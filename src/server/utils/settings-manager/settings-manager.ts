import * as path from 'path';
import * as Q from 'q';
import { External, Dataset, basicExecutorFactory } from 'plywood';
import { Logger } from '../logger/logger';
import { loadFileSync } from '../file/file';
import { FileManager } from '../file-manager/file-manager';
import { ClusterManager } from '../cluster-manager/cluster-manager';
import { AppSettings, Cluster, DataSource } from '../../../common/models/index';


export interface SettingsLocation {
  location: 'local';
  readOnly: boolean;
  uri: string;
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
  public fileManager: FileManager;
  public clusterManagers: ClusterManager[];
  public initialLoad: Q.Promise<any>;
  public initialLoadTimeout: number;

  constructor(settingsLocation: SettingsLocation, options: SettingsManagerOptions) {
    var logger = options.logger;
    this.logger = logger;
    var verbose = Boolean(options.verbose);
    this.verbose = verbose;

    this.settingsLocation = settingsLocation;
    this.fileManager = null;
    this.clusterManagers = [];

    this.initialLoadTimeout = options.initialLoadTimeout || 30000;

    this.initialLoad = Q.fcall(() => {
      var progress: Q.Promise<any> = Q(null);

      // Load the settings
      progress = progress.then(() => {
        this.appSettings = AppSettings.fromJS(loadFileSync(settingsLocation.uri, 'yaml'));
      });

      // Collect all declared datasources
      progress = progress.then(() => {
        const { clusters } = this.appSettings;
        const generateExternalName = this.generateDataSourceName.bind(this);

        clusters.forEach(cluster => {
          // Get each of their externals
          var initialExternals = this.appSettings.getDataSourcesForCluster(cluster.name).map(dataSource => {
            return {
              name: dataSource.name,
              external: dataSource.toExternal(),
              suppressIntrospection: dataSource.introspection === 'none'
            };
          });

          // Make a cluster manager for each cluster and assign the correct initial externals to it.
          this.clusterManagers.push(new ClusterManager(cluster, {
            logger,
            verbose,
            initialExternals,
            onExternalChange: this.onExternalChange.bind(this, cluster),
            generateExternalName
          }));
        });

        var initPromises = this.clusterManagers.map(clusterManager => clusterManager.init());

        // Also make a FileManager for the local files
        var initialDatasets = this.appSettings.getDataSourcesForCluster('native').map(dataSource => {
          var uri = dataSource.source;
          if (settingsLocation.location === 'local') uri = path.resolve(path.dirname(settingsLocation.uri), uri);
          return {
            name: dataSource.name,
            uri,
            subsetFilter: dataSource.subsetFilter
          };
        });

        if (initialDatasets.length) {
          this.fileManager = new FileManager({
            logger,
            verbose,
            initialDatasets,
            onDatasetChange: this.onDatasetChange.bind(this)
          });

          initPromises.push(this.fileManager.init());
        }

        return Q.all(initPromises);
      });

      return progress;
    })
      .then(() => {
        logger.log(`Initial load and introspection complete.`);
      })
      .catch(e => {
        logger.error(`Fatal initialization error: ${e.message}`);
      });

    this.makeMaxTimeCheckTimer();
  }

  getSettings(dataSourceOfInterest?: string): Q.Promise<AppSettings> {
    return this.initialLoad
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
      var appSettings = this.appSettings;
      appSettings.dataSources.forEach((dataSource) => {
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

}
