'use strict';
require('./geo.css');

import { List } from 'immutable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
// import { ... } from '../../config/constants';
import { Stage, CubeEssence, DataSource, Filter, Splits, Dimension, Measure, Colors, VisualizationProps, Resolve } from '../../../common/models/index';
// import { SomeComp } from '../some-comp/some-comp';

export interface GeoState {
}

export class Geo extends React.Component<VisualizationProps, GeoState> {
  static id = 'geo';
  static title = 'Geo';

  static handleCircumstance(dataSource: DataSource, splits: Splits, colors: Colors, current: boolean): Resolve {
    return Resolve.manual(0, 'The Geo visualization is not ready, please select another visualization.', []);
  }

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

  componentWillReceiveProps(nextProps: VisualizationProps) {

  }

  render() {
    return <div className="geo"></div>;
  }
}
