require('./simple-table.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Datum, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
import { SvgIcon } from '../svg-icon/svg-icon';
import { Loader } from '../loader/loader';
import { QueryError } from '../query-error/query-error';
import { Fn } from "../../../common/utils/general/general";

// I am: import { SimpleTable } from '../simple-table/simple-table';

// dynamic inline positioning styles
export interface InlineStyle {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

export interface SimpleTableProps extends React.Props<any> {
  scrollLeft: number;
  scrollTop: number;
  headerColumns: JSX.Element[];
  rowWidth?: number;
  preRows?: JSX.Element;
  dataLength: number;
  rows: JSX.Element[];
  postRows?: JSX.Element;
  scrollContainer?: JSX.Element;
  loading: boolean;
  error: Error;
}

export interface SimpleTableState {

}

export class SimpleTable extends React.Component<SimpleTableProps, SimpleTableState> {
  static HEADER_HEIGHT = 38;
  static ROW_HEIGHT = 30;
  static SPACE_LEFT = 10;
  static SPACE_RIGHT = 10;

  static ROW_PADDING_RIGHT = 50;
  static BODY_PADDING_BOTTOM = 90;

  static getFirstElementToShow(scrollTop: number) {
    return Math.max(0, Math.floor(scrollTop / SimpleTable.ROW_HEIGHT));
  }

  static getLastElementToShow(datasetLength: number, scrollTop: number, visibleHeight: number) {
    return Math.min(datasetLength, Math.ceil((scrollTop + visibleHeight) / SimpleTable.ROW_HEIGHT));
  }

  static getRowStyle(topValue: number): InlineStyle {
    return {
      top: topValue
    };
  }

  static getScrollerStyle(rowWidth: number, bodyHeight: number): InlineStyle {
    return {
      width: SimpleTable.SPACE_LEFT + rowWidth + SimpleTable.SPACE_RIGHT,
      height: SimpleTable.HEADER_HEIGHT + bodyHeight + SimpleTable.BODY_PADDING_BOTTOM
    };
  }

  getHeaderStyle(): InlineStyle {
    const { scrollLeft, rowWidth } = this.props;
    return {
      width: rowWidth,
      left: -scrollLeft
    };
  }

  getBodyStyle(): InlineStyle {
    const { scrollLeft, scrollTop, rowWidth, dataLength} = this.props;
    return {
      left: -scrollLeft,
      top: -scrollTop,
      width: rowWidth,
      height: dataLength * SimpleTable.ROW_HEIGHT
    };
  }

  render() {
    var { headerColumns, preRows, rows, postRows, loading, error, scrollContainer  } = this.props;
    var loader: JSX.Element = null;
    if (loading) {
      loader = <Loader/>;
    }

    var queryError: JSX.Element = null;
    if (error) {
      queryError = <QueryError error={error}/>;
    }

    return <div className="simple-table">
      <div className="header-cont">
        <div className="header" style={this.getHeaderStyle()}>{headerColumns}</div>
      </div>
      { preRows }
      <div className="body-cont">
        <div className="body" style={this.getBodyStyle()}>{rows}</div>
      </div>
      { postRows }
      { scrollContainer }
      { queryError }
      { loader }
    </div>;
  }
}
