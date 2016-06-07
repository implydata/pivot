require('./clusters.css');

import { Instance } from 'immutable-class';

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { firstUp } from '../../../utils/string/string';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';

import { AppSettings, Cluster } from '../../../../common/models/index';

import { SimpleList, SimpleListColumn, SimpleListAction } from '../../../components/simple-list/simple-list';

export interface ClustersProps extends React.Props<any> {
  settings?: AppSettings;
  onSave?: (settings: AppSettings) => void;
}

export interface ClustersState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
}

export class Clusters extends React.Component<ClustersProps, ClustersState> {
  constructor() {
    super();

    this.state = {hasChanged: false};
  }

  componentWillReceiveProps(nextProps: ClustersProps) {
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

  edit(cluster: Cluster) {
    console.log(cluster);
  }

  moar(cluster: Cluster) {
    this.edit(cluster);
  }

  render() {
    const { hasChanged, newSettings } = this.state;

    if (!newSettings) return null;

    const columns: SimpleListColumn[] = [
      {label: 'Name', field: 'name', width: 400, cellIcon: 'cluster'},
      {label: 'Host', field: 'host', width: 400},
      {label: 'Strategy', field: 'introspectionStrategy', width: 300}
    ];

    const actions: SimpleListAction[] = [
      {icon: 'full-edit-brand', callback: this.edit.bind(this)},
      {icon: 'full-more-brand', callback: this.moar.bind(this)}
    ];

    var rows = newSettings.clusters;

    // This is for debug purposes only
    for (let i = 0; i < 10; i++) {
      let c = new Cluster(newSettings.clusters[0].valueOf());

      c.name = c.name.split('').sort(() => 0.5 - Math.random()).join('');
      c.introspectionStrategy = c.introspectionStrategy.split('').sort(() => 0.5 - Math.random()).join('');

      rows.push(c);
    }

    return <div className="clusters">
      <div className="title-bar">
        <div className="title">Clusters</div>
        {hasChanged ? <Button title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
      </div>
      <div className="main">
      <SimpleList
        columns={columns}
        rows={rows}
        actions={actions}
      ></SimpleList>
      </div>
    </div>;
  }
}
