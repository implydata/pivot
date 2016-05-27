require('./range-handle.css');

import * as React from 'react';
import { getXFromEvent, classNames, clamp } from '../../utils/dom/dom';

export interface RangeHandleProps extends React.Props<any> {
  positionLeft: number;
  onChange: (x: number) => void;
  isAny: boolean;
  isBeyondMin?: boolean;
  isBeyondMax?: boolean;
  rightBound?: number;
  leftBound?: number;
  offset: number;
  size: number;
  type: "start" | "end";
}

export interface RangeHandleState {
  anchor: number;
}

export class RangeHandle extends React.Component<RangeHandleProps, RangeHandleState> {
  public mounted: boolean;

  constructor() {
    super();
    this.state = {
      anchor:  null
    };

    this.onGlobalMouseUp = this.onGlobalMouseUp.bind(this);
    this.onGlobalMouseMove = this.onGlobalMouseMove.bind(this);
  }

  onGlobalMouseMove(event: MouseEvent) {
    const { onChange, leftBound, rightBound, size, type } = this.props;
    const { anchor } = this.state;
    let newX = getXFromEvent(event) + (type === "end" ? size - anchor : -anchor);

    onChange(clamp(newX, leftBound, rightBound));
  }

  onMouseDown(event: MouseEvent) {
    const { offset, size, positionLeft, type } = this.props;

    window.addEventListener('mouseup', this.onGlobalMouseUp);
    window.addEventListener('mousemove', this.onGlobalMouseMove);


    let x = getXFromEvent(event);
    var anchor = x - offset - positionLeft;
    if (type === "end") anchor = anchor - size;

    this.setState({
      anchor
    });
    event.preventDefault();
  }

  onGlobalMouseUp() {
    window.removeEventListener('mouseup', this.onGlobalMouseUp);
    window.removeEventListener('mousemove', this.onGlobalMouseMove);
  }

  render() {
    const { positionLeft, isAny, isBeyondMin, isBeyondMax } = this.props;

    var style = { left: positionLeft };

    return <div
      className={classNames("range-handle", { empty: isAny, "beyond min": isBeyondMin, "beyond max": isBeyondMax })}
      style={style}
      onMouseDown={this.onMouseDown.bind(this)}
    />;
  }
}
