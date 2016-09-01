/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('./simple-table.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { } from '../../../common/models/index';

import { classNames } from '../../utils/dom/dom';

import { SvgIcon } from '../svg-icon/svg-icon';
import { Scroller, ScrollerPart } from '../scroller/scroller';
import { GlobalEventListener } from '../global-event-listener/global-event-listener';

export interface SimpleTableColumn {
  label: string;
  field: string | ((row: any) => any);
  width: number;
  cellIcon?: string;
  render?: (column: SimpleTableColumn, hovered: boolean) => JSX.Element;
  data?: any;
}

export interface SimpleTableAction {
  icon: string;
  callback: (item: any) => void;
  inEllipsis?: boolean;
}

export interface SimpleTableProps extends React.Props<any> {
  columns: SimpleTableColumn[];
  rows: any[];
  actions?: SimpleTableAction[];
  onRowClick?: (row: any) => void;
  onHeaderClick?: (column: SimpleTableColumn) => boolean;

  headerHeight?: number;
}

export interface SimpleTableState {
  sortColumn?: SimpleTableColumn;
  sortAscending?: boolean;
  hoveredRowIndex?: number;
  hoveredColumnIndex?: number;
  hoveredActionIndex?: number;

  scrollTop?: number;
  scrollLeft?: number;
  viewportHeight?: number;
  viewportWidth?: number;

  columnsPosition?: number[];
}

const ROW_HEIGHT = 42;
const HEADER_HEIGHT = 26;
const ACTION_WIDTH = 30;

export class SimpleTable extends React.Component<SimpleTableProps, SimpleTableState> {
  static defaultProps = {
    actions: [] as SimpleTableAction[],
    headerHeight: HEADER_HEIGHT
  };

  constructor() {
    super();

    this.state = {
      scrollLeft: 0,
      scrollTop: 0
    };
  }

  componentWillReceiveProps(nextProps: SimpleTableProps) {
    this.computeColumnsPositions(nextProps.columns);
  }

  componentDidMount() {
    this.computeColumnsPositions(this.props.columns);
    this.onResize();
  }

  computeColumnsPositions(columns: SimpleTableColumn[]) {
    if (columns) {
      let columnsPosition: number[] = [];

      let cumuledWidth = 0;
      columns.forEach((c, i) => {
        columnsPosition[i] = cumuledWidth;
        cumuledWidth += c.width;
      });

      this.setState({columnsPosition});
    }
  }

  onScroll(scrollTop: number, scrollLeft: number) {
    if (this.state.scrollLeft !== scrollLeft || this.state.scrollTop !== scrollTop) {
      this.setState({
        scrollLeft,
        scrollTop
      });
    }
  }

  onResize() {
    const { viewportWidth, viewportHeight } = this.state;

    var node = ReactDOM.findDOMNode(this.refs['scroller']);
    if (!node) return;

    var rect = node.getBoundingClientRect();

    if (viewportHeight !== rect.height || viewportWidth !== rect.width) {
      this.setState({
        viewportHeight: rect.height,
        viewportWidth: rect.width
      });
    }
  }

  renderHeaders(columns: SimpleTableColumn[], sortColumn: SimpleTableColumn, sortAscending: boolean): JSX.Element {
    const { hoveredRowIndex, hoveredColumnIndex } = this.state;

    var items: JSX.Element[] = [];

    for (let i = 0; i < columns.length; i++) {
      let column = columns[i];

      let isHovered = hoveredRowIndex === -1 && i === hoveredColumnIndex;

      if (column.render) {
        items.push(column.render(column, isHovered));
        continue;
      }

      let icon: JSX.Element = null;
      if (sortColumn && sortColumn === column) {
        icon = <SvgIcon
          svg={require('../../icons/sort-arrow.svg')}
          className={`sort-arrow ${sortAscending ? 'ascending' : 'descending'}`}
        />;
      }

      items.push(<div
        className={classNames("header", {hover: isHovered})}
        style={{width: column.width}}
        key={`column-${i}`}
      >{column.label}{icon}</div>);
    }

    return <div className="column-headers">
      {items}
    </div>;
  }

  getIcons(row: any, actions: SimpleTableAction[]): JSX.Element[] {
    if (!actions || !actions.length) return null;

    var items: JSX.Element[] = [];

    for (let i = 0; i < actions.length; i++) {
      let action = actions[i];

      items.push(<div
        className='cell action'
        key={`action-${i}`}
        onClick={action.callback.bind(this, row)}
      ><SvgIcon svg={action.icon}/></div>);
    }

    return items;
  }

  labelizer(column: SimpleTableColumn): (row: any) => any {
    if (typeof column.field === 'string') {
      return (row: any) => '' + row[column.field as string];
    }

    return column.field as (row: any) => any;
  }

  sortRows(rows: any[], sortColumn: SimpleTableColumn, sortAscending: boolean): any[] {
    if (!sortColumn) return rows;

    var labelize = this.labelizer(sortColumn);

    if (sortAscending) {
      return rows.sort((a: any, b: any) => {
        if (labelize(a) < labelize(b)) {
          return -1;
        } else if (labelize(a) > labelize(b)) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    return rows.sort((a: any, b: any) => {
      if (labelize(a) < labelize(b)) {
        return 1;
      } else if (labelize(a) > labelize(b)) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  renderRow(row: any, columns: SimpleTableColumn[], index: number, columnStart: number, columnEnd: number): JSX.Element {
    const { hoveredRowIndex, columnsPosition } = this.state;
    var items: JSX.Element[] = [];

    for (let i = columnStart; i < columnEnd; i++) {
      let col = columns[i];

      let icon = col.cellIcon ? <SvgIcon svg={col.cellIcon}/> : null;

      items.push(<div
        className={classNames('cell', {'has-icon': !!col.cellIcon})}
        style={{width: col.width, left: columnsPosition[i]}}
        key={`cell-${i}`}
      >{icon}{this.labelizer(col)(row)}</div>);
    }

    return <div
      className={classNames('row', {hover: hoveredRowIndex === index})}
      key={`row-${index}`}
      style={{height: ROW_HEIGHT, top: index * ROW_HEIGHT}}
    >
      {items}
    </div>;
  }

  renderRows(rows: any[], columns: SimpleTableColumn[], sortColumn: SimpleTableColumn, sortAscending: boolean): JSX.Element[] {
    if (!rows || !rows.length || !columns || !columns.length) return null;

    const vertical = this.getYBoundaries(rows);
    const horizontal = this.getXBoundaries(columns);

    rows = this.sortRows(rows, sortColumn, sortAscending);

    var items: JSX.Element[] = [];

    for (let i = vertical.start; i < vertical.end; i++) {
      items.push(this.renderRow(rows[i], columns, i, horizontal.start, horizontal.end));
    }

    return items;
  }

  getXBoundaries(columns: SimpleTableColumn[]): {start: number, end: number} {
    const { viewportWidth, scrollLeft } = this.state;
    var headerWidth = 0;
    var start = -1;
    var end = -1;

    const n = columns.length;
    for (let i = 0; i < n; i++) {
      let col = columns[i];

      if (start === -1 && headerWidth + col.width > scrollLeft) {
        start = i;
      }

      if  (end === -1 && headerWidth > scrollLeft + viewportWidth) {
        end = i;
      }

      // To render last column
      if (end === -1 && i === n - 1) {
        end = n;
      }

      if (start !== -1 && end !== -1) break;

      headerWidth += col.width;
    }

    return {start, end};
  }

  getYBoundaries(rows: any[]): {start: number, end: number} {
    const { viewportHeight, scrollTop } = this.state;

    var topIndex = Math.floor(scrollTop / ROW_HEIGHT);

    return {
      start: topIndex,
      end: Math.min(topIndex + Math.ceil(viewportHeight / ROW_HEIGHT), rows.length)
    };
  }

  getLayout(columns: SimpleTableColumn[], rows: any[], actions: SimpleTableAction[]) {
    const width = columns.reduce((a, b) => a + b.width, 0);

    actions = actions || [];

    const directActionsCount = actions.filter((a) => !a.inEllipsis).length;
    const indirectActionsCount = directActionsCount !== actions.length ? 1 : 0;

    return {
      // Inner dimensions
      bodyWidth: width,
      bodyHeight: rows.length * ROW_HEIGHT,

      // Gutters
      top: this.props.headerHeight,
      right: directActionsCount * 30 + indirectActionsCount * 30,
      bottom: 0,
      left: 0
    };
  }

  getDirectActions(actions: SimpleTableAction[]): SimpleTableAction[] {
    return actions.filter((action) => !action.inEllipsis);
  }

  renderActions(rows: any[], actions: SimpleTableAction[]): JSX.Element[] {
    const { hoveredRowIndex, hoveredActionIndex } = this.state;

    const vertical = this.getYBoundaries(rows);

    const directActions = this.getDirectActions(actions);

    var elements: JSX.Element[] = [];

    for (let i = vertical.start; i < vertical.end; i++) {
      let isRowHovered = i === hoveredRowIndex;
      let row = rows[i];

      let icons = directActions.map((action, j) => {
        return <div
          className={classNames('icon', {hover: isRowHovered && j === hoveredActionIndex})}
          key={`icon-${j}`}
          style={{width: ACTION_WIDTH}}
        >
          <SvgIcon svg={action.icon}/>
        </div>;
      });

      elements.push(<div
        className={classNames('row action', {hover: isRowHovered})}
        key={`action-${i}`}
        style={{height: ROW_HEIGHT, top: i * ROW_HEIGHT}}
      >{icons}</div>);
    }

    return elements;
  }

  getRowIndex(y: number): number {
    var rowIndex = -1; // -1 means header

    // Not in the header
    if (y > this.props.headerHeight) {
      rowIndex = Math.floor((y - this.props.headerHeight) / ROW_HEIGHT);
    }

    return rowIndex;
  }

  getActionIndex(x: number, headerWidth: number): number {
    const { actions } = this.props;

    return Math.floor((x - headerWidth) / ACTION_WIDTH);
  }

  getColumnIndex(x: number, headerWidth: number): number {
    if (x >= headerWidth) return -1;

    const { columns } = this.props;

    var columnIndex = 0;
    while ((x -= columns[columnIndex].width) > 0) columnIndex++;

    return columnIndex;
  }

  getHeaderWidth(columns: SimpleTableColumn[]): number {
    return columns.reduce((a, b) => a + b.width, 0);
  }

  onClick(x: number, y: number, part: ScrollerPart) {
    const { columns, rows, actions } = this.props;

    if (part === Scroller.TOP_RIGHT_CORNER) return;

    const headerWidth = this.getHeaderWidth(columns);

    var columnIndex = this.getColumnIndex(x, headerWidth); // -1 means right gutter
    var rowIndex = this.getRowIndex(y); // -1 means header

    if (part === Scroller.RIGHT_GUTTER) {
      let action = actions[this.getActionIndex(x, headerWidth)];
      if (action) {
        this.onActionClick(action, rows[rowIndex]);
        return;
      }
    }

    // Header
    if (part === Scroller.TOP_GUTTER) {
      this.onHeaderClick(columns[columnIndex]);
      return;
    }

    this.onCellClick(rows[rowIndex], columns[columnIndex]);
  }

  onCellClick(row: any, column: SimpleTableColumn) {
    if (this.props.onRowClick && row) {
      this.props.onRowClick(row);
    }
  }

  onHeaderClick(column: SimpleTableColumn) {
    if (this.props.onHeaderClick) {
      let shouldSort = this.props.onHeaderClick(column);
      if (!shouldSort) return;
    }

    this.setState({
      sortColumn: column,
      sortAscending: this.state.sortColumn === column ? !this.state.sortAscending : true
    });
  }

  onActionClick(action: SimpleTableAction, row: any) {
    action.callback(row);
  }

  onMouseMove(x: number, y: number, part: ScrollerPart) {
    const { rows, columns } = this.props;
    const headerWidth = this.getHeaderWidth(columns);

    var rowIndex = this.getRowIndex(y);
    var columnIndex = this.getColumnIndex(x, headerWidth);

    this.setState({
      hoveredColumnIndex: columnIndex,
      hoveredRowIndex: rowIndex > rows.length ? undefined : rowIndex,
      hoveredActionIndex: part === Scroller.RIGHT_GUTTER ? this.getActionIndex(x, headerWidth) : undefined
    });
  }

  onMouseLeave() {
    this.setState({
      hoveredRowIndex: undefined,
      hoveredColumnIndex: undefined,
      hoveredActionIndex: undefined
    });
  }

  render() {
    const { columns, rows, actions } = this.props;
    const { sortColumn, sortAscending, hoveredRowIndex } = this.state;

    if (!columns) return null;

    return <div className={classNames("simple-table", {clickable: hoveredRowIndex !== undefined})}>
      <GlobalEventListener resize={this.onResize.bind(this)}/>
      <Scroller
        ref="scroller"
        layout={this.getLayout(columns, rows, actions)}

        topRightCorner={<div></div>} // for styling purposes...
        topGutter={this.renderHeaders(columns, sortColumn, sortAscending)}
        rightGutter={this.renderActions(rows, actions)}

        body={this.renderRows(rows, columns, sortColumn, sortAscending)}

        onClick={this.onClick.bind(this)}
        onMouseMove={this.onMouseMove.bind(this)}
        onMouseLeave={this.onMouseLeave.bind(this)}
        onScroll={this.onScroll.bind(this)}
      />
    </div>;
  }
}
