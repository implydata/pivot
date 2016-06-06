require('./pill-overflow.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Q from 'q';

import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
import { CORE_ITEM_GAP } from '../../config/constants';
import { Fn } from '../../../common/utils/general/general';
import { SvgIcon } from '../svg-icon/svg-icon';
import { transformStyle, uniqueId } from '../../utils/dom/dom';
import { BubbleMenu } from '../bubble-menu/bubble-menu';

// I am: import { PillOverflow } from '../pill-overflow/pill-overflow';

export interface PillOverflowProps<T> {
  x: number;
  items: T[];
  overflowMenuOpenOn?: Element;
  renderItemFn?: any;
  //renderItemFn?: (item: T, i: number, pos: number) => JSX.Element;
  onOverflowMenuClose?: Fn;
}

export interface PillOverflowState {
  overflowMenuOpenOn?: Element;
}

export class PillOverflow<T> extends React.Component<PillOverflowProps<T>, PillOverflowState> {
  private overflowMenuId: string;
  private dummyDeferred: Q.Deferred<any>;
  private overflowMenuDeferred: Q.Deferred<Element>;

  public mounted: boolean;

  constructor() {
    super();
    this.overflowMenuId = uniqueId('overflow-menu-');
    this.state = {
      overflowMenuOpenOn: null
    };

  }

  overflowButtonTarget(): Element {
    return ReactDOM.findDOMNode(this.refs['pill-overflow']);
  }

  overflowButtonClick() {
    this.openOverflowMenu(this.overflowButtonTarget());
  };

  openOverflowMenu(target: Element): Q.Promise<any> {
    if (!target) return;
    var { overflowMenuOpenOn } = this.state;

    if (overflowMenuOpenOn === target) {
      this.closeOverflowMenu();
      return;
    }

    this.overflowMenuDeferred = Q.defer() as Q.Deferred<Element>;
    this.setState({ overflowMenuOpenOn: target });
    return this.overflowMenuDeferred.promise;
  }

  closeOverflowMenu() {
    var { overflowMenuOpenOn } = this.state;
    if (!overflowMenuOpenOn) return;
    this.setState({
      overflowMenuOpenOn: null
    });
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentDidUpdate() {
    var { overflowMenuOpenOn } = this.state;

    if (overflowMenuOpenOn) {
      var overflowMenu = this.getOverflowMenu();
      if (overflowMenu) this.overflowMenuDeferred.resolve(overflowMenu);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentWillReceiveProps(nextProps: PillOverflowProps<T>) {

  }

  getOverflowMenu(): Element {
    return document.getElementById(this.overflowMenuId);
  }

  onOverflowMenuClose() {

  }

  renderOverflowMenu(overflowItems: any[]): JSX.Element {
    var { renderItemFn } = this.props;
    var { overflowMenuOpenOn } = this.state;

    if (!overflowMenuOpenOn) return null;

    var segmentHeight = 29 + CORE_ITEM_GAP;

    var itemY = CORE_ITEM_GAP;
    var filterItems = overflowItems.map((item, i) => {
      var style = transformStyle(0, itemY);
      itemY += segmentHeight;
      return renderItemFn(item, style, i);
    });

    return <BubbleMenu
      className="overflow-menu"
      id={this.overflowMenuId}
      direction="down"
      stage={Stage.fromSize(208, itemY)}
      fixedSize={true}
      openOn={overflowMenuOpenOn}
      onClose={this.onOverflowMenuClose.bind(this)}
    >
      {filterItems}
    </BubbleMenu>;  }

  render() {
    const { x, items } = this.props;
    var style = transformStyle(x, 0);

    return <div
      style={style}
      className="pill-overflow"
      ref="pill-overflow"
      onClick={this.overflowButtonClick.bind(this)}
    >
      <div className="count">{'+' + items.length}</div>
      {this.renderOverflowMenu(items)}
    </div>;
  }
}
