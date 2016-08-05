import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { firstUp } from '../../../common/utils/string/string';
import { escapeKey, enterKey } from '../../utils/dom/dom';


export interface GlobalEventListenerProps extends React.Props<any> {
  resize?: () => void;
  mouseDown?: (e: MouseEvent) => void;
  enter?: () => void;
  escape?: () => void;
}

export interface GlobalEventListenerState {
}

export class GlobalEventListener extends React.Component<GlobalEventListenerProps, GlobalEventListenerState> {
  public mounted: boolean;
  private propsToEvents: any = {
    resize: 'resize',
    mouseDown: 'mousedown',
    enter: 'keydown',
    escape: 'keydown'
  };

  constructor() {
    super();

    this.onResize = this.onResize.bind(this);
    this.onMousedown = this.onMousedown.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
  }

  componentWillReceiveProps(nextProps: GlobalEventListenerProps) {
    this.refreshListeners(nextProps, this.props);
  }

  componentDidMount() {
    this.refreshListeners(this.props);
  }

  componentWillUnmount() {
    for (let prop in this.propsToEvents) {
      this.removeListener(this.propsToEvents[prop]);
    }
  }

  refreshListeners(nextProps: any, currentProps: any = {}) {
    var toAdd: string[] = [];
    var toRemove: string[] = [];

    for (let prop in this.propsToEvents) {
      let event = this.propsToEvents[prop];

      if (currentProps[prop] && nextProps[prop]) continue;

      if (nextProps[prop] && toAdd.indexOf(event) === -1) {
        toAdd.push(event);
      } else if (currentProps[prop] && toRemove.indexOf(event) === -1) {
        toRemove.push(event);
      }
    }

    toRemove.forEach(this.removeListener, this);
    toAdd.forEach(this.addListener, this);
  }

  addListener(event: string) {
    window.addEventListener(event, (this as any)[`on${firstUp(event)}`]);
  }

  removeListener(event: string) {
    window.removeEventListener(event, (this as any)[`on${firstUp(event)}`]);
  }

  onResize() {
    if (this.props.resize) this.props.resize();
  }

  onMousedown(e: MouseEvent) {
    if (this.props.mouseDown) this.props.mouseDown(e);
  }

  onKeydown(e: KeyboardEvent) {
    if (this.props.escape && escapeKey(e)) this.props.escape();
  }

  render(): JSX.Element {
    return null;
  }
}
