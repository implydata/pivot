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

require('./collection-item-card.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';

import { Collection, CollectionItem, VisualizationProps, Stage, Essence } from '../../../../common/models/index';

import { getVisualizationComponent } from '../../../visualizations/index';

export interface CollectionItemCardProps extends React.Props<any> {
  item: CollectionItem;
  onExpand?: (item: CollectionItem) => void;
}

export type DeviceSize = 'small' | 'medium' | 'large';

export interface CollectionItemCardState {
  visualizationStage?: Stage;
  deviceSize?: DeviceSize;
}

export class CollectionItemCard extends React.Component<CollectionItemCardProps, CollectionItemCardState> {
  constructor() {
    super();

    this.state = {};

    this.globalResizeListener = this.globalResizeListener.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.globalResizeListener);
    this.globalResizeListener();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.globalResizeListener);
  }

  globalResizeListener() {
    var { visualization } = this.refs;
    var visualizationDOM = ReactDOM.findDOMNode(visualization);

    if (!visualizationDOM) return;

    let deviceSize: DeviceSize = 'large';
    if (window.innerWidth <= 1250) deviceSize = 'medium';
    if (window.innerWidth <= 1080) deviceSize = 'small';

    this.setState({
      deviceSize,
      visualizationStage: Stage.fromClientRect(visualizationDOM.getBoundingClientRect())
    });
  }

  expand() {
    const { onExpand, item } = this.props;

    if (!onExpand) return;

    onExpand(item);
  }

  render() {
    const { item } = this.props;
    const { visualizationStage } = this.state;

    if (!item) return null;

    var { essence } = item;

    var visElement: JSX.Element = null;
    if (essence.visResolve.isReady() && visualizationStage) {

      // Forcing single measure mode
      if (essence.getEffectiveMultiMeasureMode()) {
        essence = essence.toggleMultiMeasureMode();
      }

      var visProps: VisualizationProps = {
        clicker: {},
        essence,
        stage: visualizationStage
      };

      visElement = React.createElement(getVisualizationComponent(essence.visualization), visProps);
    }

    return <div className="collection-item-card">
        <div className="headband grid-row">
          <div className="grid-col-80 vertical">
            <div className="title">{item.title}</div>
            <div className="description">{item.description}</div>
          </div>
          <div className="grid-col-20 middle right">
            <div
              className="expand-button"
              onClick={this.expand.bind(this)}
            >
              <SvgIcon svg={require(`../../../icons/full-expand.svg`)}/>
            </div>
          </div>
        </div>
        <div className="content" ref="visualization">
          {visElement}
        </div>
    </div>;
  }
}
