require('./data-cubes.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { firstUp } from '../../../utils/string/string';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';

import { AppSettings, Cluster, DataSource} from '../../../../common/models/index';

import { SimpleTable, SimpleTableColumn, SimpleTableAction } from '../../../components/simple-table/simple-table';

export interface DataCubesProps extends React.Props<any> {
  settings?: AppSettings;
  onSave?: (settings: AppSettings, message?: string) => void;
}

export interface DataCubesState {
  newSettings?: AppSettings;
}

export class DataCubes extends React.Component<DataCubesProps, DataCubesState> {
  constructor() {
    super();

    this.state = {};
  }

  componentWillReceiveProps(nextProps: DataCubesProps) {
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings
    });
  }

  edit(cube: DataSource) {
    window.location.hash += `/${cube.name}`;
  }

  createCube() {
    var dataSources = this.state.newSettings.dataSources;
    dataSources.push(DataSource.fromJS({
      name: 'new-datacube',
      engine: 'druid',
      source: 'new-source'
    }));

    this.props.onSave(
      this.state.newSettings.changeDataSources(dataSources),
      'Cube added'
    );
  }

  render() {
    const { newSettings } = this.state;

    if (!newSettings) return null;

    const columns: SimpleTableColumn[] = [
      {label: 'Name', field: 'title', width: 170, cellIcon: 'full-cube'},
      {label: 'Source', field: 'source', width: 400},
      {label: 'Dimensions', field: (cube: DataSource) => cube.dimensions.size, width: 120},
      {label: 'Measures', field: (cube: DataSource) => cube.measures.size, width: 80}
    ];

    const actions: SimpleTableAction[] = [
      {icon: 'full-edit', callback: this.edit.bind(this)}
    ];

    return <div className="data-cubes">
      <div className="title-bar">
        <div className="title">Data Cubes</div>
        <Button className="save" title="Add a cube" type="primary" onClick={this.createCube.bind(this)}/>
      </div>
      <div className="content">
      <SimpleTable
        columns={columns}
        rows={newSettings.dataSources}
        actions={actions}
        onRowClick={this.edit.bind(this)}
      ></SimpleTable>
      </div>
    </div>;
  }
}
