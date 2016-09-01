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

import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class-tester';

import { Cluster } from './cluster';

describe('Cluster', () => {
  it('is an immutable class', () => {
    testImmutableClass(Cluster, [
      {
        name: 'my-druid-cluster',
        title: 'my-druid-cluster',
        type: 'druid'
      },
      {
        name: 'my-druid-cluster',
        title: 'my-druid-cluster',
        type: 'druid',
        host: '192.168.99.100',
        version: '0.9.1',
        timeout: 30000,
        sourceListScan: 'auto',

        introspectionStrategy: 'segment-metadata-fallback'
      },
      {
        name: 'my-mysql-cluster',
        title: 'my-mysql-cluster',
        type: 'mysql',
        host: '192.168.99.100',
        timeout: 30000,
        sourceListScan: 'auto',

        database: 'datazoo',
        user: 'datazoo-user',
        password: 'koalas'
      },
      {
        name: 'my-mysql-cluster',
        title: 'my-mysql-cluster',
        type: 'druid',
        host: '192.168.99.100',
        timeout: 30000,
        sourceListScan: 'auto'
      }
    ]);
  });

});
