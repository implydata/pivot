require('./raw-data-modal.css');

import * as React from 'react';
import { List } from 'immutable';
import { $, ply, Expression, Executor, Dataset, Datum, PlyType, PlywoodValue, Set } from 'plywood';
import { Stage, FilterClause, Dimension, Measure, DataSource } from '../../../common/models/index';

import { Fn, makeTitle, hasOwnProperty, setToString } from "../../../common/utils/general/general";
import { formatTimeRange, DisplayYear } from "../../utils/date/date";
import { formatLabel } from "../filter-tile/filter-tile";

import { STRINGS } from '../../config/constants';
import { Modal } from '../modal/modal';
import { Essence } from "../../../common/models/essence/essence";
import { Button } from '../button/button';
import { DownloadButton } from '../download-button/download-button';

import { ScrollContainer } from '../scroll-container/scroll-container';
import { SvgIcon } from '../../components/svg-icon/svg-icon';

import { SEGMENT, SPLIT } from "../../config/constants";
import { SimpleTable, InlineStyle } from '../../components/simple-table/simple-table';


const LIMIT = 100;
const TIME_COL_WIDTH = 170;
const thClassName = "table-header";
const thText = "title-wrap";
const tdClassName = "cell";
const tdText = "cell-value";
const rowClassName = "row";

export interface RawDataModalProps extends React.Props<any> {
  onClose: Fn;
  essence: Essence;
  stage: Stage;
}

export interface RawDataModalState {
  dataset?: Dataset;
  error?: Error;
  loading?: boolean;
  scrollLeft?: number;
  scrollTop?: number;
}

function getColumnWidth(type: string): number {
  switch (type) {
    case 'boolean':
      return 50;
    case 'number':
      return 70;
    default:
      return 100;
  }
}

export class RawDataModal extends React.Component<RawDataModalProps, RawDataModalState> {
  static id = 'table';
  public mounted: boolean;
  public dimensionsWidths: number[];
  public measuresWidths: number[];

  constructor() {
    super();
    this.state = {
      loading: false,
      dataset: null,
      scrollLeft: 0,
      scrollTop: 0,
      error: null
    };
    this.dimensionsWidths = [];
    this.measuresWidths = [];
  }

  componentDidMount() {
    this.mounted = true;
    const { essence } = this.props;
    this.fetchData(essence);
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  fetchData(essence: Essence): void {
    const { dataSource } = essence;
    const $main = $('main');
    const query = $main.filter(essence.getEffectiveFilter(RawDataModal.id).toExpression()).limit(LIMIT);
    this.setState({ loading: true });
    dataSource.executor(query)
      .then(
        (dataset: Dataset) => {
          if (!this.mounted) return;
          this.setState({
            dataset,
            loading: false
          });
        },
        (error: Error) => {
          if (!this.mounted) return;
          this.setState({
            error,
            loading: false
          });
        }
      );
  }

  onScroll(e: UIEvent) {
    const target = e.target as Element;
    this.setState({
      scrollLeft: target.scrollLeft,
      scrollTop: target.scrollTop
    });
  }

  getStringifiedFilters(): List<string> {
    const { essence } = this.props;
    const { dataSource, filter } = essence;
    return filter.clauses.map((clause, i) => {
      const dimension = dataSource.getDimensionByExpression(clause.expression);
      if (!dimension) return null;
      return formatLabel({ dimension, clause, essence, verbose: true });
    }).toList();
  }

  renderFilters(): List<JSX.Element> {
    const stringifiedFilters = this.getStringifiedFilters();
    var filters = stringifiedFilters.map((filter: string, i: number) => {
      return <li className="filter" key={i}>{filter}</li>;
    });
    filters = filters.concat(<li className="filter" key="filter">limit: {LIMIT}</li>);
    return filters.toList();
  }

  renderHeader(): JSX.Element[] {
    const { essence } = this.props;
    const { dataSource } = essence;
    const dimensions = dataSource.dimensions;
    const measures = dataSource.measures;
    const timeAttribute: string = dataSource.timeAttribute.name;
    const timeColStyle = { width: TIME_COL_WIDTH };
    var cols = [ <div className={thClassName} style={timeColStyle} key="time">
      <span className={thText}>
        {makeTitle(timeAttribute)}
      </span>
    </div> ];
    this.dimensionsWidths = [TIME_COL_WIDTH];
    dimensions.map((dimension, i) => {
      if (dimension.name === timeAttribute) return;
      const width = getColumnWidth(dimension.kind);
      const style = { width };
      const key = dimension.title;
      this.dimensionsWidths = this.dimensionsWidths.concat(width);
      cols = cols.concat(<div className={thClassName} style={style} key={i}>
        <div className={thText}>
          {key}
        </div>
      </div>);
    });

    this.measuresWidths = [];
    measures.map((measure, i) => {
      const width = getColumnWidth('number');
      const colStyle = { width };
      this.measuresWidths = this.measuresWidths.concat(width);
      cols = cols.concat(<div className={thClassName} style={colStyle} key={`${measure.name}${i}`}>
        <div className={thText}>
          {makeTitle(measure.name)}
        </div>
      </div>);
    });

    return cols;
  }

  renderRows(dataset: Dataset, scrollTop: number, stage: Stage): JSX.Element[] {
    if (!dataset) return null;
    const { essence } = this.props;
    const { dataSource } = essence;
    const rawData = dataset.data;
    const firstElementToShow = SimpleTable.getFirstElementToShow(scrollTop);
    const lastElementToShow = SimpleTable.getLastElementToShow(rawData.length, scrollTop, stage.height);
    const dimensions = dataSource.dimensions;
    const measures = dataSource.measures;
    const timeAttribute: string = dataSource.timeAttribute.name;
    const rows = rawData.slice(firstElementToShow, lastElementToShow);
    var rowY = firstElementToShow * SimpleTable.ROW_HEIGHT;
    return rows.map((datum: Datum, i: number) => {
      const colStyle = { width: TIME_COL_WIDTH };
      var cols = [ <div className={tdClassName} key="time" style={colStyle}>
        <span className={tdText}>
          { `${new Date(datum[timeAttribute].toString()).toISOString()}` }
        </span>
      </div> ];
      dimensions.map((dimension: Dimension, colNumber: number) => {
        if (dimension.name === timeAttribute) return;
        const colStyle = {
          width: this.dimensionsWidths[colNumber]
        };
        const key = dimension.name;
        const value: PlywoodValue = datum[key];
        var displayValue = value;

        if (Set.isSet(value)) {
          displayValue = setToString(value);
        }

        cols = cols.concat(<div className={tdClassName} key={key} style={colStyle}>
          <span className={tdText}>
            {displayValue}
          </span>
        </div>);
      });
      measures.map((measure: Measure, colNumber: number) => {
        const colStyle = {
          width: this.measuresWidths[colNumber]
        };
        const key = measure.name.toLowerCase();
        cols = cols.concat(<div className={tdClassName} key={key} style={colStyle}>
          <span className={tdText}>
            {`${datum[key]}`}
          </span>
        </div>);
      });

      const rowStyle = { top: rowY };
      rowY += SimpleTable.ROW_HEIGHT;
      return <div className={rowClassName} style={rowStyle} key={i}>{cols}</div>;
    });
  }

  makeFileName(): string {
    const { essence } = this.props;
    const visType = ((essence.visualization as any)['name']).toLowerCase();
    const filters = this.getStringifiedFilters();
    var wordsOnly = "";
    if (filters.size > 2) {
      wordsOnly = `filters-${filters.size}`;
    } else {
      wordsOnly = filters.map((filter) => {
        return filter.toLowerCase().replace(/[^0-9a-z]/gi, '');
      }).join('-');
    }
    const dsName = essence.dataSource.name.toLowerCase().substr(0, 5);
    return `${dsName}-${visType}-${wordsOnly}`;
  }


  render() {
    const { onClose, stage } = this.props;
    const { dataset, loading, scrollTop, scrollLeft, error } = this.state;
    const headerColumns = this.renderHeader();
    const rows = this.renderRows(dataset, scrollTop, stage);
    const dimensionsWidth = this.dimensionsWidths.reduce((p: number, c: number) => {
      return p + c;
    }, 0);
    const measuresWidths = this.measuresWidths.reduce((p: number, c: number) => {
      return p + c;
    }, 0);
    const rowWidth = dimensionsWidth + measuresWidths;

    const title = `${makeTitle(SEGMENT.toLowerCase())} ${STRINGS.rawData} `;
    const dataLength = dataset ? dataset.data.length : 0;
    const bodyHeight = dataLength * SimpleTable.ROW_HEIGHT;

    var horizontalScrollShadowStyle: any = { display: 'none' };
    if (scrollTop) {
      horizontalScrollShadowStyle = {
        width: rowWidth - scrollLeft
      };
    }
    const postRows = <div className="post-body">
      <div className="horizontal-scroll-shadow" style={horizontalScrollShadowStyle}></div>
    </div>;

    const scrollerStyle = SimpleTable.getScrollerStyle(rowWidth, bodyHeight);
    const scrollContainer = <ScrollContainer style={scrollerStyle} onScroll={this.onScroll.bind(this)}/>;
    return <Modal
      className="raw-data-modal"
      title={title}
      onClose={onClose}
    >
      <div className="content">
        <ul className="filters">{this.renderFilters()}</ul>
        <SimpleTable
          scrollLeft={scrollLeft}
          scrollTop={scrollTop}
          loading={loading}
          error={error}
          headerColumns={headerColumns}
          rowWidth={rowWidth}
          rows={rows}
          postRows={postRows}
          scrollContainer={scrollContainer}
          dataLength={dataLength}
        />
        <div className="button-bar">
          <Button type="primary" className="close" onClick={onClose} title={STRINGS.close}/>
          <DownloadButton
            className="secondary"
            fileName={this.makeFileName()}
            fileFormat={DownloadButton.defaultFileFormat}
            dataset={dataset}/>
        </div>
      </div>
    </Modal>;
  }
}

