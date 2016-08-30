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

require('./data-cubes.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';

import { AppSettings, Cluster, DataCube} from '../../../../common/models/index';

import { SimpleTable, SimpleTableColumn, SimpleTableAction, SvgIcon, FormLabel, Button, Notifier } from '../../../components/index';

export interface DataCubesProps extends React.Props<any> {
  settings?: AppSettings;
  onSave?: (settings: AppSettings, message?: string) => void;
}

export interface DataCubesState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
}

export class DataCubes extends React.Component<DataCubesProps, DataCubesState> {
  constructor() {
    super();

    this.state = {};
  }

  componentWillReceiveProps(nextProps: DataCubesProps) {
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings,
      hasChanged: false
    });
  }

  editDataCube(dataCube: DataCube) {
    window.location.hash += `/${dataCube.name}`;
  }

  removeDataCube(dataCube: DataCube) {
    const remove = () => {
      this.props.onSave(this.state.newSettings.deleteDataCube(dataCube.name), 'Date cube removed');
      Notifier.removeQuestion();
    };

    const cancel = () => {
      Notifier.removeQuestion();
    };

    Notifier.ask({
      title: 'Remove this data cube',
      message: [
        `Are you sure you would like to delete the data cube "${dataCube.title}"?`,
        'This action is not reversible.'
      ],
      choices: [
        {label: 'Remove', callback: remove, type: 'warn'},
        {label: 'Cancel', callback: cancel, type: 'secondary'}
      ],
      onClose: Notifier.removeQuestion
    });
  }

  startSeed() {
    window.location.hash += '/new-data-cube';
  }

  renderEmpty(): JSX.Element {
    return <div className="data-cubes empty">
      <div className="title">No data cubes</div>
      <div className="subtitle actionable" onClick={this.startSeed.bind(this)}>Create a new data cube</div>
    </div>;
  }

  render() {
    const { newSettings } = this.state;

    if (!newSettings) return null;

    if (!newSettings.dataCubes.length) return this.renderEmpty();

    const columns: SimpleTableColumn[] = [
      {label: 'Title', field: 'title', width: 170, cellIcon: require(`../../../icons/full-cube.svg`) },
      {label: 'Source', field: 'source', width: 400},
      {label: 'Dimensions', field: (cube: DataCube) => cube.dimensions.size, width: 120},
      {label: 'Measures', field: (cube: DataCube) => cube.measures.size, width: 80}
    ];

    const actions: SimpleTableAction[] = [
      {icon: require(`../../../icons/full-edit.svg`), callback: this.editDataCube.bind(this)},
      {icon: require(`../../../icons/full-remove.svg`), callback: this.removeDataCube.bind(this)}
    ];

    return <div className="data-cubes">
      <div className="title-bar">
        <div className="title">Data Cubes</div>
        <Button className="save" title="Create new data cube" type="primary" onClick={this.startSeed.bind(this)}/>
      </div>
      <div className="content">
        <SimpleTable
          columns={columns}
          rows={newSettings.dataCubes}
          actions={actions}
          onRowClick={this.editDataCube.bind(this)}
        />
      </div>
    </div>;
  }
}
