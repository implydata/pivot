require('./number-range-picker.css');

import * as React from 'react';
import { getXFromEvent, clamp } from '../../utils/dom/dom';
import { minToAny, maxToAny, isStartAny, isBeyondMin, isEndAny, isBeyondMax } from '../../utils/number-range/number-range';

import { RangeHandle } from '../range-handle/range-handle';

export const NUB_SIZE = 16;

function getAdjustedStart(start: number) {
  return start + NUB_SIZE;
}

function getAdjustedEnd(end: number) {
  return end - NUB_SIZE;
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
  min: number;
  max: number;
  rightBound: number;
  offSet: number;
  stepSize: number;
  onRangeStartChange: (n: number) => void;
  onRangeEndChange: (rangeEnd: number) => void;
}

export interface NumberRangePickerState {
  valueAdder?: number;
  dragging?: boolean;
}

export class NumberRangePicker extends React.Component<NumberRangePickerProps, NumberRangePickerState> {
  public mounted: boolean;

  constructor() {
    super();
    this.state = {
      valueAdder: null
    };
  }

  componentWillMount() {
    const { min } = this.props;
    if (min < 0) {
      this.setState({
        valueAdder: Math.abs(min)
      });
    }
  };

  componentWillReceiveProps(nextProps: NumberRangePickerProps) {
    const { min } = nextProps;
    if (min < 0) {
      this.setState({
        valueAdder: Math.abs(min)
      });
    }
  }

  relativePositionToValue(position: number) {
    const { stepSize, rightBound, min, max } = this.props;
    const { valueAdder } = this.state;
    if (position === 0) return minToAny();
    if (position === rightBound) return maxToAny();
    var significantDigits = min - max > 1000 ? 6 : 3;
    return (toSignificanDigits(position * stepSize, significantDigits)) - valueAdder;
  }


  valueToRelativePosition(value: number) {
    const { valueAdder } = this.state;
    const { stepSize } = this.props;

    return (value + valueAdder) / stepSize;
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
    const { start, end, rightBound, stepSize, min, max, offSet } = this.props;
    if (!rightBound || !stepSize || !min || !max) {
      return <div className="number-range-picker" />;
    }
    
    var relativeEnd = end && end < max ? this.valueToRelativePosition(end) : rightBound;
    var adjustedEnd = clamp(getAdjustedEnd(relativeEnd), getAdjustedStart(0), rightBound);
    var positionEnd = getAdjustedEnd(adjustedEnd);

    var positionStart = start ? clamp(this.valueToRelativePosition(start), 0, positionEnd) : 0;

    var rangeBarLeft = { left: 0, width: positionStart };
    var rangeBarMiddle = { left: getAdjustedStartHalf(positionStart), width: adjustedEnd - positionStart };
    var rangeBarRight = { left: adjustedEnd, width: rightBound - adjustedEnd };

    var absoluteRightBound = offSet + rightBound;

    return <div className="number-range-picker">
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
}
