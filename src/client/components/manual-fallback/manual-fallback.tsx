'use strict';
require('./manual-fallback.css');

import { List } from 'immutable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
// import { SvgIcon } from '../svg-icon/svg-icon';
import { $, Expression, Executor, Dataset } from 'plywood';
// import { ... } from '../../config/constants';
import { Stage, CubeClicker, CubeEssence, Resolution, VisStrategy } from '../../../common/models/index';


export interface ManualFallbackProps extends React.Props<any> {
  clicker: CubeClicker;
  essence: CubeEssence;
}

export interface ManualFallbackState {
}

export class ManualFallback extends React.Component<ManualFallbackProps, ManualFallbackState> {

  constructor() {
    super();
    // this.state = {};

  }

  onResolutionClick(resolution: Resolution): void {
    var { clicker } = this.props;
    clicker.changeSplits(resolution.adjustment.splits, VisStrategy.KeepAlways);
  }

  render() {
    var { essence } = this.props;
    var { visResolve } = essence;

    if (!visResolve.isManual()) return null;

    var resolutionItems = visResolve.resolutions.map((resolution, i) => {
      return <li key={i} onClick={this.onResolutionClick.bind(this, resolution)}>{resolution.description}</li>;
    });

    return <div className="manual-fallback">
      <div className="message">{visResolve.message}</div>
      <ul>{resolutionItems}</ul>
    </div>;
  }
}
