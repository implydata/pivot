require('./simple-scroller.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { classNames, getXFromEvent, getYFromEvent } from '../../utils/dom/dom';
import { Fn } from '../../../common/utils/general/general';

export interface SimpleScrollerLayout {
  bodyWidth: number;
  bodyHeight: number;

  top: number;
  right: number;
  bottom: number;
  left: number;
};

export interface SimpleScrollerProps extends React.Props<any> {
  layout: SimpleScrollerLayout;

  onClick?: (x: number, y: number) => void;
  onMouseMove?: (x: number, y: number) => void;
  onMouseLeave?: () => void;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;

  // Transcluded elements
  topGutter?: JSX.Element | JSX.Element[];
  rightGutter?: JSX.Element | JSX.Element[];
  bottomGutter?: JSX.Element | JSX.Element[];
  leftGutter?: JSX.Element | JSX.Element[];
  topLeftCorner?: JSX.Element | JSX.Element[];
  topRightCorner?: JSX.Element | JSX.Element[];
  bottomRightCorner?: JSX.Element | JSX.Element[];
  bottomLeftCorner?: JSX.Element | JSX.Element[];
  body?: JSX.Element[];
  bodyOverlay?: JSX.Element | JSX.Element[];
}

export interface SimpleScrollerState {
  scrollTop?: number;
  scrollLeft?: number;

  viewportHeight?: number;
  viewportWidth?: number;
}

export class SimpleScroller extends React.Component<SimpleScrollerProps, SimpleScrollerState> {
  constructor() {
    super();
    this.state = {
      scrollTop: 0,
      scrollLeft: 0,
      viewportHeight: 0,
      viewportWidth: 0
    };
  }

  getTopLeftCornerStyle(): React.CSSProperties {
    const { layout } = this.props;
    return {
      width: layout.left,
      height: layout.top,
      left: 0
    };
  }

  getTopRightCornerStyle(): React.CSSProperties {
    const { layout } = this.props;
    return {
      width: layout.right,
      height: layout.top,
      right: 0
    };
  }

  getBottomLeftCornerStyle(): React.CSSProperties {
    const { layout } = this.props;
    return {
      width: layout.left,
      height: layout.bottom,
      bottom: 0
    };
  }

  getBottomRightCornerStyle(): React.CSSProperties {
    const { layout } = this.props;
    return {
      width: layout.right,
      height: layout.bottom,
      bottom: 0,
      right: 0
    };
  }

  getTopGutterStyle(): React.CSSProperties {
    const { layout } = this.props;
    const { scrollLeft } = this.state;

    return {
      height: layout.top,
      left: layout.left - scrollLeft,
      right: layout.right
    };
  }

  getRightGutterStyle(): React.CSSProperties {
    const { layout } = this.props;
    const { scrollTop } = this.state;

    return {
      width: layout.right,
      right: 0,
      top: layout.top - scrollTop,
      bottom: layout.bottom
    };
  }

  getBottomGutterStyle(): React.CSSProperties {
    const { layout } = this.props;
    const { scrollLeft } = this.state;

    return {
      height: layout.bottom,
      left: layout.left - scrollLeft,
      right: layout.right
    };
  }

  getLeftGutterStyle(): React.CSSProperties {
    const { layout } = this.props;
    const { scrollTop } = this.state;

    return {
      width: layout.left,
      left: 0,
      top: layout.top - scrollTop,
      bottom: layout.bottom
    };
  }

  getTopShadowStyle(): React.CSSProperties {
    const { layout } = this.props;

    return {
      top: 0,
      height: layout.top,
      left: 0,
      right: 0
    };
  }

  getRightShadowStyle(): React.CSSProperties {
    const { layout } = this.props;

    return {
      width: layout.right,
      right: 0,
      top: 0,
      bottom: 0
    };
  }

  getBottomShadowStyle(): React.CSSProperties {
    const { layout } = this.props;

    return {
      height: layout.bottom,
      bottom: 0,
      left: 0,
      right: 0
    };
  }

  getLeftShadowStyle(): React.CSSProperties {
    const { layout } = this.props;
    const { scrollTop } = this.state;

    return {
      width: layout.left,
      left: 0,
      top: 0,
      bottom: 0
    };
  }

  getBodyStyle(): React.CSSProperties {
    const { layout } = this.props;
    const { scrollTop, scrollLeft } = this.state;

    return {
      top: layout.top - scrollTop,
      right: layout.right,
      bottom: layout.bottom,
      left: layout.left - scrollLeft
    };
  }

  getBodyOverlayStyle(): React.CSSProperties {
    return this.getBodyStyle();
  }

  getTargetStyle(): React.CSSProperties {
    const { layout } = this.props;

    return {
      top: 0,
      left: 0,
      width: layout.bodyWidth + layout.left + layout.right,
      height: layout.bodyHeight + layout.top + layout.bottom
    };
  }

  private getDOMElement(refName: string): any {
    return ReactDOM.findDOMNode(this.refs[refName]) as any;
  }

  private onScroll(e: UIEvent) {
    var target = e.target as Element;

    if (this.props.onScroll !== undefined) {
      const { top, bottom } = this.props.layout;
      const rect = target.getBoundingClientRect();

      this.setState({
        scrollTop: target.scrollTop,
        scrollLeft: target.scrollLeft
      }, () => {
        this.props.onScroll(target.scrollTop, target.scrollLeft);
      });
    }
  }

  getRelativeMouseCoordinates(event: MouseEvent): {x: number, y: number} {
    const { top, right, bottom, left, bodyWidth, bodyHeight } = this.props.layout;
    const container = this.getDOMElement('eventContainer');
    const { scrollLeft, scrollTop, viewportHeight, viewportWidth } = this.state;
    const rect = container.getBoundingClientRect();

    var x = getXFromEvent(event) - rect.left;
    var y = getYFromEvent(event) - rect.top;

    if (x > left && x <= left + viewportWidth) {
      x += scrollLeft;
    } else if (x > left + viewportWidth) {
      x += bodyWidth - viewportWidth;
    }

    if (y > top && y <= top + viewportHeight) {
      y += scrollTop;
    } else if (y > top + viewportHeight) {
      y += bodyHeight - viewportHeight;
    }

    return {x, y};
  }

  onClick(event: MouseEvent) {
    if (this.props.onClick === undefined) return;

    const { x, y } = this.getRelativeMouseCoordinates(event);

    this.props.onClick(x, y);
  }

  onMouseMove(event: MouseEvent) {
    if (this.props.onMouseMove === undefined) return;

    const { x, y } = this.getRelativeMouseCoordinates(event);

    this.props.onMouseMove(x, y);
  }

  firstUp(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : undefined;
  }

  toKebabCase(str: string): string {
    return str ? str.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`) : undefined;
  }

  renderTile(id: string): JSX.Element {
    var element = (this.props as any)[id];
    var styler = (this as any)[`get${this.firstUp(id)}Style`].bind(this);

    return <div className={this.toKebabCase(id)} style={styler()}>{element}</div>;
  }

  renderGutter(side: string): JSX.Element {
    if (['top', 'bottom', 'left', 'right'].indexOf(side) === -1) {
      throw new Error('Unknown gutter : ' + side);
    }

    return this.renderTile(side + 'Gutter');
  }

  shouldHaveShadow(side: string): boolean {
    const { scrollLeft, scrollTop, viewportHeight, viewportWidth } = this.state;

    const { layout } = this.props;

    if (side === 'top') return scrollTop > 0;
    if (side === 'left') return scrollLeft > 0;
    if (side === 'bottom') return layout.bodyHeight - scrollTop > viewportHeight;
    if (side === 'right') return layout.bodyWidth - scrollLeft > viewportWidth;

    throw new Error('Unknow side for shadow : ' + side);
  }

  renderShadow(side: string): JSX.Element {
    if (['top', 'bottom', 'left', 'right'].indexOf(side) === -1) {
      throw new Error('Unknown shadow : ' + side);
    }

    if (!(this.props.layout as any)[side]) return null; // no gutter ? no shadow.
    if (!this.shouldHaveShadow(side)) return null;

    const name = `${side}Shadow`;

    var styler = (this as any)[`get${this.firstUp(name)}Style`].bind(this);

    return <div className={this.toKebabCase(name)} style={styler()}/>;
  }

  renderCorner(side: string): JSX.Element {
    if (['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].indexOf(side) === -1) {
      throw new Error('Unknown corner : ' + side);
    }

    return this.renderTile(side + 'Corner');
  }

  componentDidUpdate() {
    const rect = this.getDOMElement('simpleScroller').getBoundingClientRect();
    const { top, right, bottom, left } = this.props.layout;

    const newHeight = rect.height - top - bottom;
    const newWidth = rect.width - left - right;

    if (this.state.viewportHeight !== newHeight || this.state.viewportWidth !== newWidth) {
      this.setState({viewportHeight: newHeight, viewportWidth: newWidth});
    }
  }

  render() {
    const { body, bodyOverlay, onMouseLeave } = this.props;

    return <div className="simple-scroller" ref="simpleScroller">

      <div className="body" style={this.getBodyStyle()}>{body}</div>

      {this.renderGutter("top")}
      {this.renderGutter("right")}
      {this.renderGutter("bottom")}
      {this.renderGutter("left")}

      {this.renderCorner("topLeft")}
      {this.renderCorner("topRight")}
      {this.renderCorner("bottomLeft")}
      {this.renderCorner("bottomRight")}

      {this.renderShadow("top")}
      {this.renderShadow("right")}
      {this.renderShadow("bottom")}
      {this.renderShadow("left")}

      <div className="body-overlay" style={this.getBodyOverlayStyle()}>{bodyOverlay}</div>

      <div
        className="event-container"
        ref="eventContainer"
        onScroll={this.onScroll.bind(this)}
        onClick={this.onClick.bind(this)}
        onMouseMove={this.onMouseMove.bind(this)}
        onMouseLeave={onMouseLeave || null}
       >
        <div className="event-target" style={this.getTargetStyle()}/>
      </div>

    </div>;
  }
}
