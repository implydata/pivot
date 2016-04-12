require('./hiluk-menu.css');

import * as React from 'react';
import { Fn } from "../../../common/utils/general/general";
import { Stage, Clicker, Essence } from '../../../common/models/index';
import { STRINGS } from '../../config/constants';
import { BubbleMenu } from '../bubble-menu/bubble-menu';


export interface HilukMenuProps extends React.Props<any> {
  essence: Essence;
  openOn: Element;
  onClose: Fn;
  getUrlPrefix: () => string;
  openRawDataModal: Fn;
}

export interface HilukMenuState {
  url?: string;
  specificUrl?: string;
}

export class HilukMenu extends React.Component<HilukMenuProps, HilukMenuState> {

  constructor() {
    super();
    this.state = {
      url: null,
      specificUrl: null
    };

  }

  componentDidMount() {
    var { essence, getUrlPrefix } = this.props;

    var urlPrefix = getUrlPrefix();
    var url = essence.getURL(urlPrefix);
    var specificUrl = essence.filter.isRelative() ? essence.convertToSpecificFilter().getURL(urlPrefix) : null;

    this.setState({
      url,
      specificUrl
    });
  }

  openRawDataModal() {
    const { openRawDataModal, onClose } = this.props;
    openRawDataModal();
    onClose();
  }

  render() {
    const { openOn, onClose } = this.props;
    const { url, specificUrl } = this.state;

    var shareOptions: JSX.Element[] = [
      <li
        className="copy-url clipboard"
        key="copy-url"
        data-clipboard-text={url}
        onClick={onClose}
      >{STRINGS.copyUrl}</li>
    ];

    if (specificUrl) {
      shareOptions.push(<li
        className="copy-specific-url clipboard"
        key="copy-specific-url"
        data-clipboard-text={specificUrl}
        onClick={onClose}
      >{STRINGS.copySpecificUrl}</li>);
    }
    shareOptions.push(<li
      className="select-query"
      key="select-query"
      onClick={this.openRawDataModal.bind(this)}
    >{STRINGS.seeRawData}</li>);

    var stage = Stage.fromSize(200, 200);
    return <BubbleMenu
      className="hiluk-menu"
      direction="down"
      stage={stage}
      openOn={openOn}
      onClose={onClose}
    >
      <ul className="bubble-list">
        {shareOptions}
      </ul>
    </BubbleMenu>;
  }
}
