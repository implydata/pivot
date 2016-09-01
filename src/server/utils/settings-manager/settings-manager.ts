/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Q from 'q';
import { Timezone, day } from 'chronoshift';
import { $, Executor, basicExecutorFactory, find, Attributes, Dataset, TimeRange } from 'plywood';
import { Logger } from 'logger-tracker';
import { TimeMonitor } from "../../../common/utils/time-monitor/time-monitor";
import { AppSettings, Timekeeper, Cluster, DataCube } from '../../../common/models/index';
import { SettingsStore } from '../settings-store/settings-store';
import { FileManager } from '../file-manager/file-manager';
import { ClusterManager } from '../cluster-manager/cluster-manager';
import { updater } from '../updater/updater';

const PREVIEW_LIMIT = 20;
const LOTS_OF_TIME = TimeRange.fromJS({
  start: new Date('1000-01-01Z'),
  end: new Date('4000-01-01Z')
});

export interface SettingsManagerOptions {
  logger: Logger;
  verbose?: boolean;
  initialLoadTimeout?: number;
  anchorPath: string;
}

export interface GetSettingsOptions {
  dataCubeOfInterest?: string;
  timeout?: number;
}

export interface FullSettings {
  appSettings: AppSettings;
  timekeeper: Timekeeper;
  executors: Lookup<Executor>;
}

export interface ClusterAndSources {
  cluster: Cluster;
  sources: string[];
}

export interface ClusterNameAndSource {
  clusterName: string;
  source: string;
}

function flatten<T>(as: T[][]): T[] {
  return Array.prototype.concat.apply([], as);
}

export class SettingsManager {
  public logger: Logger;
  public verbose: boolean;
  public anchorPath: string;
  public settingsStore: SettingsStore;
  public appSettings: AppSettings;
  public timeMonitor: TimeMonitor;
  public executors: Lookup<Executor>;
  public fileManagers: FileManager[];
  public clusterManagers: ClusterManager[];
  public currentWork: Q.Promise<any>;
  public initialLoadTimeout: number;

  constructor(settingsStore: SettingsStore, options: SettingsManagerOptions) {
    var logger = options.logger;
    this.logger = logger;
    this.verbose = Boolean(options.verbose);
    this.anchorPath = options.anchorPath;

    this.timeMonitor = new TimeMonitor(logger);
    this.executors = {};
    this.settingsStore = settingsStore;
    this.fileManagers = [];
    this.clusterManagers = [];

    this.initialLoadTimeout = options.initialLoadTimeout || 30000;
    this.appSettings = AppSettings.BLANK;

    // do initial load of initial settings
    this.currentWork = settingsStore.readSettings()
      .then((appSettings) => {
        return this.synchronizeSettings(appSettings);
      });

    // add the auto loader if need after completing initial read
    if (this.settingsStore.needsAutoLoader) {
      this.settingsStore.autoLoader = this.autoLoadDataCubes.bind(this);

      // Reread the settings
      this.currentWork = this.currentWork
        .then(() => settingsStore.readSettings())
        .then((appSettings) => {
          return this.synchronizeSettings(appSettings);
        });
    }

    // log error if something goes wrong
    this.currentWork = this.currentWork
      .catch(e => {
        logger.error(`Fatal settings load error: ${e.message}`);
        logger.error(e.stack);
        throw e;
      });
  }

  public isStateful(): boolean {
    return Boolean(this.settingsStore.writeSettings);
  }

  private getClusterManagerFor(clusterName: string): ClusterManager {
    return find(this.clusterManagers, (clusterManager) => clusterManager.cluster.name === clusterName);
  }

  private getFileManagerFor(uri: string): FileManager {
    return find(this.fileManagers, (fileManager) => fileManager.uri === uri);
  }

  getFullSettings(opts: GetSettingsOptions = {}): Q.Promise<FullSettings> {
    const { settingsStore } = this;
    var currentWork = this.currentWork;

    if (settingsStore.hasUpdateOnLoad) {
      currentWork = currentWork
        .then(() => {
          return settingsStore.hasUpdateOnLoad().then(hasUpdate => {
            if (!hasUpdate) return null;

            // There is an update so re-read and sync teh settings
            return settingsStore.readSettings()
              .then((appSettings) => {
                return this.synchronizeSettings(appSettings);
              });
          });
        });
    }

    var timeout = opts.timeout || this.initialLoadTimeout;
    if (timeout !== 0) {
      currentWork = currentWork.timeout(timeout)
        .catch(e => {
          this.logger.error(`Settings load timeout hit, continuing`);
        });
    }

    return currentWork.then(() => {
      return {
        appSettings: this.appSettings,
        timekeeper: this.timeMonitor.timekeeper,
        executors: this.executors
      };
    });
  }

  synchronizeSettings(newSettings: AppSettings): Q.Promise<any> {
    var tasks = [
      this.synchronizeClusters(newSettings),
      this.synchronizeDataCubes(newSettings)
    ];
    this.appSettings = newSettings;

    return Q.all(tasks);
  }

  // === Clusters ==============================

  private addClusterManager(cluster: Cluster): Q.Promise<any> {
    const { verbose, logger, anchorPath } = this;

    var clusterManager = new ClusterManager(cluster, {
      logger,
      verbose,
      anchorPath
    });

    this.clusterManagers.push(clusterManager);
    return clusterManager.establishInitialConnection();
  }

  private removeClusterManager(cluster: Cluster): void {
    this.clusterManagers = this.clusterManagers.filter((clusterManager) => {
      if (clusterManager.cluster.name !== cluster.name) return true;
      clusterManager.destroy();
      return false;
    });
  }


  synchronizeClusters(newSettings: AppSettings): Q.Promise<any> {
    const { verbose, logger } = this;
    var oldSettings = this.appSettings;
    var tasks: Q.Promise<any>[] = [];

    updater(oldSettings.clusters, newSettings.clusters, {
      onExit: (oldCluster) => {
        logger.log(`Removing cluster manager for '${oldCluster.name}'`);
        this.removeClusterManager(oldCluster);
      },
      onUpdate: (newCluster, oldCluster) => {
        logger.log(`Updating cluster manager for '${newCluster.name}'`);
        this.removeClusterManager(oldCluster);
        tasks.push(this.addClusterManager(newCluster));
      },
      onEnter: (newCluster) => {
        logger.log(`Adding cluster manager for '${newCluster.name}'`);
        tasks.push(this.addClusterManager(newCluster));
      }
    });

    return Q.all(tasks);
  }

  // === Cubes ==============================

  private addExecutor(dataCube: DataCube, executor: Executor): void {
    this.executors[dataCube.name] = executor;
  }

  private removeExecutor(dataCube: DataCube): void {
    delete this.executors[dataCube.name];
  }

  private addTimeCheckIfNeeded(dataCube: DataCube, executor: Executor): void {
    if (!dataCube.refreshRule.isQuery()) return;

    var maxTimeQuery = dataCube.getMaxTimeQuery();
    if (!maxTimeQuery) return;
    this.timeMonitor.addCheck(dataCube.name, () => {
      return executor(maxTimeQuery).then(DataCube.processMaxTimeQuery);
    });
  }

  private removeTimeCheck(dataCube: DataCube): void {
    this.timeMonitor.removeCheck(dataCube.name);
  }

  private addNativeCube(dataCube: DataCube): Q.Promise<any> {
    if (dataCube.clusterName !== 'native') throw new Error(`data cube '${dataCube.name}' must be native to have a file manager`);
    const { verbose, logger, anchorPath } = this;

    var fileManager = new FileManager({
      logger,
      verbose,
      anchorPath,
      uri: dataCube.source,
      subsetExpression: dataCube.subsetExpression

    });

    this.fileManagers.push(fileManager);
    return fileManager.loadDataset().then((dataset) => {
      var newExecutor = basicExecutorFactory({
        datasets: { main: dataset }
      });
      this.addExecutor(dataCube, newExecutor);
      this.addTimeCheckIfNeeded(dataCube, newExecutor);
    });
  }

  private removeNativeCube(dataCube: DataCube): void {
    if (dataCube.clusterName !== 'native') throw new Error(`data cube '${dataCube.name}' must be native to have a file manager`);

    this.fileManagers = this.fileManagers.filter((fileManager) => {
      if (fileManager.uri !== dataCube.source) return true;
      fileManager.destroy();
      return false;
    });
    this.removeExecutor(dataCube);
    this.removeTimeCheck(dataCube);
  }

  private addClusterCube(dataCube: DataCube): void {
    var clusterManager = this.getClusterManagerFor(dataCube.clusterName);
    if (clusterManager) {
      var newExecutor = basicExecutorFactory({
        datasets: { main: dataCube.toExternal(clusterManager.cluster, clusterManager.requester) }
      });
      this.addExecutor(dataCube, newExecutor);
      this.addTimeCheckIfNeeded(dataCube, newExecutor);
    }
  }

  private removeClusterCube(dataCube: DataCube): void {
    this.removeExecutor(dataCube);
    this.removeTimeCheck(dataCube);
  }

  synchronizeDataCubes(newSettings: AppSettings): Q.Promise<any> {
    const { verbose, logger } = this;
    var oldSettings = this.appSettings;
    var tasks: Q.Promise<any>[] = [];

    updater(oldSettings.dataCubes, newSettings.dataCubes, {
      onExit: (oldDataCube) => {
        logger.log(`Removing data cube manager for '${oldDataCube.name}'`);
        if (oldDataCube.clusterName === 'native') {
          this.removeNativeCube(oldDataCube);
        } else {
          this.removeClusterCube(oldDataCube);
        }
      },
      onUpdate: (newDataCube, oldDataCube) => {
        // If native sources are the same, nothing to do.
        if (newDataCube.clusterName === 'native' && oldDataCube.clusterName === 'native' && newDataCube.source === oldDataCube.source) return;

        logger.log(`Updating data cube manager for '${newDataCube.name}'`);
        if (oldDataCube.clusterName === 'native') {
          this.removeNativeCube(oldDataCube);
          tasks.push(this.addNativeCube(newDataCube));
        } else {
          this.removeClusterCube(oldDataCube);
          this.addClusterCube(newDataCube);
        }
      },
      onEnter: (newDataCube) => {
        logger.log(`Adding data cube manager for '${newDataCube.name}'`);
        if (newDataCube.clusterName === 'native') {
          tasks.push(this.addNativeCube(newDataCube));
        } else {
          this.addClusterCube(newDataCube);
        }
      }
    });

    return Q.all(tasks);
  }

  updateSettings(newSettings: AppSettings): Q.Promise<any> {
    if (!this.settingsStore.writeSettings) return Q.reject(new Error('must be writable'));

    return this.settingsStore.writeSettings(newSettings)
      .then(() => {
        this.synchronizeSettings(newSettings);
      });
  }

  checkClusterConnectionInfo(cluster: Cluster): Q.Promise<ClusterAndSources> {
    const { verbose, logger, anchorPath } = this;

    var clusterManager = new ClusterManager(cluster, {
      logger,
      verbose,
      anchorPath
    });

    return clusterManager.establishInitialConnection(0)
      .then(
        () => clusterManager.getSources(),
        (e) => {
          throw new Error('Unable to connect tp cluster');
        }
      )
      .then((sources) => {
        return {
          cluster: clusterManager.cluster,
          sources
        };
      });
  }

  getAllClusterSources(): Q.Promise<ClusterNameAndSource[]> {
    var clusterSources = this.clusterManagers.map((clusterManager) => {
      var clusterName = clusterManager.cluster.name;
      return clusterManager.getSources().then((sources) => {
        return sources.map((source): ClusterNameAndSource => {
          return { clusterName, source };
        });
      });
    });

    return Q.all(clusterSources).then((things: ClusterNameAndSource[][]) => flatten(things));
  }

  getAllAttributes(source: string, cluster: string | Cluster, templateDataCube: DataCube = null): Q.Promise<Attributes> {
    const { verbose, logger, anchorPath } = this;

    var clusterName: string = typeof cluster === 'string' ? cluster : cluster.name;

    logger.log(`Getting attributes for source '${source}' in cluster '${clusterName}'`);
    if (cluster === 'native') {
      return Q.fcall(() => {
        var fileManager = this.getFileManagerFor(source);
        if (!fileManager) throw new Error(`no file manager for ${source}`);
        return fileManager.dataset.attributes;
      });
    } else {
      return Q.fcall(() => {
        if (typeof cluster === 'string') {
          var clusterManager = this.getClusterManagerFor(cluster);
          if (!clusterManager) throw new Error(`no cluster manager for ${cluster}`);
          return clusterManager;
        } else {
          var clusterManager = new ClusterManager(cluster, {
            logger,
            verbose,
            anchorPath
          });

          return clusterManager.establishInitialConnection().then(() => clusterManager);
        }
      })
        .then((clusterManager: ClusterManager) => {
          return (templateDataCube || DataCube.fromClusterAndSource('test_cube', clusterManager.cluster, source))
            .toExternal(clusterManager.cluster, clusterManager.requester)
            .introspect()
            .then((introspectedExternal) => introspectedExternal.attributes) as any;
        });
    }
  }

  preview(dataCube: DataCube): Q.Promise<Dataset> {
    var clusterName = dataCube.clusterName;
    if (clusterName === 'native') {
      return Q.fcall(() => {
        throw new Error('no support yet');
      });
    } else {
      return Q.fcall(() => {
        var clusterManager = this.getClusterManagerFor(clusterName);
        if (!clusterManager) throw new Error(`no cluster manager for ${clusterName}`);
        var context: any = { temp: dataCube.toExternal(clusterManager.cluster, clusterManager.requester) };

        var primaryTimeExpression = dataCube.getPrimaryTimeExpression();
        if (primaryTimeExpression) {
          return $('temp')
            .filter(primaryTimeExpression.in(LOTS_OF_TIME))
            .max(primaryTimeExpression)
            .compute(context)
            .then((maxTime: Date) => {
              maxTime = new Date(maxTime);
              if (isNaN(maxTime as any)) throw new Error('invalid maxTime');
              var lastTwoWeeks = TimeRange.fromJS({
                start: day.move(maxTime, Timezone.UTC, -14),
                end: maxTime
              });
              return $('temp').filter(primaryTimeExpression.in(lastTwoWeeks)).limit(PREVIEW_LIMIT).compute(context) as any;
            });
        } else {
          return $('temp').limit(PREVIEW_LIMIT).compute(context) as any;
        }
      });
    }
  }

  private autoLoadDataCubes(initSettings: AppSettings): Q.Promise<AppSettings> {
    const { verbose, logger } = this;

    logger.log(`Auto loading`);
    return this.getAllClusterSources()
      .then((clusterNameAndSources) => {
        var dataCubeFillTasks: Q.Promise<any>[] = [];
        var fullDataCubes: DataCube[] = [];
        var fullExtraDataCubes: DataCube[] = [];

        initSettings.getDataCubesByCluster('native').forEach((nativeDataCube) => {
          dataCubeFillTasks.push(
            this.getAllAttributes(nativeDataCube.source, 'native')
              .then(attributes => {
                fullDataCubes.push(nativeDataCube.fillAllFromAttributes(attributes));
              })
          );
        });

        clusterNameAndSources.forEach((clusterNameAndSource, i) => {
          const { clusterName, source } = clusterNameAndSource;

          var baseDataCubes = initSettings.getDataCubesByClusterSource(clusterName, source);
          var isNewDataCube = baseDataCubes.length === 0;
          if (isNewDataCube) {
            var newName = `${clusterName}-${source}-${i}`;
            if (verbose) logger.log(`Adding DataCube '${newName}'`);
            var cluster = initSettings.getCluster(clusterName);
            if (cluster.getSourceListScan() === 'auto') { // Respect sourceListScan property
              baseDataCubes = [DataCube.fromClusterAndSource(newName, cluster, source)];
            }
          }

          baseDataCubes.forEach(baseDataCube => {
            dataCubeFillTasks.push(
              this.getAllAttributes(source, clusterName, baseDataCube)
                .then(attributes => {
                  var fullDataCube = baseDataCube.fillAllFromAttributes(attributes);
                  if (isNewDataCube) {
                    fullExtraDataCubes.push(fullDataCube);
                  } else {
                    fullDataCubes.push(fullDataCube);
                  }
                })
            );
          });
        });

        return Q.allSettled(dataCubeFillTasks).then(() => {
          return initSettings.changeDataCubes(fullDataCubes.concat(fullExtraDataCubes));
        });
      });
  }

}
