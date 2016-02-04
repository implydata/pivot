'use strict';
require('./fancy-drag-indicator.css');

import { List } from 'immutable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SvgIcon } from '../svg-icon/svg-icon';
import { $, Expression, Executor, Dataset } from 'plywood';
import { CORE_ITEM_WIDTH, CORE_ITEM_GAP } from '../../config/constants';
import { Stage, CubeEssence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
// import { SomeComp } from '../some-comp/some-comp';

export interface FancyDragIndicatorProps extends React.Props<any> {
  dragInsertPosition: number;
  dragReplacePosition: number;
}

export interface FancyDragIndicatorState {
}

export class FancyDragIndicator extends React.Component<FancyDragIndicatorProps, FancyDragIndicatorState> {

  constructor() {
    super();
    // this.state = {};

  }

  render() {
    var { dragInsertPosition, dragReplacePosition } = this.props;

    const sectionWidth = CORE_ITEM_WIDTH + CORE_ITEM_GAP;

    let ghostArrowLeft: number;
    if (dragInsertPosition !== null) {
      ghostArrowLeft = dragInsertPosition * sectionWidth - CORE_ITEM_GAP / 2;
    } else {
      ghostArrowLeft = dragReplacePosition * sectionWidth + CORE_ITEM_WIDTH / 2;
    }

    var dragGhostElement: JSX.Element = null;
    if (dragReplacePosition !== null) {
      let left = dragReplacePosition * sectionWidth;
      dragGhostElement = <div className="drag-ghost-element" style={{left: left}}></div>;
    }

    return <div className="fancy-drag-indicator">
      {dragGhostElement}
      <SvgIcon className="drag-ghost-arrow" svg={require('../../icons/drag-arrow.svg')} style={{left: ghostArrowLeft}}/>
    </div>;
  }
}
