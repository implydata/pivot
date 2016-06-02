import * as Q from 'q';
import { External, Dataset, DruidExternal, helper, basicExecutorFactory } from 'plywood';
import { DruidRequestDecorator } from 'plywood-druid-requester';
import { loadFileSync } from '../file/file';
import { properRequesterFactory, SupportedTypes } from '../requester/requester';
import { AppSettings, Cluster, DataSource } from '../../../common/models/index';

export interface SettingsLocation {
  location: 'local';
  readOnly: boolean;
  uri: string;
}

export class FileManager {
  public datasets: Dataset[] = [];
}


// For each external we want to maintain its source and weather it should introspect at all
export interface ManagedExternal {
  name: string;
  external: External;
  autoDiscovered?: boolean;
  suppressIntrospection?: boolean;
}

export interface ClusterManagerOptions {
  verbose?: boolean;
  initialExternals?: ManagedExternal[];
  onExternalChange?: (name: string, external: External) => void;
  generateExternalName?: (external: External) => string;
}

function noop() {}

function sourceAsName(external: External) {
  return (external as any).dataSource;
}

export class ClusterManager {
  public cluster: Cluster;
  public version: string;
  public requester: Requester.PlywoodRequester<any>;
  public managedExternals: ManagedExternal[] = [];
  public verbose: boolean;
  public onExternalChange: (name: string, external: External) => void;
  public generateExternalName: (external: External) => string;

  constructor(cluster: Cluster, options: ClusterManagerOptions = {}) {
    if (!cluster) throw new Error('must have cluster');
    this.cluster = cluster;
    this.verbose = Boolean(options.verbose);
    this.managedExternals = options.initialExternals || [];
    this.onExternalChange = options.onExternalChange || noop;
    this.generateExternalName = options.generateExternalName || sourceAsName;

    var clusterType: SupportedTypes = 'druid'; // ToDo: cluster.type

    var druidRequestDecorator: DruidRequestDecorator = null;
    // if (clusterType === 'druid' && serverSettings.druidRequestDecoratorModule) {
    //   var logger = (str: string) => console.log(str);
    //   druidRequestDecorator = serverSettings.druidRequestDecoratorModule.druidRequestDecorator(logger, {
    //     config
    //   });
    // }

    var requester = properRequesterFactory({
      type: clusterType,
      host: cluster.host,
      timeout: cluster.timeout,
      verbose: this.verbose,
      concurrentLimit: 5,

      druidRequestDecorator

      // database: cluster.database,
      // user: cluster.user,
      // password: cluster.password
    });
    this.requester = requester;

    for (var managedExternal of this.managedExternals) {
      managedExternal.external = managedExternal.external.attachRequester(requester);
    }
  }

  // Do initialization
  public init(): Q.Promise<any> {
    const { cluster, requester } = this;

    var progress: Q.Promise<any> = Q(null);

    // Get the version if needed
    if (!this.version) {
      progress = progress
        .then(() => DruidExternal.getVersion(requester))
        .then(
          (version) => {
            this.version = version;
          },
          (e) => {
            throw new Error(`Field to get version from cluster ${cluster.name} because ${e.message}`);
          }
        );
    }

    // If desired scan for other sources
    if (cluster.sourceListScan) {
      progress = progress
        .then(() => DruidExternal.getSourceList(requester))
        .then(
          (sources) => {
            // For every un-accounted source: make an external and add it to the managed list.
            for (var source of sources) {
              if (this.managedExternals.filter(managedExternal => (managedExternal.external as any).dataSource === source).length) continue;
              var external = cluster.makeExternalFromSourceName(source, this.version).attachRequester(requester);
              this.managedExternals.push({
                name: this.generateExternalName(external),
                external: external,
                autoDiscovered: true
              });
            }
          },
          (e) => {
            throw new Error(`Failed to get source list from cluster ${cluster.name} because ${e.message}`);
          }
        );
    }

    // Go over all managed externals and introspect them if needed also set up intersection for the cluster
    progress = progress
      .then(() => {
        var initialIntrospectionTasks: Q.Promise<any>[] = [];
        this.managedExternals.forEach((managedExternal) => {
          if (managedExternal.suppressIntrospection) return;
          initialIntrospectionTasks.push(
            managedExternal.external.introspect()
              .then(introspectedExternal => {
                if (introspectedExternal.equals(managedExternal.external)) return;
                managedExternal.external = introspectedExternal;
                this.onExternalChange(managedExternal.name, introspectedExternal);
              })
          );
        });
        return Q.all(initialIntrospectionTasks);
      });

    // Set up timers to reintrospect the sources and reintrospect the

    return progress;
  }

  // See if any new sources were added to the cluster
  public refreshSourceList(): Q.Promise<any> {
    var progress: Q.Promise<any> = Q(null);

    return progress;
  }

  // See if any new dimensions or measures were added to the existing externals
  public reintrospectSources(): Q.Promise<any> {
    var progress: Q.Promise<any> = Q(null);

    return progress;
  }

  // Refresh the cluster now, will trigger onExternalUpdate and then return an empty promise when done
  public refresh(): Q.Promise<any> {
    return this.refreshSourceList().then(() => this.reintrospectSources());
  }

  public getExternalByName(name: string): External {
    var managedExternal = helper.findByName(this.managedExternals, name);
    return managedExternal ? managedExternal.external : null;
  }

}


export class SettingsManager {
  public settingsLocation: SettingsLocation;
  public appSettings: AppSettings;
  public clusterManagers: ClusterManager[];
  public initialLoad: Q.Promise<any>;

  constructor(settingsLocation: SettingsLocation, log?: (line: string) => void) {
    this.settingsLocation = settingsLocation;
    this.clusterManagers = [];

    this.initialLoad = Q.fcall(() => {
      var progress: Q.Promise<any> = Q(null);

      // Load the settings
      progress = progress.then(() => {
        this.appSettings = AppSettings.fromJS(loadFileSync(settingsLocation.uri, 'yaml'));
      });

      // Collect all declared datasources
      progress = progress.then(() => {
        const { clusters } = this.appSettings;
        clusters.forEach(cluster => {
          // Get each of their externals
          var initialExternals = this.appSettings.getDataSourcesForCluster(cluster.name).map(dataSource => {
            return {
              name: dataSource.name,
              external: cluster.makeExternalFromDataSource(dataSource), // ToDo: figure out version story
              suppressIntrospection: dataSource.introspection === 'none'
            };
          });

          // Make a cluster manager for each cluster and assign the correct initial externals to it.
          this.clusterManagers.push(new ClusterManager(cluster, {
            initialExternals,
            onExternalChange: this.onExternalChange.bind(this, cluster)
          }));
        });

        var initPromises = this.clusterManagers.map(clusterManager => clusterManager.init());

        // Also make a FileManager for the local files
        // this.appSettings.getDataSourcesForCluster('native')

        return Q.all(initPromises);
      });

      return progress;
    })
      .catch(e => {
        console.log("Error:", e);
      });
  }

  getDataSource(dataSourceName: string): Q.Promise<DataSource> {
    return this.getSettings().then(appSettings => appSettings.getDataSource(dataSourceName));
  }

  getSettings(): Q.Promise<AppSettings> {
    return this.initialLoad
      .then(() => {
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

  onExternalChange(cluster: Cluster, dataSourceName: string, changedExternal: External): void {
    //console.log('onExternalChange', dataSourceName);
    var dataSource = this.appSettings.getDataSource(dataSourceName);
    if (!dataSource) {
       dataSource = cluster.makeDataSourceFromExternal(dataSourceName, changedExternal);
    }
    this.appSettings = this.appSettings.addOrUpdateDataSource(dataSource.updateWithExternal(changedExternal));

  }

}
