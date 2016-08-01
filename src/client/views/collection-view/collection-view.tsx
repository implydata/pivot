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

require('./collection-view.css');

import * as React from 'react';
import * as Qajax from 'qajax';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Collection, User, Customization } from '../../../common/models/index';
import { Fn } from '../../../common/utils/general/general';
import { STRINGS } from '../../config/constants';

import { classNames } from '../../utils/dom/dom';
import { Notifier } from '../../components/notifications/notifications';

import { HomeHeaderBar } from '../../components/home-header-bar/home-header-bar';
import { Button } from '../../components/button/button';
import { SvgIcon } from '../../components/svg-icon/svg-icon';
import { ButtonGroup } from '../../components/button-group/button-group';

import { AppSettings, AppSettingsJS } from '../../../common/models/index';


export interface CollectionViewProps extends React.Props<any> {
  collection: Collection;
  user?: User;
  onNavClick?: Fn;
  customization?: Customization;
}

export interface CollectionViewState {
}

export class CollectionView extends React.Component<CollectionViewProps, CollectionViewState> {
  constructor() {
    super();
    this.state = {
    };
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    const { user, collection, customization, onNavClick } = this.props;

    return <div className="settings-view">
      <HomeHeaderBar
        user={user}
        onNavClick={onNavClick}
        customization={customization}
        title={STRINGS.collections}
      />

     <div className="main-panel">
       {collection.name}
     </div>
    </div>;
  }
}
