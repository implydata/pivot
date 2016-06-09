require('./data-cube-edit.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { firstUp } from '../../../utils/string/string';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';

import { AppSettings, Cluster, DataSource} from '../../../../common/models/index';

import { SimpleList } from '../../../components/simple-list/simple-list';

export interface DataCubeEditProps extends React.Props<any> {
  settings?: AppSettings;
  cubeId?: string;
  tab?: string;
}

export interface DataCubeEditState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
  cube?: DataSource;
}

const TABS = [
  {label: 'General', value: 'general'},
  {label: 'Dimensions', value: 'dimensions'},
  {label: 'Measures', value: 'measures'}
];

export class DataCubeEdit extends React.Component<DataCubeEditProps, DataCubeEditState> {
  constructor() {
    super();

    this.state = {hasChanged: false};
  }

  componentWillReceiveProps(nextProps: DataCubeEditProps) {
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings,
      hasChanged: false,
      cube: nextProps.settings.dataSources.filter((d) => d.name === nextProps.cubeId)[0]
    });
  }

  selectTab(tab: string) {
    var hash = window.location.hash.split('/');
    hash.splice(-1);
    window.location.hash = hash.join('/') + '/' + tab;
  }

  renderTabs(activeTab: string): JSX.Element[] {
    return TABS.map(({label, value}) => {
      return <button
        className={classNames({active: activeTab === value})}
        key={value}
        onClick={this.selectTab.bind(this, value)}
      >{label}</button>;
    });
  }

  save() {

  }

  goBack() {
    const { cubeId, tab } = this.props;
    var hash = window.location.hash;
    window.location.hash = hash.replace(`/${cubeId}/${tab}`, '');
  }

  editDimension(index: number) {

  }

  deleteDimension(index: number) {

  }

  render() {
    const { cubeId, tab } = this.props;
    const { cube, hasChanged } = this.state;

    if (!cube) return null;

    const rows = cube.dimensions.toArray().map((dimension) => {
      return {
        title: dimension.title,
        description: dimension.expression.toString(),
        icon: `dim-${dimension.kind}`
      };
    });

    return <div className="data-cube-edit">
      <div className="title-bar">
        <button className="button back" onClick={this.goBack.bind(this)}>
          <SvgIcon svg={require('../../../icons/full-back-brand.svg')}/>
        </button>
        <div className="title">{cube.title}</div>
        {hasChanged ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
      </div>
      <div className="content">
        <div className="tabs">
          {this.renderTabs(tab)}
        </div>
        <div className="tab-content">
          <SimpleList
            rows={rows}
            onEdit={this.editDimension.bind(this)}
            onRemove={this.deleteDimension.bind(this)}
          />
        </div>
      </div>

    </div>;
  }
}
