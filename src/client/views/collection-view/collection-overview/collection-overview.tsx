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

require('./collection-overview.css');

import * as React from 'react';
import * as Qajax from 'qajax';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Collection, User, Customization, CollectionItem } from '../../../../common/models/index';
import { Fn } from '../../../../common/utils/general/general';
import { STRINGS } from '../../../config/constants';

import { classNames } from '../../../utils/dom/dom';
import { Notifier } from '../../../components/notifications/notifications';

import { HomeHeaderBar } from '../../../components/home-header-bar/home-header-bar';
import { Button } from '../../../components/button/button';
import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { Router, Route } from '../../../components/router/router';
import { ButtonGroup } from '../../../components/button-group/button-group';

import { AppSettings, AppSettingsJS } from '../../../../common/models/index';

import { CollectionItemCard } from '../collection-item-card/collection-item-card';
import { CollectionItemLightbox } from '../collection-item-lightbox/collection-item-lightbox';


export interface CollectionOverviewProps extends React.Props<any> {
  collections: Collection[];
  collectionId?: string;
}

export interface CollectionOverviewState {
  collection?: Collection;
}

export class CollectionOverview extends React.Component<CollectionOverviewProps, CollectionOverviewState> {
  constructor() {
    super();
    this.state = {};
  }

  componentWillReceiveProps(nextProps: CollectionOverviewProps) {
    const { collections, collectionId } = nextProps;

    if (collections && collectionId) {
      this.setState({
        collection: collections.filter(({name}) => collectionId === name)[0]
      });
    }
  }

  onExpand(item: CollectionItem) {
    window.location.hash = `#collection/${this.state.collection.name}/${item.name}`;
  }

  renderItem(item: CollectionItem): JSX.Element {
    return <CollectionItemCard item={item} key={item.name} onExpand={this.onExpand.bind(this)}/>;
  }

  render() {
    const { collection } = this.state;

    if (!collection) return null;

    return <div className="collection-overview">
     {collection.items.map(this.renderItem, this)}
     <div className="collection-item-card empty"/>
    </div>;
  }
}
