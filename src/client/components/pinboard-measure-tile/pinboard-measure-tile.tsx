'use strict';
require('./pinboard-measure-tile.css');

import { List } from 'immutable';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ply, $, Expression, Executor, Dataset } from 'plywood';
import { Stage, CubeEssence, DataSource, Filter, Dimension, Measure, SortOn } from '../../../common/models/index';
// import { ... } from '../../config/constants';
import { Dropdown, DropdownProps } from '../dropdown/dropdown';

export interface PinboardMeasureTileProps extends React.Props<any> {
  essence: CubeEssence;
  title: string;
  dimension?: Dimension;
  sortOn: SortOn;
  onSelect: Function;
}

export interface PinboardMeasureTileState {
}

export class PinboardMeasureTile extends React.Component<PinboardMeasureTileProps, PinboardMeasureTileState> {
  constructor() {
    super();
    //this.state = {
    //};
  }

  render() {
    var { essence, title, dimension, sortOn, onSelect } = this.props;

    var sortOns = (dimension ? [SortOn.fromDimension(dimension)] : []).concat(
      essence.dataSource.measures.toArray().map(SortOn.fromMeasure)
    );

    var dropdown = React.createElement(Dropdown, {
      items: sortOns,
      selectedItem: sortOn,
      equal: SortOn.equal,
      renderItem: SortOn.getTitle,
      keyItem: SortOn.getName,
      onSelect: onSelect
    } as DropdownProps<SortOn>);

    return <div className="pinboard-measure-tile">
      <div className="title">{title}</div>
      {dropdown}
    </div>;
  }
}
