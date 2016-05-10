require('./dropdown-menu.css');

import * as React from 'react';
import { classNames } from '../../utils/dom/dom';

function simpleEqual(item1: any, item2: any): boolean {
  return item1 === item2;
}

export interface DropdownMenuProps<T> extends React.Props<any> {
  items: T[];
  selectedItem?: T;
  equal?: (item1: T, item2: T) => boolean;
  renderItem?: (item: T) => string;
  keyItem?: (item: T) => string;
  onSelect?: (item: T) => void;
}

export interface DropdownMenuState {
}

export class DropdownMenu<T> extends React.Component<DropdownMenuProps<T>, DropdownMenuState> {

  constructor() {
    super();
  }

  render() {

    var { items, renderItem, keyItem, selectedItem, equal, onSelect } = this.props;
    if (!items || !items.length) return null;
    if (!renderItem) renderItem = String;
    if (!keyItem) keyItem = renderItem;
    if (!equal) equal = simpleEqual;
    var itemElements = items.map((item) => {
      return <div
        className={classNames('dropdown-item', equal(item, selectedItem) ? 'selected' : null)}
        key={keyItem(item)}
        onClick={() => onSelect(item)}
      >
        {renderItem(item)}
      </div>;
    });

    return <div className="dropdown-menu">
      {itemElements}
    </div>;
  }
}
