require('./dimension-tile-show-more.css');

import * as React from 'react';
import { Fn } from "../../../common/utils/general/general";
import { BubbleMenu } from '../bubble-menu/bubble-menu';

import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';

export interface DimensionTileShowMoreProps extends React.Props<any> {
  openOn: Element;
  onClose: Fn;
}

export interface DimensionTileShowMoreState {
}

export class DimensionTileShowMore extends React.Component<DimensionTileShowMoreProps, DimensionTileShowMoreState> {
  constructor() {
    super();
  }

  render() {
    const { openOn, onClose, children } = this.props;
    var stage = Stage.fromSize(240, 200);

    return <BubbleMenu
      direction="down"
      openOn={openOn}
      onClose={onClose}
      stage={stage}
      className="dimension-tile-show-more"
    >
      <ul className="bubble-list"> {children} </ul>
    </BubbleMenu>;
  }
}
