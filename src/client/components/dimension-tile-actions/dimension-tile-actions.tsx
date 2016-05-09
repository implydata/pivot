require('./dimension-tile-actions.css');

import * as React from 'react';
import { Fn } from "../../../common/utils/general/general";
import { BubbleMenu } from '../bubble-menu/bubble-menu';

import { Stage } from '../../../common/models/index';

export interface DimensionTileActionsProps extends React.Props<any> {
  openOn: Element;
  onClose: Fn;
}

export interface DimensionTileActionsState {
}

export class DimensionTileActions extends React.Component<DimensionTileActionsProps, DimensionTileActionsState> {
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
      className="dimension-tile-actions"
    >
      <ul className="bubble-list">{children}</ul>
    </BubbleMenu>;
  }
}
