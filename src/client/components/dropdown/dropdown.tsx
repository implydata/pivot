require('./dropdown.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SvgIcon } from '../svg-icon/svg-icon';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
import { isInside, escapeKey, classNames } from '../../utils/dom/dom';

function simpleEqual(item1: any, item2: any): boolean {
  return item1 === item2;
}

export interface DropdownProps<T> {
  label?: string;
  items: T[];
  selectedItem?: T;
  equal?: (item1: T, item2: T) => boolean;
  renderItem?: (item: T) => string;
  keyItem?: (item: T) => string;
  onSelect?: (item: T) => void;
  direction?: string;
}

export interface DropdownState {
  open: boolean;
}

export class Dropdown<T> extends React.Component<DropdownProps<T>, DropdownState> {

  constructor() {
    super();
    this.state = {
      open: false
    };

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

  onClick() {
    var { open } = this.state;
    this.setState({ open: !open });
  }

  globalMouseDownListener(e: MouseEvent) {
    var { open } = this.state;
    if (!open) return;

    var myElement = ReactDOM.findDOMNode(this);
    if (!myElement) return;
    var target = e.target as Element;

    if (isInside(target, myElement)) return;
    this.setState({ open: false });
  }

  globalKeyDownListener(e: KeyboardEvent) {
    if (!escapeKey(e)) return;
    var { open } = this.state;
    if (!open) return;
    this.setState({ open: false });
  }

  renderMenu() {
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

  render() {
    var { label, renderItem, selectedItem, direction } = this.props;
    var { open } = this.state;
    if (!renderItem) renderItem = String;
    if (!direction) direction = 'down';

    var labelElement: JSX.Element = null;
    if (label) {
      labelElement = <div className="dropdown-label">{label}</div>;
    }

    return <div className={classNames('dropdown', direction)} onClick={this.onClick.bind(this)}>
      {labelElement}
      <div className="selected-item">{renderItem(selectedItem)}
        <SvgIcon className="caret-icon" svg={require('../../icons/dropdown-caret.svg')}/>
      </div>
      { open ? this.renderMenu() : null }
    </div>;
  }
}
