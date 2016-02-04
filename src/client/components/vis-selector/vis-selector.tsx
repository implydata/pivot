'use strict';
require('./vis-selector.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { List } from 'immutable';
import { $, Expression, Executor, Dataset } from 'plywood';
import { findParentWithClass } from '../../utils/dom/dom';
import { SvgIcon } from '../svg-icon/svg-icon';
import { CubeClicker, CubeEssence, Measure, Manifest } from '../../../common/models/index';
import { VisSelectorMenu } from '../vis-selector-menu/vis-selector-menu';

export interface VisSelectorProps extends React.Props<any> {
  clicker: CubeClicker;
  essence: CubeEssence;
}

export interface VisSelectorState {
  menuOpenOn?: Element;
}

export class VisSelector extends React.Component<VisSelectorProps, VisSelectorState> {

  constructor() {
    super();
    this.state = {
      menuOpenOn: null
    };

  }

  openMenu(e: MouseEvent) {
    var { menuOpenOn } = this.state;
    var target = findParentWithClass(e.target as Element, 'vis-selector');
    if (menuOpenOn === target) {
      this.closeMenu();
      return;
    }
    this.setState({
      menuOpenOn: target
    });
  }

  closeMenu() {
    this.setState({
      menuOpenOn: null
    });
  }

  render() {
    var { clicker, essence } = this.props;
    var { menuOpenOn } = this.state;
    var { visualization } = essence;

    var menu: JSX.Element = null;
    if (menuOpenOn) {
      menu = React.createElement(VisSelectorMenu, {
        clicker,
        essence,
        openOn: menuOpenOn,
        onClose: this.closeMenu.bind(this)
      });
    }

    return <div className="vis-selector" onClick={this.openMenu.bind(this)}>
      <div className="vis-item selected">
        <SvgIcon svg={require('../../icons/vis-' + visualization.id + '.svg')}/>
        <div className="vis-title">{visualization.title}</div>
      </div>
      {menu}
    </div>;
  }
}
