require('./number-range-picker.css');

import * as React from 'react';
import { $, Dataset, ply } from 'plywood';

import { Essence, Dimension } from '../../../common/models/index';

import { getXFromEvent, clamp } from '../../utils/dom/dom';
import { minToAny, maxToAny, isStartAny, isBeyondMin, isEndAny, isBeyondMax } from '../../utils/number-range/number-range';

import { Loader } from '../loader/loader';
import { QueryError } from '../query-error/query-error';
import { RangeHandle } from '../range-handle/range-handle';

export const NUB_SIZE = 16;

function getAdjustedStart(start: number) {
  return start + NUB_SIZE;
}

function getAdjustedEnd(end: number) {
  return end && end > NUB_SIZE ? end - NUB_SIZE : 0;
}

function toSignificanDigits(n: number, digits: number) {
  var multiplier = Math.pow(10, digits - Math.floor(Math.log(n) / Math.LN10) - 1);
  return Math.round(n * multiplier) / multiplier;
}

// offset the bar a little because a rectangle at the same position as a circle will peek through
function getAdjustedStartHalf(start: number) {
  return start + NUB_SIZE / 2;
}

export interface NumberRangePickerProps extends React.Props<any> {
  start: number;
  end: number;
  essence: Essence;
  dimension: Dimension;
  rightBound: number;
  offSet: number;
  onRangeStartChange: (n: number) => void;
  onRangeEndChange: (n: number) => void;
}

export interface NumberRangePickerState {
  min?: number;
  max?: number;
  step?: number;
  loading?: boolean;
  error?: any;
}

export class NumberRangePicker extends React.Component<NumberRangePickerProps, NumberRangePickerState> {
  constructor() {
    super();
    this.state = {
      min: null,
      max: null,
      step: null,
      loading: false,
      error: null
    };
  }

  fetchData(essence: Essence, dimension: Dimension, rightBound: number): void {
    var { dataSource } = essence;
    var filterExpression = essence.getEffectiveFilter(null, dimension).toExpression();
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

          this.setState({
            min,
            max,
            loading: false,
            step: (max - min) / rightBound
          });
        },
        (error) => {
          this.setState({
            loading: false,
            error
          });
        }
      );
  }

  componentWillReceiveProps(nextProps: NumberRangePickerProps) {
    var { essence, dimension, rightBound } = this.props;
    var nextEssence = nextProps.essence;
    var nextDimension = nextProps.dimension;
    var nextRightBound = nextProps.rightBound;

    if (
      essence.differentDataSource(nextEssence) ||
      essence.differentEffectiveFilter(nextEssence, null, nextDimension) || !dimension.equals(nextDimension) ||
      nextRightBound && rightBound !== nextRightBound
    ) {
      this.fetchData(nextEssence, nextDimension, nextRightBound);
    }
  }

  relativePositionToValue(position: number) {
    const { rightBound } = this.props;
    const { step, min, max } = this.state;
    if (position === 0) return minToAny();
    if (position === rightBound) return maxToAny();
    var significantDigits = min - max > 1000 ? 6 : 3;
    return (toSignificanDigits(position * step, significantDigits));
  }

  valueToRelativePosition(value: number) {
    const { step } = this.state;
    return (value) / step;
  }

  onLeftBarClick(e: MouseEvent) {
    var newStart = getXFromEvent(e);
    this.updateStart(newStart);
  }

  onRightBarClick(e: MouseEvent) {
    var newEnd = getXFromEvent(e);
    this.updateEnd(newEnd);
  }

  updateStart(absolutePosition: number) {
    const { onRangeStartChange, offSet } = this.props;
    var relativePosition = absolutePosition - offSet;
    var newValue = this.relativePositionToValue(relativePosition);
    onRangeStartChange(newValue);
  }

  updateEnd(absolutePosition: number) {
    const { onRangeEndChange, offSet } = this.props;
    var relativePosition = absolutePosition - offSet;
    var newValue = this.relativePositionToValue(relativePosition);
    onRangeEndChange(newValue);
  }

  render() {
    const { start, end, rightBound, offSet } = this.props;
    const { min, max, loading, error, step } = this.state;

    var content: JSX.Element = null;

    if (rightBound && step) {
      var relativeEnd = end && end < max ? this.valueToRelativePosition(end) : rightBound;
      var adjustedEnd = clamp(getAdjustedEnd(relativeEnd), getAdjustedStart(this.valueToRelativePosition(start)), getAdjustedEnd(rightBound));
      var positionEnd = getAdjustedEnd(adjustedEnd);
      var positionStart = start ? clamp(this.valueToRelativePosition(start), 0, positionEnd) : 0;

      var rangeBarLeft = { left: 0, width: positionStart };
      var rangeBarMiddle = { left: getAdjustedStartHalf(positionStart), width: adjustedEnd - positionStart };
      var rangeBarRight = { left: adjustedEnd, width: rightBound - adjustedEnd };

      var absoluteRightBound = offSet + rightBound;

      content = <div>
        <div className="range-bar left" style={rangeBarLeft} onClick={this.onLeftBarClick.bind(this)} />
        <RangeHandle
          positionLeft={positionStart}
          onChange={this.updateStart.bind(this)}
          isAny={isStartAny(start)}
          isBeyondMin={isBeyondMin(min, start)}
          leftBound={offSet}
          rightBound={offSet + positionEnd}
        />
        <div className="range-bar middle" style={rangeBarMiddle} />
        <RangeHandle
          positionLeft={positionEnd}
          onChange={this.updateEnd.bind(this)}
          isAny={isEndAny(end)}
          isBeyondMax={isBeyondMax(max, end)}
          leftBound={offSet + getAdjustedStart(positionStart)}
          rightBound={absoluteRightBound}
        />
        <div className="range-bar right" style={rangeBarRight} onClick={this.onRightBarClick.bind(this)} />
      </div>;
    }

    return <div className="number-range-picker">
      {content}
      {loading ? <Loader/> : null}
      {error ? <QueryError error={error}/> : null}
    </div>;
  }
}
