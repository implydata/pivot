require('./dimension-tile-actions.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Fn } from "../../../common/utils/general/general";
import { Granularity } from '../../../common/models/index';

import { isInside, escapeKey } from '../../utils/dom/dom';
import { DropdownMenu } from '../dropdown-menu/dropdown-menu';

var equalToString = (g1: Granularity, g2: Granularity) => { return g1.toString() === g2.toString(); };

export interface DimensionTileActionsProps extends React.Props<any> {
  onSelect: Fn;
  onClose: Fn;
  openOn: Element;
  selectedItem: Granularity;
  items: Granularity[];
}

export interface DimensionTileActionsState {
}

export class DimensionTileActions extends React.Component<DimensionTileActionsProps, DimensionTileActionsState> {
  constructor() {
    super();

    this.globalMouseDownListener = this.globalMouseDownListener.bind(this);
    this.globalKeyDownListener = this.globalKeyDownListener.bind(this);
  }

  componentDidMount() {
    window.addEventListener('mousedown', this.globalMouseDownListener);
    window.addEventListener('keydown', this.globalKeyDownListener);
  }

  componentWillUnmount() {
    window.removeEventListener('mousedown', this.globalMouseDownListener);
    window.removeEventListener('keydown', this.globalKeyDownListener);
  }

  globalMouseDownListener(e: MouseEvent) {
    const { onClose, openOn } = this.props;
    var myElement = ReactDOM.findDOMNode(this);
    if (!myElement) return;
    var target = e.target as Element;

    if (isInside(target, myElement) || isInside(target, openOn)) return;
    onClose();
  }

  globalKeyDownListener(e: KeyboardEvent) {
    const { onClose } = this.props;
    if (!escapeKey(e)) return;
    onClose();
  }

  renderGranularityDropdown() {
    const { items, selectedItem, onSelect } = this.props;
    return React.createElement(DropdownMenu, {
      items, selectedItem, onSelect, equal: equalToString
    });
  }

  render() {
    return <div className="dimension-tile-actions">{this.renderGranularityDropdown()}</div>;
  }
}

