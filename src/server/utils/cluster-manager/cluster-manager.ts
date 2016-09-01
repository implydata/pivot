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

import * as path from 'path';
import * as Q from 'q';
import { External, findByName } from 'plywood';
import { Logger } from 'logger-tracker';
import { DruidRequestDecorator } from 'plywood-druid-requester';
import { properRequesterFactory } from '../requester/requester';
import { Cluster } from '../../../common/models/index';

const CONNECTION_RETRY_TIMEOUT = 20000;
const DRUID_REQUEST_DECORATOR_MODULE_VERSION = 1;

export interface RequestDecoratorFactoryParams {
  options: any;
  cluster: Cluster;
}

export interface DruidRequestDecoratorModule {
  version: number;
  druidRequestDecoratorFactory: (logger: Logger, params: RequestDecoratorFactoryParams) => DruidRequestDecorator;
}

export interface ClusterManagerOptions {
  logger: Logger;
  verbose?: boolean;
  anchorPath: string;
}

function noop() {}

function getSourceFromExternal(external: External): string {
  return String(external.source);
}

export class ClusterManager {
  public logger: Logger;
  public verbose: boolean;
  public anchorPath: string;
  public cluster: Cluster;
  public initialConnectionEstablished: boolean;
  public introspectedSources: Lookup<boolean>;
  public version: string;
  public requester: Requester.PlywoodRequester<any>;
  public requestDecoratorModule: DruidRequestDecoratorModule;

  private initialConnectionTimer: NodeJS.Timer = null;

  constructor(cluster: Cluster, options: ClusterManagerOptions) {
    if (!cluster) throw new Error('must have cluster');
    this.logger = options.logger;
    this.verbose = Boolean(options.verbose);
    this.anchorPath = options.anchorPath;
    this.cluster = cluster;
    this.initialConnectionEstablished = false;
    this.introspectedSources = {};
    this.version = cluster.version;

    this.updateRequestDecorator();
    this.updateRequester();
  }

  public destroy() {
    if (this.initialConnectionTimer) {
      clearTimeout(this.initialConnectionTimer);
      this.initialConnectionTimer = null;
    }
  }

  private updateRequestDecorator(): void {
    const { cluster, logger, anchorPath } = this;
    if (!cluster.requestDecorator) return;

    var requestDecoratorPath = path.resolve(anchorPath, cluster.requestDecorator);
    logger.log(`Loading requestDecorator from '${requestDecoratorPath}'`);
    try {
      this.requestDecoratorModule = require(requestDecoratorPath);
    } catch (e) {
      throw new Error(`error loading druidRequestDecorator module from '${requestDecoratorPath}': ${e.message}`);
    }

    if (this.requestDecoratorModule.version !== DRUID_REQUEST_DECORATOR_MODULE_VERSION) {
      throw new Error(`druidRequestDecorator module '${requestDecoratorPath}' has incorrect version`);
    }
  }

  private updateRequester() {
    const { cluster, logger, requestDecoratorModule } = this;

    var druidRequestDecorator: DruidRequestDecorator = null;
    if (cluster.type === 'druid' && requestDecoratorModule) {
      logger.log(`Cluster '${cluster.name}' creating requestDecorator`);
      druidRequestDecorator = requestDecoratorModule.druidRequestDecoratorFactory(logger, {
        options: cluster.decoratorOptions,
        cluster
      });
    }

    this.requester = properRequesterFactory({
      type: cluster.type,
      host: cluster.host,
      timeout: cluster.getTimeout(),
      verbose: this.verbose,
      concurrentLimit: 5,

      druidRequestDecorator,

      database: cluster.database,
      user: cluster.user,
      password: cluster.password
    });
  }

  public establishInitialConnection(maxRetries = Infinity): Q.Promise<any> {
    const { logger, verbose, cluster } = this;

    var deferred: Q.Deferred<any> = Q.defer();

    var retryNumber = -1;
    var lastTryAt: number;
    var attemptConnection = () => {
      retryNumber++;
      if (retryNumber === 0) {
        if (verbose) logger.log(`Attempting to connect to cluster '${cluster.name}'`);
      } else {
        logger.log(`Re-attempting to connect to cluster '${cluster.name}' (retry ${retryNumber})`);
      }
      lastTryAt = Date.now();
      (External.getConstructorFor(cluster.type) as any)
        .getVersion(this.requester)
        .then(
          (version: string) => {
            this.onConnectionEstablished();
            this.internalizeVersion(version).then(() => deferred.resolve(null));
          },
          (e: Error) => {
            var msSinceLastTry = Date.now() - lastTryAt;
            var msToWait = Math.max(1, CONNECTION_RETRY_TIMEOUT - msSinceLastTry);
            logger.error(`Failed to connect to cluster '${cluster.name}' because: ${e.message} (will retry in ${msToWait}ms)`);
            if (retryNumber < maxRetries) {
              this.initialConnectionTimer = setTimeout(attemptConnection, msToWait);
            } else {
              deferred.reject(new Error('too many failed attempts'));
            }
          }
        );
    };

    attemptConnection();

    return deferred.promise;
  }

  private onConnectionEstablished(): void {
    const { logger, cluster } = this;
    logger.log(`Connected to cluster '${cluster.name}'`);
    this.initialConnectionEstablished = true;
  }

  private internalizeVersion(version: string): Q.Promise<any> {
    // If there is a version already do nothing
    if (this.version) return Q(null);

    const { logger, cluster } = this;
    logger.log(`Cluster '${cluster.name}' is running ${cluster.type}@${version}`);
    this.version = version;

    // Update all externals if needed
    return Q(null);
  }

  public getSources(): Q.Promise<string[]> {
    return (External.getConstructorFor(this.cluster.type) as any).getSourceList(this.requester);
  }

}
