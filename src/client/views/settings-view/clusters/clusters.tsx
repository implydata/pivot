require('./clusters.css');

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

  save() {
    if (this.props.onSave) {
      this.props.onSave(this.state.newSettings);
    }
  }

  edit(cluster: Cluster) {

  }

  render() {
    const { hasChanged, newSettings } = this.state;

    if (!newSettings) return null;

    const columns: SimpleListColumn[] = [
      {label: 'Name', field: 'name', width: 400, cellIcon: 'cluster-grey'},
      {label: 'Host', field: 'host', width: 400},
      {label: 'Strategy', field: 'introspectionStrategy', width: 300}
    ];

    const actions: SimpleListAction[] = [
      {icon: 'full-edit-brand', callback: this.edit.bind(this)}
    ];

    return <div className="clusters">
      <div className="title-bar">
        <div className="title">Clusters</div>
        {hasChanged ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
      </div>
      <div className="content">
      <SimpleList
        columns={columns}
        rows={newSettings.clusters}
        actions={actions}
      ></SimpleList>
      </div>
    </div>;
  }
}
