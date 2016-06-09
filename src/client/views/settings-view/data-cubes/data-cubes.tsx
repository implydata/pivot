require('./data-cubes.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { firstUp } from '../../../utils/string/string';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';

import { AppSettings, Cluster, DataSource} from '../../../../common/models/index';

import { SimpleList, SimpleListColumn, SimpleListAction } from '../../../components/simple-list/simple-list';

export interface DataCubesProps extends React.Props<any> {
  settings?: AppSettings;
  onSave?: (settings: AppSettings) => void;
}

export interface DataCubesState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
}

export class DataCubes extends React.Component<DataCubesProps, DataCubesState> {
  constructor() {
    super();

    this.state = {hasChanged: false};
  }

  componentWillReceiveProps(nextProps: DataCubesProps) {
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings,
      hasChanged: false
    });
  }

  changeOnPath(path: string, instance: any, newValue: any): any {
    var bits = path.split('.');
    var lastObject = newValue;
    var currentObject: any;

    var getLastObject = () => {
      let o: any = instance;

      for (let i = 0; i < bits.length; i++) {
        o = o[bits[i]];
      }

      return o;
    };

    while (bits.length) {
      let bit = bits.pop();

      currentObject = getLastObject();

      lastObject = currentObject[`change${firstUp(bit)}`](lastObject);
    }

    return lastObject;
  }

  onChange(propertyPath: string, e: KeyboardEvent) {
    const settings: AppSettings = this.props.settings;

    var newValue: any = (e.target as HTMLInputElement).value;
    var newSettings = this.changeOnPath(propertyPath, settings, newValue);

    this.setState({
      newSettings,
      hasChanged: !settings.equals(newSettings)
    });
  }

  save() {
    if (this.props.onSave) {
      this.props.onSave(this.state.newSettings);
    }
  }

  edit(cube: DataSource) {
    window.location.hash += `/${cube.name}`;
  }

  render() {
    const { hasChanged, newSettings } = this.state;

    if (!newSettings) return null;

    const columns: SimpleListColumn[] = [
      {label: 'Name', field: 'title', width: 170, cellIcon: 'full-cube-grey'},
      {label: 'Source', field: 'source', width: 400},
      {label: 'Dimensions', field: (cube: DataSource) => cube.dimensions.size, width: 120},
      {label: 'Measures', field: (cube: DataSource) => cube.measures.size, width: 80}
    ];

    const actions: SimpleListAction[] = [
      {icon: 'full-edit-brand', callback: this.edit.bind(this)}
    ];

    return <div className="data-cubes">
      <div className="title-bar">
        <div className="title">Data Cubes</div>
        {hasChanged ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
      </div>
      <div className="content">
      <SimpleList
        columns={columns}
        rows={newSettings.dataSources}
        actions={actions}
      ></SimpleList>
      </div>
    </div>;
  }
}
