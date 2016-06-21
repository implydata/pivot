require('./modal.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Fn } from '../../../common/utils/general/general';
import { isInside, escapeKey, enterKey, uniqueId, classNames } from '../../utils/dom/dom';
import { BodyPortal } from '../body-portal/body-portal';
import { SvgIcon } from '../svg-icon/svg-icon';
import { GoldenCenter } from '../golden-center/golden-center';

export interface ModalProps extends React.Props<any> {
  className?: string;
  id?: string;
  title?: string;
  mandatory?: boolean;
  onClose: Fn;
  onEnter?: Fn;
  startUpFocusOn?: string;
}

export interface ModalState {
  id?: string;
}

export class Modal extends React.Component<ModalProps, ModalState> {
  private focusAlreadyGiven =  false;

  constructor() {
    super();
    this.state = {
      id: null
    };
    this.globalMouseDownListener = this.globalMouseDownListener.bind(this);
    this.globalKeyDownListener = this.globalKeyDownListener.bind(this);
  }

  componentWillMount() {
    var { id } = this.props;

    this.setState({
      id: id || uniqueId('modal-')
    });
  }

  componentDidMount() {
    window.addEventListener('mousedown', this.globalMouseDownListener);
    window.addEventListener('keydown', this.globalKeyDownListener);

    this.maybeFocus();
  }

  componentDidUpdate() {
    this.maybeFocus();
  }

  componentWillUnmount() {
    window.removeEventListener('mousedown', this.globalMouseDownListener);
    window.removeEventListener('keydown', this.globalKeyDownListener);
  }

  getChildByID(children: NodeList, id: string): HTMLElement {
    if (!children) return null;

    const n = children.length;

    for (let i = 0; i < n; i++) {
      let child = children[i] as HTMLElement;

      if (child.getAttribute && child.getAttribute('id') === id) return child;

      if (child.childNodes) {
        let foundChild = this.getChildByID(child.childNodes, id);
        if (foundChild) return foundChild;
      }
    }

    return null;
  }

  maybeFocus() {
    if (this.props.startUpFocusOn) {
      var myElement = document.getElementById(this.state.id) as Element;

      let target = this.getChildByID(
        myElement.childNodes,
        this.props.startUpFocusOn
      );

      if (!this.focusAlreadyGiven && !!target) {
        target.focus();
        this.focusAlreadyGiven = true;
      }
    }
  }

  globalMouseDownListener(e: MouseEvent) {
    var { onClose, mandatory } = this.props;
    if (mandatory) return;

    var { id } = this.state;
    // can not use ReactDOM.findDOMNode(this) because portal?
    var myElement = document.getElementById(id) as Element;
    if (!myElement) return;
    var target = e.target as Element;

    if (isInside(target, myElement)) return;
    onClose();
  }

  globalKeyDownListener(e: KeyboardEvent) {
    if (enterKey(e) && this.props.onEnter) this.props.onEnter();

    if (!escapeKey(e)) return;
    var { onClose, mandatory } = this.props;
    if (mandatory) return;
    onClose();
  }

  render() {
    var { className, title, children, onClose } = this.props;
    var { id } = this.state;

    var titleElement: JSX.Element = null;
    if (typeof title === 'string') {
      titleElement = <div className="modal-title">
        <div className="text">{title}</div>
        <div className="close" onClick={onClose}>
          <SvgIcon svg={require('../../icons/full-remove.svg')}/>
        </div>
      </div>;
    }

    return <BodyPortal fullSize={true}>
      <div className={classNames('modal', className)}>
        <div className="backdrop"></div>
        <GoldenCenter>
          <div className="modal-window" id={id}>
            {titleElement}
            {children}
          </div>
        </GoldenCenter>
      </div>
    </BodyPortal>;
  }
}
