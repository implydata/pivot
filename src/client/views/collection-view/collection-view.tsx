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
import { Collection, User, Customization, CollectionItem } from '../../../common/models/index';
import { Fn } from '../../../common/utils/general/general';

import { replaceHash } from '../../utils/url/url';

import { HomeHeaderBar } from '../../components/home-header-bar/home-header-bar';
import { Router, Route } from '../../components/router/router';

import { CollectionOverview } from './collection-overview/collection-overview';
import { CollectionItemLightbox } from './collection-item-lightbox/collection-item-lightbox';


export interface CollectionViewProps extends React.Props<any> {
  collections: Collection[];
  user?: User;
  onNavClick?: Fn;
  customization?: Customization;
}

export interface CollectionViewState {
  title?: string;
}

export class CollectionView extends React.Component<CollectionViewProps, CollectionViewState> {
  constructor() {
    super();
    this.state = {};
  }

  onURLChange(crumbs: string[]) {
    const { collections } = this.props;

    if (crumbs.length === 0) {
      replaceHash(`#collection/${collections[0].name}`);
      return;
    }

    const collection = collections.filter(({name}) => name === crumbs[0])[0];

    this.setState({
      title: collection ? collection.title : ''
    });
  }

  render() {
    const { user, collections, customization, onNavClick } = this.props;
    const { title } = this.state;

    return <div className="collection-view">
      <HomeHeaderBar
        user={user}
        onNavClick={onNavClick}
        customization={customization}
        title={title}
      />

     <div className="main-panel">
       <Router onURLChange={this.onURLChange.bind(this)} rootFragment="collection">
         <Route fragment=":collectionId" alwaysShowOrphans={true}>
           <CollectionOverview collections={collections}/>

           <Route fragment=":itemId">
             <CollectionItemLightbox collections={collections}/>
           </Route>

         </Route>

       </Router>
     </div>

    </div>;
  }
}
