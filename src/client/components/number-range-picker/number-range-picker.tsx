require('./number-range-picker.css');

import * as React from 'react';
import { RangeHandle } from '../range-handle/range-handle';
import { clamp, getXFromEvent } from '../../utils/dom/dom';

export const NUB_SIZE = 16;

export function getAdjustedEnd(end: number) {
  return end > NUB_SIZE ? end - NUB_SIZE : end;
}

export function getAdjustedStart(start: number) {
  return start + NUB_SIZE;
}

// offset the bar a little because a rectangle at the same position as a circle will peek through
export function getAdjustedStartHalf(start: number) {
  return start + NUB_SIZE / 2;
}

export interface NumberRangePickerProps extends React.Props<any> {
  start?: number;
  end?: number;
  min?: number;
  max?: number;
  rightBound?: number;
  offSet?: number;
  onRangeStartChange?: (n: number) => void;
  onRangeEndChange?: (rangeEnd: number) => void;
  stepSize?: number;
  remainder?: number;
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
    const { start, remainder } = this.props;
    if (start < 0) {
      this.setState({
        valueAdder: Math.abs(start)
      });
    }
  };

  componentWillReceiveProps(nextProps: NumberRangePickerProps) {
    const { end, start, rightBound, remainder } = nextProps;
    var newRightBound = this.relativePositionToValue(rightBound);
    if (start < 0) {
      this.setState({
        valueAdder: Math.abs(start)
      });
    } else if (start > newRightBound && newRightBound > 0) {
      var correction = Math.max(end - start, start);
      this.setState({
        valueAdder: -correction
      });
    }
  }

  relativePositionToValue(position: number) {
    const { stepSize, rightBound } = this.props;
    const { valueAdder } = this.state;
    var relativePosition = (position * stepSize) - valueAdder;
    if (relativePosition === rightBound) {
      return this.props.max + 1;
    }

    return (position * stepSize) - valueAdder;
  }

  valueToRelativePosition(value: number) {
    if (value < 0) return 0;
    const { stepSize } = this.props;
    const { valueAdder } = this.state;
    return (value + valueAdder) / stepSize;
  }

  onLeftBarClick(e: MouseEvent) {
    var newStart = getXFromEvent(e);
    this.updateStart(newStart);
  }

  getValue(value: number, min: number, max: number) {
    return this.relativePositionToValue(clamp(value, min, max));
  }

  onRightBarClick(e: MouseEvent) {
    var newEnd = getXFromEvent(e);
    this.updateEnd(newEnd);
  }

  updateStart(absolutePosition: number) {
    const { onRangeStartChange, end, offSet } = this.props;

    var relativePosition = absolutePosition - offSet;
    var max = getAdjustedEnd(this.valueToRelativePosition(end));
    var newValue = this.getValue(relativePosition, 0, max);
    onRangeStartChange(newValue);
  }

  updateEnd(absolutePosition: number) {
    const { onRangeEndChange, start, rightBound, offSet, max } = this.props;
    var relativePosition = absolutePosition - offSet;
    var min = getAdjustedStart(this.valueToRelativePosition(start));
    var maxPosition = getAdjustedEnd(rightBound);
    var newValue = this.getValue(relativePosition, min, maxPosition);

    if (newValue === getAdjustedEnd(rightBound)) {
      onRangeEndChange(max + 1);
    } else {
      onRangeEndChange(newValue);
    }
  }

  render() {
    const { start, end, rightBound, stepSize, min, max } = this.props;

    if (!rightBound || !stepSize) return null;
    var endLimitPosition = getAdjustedEnd(rightBound);
    var relativeEnd = end < max ? clamp(this.valueToRelativePosition(end), 0, endLimitPosition) : endLimitPosition;

    var positionEnd = getAdjustedEnd(relativeEnd);
    var positionStart = start ? clamp(this.valueToRelativePosition(start), 0, positionEnd) : 0;

    var rangeBarLeft = { left: 0, width: positionStart };
    var rangeBarMiddle = { left: getAdjustedStartHalf(positionStart), width: relativeEnd - positionStart };
    var rangeBarRight = { left: relativeEnd, width: rightBound - relativeEnd };
    var isEndAny = end > max;
    return <div className="number-range-picker">
      <div className="range-bar left" style={rangeBarLeft} onClick={this.onLeftBarClick.bind(this)} />
      <RangeHandle
        positionLeft={positionStart}
        onChange={this.updateStart.bind(this)}
        isAny={start < min}
      />
      <div className="range-bar middle" style={rangeBarMiddle} />
      <RangeHandle
        positionLeft={positionEnd}
        onChange={this.updateEnd.bind(this)}
        isAny={isEndAny}
      />
      <div className="range-bar right" style={rangeBarRight} onClick={this.onRightBarClick.bind(this)} />
    </div>;
  }
}
