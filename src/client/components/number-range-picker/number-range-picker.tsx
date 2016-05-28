require('./number-range-picker.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { $, Dataset, ply } from 'plywood';

import { Essence, Dimension } from '../../../common/models/index';

import { getXFromEvent, clamp } from '../../utils/dom/dom';
import { minToAny, maxToAny, isStartAny, isBeyondMin, isEndAny, isBeyondMax, getNumberOfWholeDigits } from '../../utils/number-range/number-range';

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

function getNumberOfDigitsToShow(n: number) {
  // divide n by granularity later?
  var totalDigits = getNumberOfWholeDigits(n);
  return totalDigits > 3 ? Math.min(totalDigits, 4) : 3;
}

function toSignificantDigits(n: number, digits: number) {
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
  onRangeStartChange: (n: number) => void;
  onRangeEndChange: (n: number) => void;
}

export interface NumberRangePickerState {
  leftOffset?: number;
  rightBound?: number;
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

  componentDidMount() {
    var node = ReactDOM.findDOMNode(this.refs['number-range-picker']);
    var rect =  node.getBoundingClientRect();
    var { essence, dimension } = this.props;
    var leftOffset = rect.left;
    var rightBound = rect.width;

    this.setState({ leftOffset, rightBound });
    this.fetchData(essence, dimension, rightBound);

  }

  relativePositionToValue(position: number) {
    const { step, min, max, rightBound } = this.state;
    if (position === 0) return minToAny();
    if (position === rightBound) return maxToAny();

    return (toSignificantDigits(position * step, getNumberOfDigitsToShow(max - min)));
  }

  valueToRelativePosition(value: number) {
    const { step } = this.state;
    return (value) / step;
  }

  onClick(positionStart: number, positionEnd: number, e: MouseEvent) {
    const { leftOffset } = this.state;

    var clickPadding = 5;
    var absoluteX = getXFromEvent(e);
    var relativeX = absoluteX - leftOffset;

    var startNubPosition = getAdjustedStart(positionStart) + clickPadding;
    var endNubPosition = getAdjustedEnd(positionEnd) + clickPadding;

    var isBeforeStart = relativeX < positionStart;
    var isAfterEnd = relativeX > positionEnd + NUB_SIZE;
    var inBetween = (relativeX < positionEnd) && relativeX > startNubPosition;

    if (isBeforeStart) {
      this.updateStart(absoluteX);
    } else if (isAfterEnd) {
      this.updateEnd(absoluteX);
    } else if (inBetween) {

      var distanceFromEnd = endNubPosition - relativeX;
      var distanceFromStart = relativeX - startNubPosition;

      if (distanceFromEnd < distanceFromStart) {
        this.updateEnd(endNubPosition + leftOffset - distanceFromEnd);
      } else {
        this.updateStart(startNubPosition + leftOffset + distanceFromStart);
      }
      return;
    }
  }

  updateStart(absolutePosition: number) {
    const { onRangeStartChange } = this.props;
    const { leftOffset } = this.state;

    var relativePosition = absolutePosition - leftOffset;
    var newValue = this.relativePositionToValue(relativePosition);
    onRangeStartChange(newValue);
  }

  updateEnd(absolutePosition: number) {
    const { onRangeEndChange } = this.props;
    const { leftOffset } = this.state;

    var relativePosition = absolutePosition - leftOffset;
    var newValue = this.relativePositionToValue(relativePosition);
    onRangeEndChange(newValue);
  }

  render() {
    const { start, end } = this.props;
    const { min, max, loading, error, step, rightBound, leftOffset } = this.state;

    var content: JSX.Element = null;

    if (rightBound && step) {
      var relativeEnd = end && end < max ? this.valueToRelativePosition(end) : rightBound;
      var relativeStart = this.valueToRelativePosition(start);
      var adjustedRightBound = getAdjustedEnd(rightBound);

      var positionEnd = clamp(relativeEnd, 0, adjustedRightBound);
      var positionStart = start ? clamp(relativeStart, 0, positionEnd) : 0;

      positionEnd = clamp(positionEnd, getAdjustedStart(positionStart), adjustedRightBound);

      var rangeBarLeft = { left: 0, width: positionStart };
      var rangeBarMiddle = { left: getAdjustedStartHalf(positionStart), width: positionEnd - positionStart };
      var rangeBarRight = { left: positionEnd, width: rightBound - positionEnd };

      var absoluteRightBound = leftOffset + rightBound;

      content = <div className="range-slider" onClick={this.onClick.bind(this, positionStart, positionEnd)}>
        <div className="range-bar left" style={rangeBarLeft} />
        <RangeHandle
          positionLeft={positionStart}
          onChange={this.updateStart.bind(this)}
          isAny={isStartAny(start)}
          isBeyondMin={isBeyondMin(min, start)}
          leftBound={leftOffset}
          rightBound={leftOffset + positionEnd}
          offset={leftOffset}
        />
        <div className="range-bar middle" style={rangeBarMiddle} />
        <RangeHandle
          positionLeft={positionEnd}
          onChange={this.updateEnd.bind(this)}
          isAny={isEndAny(end)}
          isBeyondMax={isBeyondMax(max, end)}
          leftBound={leftOffset + getAdjustedStart(positionStart)}
          rightBound={absoluteRightBound}
          offset={leftOffset}
        />
        <div className="range-bar right" style={rangeBarRight} />
      </div>;
    }

    return <div className="number-range-picker" ref="number-range-picker">
      {content}
      {loading ? <Loader/> : null}
      {error ? <QueryError error={error}/> : null}
    </div>;
  }
}
