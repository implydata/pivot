import * as Q from 'q';
import { External, DruidExternal, helper } from 'plywood';
import { DruidRequestDecorator } from 'plywood-druid-requester';
import { properRequesterFactory, SupportedTypes } from '../requester/requester';
import { Cluster } from '../../../common/models/index';
import { Logger } from '../logger/logger';

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

function sourceAsName(external: External) {
  return (external as any).dataSource;
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

  constructor(cluster: Cluster, options: ClusterManagerOptions) {
    if (!cluster) throw new Error('must have cluster');
    this.logger = options.logger;
    this.verbose = Boolean(options.verbose);
    this.cluster = cluster;
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
        .delay(30000)
        .then(() => DruidExternal.getVersion(requester))
        .then(
          (version) => {
            this.version = version;
            this.logger.log(`Detected cluster ${cluster.name} running version ${version}`);
          },
          (e) => {
            this.logger.error(`Field to get version from cluster ${cluster.name} because ${e.message}`);
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
            this.logger.error(`Failed to get source list from cluster ${cluster.name} because ${e.message}`);
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
