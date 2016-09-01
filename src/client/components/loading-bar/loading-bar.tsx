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

require('./loading-bar.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataCube, Filter, Dimension, Measure } from '../../../common/models/index';
import { SvgIcon } from '../index';

// I am: import { LoadingBar } from '../loading-bar/loading-bar';

export interface LoadingBarProps extends React.Props<any> {
  label?: string;
}

export interface LoadingBarState {
}

export class LoadingBar extends React.Component<LoadingBarProps, LoadingBarState> {
  public mounted: boolean;

  constructor() {
    super();
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentWillReceiveProps(nextProps: LoadingBarProps) {

  }

  render() {
    const { label } = this.props;

    return <div className="loading-bar">
      <div className="undetermined">{label}</div>
    </div>;
  }
}
