/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('./hiluk-menu.css');

import * as React from 'react';
import { Dataset } from 'plywood';
import { Fn } from '../../../common/utils/general/general';
import { Stage, Essence, Timekeeper, ExternalView } from '../../../common/models/index';
import { STRINGS } from '../../config/constants';
import { download, makeFileName } from '../../utils/download/download';
import { BubbleMenu } from '../bubble-menu/bubble-menu';


export interface HilukMenuProps extends React.Props<any> {
  essence: Essence;
  timekeeper: Timekeeper;
  openOn: Element;
  onClose: Fn;
  getUrlPrefix: () => string;
  openRawDataModal: Fn;
  externalViews?: ExternalView[];
  getDownloadableDataset?: () => Dataset;
  addEssenceToCollection?: () => void;
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
    var { essence, timekeeper, getUrlPrefix } = this.props;

    var urlPrefix = getUrlPrefix();
    var url = essence.getURL(urlPrefix);
    var specificUrl = essence.filter.isRelative() ? essence.convertToSpecificFilter(timekeeper).getURL(urlPrefix) : null;

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

  onExport() {
    const { onClose, getDownloadableDataset, essence, timekeeper } = this.props;
    const { dataCube, splits } = essence;
    if (!getDownloadableDataset) return;

    const filters = essence.getEffectiveFilter(timekeeper).getFileString(dataCube.getPrimaryTimeExpression());
    var splitsString = splits.toArray().map((split) => {
      var dimension = split.getDimension(dataCube.dimensions);
      if (!dimension) return '';
      return `${STRINGS.splitDelimiter}_${dimension.name}`;
    }).join("_");

    download(getDownloadableDataset(), makeFileName(dataCube.name, filters, splitsString), 'csv');
    onClose();
  }

  render() {
    const { openOn, onClose, externalViews, essence, getDownloadableDataset, addEssenceToCollection } = this.props;
    const { url, specificUrl } = this.state;

    var shareOptions: JSX.Element[] = [];

    if (addEssenceToCollection) {
      shareOptions.push(<li
        key="add-to-collection"
        className="add-to-collection"
        onClick={addEssenceToCollection}
      >{STRINGS.addToCollection}</li>);
    }

    shareOptions.push(<li
      className="copy-url clipboard"
      key="copy-url"
      data-clipboard-text={url}
      onClick={onClose}
    >{STRINGS.copyUrl}</li>);

    if (specificUrl) {
      shareOptions.push(<li
        className="copy-specific-url clipboard"
        key="copy-specific-url"
        data-clipboard-text={specificUrl}
        onClick={onClose}
      >{STRINGS.copySpecificUrl}</li>);
    }

    if (getDownloadableDataset()) {
      shareOptions.push(<li
        className="export"
        key="export"
        onClick={this.onExport.bind(this)}
      >{STRINGS.exportToCSV}</li>);
    }

    shareOptions.push(<li
      className="view-raw-data"
      key="view-raw-data"
      onClick={this.openRawDataModal.bind(this)}
    >{STRINGS.viewRawData}</li>);

    if (externalViews) {
      externalViews.forEach((externalView: ExternalView, i: number) => {
        const url = externalView.linkGeneratorFn(essence.dataCube, essence.timezone, essence.filter, essence.splits);
        if (typeof url !== "string") return;
        var title = `${STRINGS.openIn} ${externalView.title}`;
        var target = externalView.sameWindow ? "_self" : "_blank";
        shareOptions.push(<li key={`custom-url-${i}`}>
          <a href={url} target={target}>{title}</a>
        </li>);
      });
    }

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
