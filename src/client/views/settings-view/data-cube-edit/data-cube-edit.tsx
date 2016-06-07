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
}

export interface DataCubeEditState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
}

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


  render() {
    return <div className="data-cube-edit">
      {this.props.cubeId}
    </div>;
  }
}
