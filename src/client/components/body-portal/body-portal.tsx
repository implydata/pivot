'use strict';
require('./body-portal.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { CubeEssence, Filter, Dimension, Measure } from '../../../common/models/index';

export interface BodyPortalProps extends React.Props<any> {
  left?: number;
  top?: number;
  fullSize?: boolean;
  disablePointerEvents?: boolean;
}

export interface BodyPortalState {
}

export class BodyPortal extends React.Component<BodyPortalProps, BodyPortalState> {
  private target: any = null; // HTMLElement, a div that is appended to the body
  private component: React.DOMComponent<any> = null; // ReactElement, which is mounted on the target

  constructor() {
    super();
    // this.state = {};
  }

  position() {
    var { left, top } = this.props;
    if (typeof left === 'number') {
      this.target.style.left = Math.round(left) + 'px';
    }
    if (typeof top === 'number') {
      this.target.style.top = Math.round(top) + 'px';
    }
  }

  componentDidMount() {
    var { fullSize, disablePointerEvents } = this.props;
    var newDiv = document.createElement('div');
    newDiv.className = 'body-portal' + (fullSize ? ' full-size' : '') + (disablePointerEvents ? '' : ' pointer-events');
    this.target = document.body.appendChild(newDiv);
    this.position();
    this.component = ReactDOM.render(this.props.children as any, this.target);
  }

  componentDidUpdate() {
    this.position();
    this.component = ReactDOM.render(this.props.children as any, this.target);
  }

  componentWillUnmount() {
    ReactDOM.unmountComponentAtNode(this.target);
    document.body.removeChild(this.target);
  }

  render(): React.ReactElement<BodyPortalProps> {
    return null;
  }
}
