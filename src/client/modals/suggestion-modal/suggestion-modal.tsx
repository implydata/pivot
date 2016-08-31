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
import { STRINGS } from "../../config/constants";
import { pluralIfNeeded } from "../../../common/utils/general/general";

import { Checkbox } from "../../components/checkbox/checkbox";

const SELECTED = "hsl(200, 80%, 51%)";
const UNSELECTED = "#cccccc";

function defaultGetKey(thing: any): string {
  return thing.name;
}

export interface Suggestion<T> {
  option: T;
  selected: boolean;
  label: string;
}

function changeSelected<T>(suggestion: Suggestion<T>, value: boolean): Suggestion<T> {
  const { option, label } = suggestion;
  return {
    option, label, selected: value
  };
}

export interface SuggestionModalProps<T> extends React.Props<any> {
  onAdd: (suggestions: T[]) => void;
  onNothing?: () => void;
  onClose: () => void;
  getLabel: (o: T) => string;
  getKey?: (o: T) => string;
  options: T[];
  title: string;
  okLabel?: (c: number) => string;
  nothingLabel?: string;
  explanation?: (c: number) => string;
}

export interface SuggestionModalState<T> {
  suggestions: Suggestion<T>[];
}

export class SuggestionModal<T> extends React.Component<SuggestionModalProps<T>, SuggestionModalState<T>> {
  static defaultProps = {
    getKey: defaultGetKey
  };

  static specialize<U>() {
    return SuggestionModal as { new (): SuggestionModal<U>; };
  }

  constructor() {
    super();
    this.state = {
      suggestions: []
    };
  }

  componentDidMount() {
    const { options } = this.props;
    if (options) this.initFromProps(this.props);
  }

  initFromProps(props: SuggestionModalProps<T>) {
    const { options, getLabel } = props;
    this.setState({
      suggestions: options.map((s) => { return { option: s, selected: true, label: getLabel(s) }; })
    });
  }

  onAdd() {
    const { onAdd, onClose } = this.props;
    const { suggestions } = this.state;
    onAdd(suggestions.filter(s => s.selected).map(s => s.option));
    onClose();
  }

  selectAll() {
    const { suggestions } = this.state;
    const allSelected = suggestions.map((s) => changeSelected(s, true));
    this.setState({
      suggestions: allSelected
    });
  }

  selectNone() {
    const { suggestions } = this.state;
    const noneSelected = suggestions.map((s) => changeSelected(s, false));
    this.setState({
      suggestions: noneSelected
    });
  }

  toggleSuggestion(toggle: Suggestion<T>) {
    const { getKey } = this.props;
    const { suggestions } = this.state;
    const toggleKey = getKey(toggle.option);

    var newStateSuggestions = suggestions.map((suggestion) => {
      let { option, selected } = suggestion;
      return getKey(option) === toggleKey ? changeSelected(suggestion, !selected) : suggestion;
    });

    this.setState({
      suggestions: newStateSuggestions
    });
  }

  renderSuggestions() {
    const { getKey } = this.props;
    const { suggestions } = this.state;
    if (!suggestions) return null;

    return suggestions.map((s => {
      let { option, selected, label } = s;
      return <div
        className="row"
        key={getKey(option)}
        onClick={this.toggleSuggestion.bind(this, s)}
      >
        <Checkbox
          color={selected ? SELECTED : UNSELECTED}
          label={label}
          selected={selected}
        />
        </div>;
    }));
  }

  renderSecondaryButton() {
    const { onClose, onNothing, nothingLabel } = this.props;

    if (onNothing && nothingLabel) {
      return <Button className="cancel" title={nothingLabel} type="secondary" onClick={onNothing}/>;
    } else {
      return <Button className="cancel" title={STRINGS.cancel} type="secondary" onClick={onClose}/>;
    }
  }

  renderEmpty() {
    const { onClose, title } = this.props;

    return <Modal
      className="suggestion-modal"
      title={`${title}`}
      onClose={onClose}
    >
      <div className="background">
        <div className="message">{STRINGS.thereAreNoSuggestionsAtTheMoment}</div>
      </div>
      <div className="button-bar">
        {this.renderSecondaryButton()}
      </div>
    </Modal>;
  }

  render() {
    const { onClose, title, okLabel, explanation } = this.props;
    const { suggestions } = this.state;
    if (!suggestions || suggestions.length === 0) return this.renderEmpty();

    const length = suggestions.filter((s) => s.selected).length;
    return <Modal
      className="suggestion-modal"
      title={`${title}`}
      onClose={onClose}
      onEnter={this.onAdd.bind(this)}
    >
      { explanation ? <div className="explanation"> { explanation(length) } </div> : null }
      <div className="actions">
        <button key='all' onClick={this.selectAll.bind(this)}>Select all</button>
        <button key='none' onClick={this.selectNone.bind(this)}>Select none</button>
      </div>
      <div className="background">
        {this.renderSuggestions()}
      </div>
      <div className="button-bar">
        <Button type="primary" title={okLabel ? okLabel(length) : `${STRINGS.add} ${pluralIfNeeded(length, title)}`} disabled={length === 0} onClick={this.onAdd.bind(this)}/>
        {this.renderSecondaryButton()}
      </div>
    </Modal>;
  }
}
