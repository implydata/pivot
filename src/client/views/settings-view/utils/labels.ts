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

export const CLUSTER_EDIT = {
  type: {
    label: 'Type',
    help: 'The database type of the cluster',
    error: ''
  },
  host: {
    label: 'Host',
    help: 'The host (hostname:port) of the cluster. In the Druid case this must be the broker.',
    error: 'An IP address must be compliant with the IPv4 standard. It should look like this: 127.0.0.1:8080'
  },
  version: {
    label: 'Version',
    help: 'The explicit version to use for this cluster. This does not need to be defined ' +
    'as the version will naturally be determined through introspection.',
    error: ''
  },
  timeout: {
    label: 'Timeout',
    help: 'The timeout to set on the queries in ms. Default: 40000',
    error: 'The timeout can only contain numbers. It should look like this: 30000'
  },
  sourceListScan: {
    label: 'Source List Scan',
    help: 'Should the sources of this cluster be automatically scanned and new sources added as data cubes. Default: \'disable\'',
    error: ''
  },
  sourceListRefreshOnLoad: {
    label: 'Source List Refresh On Load',
    help: 'Should the list of sources be reloaded every time that Pivot is ' +
    'loaded. This will put additional load on the data store but will ensure that ' +
    'sources are visible in the UI as soon as they are created.',
    error: 'The refresh interval can only contain numbers. It should look like this: 15000'
  },
  sourceListRefreshInterval: {
    label: 'Source List Refresh Interval',
    help: 'How often should sources be reloaded in ms.',
    error: 'should be a number'
  },
  sourceReintrospectOnLoad: {
    label: 'Source Reintrospect On Load',
    help: 'Should sources be scanned for additional dimensions every time that ' +
    'Pivot is loaded. This will put additional load on the data store but will ' +
    'ensure that dimension are visible in the UI as soon as they are created.',
    error: ''
  },
  sourceReintrospectInterval: {
    label: 'Source Reintrospect Interval',
    help: 'How often should source schema be reloaded in ms.',
    error: 'should be a number'
  },

  // Druid specific
  introspectionStrategy: {
    label: 'Introspection Strategy',
    help: 'The introspection strategy for the Druid external.',
    error: ''
  },

  // PostGres + MySQL specific
  database: {
    label: 'Database',
    help: 'The database to which to connect to.',
    error: ''
  },
  user: {
    label: 'User',
    help: 'The user to connect as. This user needs no permissions other than SELECT.',
    error: ''
  },
  password: {
    label: 'Password',
    help: 'The password to use with the provided user.',
    error: ''
  }
};


export const GENERAL = {
  title: {
    error: 'The title should not be empty',
    help: 'What will appear as the tab\'s title in your browser. Use \'%v\' as a placeholder for Pivot\'s version.'
  },
  timezones: {
    error: 'The timezones should be an array',
    help: 'The possible timezones'
  }
};

export const CUBE_EDIT = {
  title: {
    error: 'The title should not be empty',
    help: 'What will appear as the tab\'s title in your browser. Use \'%v\' as a placeholder for Pivot\'s version.'
  },
  description: {
    error: '',
    help: 'The cube\'s description'
  },
  introspection: {
    error: '',
    help: 'The cube\'s introspection strategy. Default is \'no-autofill\'.'
  },
  clusterName: {
    error: 'The cluster name should not be empty',
    help: 'The cube\'s cluster, really.'
  },
  source: {
    error: 'The source should not be empty',
    help: 'The cube\'s source ?'
  }
};
