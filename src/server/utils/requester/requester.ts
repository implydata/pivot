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

import { $, retryRequesterFactory, verboseRequesterFactory, concurrentLimitRequesterFactory } from 'plywood';
import { druidRequesterFactory, DruidRequestDecorator } from 'plywood-druid-requester';
import { mySqlRequesterFactory } from 'plywood-mysql-requester';
import { postgresRequesterFactory } from 'plywood-postgres-requester';
import { SupportedType } from '../../../common/models/index';

export interface ProperRequesterOptions {
  type: SupportedType;
  host: string;
  retry?: number;
  timeout?: number;
  verbose?: boolean;
  concurrentLimit?: number;

  // Specific to type 'druid'
  druidRequestDecorator?: DruidRequestDecorator;

  // Specific to SQL drivers
  database?: string;
  user?: string;
  password?: string;
}

export function properRequesterFactory(options: ProperRequesterOptions): Requester.PlywoodRequester<any> {
  var {
    type,
    host,
    retry,
    timeout,
    verbose,
    concurrentLimit
  } = options;

  var requester: Requester.PlywoodRequester<any>;

  switch (type) {
    case 'druid':
      requester = druidRequesterFactory({
        host,
        timeout: timeout || 30000,
        requestDecorator: options.druidRequestDecorator
      });
      break;

    case 'mysql':
      requester = mySqlRequesterFactory({
        host,
        database: options.database,
        user: options.user,
        password: options.password
      });
      break;

    case 'postgres':
      requester = postgresRequesterFactory({
        host,
        database: options.database,
        user: options.user,
        password: options.password
      });
      break;

    default:
      throw new Error(`unknown requester type ${type}`);
  }

  if (retry) {
    requester = retryRequesterFactory({
      requester: requester,
      retry: retry,
      delay: 500,
      retryOnTimeout: false
    });
  }

  if (verbose) {
    requester = verboseRequesterFactory({
      requester: requester
    });
  }

  if (concurrentLimit) {
    requester = concurrentLimitRequesterFactory({
      requester: requester,
      concurrentLimit: concurrentLimit
    });
  }

  return requester;
}
