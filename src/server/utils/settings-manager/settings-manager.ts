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
import { External, Dataset, basicExecutorFactory, find } from 'plywood';
import { Logger } from 'logger-tracker';
import { pluralIfNeeded } from '../../../common/utils/general/general';
import { TimeMonitor } from "../../../common/utils/time-monitor/time-monitor";
import { AppSettings, Timekeeper, Cluster, DataCube } from '../../../common/models/index';
import { SettingsStore } from '../settings-store/settings-store';
import { FileManager } from '../file-manager/file-manager';
import { ClusterManager } from '../cluster-manager/cluster-manager';
import { updater } from '../updater/updater';

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

export class SettingsManager {
  public logger: Logger;
  public verbose: boolean;
  public anchorPath: string;
  public settingsStore: SettingsStore;
  public appSettings: AppSettings;
  public timeMonitor: TimeMonitor;
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
    this.settingsStore = settingsStore;
    this.fileManagers = [];
    this.clusterManagers = [];

    this.initialLoadTimeout = options.initialLoadTimeout || 30000;
    this.appSettings = AppSettings.BLANK;

    this.currentWork = settingsStore.readSettings()
      .then((appSettings) => {
        return this.reviseSettings(appSettings);
      })
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

  private addClusterManager(cluster: Cluster): Q.Promise<any> {
    const { verbose, logger, anchorPath } = this;

    // Make a cluster manager for each cluster and assign the correct initial externals to it.
    logger.log(`Adding cluster manager for '${cluster.name}'`);
    var clusterManager = new ClusterManager(cluster, {
      logger,
      verbose,
      anchorPath
    });

    this.clusterManagers.push(clusterManager);
    return clusterManager.init();
  }

  private removeClusterManager(cluster: Cluster): void {
    this.clusterManagers = this.clusterManagers.filter((clusterManager) => {
      if (clusterManager.cluster.name !== cluster.name) return true;
      clusterManager.destroy();
      return false;
    });
  }

  private getFileManagerFor(uri: string): FileManager {
    return find(this.fileManagers, (fileManager) => fileManager.uri === uri);
  }

  private addFileManager(dataCube: DataCube): Q.Promise<any> {
    if (dataCube.clusterName !== 'native') throw new Error(`data cube '${dataCube.name}' must be native to have a file manager`);
    const { verbose, logger, anchorPath } = this;

    var fileManager = new FileManager({
      logger,
      verbose,
      anchorPath,
      uri: dataCube.source,
      subsetExpression: dataCube.subsetExpression,
      //onDatasetChange: this.onDatasetChange.bind(this, dataCube.name)
    });

    this.fileManagers.push(fileManager);
    return fileManager.init();
  }

  private removeFileManager(dataCube: DataCube): void {
    if (dataCube.clusterName !== 'native') throw new Error(`data cube '${dataCube.name}' must be native to have a file manager`);

    this.fileManagers = this.fileManagers.filter((fileManager) => {
      if (fileManager.uri !== dataCube.source) return true;
      fileManager.destroy();
      return false;
    });
  }

  getTimekeeper(): Timekeeper {
    return this.timeMonitor.timekeeper;
  }

  getSettings(opts: GetSettingsOptions = {}): Q.Promise<AppSettings> {
    var currentWork = this.currentWork;

    // Refresh all clusters
    var currentWork = currentWork.then(() => {
      // ToDo: utilize dataCubeOfInterest
      return Q.all(this.clusterManagers.map(clusterManager => clusterManager.refresh())) as any;
    });

    var timeout = opts.timeout || this.initialLoadTimeout;
    if (timeout !== 0) {
      currentWork = currentWork.timeout(timeout)
        .catch(e => {
          this.logger.error(`Settings load timeout hit, continuing`);
        });
    }

    return currentWork.then(() => this.appSettings);
  }

  reviseSettings(newSettings: AppSettings): Q.Promise<any> {
    var tasks = [
      this.reviseClusters(newSettings),
      this.reviseDataCubes(newSettings)
    ];
    this.appSettings = newSettings;

    return Q.all(tasks);
  }

  reviseClusters(newSettings: AppSettings): Q.Promise<any> {
    const { verbose, logger } = this;
    var oldSettings = this.appSettings;
    var tasks: Q.Promise<any>[] = [];

    updater(oldSettings.clusters, newSettings.clusters, {
      onExit: (oldCluster) => {
        this.removeClusterManager(oldCluster);
      },
      onUpdate: (newCluster) => {
        logger.log(`${newCluster.name} UPDATED cluster`);
      },
      onEnter: (newCluster) => {
        tasks.push(this.addClusterManager(newCluster));
      }
    });

    return Q.all(tasks);
  }

  reviseDataCubes(newSettings: AppSettings): Q.Promise<any> {
    const { verbose, logger } = this;
    var oldSettings = this.appSettings;
    var tasks: Q.Promise<any>[] = [];

    updater(oldSettings.dataCubes, newSettings.dataCubes, {
      onExit: (oldDataCube) => {
        if (oldDataCube.clusterName === 'native') {
          this.removeFileManager(oldDataCube);
        } else {
          throw new Error(`only native data cubes work for now`); // ToDo: fix
        }
      },
      onUpdate: (newDataCube) => {
        logger.log(`${newDataCube.name} UPDATED datasource`);
      },
      onEnter: (newDataCube) => {
        if (newDataCube.clusterName === 'native') {
          tasks.push(this.addFileManager(newDataCube));
        } else {
          throw new Error(`only native data cube work for now`); // ToDo: fix
        }
      }
    });

    return Q.all(tasks);
  }

  updateSettings(newSettings: AppSettings): Q.Promise<any> {
    if (!this.settingsStore.writeSettings) return Q.reject(new Error('must be writable'));

    var loadedNewSettings = newSettings.attachExecutors((dataCube) => {
      if (dataCube.clusterName === 'native') {
        var fileManager = this.getFileManagerFor(dataCube.source);
        if (fileManager) {
          var dataset = fileManager.dataset;
          if (!dataset) return null;
          return basicExecutorFactory({
            datasets: { main: dataset }
          });
        }

      } else {
        var clusterManager = this.getClusterManagerFor(dataCube.clusterName);
        if (clusterManager) {
          return basicExecutorFactory({
            datasets: { main: dataCube.toExternal(clusterManager.requester) }
          });
        }

      }
      return null;
    });

    return this.settingsStore.writeSettings(loadedNewSettings)
      .then(() => {
        this.appSettings = loadedNewSettings;
      });
  }

}
