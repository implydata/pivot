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
import { List } from 'immutable';
import { STRINGS } from "../../config/constants";
import { Dimension, Measure, DataCube } from "../../../common/models/index";
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

export interface SuggestionModalProps<T> extends React.Props<any> {
  onAdd: (suggestions: T[]) => void;
  onClose: () => void;
  getLabel: (o: T) => string;
  getKey?: (o: T) => string;
  options: T[];
  title: string;
  okLabel?: (c: number) => string;
  cancelLabel?: string;
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

  componentWillReceiveProps(nextProps: SuggestionModalProps<T>) {
    if (nextProps) {
      this.initFromProps(nextProps);
    }
  }

  initFromProps(props: SuggestionModalProps<T>) {
    const { options, getLabel } = props;
    this.setState({
      suggestions: options.map((s) => { return { option: s, selected: true, label: getLabel(s) }; })
    });
  }

  changeSelection(suggestion: Suggestion<T>, value: boolean): Suggestion<T> { // member function because of T
    const { option, label } = suggestion;
    return {
      option, label, selected: value
    };
  }

  onAdd() {
    const { onAdd, onClose } = this.props;
    const { suggestions } = this.state;
    onAdd(suggestions.filter(s => s.selected).map(s => s.option));
    onClose();
  }

  selectAll() {
    const { suggestions } = this.state;
    const allSelected = suggestions.map((s) => this.changeSelection(s, true));
    this.setState({
      suggestions: allSelected
    });
  }

  selectNone() {
    const { suggestions } = this.state;
    const noneSelected = suggestions.map((s) => this.changeSelection(s, false));
    this.setState({
      suggestions: noneSelected
    });
  }

  toggleSuggestion(toggle: Suggestion<T>) {
    const { getKey } = this.props;
    const { suggestions } = this.state;
    const toggleKey = getKey(toggle.option);

    var newStateSuggestions = suggestions.map((suggestion) => {
      let { option, selected, label } = suggestion;
      return getKey(option) === toggleKey ? { option, selected: !selected, label } : suggestion;
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
        <Button className="cancel" title={STRINGS.close} type="primary" onClick={onClose}/>
      </div>
    </Modal>;
  }

  render() {
    const { onClose, title, okLabel, cancelLabel } = this.props;
    const { suggestions } = this.state;
    if (!suggestions || suggestions.length === 0) return this.renderEmpty();

    const length = List(suggestions).filter((s) => s.selected).size;
    return <Modal
      className="suggestion-modal"
      title={`${title}`}
      onClose={onClose}
    >
      <div className="actions">
        <button key='all' onClick={this.selectAll.bind(this)}>Select all</button>
        <button key='none' onClick={this.selectNone.bind(this)}>Select none</button>
      </div>
      <div className="background">
        {this.renderSuggestions()}
      </div>
      <div className="button-bar">
        <Button type="primary" title={okLabel ? okLabel(length) : `${STRINGS.add} ${pluralIfNeeded(length, title)}`} disabled={length === 0} onClick={this.onAdd.bind(this)}/>
        <Button className="cancel" title={cancelLabel || STRINGS.cancel} type="secondary" onClick={onClose}/>
      </div>
    </Modal>;
  }
}
