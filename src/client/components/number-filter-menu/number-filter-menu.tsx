require('./number-filter-menu.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Set, NumberRange, LiteralExpression } from 'plywood';

import { FilterClause, Clicker, Essence, Filter, Dimension } from '../../../common/models/index';
import { Fn } from '../../../common/utils/general/general';
import { STRINGS } from '../../config/constants';
import { enterKey } from '../../utils/dom/dom';
import { minToAny, maxToAny, isStartAny, isEndAny } from '../../utils/number-range/number-range';

import { Button } from '../button/button';
import { NumberRangePicker } from '../number-range-picker/number-range-picker';

function startToString(start: number): string {
  if (isStartAny(start)) return STRINGS.any;
  return `` + start;
}

function endToString(end: number) {
  if (isEndAny(end)) return STRINGS.any;
  return `` + end;
}

function stringToStart(startInput: string) {
  if (startInput === STRINGS.any) return minToAny();
  return parseFloat(startInput);
}

function stringToEnd(endInput: string) {
  if (endInput === STRINGS.any) return maxToAny();
  return parseFloat(endInput);
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
  start?: number;
  startInput?: string;
  end?: number;
  endInput?: string;
}

export class NumberFilterMenu extends React.Component<NumberFilterMenuProps, NumberFilterMenuState> {
  public mounted: boolean;

  constructor() {
    super();
    this.state = {
      leftOffset: null,
      rightBound: null,
      start: null,
      startInput: "",
      end: null,
      endInput: ""
    };

    this.globalKeyDownListener = this.globalKeyDownListener.bind(this);
  }

  componentWillMount() {
    var { essence, dimension } = this.props;
    var valueSet = essence.filter.getLiteralSet(dimension.expression);
    var hasRange = valueSet && valueSet.elements.length !== 0;
    var start: number = null;
    var end: number = null;
    if (hasRange) {
      var range = valueSet.elements[0];
      start = range.start;
      end = range.end;
    }

    this.setState({
      startInput: startToString(start),
      endInput: endToString(end),
      start,
      end
    });
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

  constructFilter(): Filter {
    var { essence, dimension } = this.props;
    var { start, end } = this.state;
    var { filter } = essence;

    var validFilter = start !== null || end !== null;

    if (validFilter) {
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

    var start = stringToStart(startInput);
    if (start !== null && start < end || start === null) {
      this.setState({ start });
    }
  }

  onRangeInputEndChange(e: KeyboardEvent) {
    const { start } = this.state;
    var endInput = (e.target as HTMLInputElement).value;
    this.setState({ endInput });

    var end = stringToEnd(endInput);
    if (end !== null && end > start || end === null) {
      this.setState({ end });
    }
  }

  onRangeStartChange(newStart: number) {
    this.setState({ startInput: startToString(newStart), start: newStart });
  }

  onRangeEndChange(newEnd: number) {
    this.setState({ endInput: endToString(newEnd), end: newEnd });
  }

  actionEnabled() {
    var { essence } = this.props;
    return !essence.filter.equals(this.constructFilter()) && Boolean(this.constructFilter());
  }

  render() {
    const { essence, dimension } = this.props;
    const { rightBound, leftOffset, endInput, startInput, end, start } = this.state;

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
        rightBound={rightBound}
        start={start}
        end={end}
        dimension={dimension}
        essence={essence}
      />

      <div className="button-bar">
        <Button type="primary" title={STRINGS.ok} onClick={this.onOkClick.bind(this)} disabled={!this.actionEnabled()} />
        <Button type="secondary" title={STRINGS.cancel} onClick={this.onCancelClick.bind(this)} />
      </div>
    </div>;
  }
}
