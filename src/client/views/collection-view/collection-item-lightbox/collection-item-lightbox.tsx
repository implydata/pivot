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

require('./collection-item-lightbox.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { STRINGS } from '../../../config/constants';
import { isInside, classNames } from '../../../utils/dom/dom';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { GlobalEventListener } from '../../../components/global-event-listener/global-event-listener';
import { BodyPortal } from '../../../components/body-portal/body-portal';
import { GoldenCenter } from '../../../components/golden-center/golden-center';
import { BubbleMenu } from '../../../components/bubble-menu/bubble-menu';

import { Collection, CollectionItem, VisualizationProps, Stage, Essence } from '../../../../common/models/index';

import { getVisualizationComponent } from '../../../visualizations/index';

export interface CollectionItemLightboxProps extends React.Props<any> {
  collections: Collection[];
  collectionId?: string;
  itemId?: string;
}

export interface CollectionItemLightboxState {
  item?: CollectionItem;
  visualizationStage?: Stage;
  editMenuOpen?: boolean;
}

export class CollectionItemLightbox extends React.Component<CollectionItemLightboxProps, CollectionItemLightboxState> {
  constructor() {
    super();

    this.state = {};
  }

  componentWillReceiveProps(nextProps: CollectionItemLightboxProps) {
    const { collections, collectionId, itemId } = nextProps;

    if (collections && collectionId && itemId) {
      let collection = collections.filter(({name}) => name === collectionId)[0];

      if (collection) {
        this.setState({
          item: collection.items.filter(({name}) => itemId === name)[0]
        });
      }
    }
  }

  updateStage() {
    var { visualization } = this.refs;
    var visualizationDOM = ReactDOM.findDOMNode(visualization);

    if (!visualizationDOM) return;

    this.setState({
      visualizationStage: Stage.fromClientRect(visualizationDOM.getBoundingClientRect())
    });
  }

  onExplore() {
    const essence = this.state.item.essence as Essence;
    window.location.hash = '#' + essence.getURL(essence.dataCube.name + '/');
  }

  openEditMenu() {
    this.setState({
      editMenuOpen: !this.state.editMenuOpen
    });
  }

  openMoreMenu() {

  }

  closeModal() {
    window.location.hash = `#collection/${this.props.collectionId}`;
  }

  onEscape() {
    if (this.state.editMenuOpen) return;

    this.closeModal();
  }

  renderEditMenu() {
    var onClose = () => this.setState({editMenuOpen: false});

    return <BubbleMenu
      className="edit-menu"
      direction="down"
      stage={Stage.fromSize(200, 200)}
      openOn={this.refs['edit-button'] as any}
      onClose={onClose}
    >
      <ul className="bubble-list">
        <li className="edit-vizualization">{STRINGS.editVisualization}</li>
        <li className="edit-title-and-desc"><div>{STRINGS.editTitleAndDesc}</div></li>
      </ul>
    </BubbleMenu>;
  }

  onMouseDown(e: MouseEvent) {
    const { editMenuOpen } = this.state;

    const target = e.target as Element;
    const modal = this.refs['modal'] as any;
    const leftArrow = this.refs['left-arrow'] as any;
    const rightArrow = this.refs['right-arrow'] as any;

    if (isInside(target, modal)) return;
    if (isInside(target, leftArrow)) return;
    if (isInside(target, rightArrow)) return;

    if (editMenuOpen) return;

    this.closeModal();
  }

  swipe(direction: number) {
    const { collections, collectionId, itemId } = this.props;
    const { item } = this.state;

    const items = collections.filter(({name}) => name === collectionId)[0].items;

    var newIndex = items.indexOf(item) + direction;

    if (newIndex >= items.length) newIndex = 0;
    if (newIndex < 0) newIndex = items.length - 1;

    window.location.hash = `#collection/${collectionId}/${items[newIndex].name}`;
  }

  render() {
    const { item, visualizationStage, editMenuOpen } = this.state;

    if (!item) return null;

    var { essence } = item;

    var visElement: JSX.Element = null;
    if (essence.visResolve.isReady() && visualizationStage) {
      var visProps: VisualizationProps = {
        clicker: {},
        essence,
        stage: visualizationStage
      };

      visElement = React.createElement(getVisualizationComponent(essence.visualization), visProps);
    }

    return <BodyPortal fullSize={true} onMount={this.updateStage.bind(this)}>
      <div className="collection-item-lightbox">

        <GlobalEventListener
          resize={this.updateStage.bind(this)}
          escape={this.onEscape.bind(this)}
          mouseDown={this.onMouseDown.bind(this)}
          left={this.swipe.bind(this, -1)}
          right={this.swipe.bind(this, 1)}
        />

        <div className="backdrop"/>
        <GoldenCenter>
          <div className="modal-window" ref="modal">
            <div className="headband grid-row">
              <div className="grid-col-70 vertical">
                <div className="title">{item.title}</div>
                <div className="description">{item.description}</div>
              </div>
              <div className="grid-col-30 right middle">
                <div className="explore-button" onClick={this.onExplore.bind(this)}>
                  Explore
                </div>
                <div
                  className={classNames('edit-button', {active: editMenuOpen})}
                  onClick={this.openEditMenu.bind(this)}
                  ref="edit-button"
                >
                  <SvgIcon svg={require(`../../../icons/full-edit.svg`)}/>
                </div>
                <div className="more-button" onClick={this.openMoreMenu.bind(this)}>
                  <SvgIcon svg={require(`../../../icons/full-more.svg`)}/>
                </div>
                <div className="separator"/>
                <div className="close-button" onClick={this.closeModal.bind(this)}>
                  <SvgIcon svg={require(`../../../icons/full-remove.svg`)}/>
                </div>
              </div>
            </div>
            <div className="content" ref="visualization">
              {visElement}
            </div>
          </div>
        </GoldenCenter>
        <div className="left-arrow" onClick={this.swipe.bind(this, -1)} ref="left-arrow">
          <SvgIcon svg={require(`../../../icons/full-caret-left-line.svg`)}/>
        </div>

        <div className="right-arrow" onClick={this.swipe.bind(this, 1)} ref="right-arrow">
          <SvgIcon svg={require(`../../../icons/full-caret-right-line.svg`)}/>
        </div>

        {editMenuOpen ? this.renderEditMenu() : null}
      </div>
    </BodyPortal>;
  }
}
