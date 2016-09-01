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

require('./suggestion-modal.css');

import * as React from 'react';
import * as Q from 'q';

import { Button, Modal } from '../../components/index';
import { ListItem } from '../../../common/models/index';
import { STRINGS } from "../../config/constants";
import { pluralIfNeeded } from "../../../common/utils/general/general";

import { Checkbox, LoadingBar } from "../../components/index";

import { LoadingMessageDelegate, LoadingMessageState } from '../../delegates/index';

export interface SuggestionModalAction<T> {
  label: (n: number) => string;
  callback?: (suggestions?: T[]) => void;
  closePromise?: (suggestions?: T[]) => Q.Promise<any>;
  loadingMessage?: string;
}

export interface Suggestion<T> {
  option: T;
  selected: boolean;
  label: string;
}

export interface SuggestionModalProps<T> extends React.Props<any> {
  onOk: SuggestionModalAction<T>;
  onDoNothing: SuggestionModalAction<T>;
  onAlternateView?: SuggestionModalAction<T>;

  suggestions: ListItem[];

  onClose: () => void;

  title: string;
  explanation?: (c: number) => string;

  loadingState?: LoadingMessageState;
}

export interface SuggestionModalState<T> extends LoadingMessageState {
  selection?: boolean[];
}

export class SuggestionModal<T> extends React.Component<SuggestionModalProps<T>, SuggestionModalState<T>> {
  static specialize<U>() {
    return SuggestionModal as { new (): SuggestionModal<U>; };
  }

  static defaultProps = {
    loadingState: {}
  };

  private loadingDelegate: LoadingMessageDelegate;

  constructor() {
    super();
    this.state = {selection: []};

    this.loadingDelegate = new LoadingMessageDelegate(this);
  }

  componentDidMount() {
    const { suggestions } = this.props;
    if (suggestions) this.initFromProps(this.props);
  }

  initFromProps(props: SuggestionModalProps<T>) {
    this.setState({
      selection: props.suggestions.map((s) => true)
    });
  }

  onPrimary() {
    const { onOk, suggestions, onClose } = this.props;
    const { selection } = this.state;

    const selectedSuggestions = suggestions.filter((s, i) => selection[i]).map(s => s.value);

    if (onOk.closePromise) {
      this.loadingDelegate.start(onOk.loadingMessage || '…');
      onOk.closePromise(selectedSuggestions).then(() => {
        this.loadingDelegate.stop().then(onClose);
      });
    } else if (onOk.callback) {
      onOk.callback(selectedSuggestions);
    }
  }

  selectAll() {
    this.setState({
      selection: this.state.selection.map(() => true)
    });
  }

  selectNone() {
    this.setState({
      selection: this.state.selection.map(() => false)
    });
  }

  renderSuggestions() {
    const { suggestions } = this.props;
    const { selection } = this.state;

    if (!suggestions) return null;

    const toggle = (i: number) => {
      selection[i] = !selection[i];

      this.setState({
        selection
      });
    };

    return suggestions.map(((s, i) => {
      return <div className="row" key={i} onClick={toggle.bind(this, i)}>
        <Checkbox label={s.label} selected={selection[i]}/>
      </div>;
    }));
  }

  renderSecondaryButton(length: number) {
    const { onClose, onDoNothing } = this.props;

    return <Button
      className="cancel"
      title={onDoNothing ? onDoNothing.label(length) : STRINGS.cancel}
      type="secondary"
      onClick={onDoNothing ? onDoNothing.callback : onClose}
    />;
  }

  renderAlternateButton(length: number) {
    const { onAlternateView } = this.props;

    if (!onAlternateView) return null;

    return <Button
      className="alternate"
      title={onAlternateView.label(length)}
      type="primary"
      onClick={onAlternateView.callback}
    />;
  }

  renderPrimaryButton(length: number) {
    const { onOk } = this.props;

    return <Button
      type="primary"
      title={onOk.label(length)}
      disabled={length === 0}
      onClick={this.onPrimary.bind(this)}
    />;
  }

  renderLoader(message: string) {
    return <LoadingBar label={message}/>;
  }

  renderButtons(empty = false) {
    const { loadingState } = this.props;
    const { selection, isLoading, loadingMessage } = this.state;

    // Outer world said something is loading
    if (loadingState.isLoading) return this.renderLoader(loadingState.loadingMessage);

    // Loading due to a closePromise on a SuggestionModalAction
    if (isLoading) return this.renderLoader(loadingMessage);

    const length = selection.filter(Boolean).length;

    const alternateButton = this.renderAlternateButton(length);
    const secondaryButton = this.renderSecondaryButton(length);
    const primaryButton = this.renderPrimaryButton(length);

    if (empty) {
      if (alternateButton) {
        return <div className="grid-row button-bar">
          <div className="grid-col-50">{secondaryButton}</div>
          <div className="grid-col-50 right">{alternateButton}</div>
        </div>;
      } else {
        return <div className="grid-row button-bar">
          <div className="grid-col-100">{secondaryButton}</div>
        </div>;
      }
    } else {
      if (alternateButton) {
        return <div className="grid-row button-bar">
          <div className="grid-col-50">
            {primaryButton}
            {secondaryButton}
          </div>
          <div className="grid-col-50 right">{alternateButton}</div>
        </div>;
      } else {
        return <div className="grid-row button-bar">
          <div className="grid-col-100">
            {primaryButton}
            {secondaryButton}
          </div>
        </div>;
      }
    }
  }

  renderEmpty() {
    const { onClose, title } = this.props;

    return <Modal className="suggestion-modal" title={`${title}`} onClose={onClose}>
      <div className="background">
        <div className="message">{STRINGS.thereAreNoSuggestionsAtTheMoment}</div>
      </div>
      {this.renderButtons(true)}
    </Modal>;
  }

  render() {
    const { suggestions, onClose, title, explanation } = this.props;
    const { selection } = this.state;

    if (!suggestions || suggestions.length === 0) return this.renderEmpty();

    const length = selection.filter(Boolean).length;

    return <Modal
      className="suggestion-modal"
      title={`${title}`}
      onClose={onClose}
      onEnter={this.onPrimary.bind(this)}
    >
      { explanation ? <div className="explanation"> { explanation(length) } </div> : null }
      <div className="actions">
        <button onClick={this.selectAll.bind(this)}>Select all</button>
        <button onClick={this.selectNone.bind(this)}>Select none</button>
      </div>
      <div className="background">
        {this.renderSuggestions()}
      </div>

      {this.renderButtons()}
    </Modal>;
  }
}
