require('./measures-tile.css');

import * as React from 'react';

import { STRINGS, PIN_TITLE_HEIGHT, MEASURE_HEIGHT, PIN_PADDING_BOTTOM, MAX_SEARCH_LENGTH } from '../../config/constants';
import { Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
import { classNames } from '../../utils/dom/dom';
import { Checkbox, CheckboxType } from '../checkbox/checkbox';
import { TileHeaderIcon } from '../tile-header/tile-header';
import { HighlightString } from '../highlight-string/highlight-string';
import { SearchableTile } from '../searchable-tile/searchable-tile';

export interface MeasuresTileProps extends React.Props<any> {
  clicker: Clicker;
  essence: Essence;
}

export interface MeasuresTileState {
  showSearch?: boolean;
  searchText?: string;
}

export class MeasuresTile extends React.Component<MeasuresTileProps, MeasuresTileState> {

  constructor() {
    super();
    this.state = {
      showSearch: false,
      searchText: ''
    };
  }

  measureClick(measure: Measure, e: MouseEvent) {
    if (e.altKey && typeof console !== 'undefined') {
      console.log(`Measure: ${measure.name}`);
      console.log(`expression: ${measure.expression.toString()}`);
      return;
    }
    var { clicker } = this.props;
    clicker.toggleEffectiveMeasure(measure);
  }

  toggleSearch() {
    var { showSearch } = this.state;
    this.setState({ showSearch: !showSearch });
    this.onSearchChange('');
  }

  onSearchChange(text: string) {
    var { searchText } = this.state;
    var newSearchText = text.substr(0, MAX_SEARCH_LENGTH);

    if (searchText === newSearchText) return; // nothing to do;

    this.setState({
      searchText: newSearchText
    });
  }

  render() {
    var { clicker, essence } = this.props;
    var { showSearch, searchText } = this.state;
    var { dataSource } = essence;
    var multiMeasureMode = essence.getEffectiveMultiMeasureMode();
    var selectedMeasures = essence.getEffectiveSelectedMeasure();

    var maxHeight = PIN_TITLE_HEIGHT;

    var checkboxType: CheckboxType = multiMeasureMode ? 'check' : 'radio';
    const totalMeasures = dataSource.measures;
    var rowData = totalMeasures.toArray();
    if (searchText) {
      rowData = rowData.filter((r) => {
        return r.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
      });
    }
    var message: JSX.Element = null;
    var rows = rowData.map(measure => {
      var measureName = measure.name;
      var selected = selectedMeasures.has(measureName);
      return <div
        className={classNames('row', { selected })}
        key={measureName}
        onClick={this.measureClick.bind(this, measure)}
      >
        <Checkbox type={checkboxType} selected={selected}/>
        <HighlightString className="label" text={measure.title} highlightText={searchText}/>
      </div>;
    });
    if (searchText && !rows.length) {
      message = <div className="message">{`No ${ STRINGS.measures.toLowerCase() } for "${searchText}"`}</div>;
    }

    maxHeight += (totalMeasures.size + 2) * MEASURE_HEIGHT + PIN_PADDING_BOTTOM;
    const style = {
      flex: totalMeasures.size + 2,
      maxHeight
    };

    var icons: TileHeaderIcon[] = [];

    if (!essence.isFixedMeasureMode()) {
      icons.push({
        name: 'multi',
        onClick: clicker.toggleMultiMeasureMode,
        svg: require('../../icons/full-multi.svg'),
        active: multiMeasureMode
      });
    }

    icons.push({
      name: 'search',
      ref: 'search',
      onClick: this.toggleSearch.bind(this),
      svg: require('../../icons/full-search.svg'),
      active: showSearch
    });

    // More icons to add later
    //{ name: 'more', onClick: null, svg: require('../../icons/full-more-mini.svg') }

    return <SearchableTile
      style={style}
      title={STRINGS.measures}
      toggleChangeFn={this.toggleSearch.bind(this)}
      onSearchChange={this.onSearchChange.bind(this)}
      searchText={searchText}
      showSearch={showSearch}
      icons={icons}
      className='measures-tile'
    >
      <div className="rows">
        { rows }
        { message }
      </div>
    </SearchableTile>;
  };
}

