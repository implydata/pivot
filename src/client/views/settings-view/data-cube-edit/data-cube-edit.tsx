require('./data-cube-edit.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { firstUp } from '../../../utils/string/string';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';

import { AppSettings, Cluster, DataSource} from '../../../../common/models/index';

import { SimpleList, SimpleListColumn, SimpleListAction } from '../../../components/simple-list/simple-list';

export interface DataCubeEditProps extends React.Props<any> {
  settings?: AppSettings;
  cubeId?: string;
  tab?: string;
}

export interface DataCubeEditState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
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
      hasChanged: false
    });
  }

  selectTab(tab: string) {
    var hash = window.location.hash.split('/');
    hash.splice(-1);
    window.location.hash = hash.join('/') + '/' + tab;
  }

  renderTabs(activeTab: string): JSX.Element[] {
    return TABS.map(({label, value}) => {
      return <Button
        className={classNames({active: activeTab === value})}
        title={label}
        type="secondary"
        key={value}
        onClick={this.selectTab.bind(this, value)}
      />;
    });
  }

  render() {
    const { cubeId, tab } = this.props;

    return <div className="data-cube-edit">
      <div className="tabs">
        {this.renderTabs(tab)}
      </div>
      <div className="content">
        {cubeId}
      </div>
    </div>;
  }
}
