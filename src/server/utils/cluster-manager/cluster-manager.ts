import * as Q from 'q';
import { External, DruidExternal, MySQLExternal, PostgresExternal, helper } from 'plywood';
import { DruidRequestDecorator } from 'plywood-druid-requester';
import { properRequesterFactory } from '../requester/requester';
import { Cluster, SupportedTypes } from '../../../common/models/index';
import { Logger } from '../logger/logger';

// Hack: (this should really be part of Plywood)
function externalChangeVersion(external: External, version: string): External {
  if (external.version === version) return external;
  var value = external.valueOf();
  value.version = version;
  return External.fromValue(value);
}

// For each external we want to maintain its source and weather it should introspect at all
export interface ManagedExternal {
  name: string;
  external: External;
  autoDiscovered?: boolean;
  suppressIntrospection?: boolean;
}

export interface ClusterManagerOptions {
  logger: Logger;
  verbose?: boolean;
  initialExternals?: ManagedExternal[];
  onExternalChange?: (name: string, external: External) => void;
  generateExternalName?: (external: External) => string;
}

function noop() {}

function getSourceFromExternal(external: External): string {
  return String(external.source);
}

export class ClusterManager {
  public logger: Logger;
  public verbose: boolean;
  public cluster: Cluster;
  public version: string;
  public requester: Requester.PlywoodRequester<any>;
  public managedExternals: ManagedExternal[] = [];
  public onExternalChange: (name: string, external: External) => void;
  public generateExternalName: (external: External) => string;

  private host: string = null;

  private sourceListRefreshInterval: number = 0;
  private sourceListRefreshTimer: NodeJS.Timer = null;
  private sourceReintrospectInterval: number = 0;
  private sourceReintrospectTimer: NodeJS.Timer = null;

  constructor(cluster: Cluster, options: ClusterManagerOptions) {
    if (!cluster) throw new Error('must have cluster');
    this.logger = options.logger;
    this.verbose = Boolean(options.verbose);
    this.cluster = cluster;
    this.version = cluster.version;
    this.managedExternals = options.initialExternals || [];
    this.onExternalChange = options.onExternalChange || noop;
    this.generateExternalName = options.generateExternalName || getSourceFromExternal;

    this.updateRequester();
    this.updateSourceListRefreshTimer();
    this.updateSourceReintrospectTimer();

    for (var managedExternal of this.managedExternals) {
      managedExternal.external = managedExternal.external.attachRequester(this.requester);
    }
  }

  // Do initialization
  public init(): Q.Promise<any> {
    return Q(null)
      .then(() => this.introspectVersion())
      .then(() => this.reintrospectSources())
      .then(() => this.scanSourceList());
  }

  public destroy() {
    if (this.sourceListRefreshTimer) {
      clearInterval(this.sourceListRefreshTimer);
      this.sourceListRefreshTimer = null;
    }
    if (this.sourceReintrospectTimer) {
      clearInterval(this.sourceReintrospectTimer);
      this.sourceReintrospectTimer = null;
    }
  }

  private updateRequester() {
    const { cluster } = this;

    var druidRequestDecorator: DruidRequestDecorator = null;
    // if (clusterType === 'druid' && serverSettings.druidRequestDecoratorModule) {
    //   var logger = (str: string) => console.log(str);
    //   druidRequestDecorator = serverSettings.druidRequestDecoratorModule.druidRequestDecorator(logger, {
    //     config
    //   });
    // }

    if (this.host !== cluster.host) {
      this.host = cluster.host;
      this.requester = properRequesterFactory({
        type: cluster.type,
        host: cluster.host,
        timeout: cluster.timeout,
        verbose: this.verbose,
        concurrentLimit: 5,

        druidRequestDecorator,

        database: cluster.database,
        user: cluster.user,
        password: cluster.password
      });
    }
  }

  private updateSourceListRefreshTimer() {
    const { logger, cluster } = this;

    if (this.sourceListRefreshInterval !== cluster.sourceListRefreshInterval) {
      this.sourceListRefreshInterval = cluster.sourceListRefreshInterval;

      if (this.sourceListRefreshTimer) {
        logger.log(`Clearing sourceListRefresh timer in cluster '${cluster.name}'`);
        clearTimeout(this.sourceListRefreshTimer);
        this.sourceListRefreshTimer = null;
      }

      if (this.sourceListRefreshInterval) {
        logger.log(`Setting up sourceListRefresh timer in cluster '${cluster.name}' (every ${this.sourceListRefreshInterval}ms)`);
        this.sourceListRefreshTimer = setInterval(() => {
          this.scanSourceList();
        }, this.sourceListRefreshInterval);
        this.sourceListRefreshTimer.unref();
      }
    }
  }

  private updateSourceReintrospectTimer() {
    const { logger, cluster } = this;

    if (this.sourceReintrospectInterval !== cluster.sourceReintrospectInterval) {
      this.sourceReintrospectInterval = cluster.sourceReintrospectInterval;

      if (this.sourceReintrospectTimer) {
        logger.log(`Clearing sourceReintrospect timer in cluster '${cluster.name}'`);
        clearTimeout(this.sourceReintrospectTimer);
        this.sourceReintrospectTimer = null;
      }

      if (this.sourceReintrospectInterval) {
        logger.log(`Setting up sourceReintrospect timer in cluster '${cluster.name}' (every ${this.sourceReintrospectInterval}ms)`);
        this.sourceReintrospectTimer = setInterval(() => {
          this.scanSourceList();
        }, this.sourceReintrospectInterval);
        this.sourceReintrospectTimer.unref();
      }
    }
  }

  public introspectVersion(): Q.Promise<any> {
    const { logger, cluster } = this;

    return Q(null)
    //.delay(30000)
      .then(() => {
        if (this.version) return this.version;
        if (cluster.type !== 'druid') return '1.2.3-' + cluster.type; // ToDo: hack!
        return (External.getConstructorFor(cluster.type) as any).getVersion(this.requester)
          .then(
            (version: string) => {
              this.version = version;
              logger.log(`Detected cluster ${cluster.name} running version ${version}`);
              return version;
            },
            (e: Error) => {
              logger.error(`Field to get version from cluster ${cluster.name} because ${e.message}`);
            }
          );
      })
      .then((version) => {
        // Add versions to all existing externals
        this.managedExternals.forEach(managedExternal => {
          if (managedExternal.external.version) return;
          managedExternal.external = externalChangeVersion(managedExternal.external, version);
        });
      });
  }

  private introspectManagedExternal(managedExternal: ManagedExternal): Q.Promise<any> {
    const { logger, cluster } = this;
    if (managedExternal.suppressIntrospection) return Q(null);

    return managedExternal.external.introspect()
      .then(
        (introspectedExternal) => {
          if (introspectedExternal.equals(managedExternal.external)) return;
          managedExternal.external = introspectedExternal;
          this.onExternalChange(managedExternal.name, introspectedExternal);
        },
        (e: Error) => {
          logger.error(`Cluster '${cluster.name}' could not introspect '${managedExternal.name}' because: ${e.message}`);
        }
      );
  }

  // See if any new sources were added to the cluster
  public scanSourceList(): Q.Promise<any> {
    const { logger, cluster, verbose } = this;
    if (!cluster.sourceListScan) return Q(null);

    return (External.getConstructorFor(cluster.type) as any).getSourceList(this.requester)
      .then(
        (sources: string[]) => {
          if (verbose) logger.log(`For cluster '${cluster.name}' got sources: [${sources.join(', ')}]`);
          // For every un-accounted source: make an external and add it to the managed list.
          var introspectionTasks: Q.Promise<any>[] = [];
          for (var source of sources) {
            var existingExternalsForSource = this.managedExternals.filter(managedExternal => getSourceFromExternal(managedExternal.external) === source);
            if (existingExternalsForSource.length) {
              if (verbose) logger.log(`Cluster '${cluster.name}' already has an external for '${source}' ('${existingExternalsForSource[0].name}')`);
            } else {
              if (verbose) logger.log(`Cluster '${cluster.name}' making external for '${source}'`);
              var external = cluster.makeExternalFromSourceName(source, this.version).attachRequester(this.requester);
              var newManagedExternal: ManagedExternal = {
                name: this.generateExternalName(external),
                external: external,
                autoDiscovered: true
              };
              this.managedExternals.push(newManagedExternal);
              this.onExternalChange(newManagedExternal.name, newManagedExternal.external);
              introspectionTasks.push(this.introspectManagedExternal(newManagedExternal));
            }
          }

          return Q.all(introspectionTasks);
        },
        (e: Error) => {
          logger.error(`Failed to get source list from cluster '${cluster.name}' because ${e.message}`);
        }
      );
  }

  // See if any new dimensions or measures were added to the existing externals
  public reintrospectSources(): Q.Promise<any> {
    return Q.all(this.managedExternals.map((managedExternal) => {
      return this.introspectManagedExternal(managedExternal);
    }));
  }

  // Refresh the cluster now, will trigger onExternalUpdate and then return an empty promise when done
  public refresh(): Q.Promise<any> {
    const { cluster } = this;
    var process = Q(null);

    if (cluster.sourceReintrospectOnLoad) {
      process = process.then(() => this.reintrospectSources());
    }

    if (cluster.sourceListRefreshOnLoad) {
      process = process.then(() => this.scanSourceList());
    }

    return process;
  }

  public getExternalByName(name: string): External {
    var managedExternal = helper.findByName(this.managedExternals, name);
    return managedExternal ? managedExternal.external : null;
  }

}
