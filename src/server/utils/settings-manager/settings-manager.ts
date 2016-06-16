import * as path from 'path';
import * as Q from 'q';
import { External, Dataset, basicExecutorFactory } from 'plywood';
import { Logger } from '../logger/logger';
import { loadFileSync } from '../file/file';
import { FileManager } from '../file-manager/file-manager';
import { ClusterManager } from '../cluster-manager/cluster-manager';
import { updater } from '../updater/updater';
import { AppSettings, Cluster, DataSource } from '../../../common/models/index';

export interface SettingsLocation {
  location: 'local' | 'transient';
  readOnly: boolean;
  uri?: string;
}

export interface SettingsManagerOptions {
  logger: Logger;
  verbose?: boolean;
  initialLoadTimeout?: number;
}

export class SettingsManager {
  public logger: Logger;
  public verbose: boolean;
  public settingsLocation: SettingsLocation;
  public appSettings: AppSettings;
  public fileManagers: FileManager[];
  public clusterManagers: ClusterManager[];
  public currentWork: Q.Promise<any>;
  public initialLoadTimeout: number;

  constructor(settingsLocation: SettingsLocation, options: SettingsManagerOptions) {
    var logger = options.logger;
    this.logger = logger;
    var verbose = Boolean(options.verbose);
    this.verbose = verbose;

    this.settingsLocation = settingsLocation;
    this.fileManagers = [];
    this.clusterManagers = [];

    this.initialLoadTimeout = options.initialLoadTimeout || 30000;
    this.appSettings = AppSettings.BLANK;

    switch (settingsLocation.location) {
      case 'transient':
        this.currentWork = Q(null);
        break;

      case 'local':
        Q.fcall(() => AppSettings.fromJS(loadFileSync(settingsLocation.uri, 'yaml')))
          .then(
            (appSettings) => {
              this.changeSettings(appSettings);
            },
            e => {
              logger.error(`Fatal settings load error: ${e.message}`);
              throw e;
            }
          );

        break;

      default:
        throw new Error(`unknown location ${settingsLocation.location}`);
    }

    this.makeMaxTimeCheckTimer();
  }

  private addClusterManager(cluster: Cluster): Q.Promise<any> {
    const { verbose, logger } = this;

    var initialExternals = this.appSettings.getDataSourcesForCluster(cluster.name).map(dataSource => {
      return {
        name: dataSource.name,
        external: dataSource.toExternal(),
        suppressIntrospection: dataSource.introspection === 'none'
      };
    });

    // Make a cluster manager for each cluster and assign the correct initial externals to it.
    var clusterManager = new ClusterManager(cluster, {
      logger,
      verbose,
      initialExternals,
      onExternalChange: this.onExternalChange.bind(this, cluster),
      generateExternalName: this.generateDataSourceName.bind(this)
    });

    logger.log(`Adding cluster manager for '${cluster.name}'`);
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

  private addFileManager(dataSource: DataSource): Q.Promise<any> {
    if (dataSource.engine !== 'native') throw new Error(`data source '${dataSource.name}' must be native to have a file manager`);
    const { verbose, logger } = this;

    var fileManager = new FileManager({
      logger,
      verbose,
      uri: dataSource.source,
      onDatasetChange: this.onDatasetChange.bind(this, dataSource.name)
    });

    this.fileManagers.push(fileManager);
    return fileManager.init();
  }

  private removeFileManager(dataSource: DataSource): void {
    if (dataSource.engine !== 'native') throw new Error(`data source '${dataSource.name}' must be native to have a file manager`);

    this.fileManagers = this.fileManagers.filter((fileManager) => {
      if (fileManager.uri !== dataSource.source) return true;
      fileManager.destroy();
      return false;
    });
  }

  getSettings(dataSourceOfInterest?: string): Q.Promise<AppSettings> {
    return this.currentWork
      .timeout(this.initialLoadTimeout)
      .catch(e => {
        this.logger.error(`Initial load timeout hit, continuing`);
      })
      .then(() => {
        // ToDo: utilize dataSourceOfInterest
        return Q.all(this.clusterManagers.map(clusterManager => clusterManager.refresh()));
      })
      .then(() => this.appSettings);
  }

  changeSettings(newSettings: AppSettings): void {
    var oldSettings = this.appSettings;
    this.appSettings = newSettings;

    updater(oldSettings.clusters, newSettings.clusters, {
      onExit: (oldCluster) => {
        this.removeClusterManager(oldCluster);
      },
      onUpdate: (newCluster) => {
        console.log(`${newCluster.name} UPDATED cluster`);
      },
      onEnter: (newCluster) => {
        this.addClusterManager(newCluster);
      }
    });

    var oldNativeDataSources = oldSettings.getDataSourcesForCluster('native');
    var newNativeDataSources = newSettings.getDataSourcesForCluster('native');
    updater(oldNativeDataSources, newNativeDataSources, {
      onExit: (oldDataSource) => {
        this.removeFileManager(oldDataSource);
      },
      onUpdate: (newDataSource) => {
        console.log(`${newDataSource.name} UPDATED datasource`);
      },
      onEnter: (newDataSource) => {
        this.addFileManager(newDataSource);
      }
    });
  }

  updateSettings(newSettings: AppSettings): Q.Promise<any> {
    if (this.settingsLocation.readOnly) return Q.reject(new Error('must be writable'));

    var clusterManagers = this.clusterManagers;
    this.appSettings = newSettings.attachExecutors((dataSource) => {
      if (dataSource.engine === 'native') {
        return null; // ToDo: fix this.
      } else {
        for (var clusterManager of clusterManagers) {
          if (clusterManager.cluster.name === dataSource.engine) {
            var external = clusterManager.getExternalByName(dataSource.name);
            if (!external) return null;
            return basicExecutorFactory({
              datasets: { main: external }
            });
          }
        }
      }
      return null;
    });

    return Q(null); // ToDo: actual work
  }

  generateDataSourceName(external: External): string {
    const { appSettings } = this;
    var source = String(external.source);

    var candidateName = source;
    var i = 0;
    while (appSettings.getDataSource(candidateName)) {
      i++;
      candidateName = source + i;
    }
    return candidateName;
  }

  getFreshDataSourceName(suggestion: string): string {
    return suggestion;
  }

  getFreshClusterName(suggestion: string): string {
    return suggestion;
  }

  onDatasetChange(dataSourceName: string, changedDataset: Dataset): void {
    if (this.verbose) this.logger.log(`Got native dataset update for ${dataSourceName}`);

    var dataSource = this.appSettings.getDataSource(dataSourceName);
    if (!dataSource) throw new Error(`Unknown dataset ${dataSourceName}`);
    this.appSettings = this.appSettings.addOrUpdateDataSource(dataSource.updateWithDataset(changedDataset));
  }

  onExternalChange(cluster: Cluster, dataSourceName: string, changedExternal: External): void {
    if (!changedExternal.attributes) return;
    if (this.verbose) this.logger.log(`Got external dataset update for ${dataSourceName} in cluster ${cluster.name}`);

    var dataSource = this.appSettings.getDataSource(dataSourceName);
    if (!dataSource) {
       dataSource = DataSource.fromClusterAndExternal(dataSourceName, cluster, changedExternal);
    }
    this.appSettings = this.appSettings.addOrUpdateDataSource(dataSource.updateWithExternal(changedExternal));
  }

  makeMaxTimeCheckTimer() {
    // Periodically check if max time needs to be updated
    setInterval(() => {
      this.appSettings.dataSources.forEach((dataSource) => {
        if (dataSource.refreshRule.isQuery() && dataSource.shouldUpdateMaxTime()) {
          DataSource.updateMaxTime(dataSource)
            .then(
              (updatedDataSource) => {
                this.logger.log(`Getting the latest MaxTime for '${updatedDataSource.name}'`);
                this.appSettings = this.appSettings.addOrUpdateDataSource(updatedDataSource);
              },
              (e) => {
                this.logger.error(`Error getting MaxTime for ${dataSource.name}: ${e.message}`);
              }
            );
        }
      });
    }, 1000).unref();
  }

  addCluster(cluster: Cluster): void {
    this.currentWork = this.currentWork
      .then(() => this.changeSettings(this.appSettings.addCluster(cluster)));
  }

  addDataSource(dataSource: DataSource): void {
    this.currentWork = this.currentWork
      .then(() => this.changeSettings(this.appSettings.addDataSource(dataSource)));
  }

}
