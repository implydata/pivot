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

require('./preview-string-filter-menu.css');

import * as React from 'react';
import { $, ply, r, Expression, Executor, Dataset, SortAction, Set, Datum } from 'plywood';
import { Fn } from '../../../common/utils/general/general';
import { STRINGS, MAX_SEARCH_LENGTH, SEARCH_WAIT } from '../../config/constants';
import { Stage, Clicker, Essence, DataCube, Filter, FilterClause, FilterMode, Dimension, Measure, Colors, DragPosition } from '../../../common/models/index';
import { collect } from '../../../common/utils/general/general';
import { enterKey, classNames } from '../../utils/dom/dom';
import { Loader } from '../loader/loader';
import { QueryError } from '../query-error/query-error';
import { HighlightString } from '../highlight-string/highlight-string';
import { Button } from '../button/button';
import { GlobalEventListener } from "../global-event-listener/global-event-listener";

const TOP_N = 100;

function canRegex(input: string): boolean {
  try {
    new RegExp(input);
    return true;
  } catch (e) {
    return false;
  }
}
export interface PreviewStringFilterMenuProps extends React.Props<any> {
  clicker: Clicker;
  dimension: Dimension;
  essence: Essence;
  changePosition: DragPosition;
  onClose: Fn;
  onSelectFilterOption: (option: FilterMode) => void;
  filterMode: FilterMode;
  searchText: string;
  updateSearchText: (t: string) => void;
}

export interface PreviewStringFilterMenuState {
  loading?: boolean;
  dataset?: Dataset;
  error?: any;
  fetchQueued?: boolean;
  colors?: Colors;
}

export class PreviewStringFilterMenu extends React.Component<PreviewStringFilterMenuProps, PreviewStringFilterMenuState> {
  public mounted: boolean;
  public collectTriggerSearch: Fn;

  constructor() {
    super();
    this.state = {
      loading: false,
      dataset: null,
      error: null,
      fetchQueued: false
    };

    this.collectTriggerSearch = collect(SEARCH_WAIT, () => {
      if (!this.mounted) return;
      var { essence, dimension, searchText } = this.props;
      this.fetchData(essence, dimension, searchText);
    });
  }

  fetchData(essence: Essence, dimension: Dimension, searchText: string): void {
    var { dataCube } = essence;
    var nativeCount = dataCube.getMeasure('count');
    var measureExpression = nativeCount ? nativeCount.expression : $('main').count();

    var filterExpression = essence.getEffectiveFilter(null, dimension).toExpression();

    if (searchText) {
      // check for valid regex
      if (canRegex(searchText)) {
        filterExpression = filterExpression.and(dimension.expression.match(searchText));
      }
    }

    var query = $('main')
      .filter(filterExpression)
      .split(dimension.expression, dimension.name)
      .apply('MEASURE', measureExpression)
      .sort($('MEASURE'), SortAction.DESCENDING)
      .limit(TOP_N + 1);

    this.setState({
      loading: true,
      fetchQueued: false
    });
    dataCube.executor(query, { timezone: essence.timezone })
      .then(
        (dataset: Dataset) => {
          if (!this.mounted) return;
          this.setState({
            loading: false,
            dataset,
            error: null
          });
        },
        (error) => {
          if (!this.mounted) return;
          this.setState({
            loading: false,
            dataset: null,
            error
          });
        }
      );
  }

  componentWillMount() {
    var { essence, dimension, searchText } = this.props;
    this.fetchData(essence, dimension, searchText);
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentWillReceiveProps(nextProps: PreviewStringFilterMenuProps) {
    var { essence, dimension, searchText } = this.props;
    const { fetchQueued, loading, dataset } = this.state;
    var nextEssence = nextProps.essence;
    var nextDimension = nextProps.dimension;
    if (
      essence.differentDataCube(nextEssence) ||
      essence.differentEffectiveFilter(nextEssence, null, nextDimension) || !dimension.equals(nextDimension)
    ) {
      this.fetchData(nextEssence, nextDimension, searchText);
    }
    // If the user is just typing in more and there are already < TOP_N results then there is nothing to do
    if (nextProps.searchText.indexOf(searchText) !== -1 && !fetchQueued && !loading && dataset && dataset.data.length < TOP_N) {
      return;
    } else {
      this.setState({
        fetchQueued: true
      });
      this.collectTriggerSearch();
    }
  }

  globalKeyDownListener(e: KeyboardEvent) {
    if (enterKey(e)) {
      this.onOkClick();
    }
  }

  constructFilter(): Filter {
    var { essence, dimension, changePosition, filterMode, searchText } = this.props;
    var { filter } = essence;
    var { expression } = dimension;

    var clause: FilterClause = null;
    if (filterMode === Filter.MATCH && searchText) {
      clause = new FilterClause({
        expression,
        selection: searchText,
        action: 'match'
      });
    }

    if (clause) {
      if (changePosition) {
        if (changePosition.isInsert()) {
          return filter.insertByIndex(changePosition.insert, clause);
        } else {
          return filter.replaceByIndex(changePosition.replace, clause);
        }
      } else {
        return filter.setClause(clause);
      }
    } else {
      return filter.remove(dimension.expression);
    }
  }

  onOkClick() {
    if (!this.actionEnabled()) return;
    var { clicker, onClose } = this.props;
    var { colors } = this.state;
    clicker.changeFilter(this.constructFilter(), colors);
    onClose();
  }

  onCancelClick() {
    var { onClose } = this.props;
    onClose();
  }

  actionEnabled() {
    var { essence } = this.props;
    return !essence.filter.equals(this.constructFilter());
  }

  renderRows() {
    var { loading, dataset, fetchQueued  } = this.state;
    var { dimension, searchText } = this.props;

    var rows: Array<JSX.Element> = [];
    if (dataset) {
      var rowStrings = dataset.data.slice(0, TOP_N).map((d) => d[dimension.name]);

      if (searchText) {
        rowStrings = rowStrings.filter((d) => {
          try {
            var escaped = searchText.replace(/\\[^\\]]/g, '\\\\');
            return new RegExp(escaped, 'g').test(String(d));
          } catch (e) {
            return false;
          }
        });
      }

      rows = rowStrings.map((segmentValue) => {
        var segmentValueStr = String(segmentValue);
        var match = segmentValueStr.match(searchText);
        var highlightText = (searchText && match) ? match.join("") : "";
        return <div
          className="row no-select"
          key={segmentValueStr}
          title={segmentValueStr}
        >
          <div className="row-wrapper">
            <HighlightString className="label" text={segmentValueStr} highlightText={highlightText}/>
          </div>
        </div>;
      });
    }

    var noResultsMsg: JSX.Element = null;
    if (!loading && dataset && !fetchQueued && searchText && !rows.length) {
      noResultsMsg = <div className="message">{'No results for "' + searchText + '"'}</div>;
    }

    return <div className="rows">
        {(rows.length === 0 || !searchText) ? null : <div className="matching-values-message">Matching Values</div>}
        {rows}
        {noResultsMsg}
      </div>;
  }

  render() {
    const { filterMode } = this.props;
    const { dataset, loading, error} = this.state;

    var hasMore = dataset && dataset.data.length > TOP_N;
    return <div className={classNames("string-filter-menu", filterMode)}>
      <GlobalEventListener
        keyDown={this.globalKeyDownListener.bind(this)}
      />
      <div className={classNames('menu-table', hasMore ? 'has-more' : 'no-more')}>
        {this.renderRows()}
        {error ? <QueryError error={error}/> : null}
        {loading ? <Loader/> : null}
      </div>
      <div className="button-bar">
        <Button type="primary" title={STRINGS.ok} onClick={this.onOkClick.bind(this)} disabled={!this.actionEnabled()} />
        <Button type="secondary" title={STRINGS.cancel} onClick={this.onCancelClick.bind(this)} />
      </div>
    </div>;
  }
}
