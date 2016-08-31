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
import { Button, Modal } from '../../components/index';
import { ListItem } from '../../../common/models/index';
import { STRINGS } from "../../config/constants";
import { pluralIfNeeded } from "../../../common/utils/general/general";

import { Checkbox } from "../../components/checkbox/checkbox";

const SELECTED = "hsl(200, 80%, 51%)";
const UNSELECTED = "#cccccc";

function defaultGetKey(thing: any): string {
  return thing.name;
}

export interface SuggestionModalAction<T> {
  label: (n: number) => string;
  callback: (suggestions?: T[]) => void;
}

export interface Suggestion<T> {
  option: T;
  selected: boolean;
  label: string;
}

export interface SuggestionModalProps<T> extends React.Props<any> {
  onOk: SuggestionModalAction<T>;
  onDoNothing: SuggestionModalAction<T>;

  suggestions: ListItem[];

  onClose: () => void;

  title: string;
  explanation?: (c: number) => string;
}

export interface SuggestionModalState<T> {
  selection?: boolean[];
}

export class SuggestionModal<T> extends React.Component<SuggestionModalProps<T>, SuggestionModalState<T>> {
  static specialize<U>() {
    return SuggestionModal as { new (): SuggestionModal<U>; };
  }

  constructor() {
    super();
    this.state = {selection: []};
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

  onAdd() {
    const { onOk, suggestions } = this.props;
    const { selection } = this.state;
    onOk.callback(suggestions.filter((s, i) => selection[i]).map(s => s.value));
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

  renderSecondaryButton() {
    const { onClose, onDoNothing } = this.props;
    const { selection } = this.state;

    const length = selection.filter(Boolean).length;

    return <Button
      className="cancel"
      title={onDoNothing ? onDoNothing.label(length) : STRINGS.cancel}
      type="secondary"
      onClick={onDoNothing ? onDoNothing.callback : onClose}
    />;
  }

  renderEmpty() {
    const { onClose, title, onDoNothing } = this.props;

    return <Modal className="suggestion-modal" title={`${title}`} onClose={onClose}>
      <div className="background">
        <div className="message">{STRINGS.thereAreNoSuggestionsAtTheMoment}</div>
      </div>
      <div className="button-bar">
        {this.renderSecondaryButton()}
      </div>
    </Modal>;
  }

  render() {
    const { suggestions, onClose, title, onOk, explanation } = this.props;
    const { selection } = this.state;

    if (!suggestions || suggestions.length === 0) return this.renderEmpty();

    const length = selection.filter(Boolean).length;

     // : `${STRINGS.add} ${pluralIfNeeded(length, title)}`

    return <Modal
      className="suggestion-modal"
      title={`${title}`}
      onClose={onClose}
      onEnter={this.onAdd.bind(this)}
    >
      { explanation ? <div className="explanation"> { explanation(length) } </div> : null }
      <div className="actions">
        <button onClick={this.selectAll.bind(this)}>Select all</button>
        <button onClick={this.selectNone.bind(this)}>Select none</button>
      </div>
      <div className="background">
        {this.renderSuggestions()}
      </div>
      <div className="button-bar">
        <Button
          type="primary"
          title={onOk.label(length)}
          disabled={length === 0}
          onClick={this.onAdd.bind(this)}
        />
        {this.renderSecondaryButton()}
      </div>
    </Modal>;
  }
}
