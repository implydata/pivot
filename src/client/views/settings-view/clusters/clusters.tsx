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

require('./clusters.css');

import * as React from 'react';

import { Button } from '../../../components/button/button';
import { ClusterSeedModal } from "../../../modals/index";
import { STRINGS } from "../../../config/constants";

import { AppSettings, Cluster, SupportedType } from '../../../../common/models/index';

import { SimpleTable, SimpleTableColumn, SimpleTableAction } from '../../../components/simple-table/simple-table';

export interface ClustersProps extends React.Props<any> {
  settings?: AppSettings;
}

export interface ClustersState {
  newSettings?: AppSettings;
}

export class Clusters extends React.Component<ClustersProps, ClustersState> {
  constructor() {
    super();

    this.state = {};
  }

  componentWillReceiveProps(nextProps: ClustersProps) {
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings
    });
  }

  editCluster(cluster: Cluster) {
    window.location.hash += `/${cluster.name}`;
  }

  startSeed() {
    window.location.hash += '/new-cluster';
  }

  renderEmpty(): JSX.Element {
    return <div className="clusters empty">
      <div className="title">{STRINGS.noClusters}</div>
      <div className="subtitle">Start by <a onClick={this.startSeed.bind(this)}>adding a new cluster</a></div>
    </div>;
  }

  render() {
    const { newSettings } = this.state;
    if (!newSettings) return null;

    if (!newSettings.clusters.length) return this.renderEmpty();

    const columns: SimpleTableColumn[] = [
      {label: 'Name', field: 'name', width: 200, cellIcon: 'full-cluster'},
      {label: 'Host', field: 'host', width: 200},
      {label: 'Strategy', field: 'introspectionStrategy', width: 300}
    ];

    const actions: SimpleTableAction[] = [
      {icon: 'full-edit', callback: this.editCluster.bind(this)}
    ];

    return <div className="clusters">
      <div className="title-bar">
        <div className="title">Clusters</div>
        <Button className="add" title={STRINGS.connectNewCluster} type="primary" onClick={this.startSeed.bind(this)}/>
      </div>
      <div className="content">
        <SimpleTable
          columns={columns}
          rows={newSettings.clusters}
          actions={actions}
          onRowClick={this.editCluster.bind(this)}
        ></SimpleTable>
      </div>
    </div>;
  }
}
