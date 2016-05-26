require('./number-filter-menu.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Set, NumberRange, LiteralExpression, $, Dataset, ply } from 'plywood';

import { FilterClause, Clicker, Essence, Filter, Dimension } from '../../../common/models/index';
import { Fn } from '../../../common/utils/general/general';
import { STRINGS } from '../../config/constants';
import { enterKey } from '../../utils/dom/dom';

import { Loader } from '../loader/loader';
import { QueryError } from '../query-error/query-error';
import { Button } from '../button/button';
import { NumberRangePicker } from '../number-range-picker/number-range-picker';

function minToAny(min: number) {
  return min - 1;
}

function maxToAny(max: number) {
  return max + 1;
}

function isStartAny(min: number, start: number) {
  return min && (Math.abs(min) === Math.abs(start) - 1);
}

function isBeyondMin(min: number, start: number) {
  return min && start < min && Math.abs(min - start) > 1;
}

function isEndAny(max: number, end: number) {
  return max && (Math.abs(end) === Math.abs(max) + 1);
}

function isBeyondMax(max: number, end: number) {
  return max && end > max && (Math.abs(end - max)) > 1;
}

export interface MinMaxFunctions {
  minToAny: (n: number) => number;
  maxToAny: (n: number) => number;
  isStartAny: (min: number, start: number) => boolean;
  isBeyondMin: (min: number, start: number) => boolean;
  isEndAny: (n: number, start: number) => boolean;
  isBeyondMax: (min: number, start: number) => boolean;
}

export function startToString(start: number, min: number): string {
  if (isNaN(start)) return `` + start;
  if (isStartAny(min, start)) return STRINGS.any;
  return `` + start;
}

export function endToString(end: number, max: number) {
  if (isNaN(end)) return `` + end;
  if (isEndAny(max, end)) return STRINGS.any;
  return `` + end;
}

export interface NumberFilterMenuProps extends React.Props<any> {
  clicker: Clicker;
  essence: Essence;
  dimension: Dimension;
  onClose: Fn;
}

export interface NumberFilterMenuState {
  leftOffset?: number;
  rightBound?: number;
  min?: number;
  max?: number;
  start?: number;
  startInput?: string;
  end?: number;
  endInput?: string;
  loading?: boolean;
  error?: Error;
}

export class NumberFilterMenu extends React.Component<NumberFilterMenuProps, NumberFilterMenuState> {
  public mounted: boolean;

  constructor() {
    super();
    this.state = {
      leftOffset: null,
      rightBound: null,
      min: null,
      max: null,
      start: null,
      startInput: "",
      end: null,
      endInput: "",
      loading: false,
      error: null
    };

    this.globalKeyDownListener = this.globalKeyDownListener.bind(this);
  }

  constructFilter(): Filter {
    var { essence, dimension } = this.props;
    var { start, end } = this.state;
    var { filter } = essence;

    if ((start !== null || end !== null) && start < end) {
      var newSet = Set.fromJS({ setType: "NUMBER_RANGE", elements: [NumberRange.fromJS({ start, end })] });
      var clause = new FilterClause({
        expression: dimension.expression,
        selection: new LiteralExpression({ type: "SET/NUMBER_RANGE", value: newSet })
      });
      return filter.setClause(clause);
    } else {
      return null;
    }
  }

  componentWillMount() {
    var { essence, dimension } = this.props;
    this.fetchData(essence, dimension);
  }

  fetchData(essence: Essence, dimension: Dimension): void {
    var { dataSource } = essence;
    var filterExpression = essence.getEffectiveFilter(null, dimension).toExpression();
    var valueSet = essence.filter.getLiteralSet(dimension.expression);
    var hasRange = valueSet && valueSet.elements.length !== 0;
    var $main = $('main');
    var query = ply()
      .apply('main', $main.filter(filterExpression))
      .apply('Min', $main.min($(dimension.name)))
      .apply('Max', $main.max($(dimension.name)));
    this.setState({
      loading: true
    });
    dataSource.executor(query)
      .then(
        (dataset: Dataset) => {
          var min = (dataset.data[0]['Min'] as number);
          var max = (dataset.data[0]['Max'] as number);
          var newState: NumberFilterMenuState = {
            min,
            max,
            loading: false
          };

          if (hasRange) {
            var range = valueSet.elements[0];
            var { start, end } = range;
            newState.startInput = startToString(start, min);
            newState.endInput = endToString(end, max);
            newState.start = start;
            newState.end = end;
          } else {
            newState.startInput = STRINGS.any;
            newState.endInput = STRINGS.any;
            newState.start = minToAny(min);
            newState.end = maxToAny(max);
          }

          this.setState(newState);
        },
        (error) => {
          if (!this.mounted) return;
          this.setState({
            loading: false,
            error
          });
        }
      );
  }

  componentDidMount() {
    this.mounted = true;
    var node = ReactDOM.findDOMNode(this.refs['number-filter-menu']);
    var rect =  node.getBoundingClientRect();

    this.setState({ leftOffset: rect.left, rightBound: rect.width });
    window.addEventListener('keydown', this.globalKeyDownListener);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.globalKeyDownListener);
  }

  stringToStart(startInput: string) {
    const { min } = this.state;
    if (startInput === STRINGS.any) return minToAny(min);
    return parseFloat(startInput);
  }

  stringToEnd(endInput: string) {
    const { max } = this.state;
    if (endInput === STRINGS.any) return maxToAny(max);
    return parseFloat(endInput);
  }

  globalKeyDownListener(e: KeyboardEvent) {
    if (enterKey(e)) {
      this.onOkClick();
    }
  }

  onOkClick() {
    if (!this.actionEnabled()) return;
    var { clicker, onClose } = this.props;
    clicker.changeFilter(this.constructFilter());
    onClose();
  }

  onCancelClick() {
    var { onClose } = this.props;
    onClose();
  }

  onRangeInputStartChange(e: KeyboardEvent) {
    const { end } = this.state;
    var startInput = (e.target as HTMLInputElement).value;
    this.setState({ startInput });
    var start = this.stringToStart(startInput);
    if (!isNaN(start) && start < end && start !== null) {
      this.setState({ start });
    }
  }

  onRangeInputEndChange(e: KeyboardEvent) {
    const { start } = this.state;
    var endInput = (e.target as HTMLInputElement).value;
    this.setState({ endInput });
    var end = this.stringToEnd(endInput);

    if (!isNaN(end) && end > start && end !== null) {
      this.setState({ end });
    }
  }

  onRangeStartChange(newStart: number) {
    const { min } = this.state;
    this.setState({ startInput: startToString(newStart, min), start: newStart });
  }

  onRangeEndChange(newEnd: number) {
    const { max } = this.state;
    this.setState({ endInput: endToString(newEnd, max), end: newEnd });
  }

  actionEnabled() {
    var { essence } = this.props;
    return !essence.filter.equals(this.constructFilter()) && Boolean(this.constructFilter());
  }

  render() {
    const { rightBound, leftOffset, endInput, startInput, error, loading, end, start } = this.state;
    const { min, max } = this.state;
    var step =  (max - min) / rightBound;

    return <div className="number-filter-menu" ref="number-filter-menu">
      <div className="side-by-side">
        <div className="group">
          <label className="input-top-label">Min</label>
          <input value={startInput} onChange={this.onRangeInputStartChange.bind(this)} />
        </div>
        <div className="group">
          <label className="input-top-label">Max</label>
          <input value={endInput} onChange={this.onRangeInputEndChange.bind(this)} />
        </div>
      </div>

      <NumberRangePicker
        onRangeEndChange={this.onRangeEndChange.bind(this)}
        onRangeStartChange={this.onRangeStartChange.bind(this)}
        offSet={leftOffset}
        stepSize={step}
        rightBound={rightBound}
        start={start}
        end={end}
        min={min}
        max={max}
        minMaxFunctions={{ minToAny, maxToAny, isStartAny, isBeyondMin, isEndAny, isBeyondMax }}
      />

      {loading ? <Loader/> : null}
      {error ? <QueryError error={error}/> : null}

      <div className="button-bar">
        <Button type="primary" title={STRINGS.ok} onClick={this.onOkClick.bind(this)} disabled={!this.actionEnabled()} />
        <Button type="secondary" title={STRINGS.cancel} onClick={this.onCancelClick.bind(this)} />
      </div>
    </div>;
  }
}
