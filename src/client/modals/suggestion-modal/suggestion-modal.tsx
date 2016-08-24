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
import { Dimension } from "../../../common/models/dimension/dimension";

import { Measure } from "../../../common/models/measure/measure";
import { Checkbox } from "../../components/checkbox/checkbox";


function pluralize(title: string, count: number) {
  var lower = title.toLowerCase();
  if (count <= 1) return lower;
  return `${lower}s`;
}

export type Option = Dimension | Measure;
export interface Suggestion {
  option: Option;
  selected: boolean;
  label: string;
}

export interface SuggestionModalProps extends React.Props<any> {
  onAdd: (suggestions: Option[]) => void;
  onClose: () => void;
  getLabel: (o: Option) => string;
  getOptions: () => Option[];
  title: string;
}

export interface SuggestionModalState {
  suggestions: Suggestion[];
}

export class SuggestionModal extends React.Component<SuggestionModalProps, SuggestionModalState> {
  constructor() {
    super();
    this.state = {
      suggestions: []
    };
  }

  componentDidMount() {
    const { getOptions } = this.props;
    if (getOptions) this.initFromProps(this.props);
  }

  componentWillReceiveProps(nextProps: SuggestionModalProps) {
    if (nextProps) {
      this.initFromProps(nextProps);
    }
  }

  initFromProps(props: SuggestionModalProps) {
    const { getOptions, getLabel } = props;
    const suggestions: Option[] = getOptions();
    this.setState({
      suggestions: suggestions.map((s) => { return { option: s, selected: true, label: getLabel(s) }; })
    });
  }

  onAdd() {
    const { onAdd, onClose } = this.props;
    onAdd(this.applySuggestions());
    onClose();
  }

  toggleSuggestion(toggle: Suggestion) {
    const { suggestions } = this.state;
    const toggleName = toggle.option.name;

    var newStateSuggestions = suggestions.map((suggestion) => {
      let { option, selected, label } = suggestion;
      return option.name === toggleName ? { option, selected: !selected, label } : suggestion;
    });

    this.setState({
      suggestions: newStateSuggestions
    });
  }

  applySuggestions(): Option[] {
    const { suggestions } = this.state;
    return suggestions.filter(s => s.selected).map(s => s.option);
  }

  renderSuggestions() {
    const { suggestions } = this.state;
    if (!suggestions) return null;
    return suggestions.map((s => {
      let { option, selected, label } = s;
      let { name } = option;
      return <div
        className="row"
        key={name}
        onClick={this.toggleSuggestion.bind(this, s)}
      >
        <Checkbox
          color={selected ? "hsl(200, 80%, 51%)" : "#cccccc"}
          label={label}
          selected={selected}
        />
        </div>;
    }));
  }

  render() {
    const { onClose, title } = this.props;
    const { suggestions } = this.state;

    const length = List(suggestions).filter((s) => s.selected).size;
    return <Modal
      className="suggestion-modal"
      title={`${title} ${STRINGS.suggestions}`}
      onClose={onClose}
    >
      <form>
        {this.renderSuggestions()}
      </form>
      <div className="button-bar">
        <Button type="primary" title={`${STRINGS.add} ${length} ${pluralize(title, length)}`} disabled={length === 0} onClick={this.onAdd.bind(this)}/>
        <Button className="cancel" title="Cancel" type="secondary" onClick={onClose}/>
      </div>
    </Modal>;
  }
}
