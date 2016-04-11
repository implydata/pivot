require('./scroll-container.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
// import { ... } from '../../config/constants';
import { SvgIcon } from '../svg-icon/svg-icon';
import { Fn } from "../../../common/utils/general/general";

// I am: import { ScrollContainer } from '../scroll-container/scroll-container';

export interface ScrollContainerProps extends React.Props<any> {
  style?: Lookup<any>;
  className?: string;
  ref?: string;
  onScroll?: Fn;
  onMouseLeave?: Fn;
  onMouseMove?: Fn;
  onClick?: Fn;
}

export interface ScrollContainerState {
}

export class ScrollContainer extends React.Component<ScrollContainerProps, ScrollContainerState> {
  public mounted: boolean;

  constructor() {
    super();
    // this.state = {};

  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

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
