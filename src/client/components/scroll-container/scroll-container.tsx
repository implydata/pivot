require('./scroll-container.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
// import { ... } from '../../config/constants';
import { SvgIcon } from '../svg-icon/svg-icon';
import { Fn } from "../../../common/utils/general/general";

export interface ScrollContainerProps extends React.Props<any> {
  onScroll: Fn;
  style?: Lookup<any>;
  ref?: string;
  className?: string;
  onMouseLeave?: Fn;
  onMouseMove?: Fn;
  onClick?: Fn;
}

export interface ScrollContainerState {
}

export class ScrollContainer extends React.Component<ScrollContainerProps, ScrollContainerState> {

  render() {
    const { style, onScroll, onMouseLeave, onMouseMove, onClick } = this.props;
    return <div
      className="scroll-container"
      ref="base"
      onScroll={onScroll.bind(this)}
      onMouseLeave={onMouseLeave ? onMouseLeave.bind(this) : null}
      onMouseMove={onMouseMove ? onMouseMove.bind(this) : null}
      onClick={onClick ? onClick.bind(this) : null}
    >
      <div className="scroller" style={style}></div>
    </div>;
  }
}
