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

import { DataCube } from "../../../common/models/data-cube/data-cube";
import { Measure } from "../../../common/models/measure/measure";
import { Checkbox } from "../../components/checkbox/checkbox";
import { ImmutableUtils } from "../../../common/utils/immutable-utils/immutable-utils";

export type Option = Dimension | Measure;
export interface Suggestion {
  option: Option;
  selected: boolean;
}

export interface SuggestionModalProps extends React.Props<any> {
  onAdd: (newDataCube: DataCube) => void;
  onClose: () => void;
  dataCube: DataCube;
  type: 'dimensions' | 'measures';
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
    const { dataCube } = this.props;
    if (dataCube) this.initFromProps(this.props);
  }

  componentWillReceiveProps(nextProps: SuggestionModalProps) {
    if (nextProps.dataCube) {
      this.initFromProps(nextProps);
    }
  }

  initFromProps(props: SuggestionModalProps) {
    const { dataCube, type } = props;
    var newCube = new DataCube(dataCube.valueOf());
    const suggestions: Option[] = type === 'dimensions' ? newCube.getSuggestedDimensions() : newCube.getSuggestedMeasures();
    this.setState({
      suggestions: suggestions.map((s) => { return { option: s, selected: true}; })
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
      let { option, selected } = suggestion;
      return option.name === toggleName ? { option, selected: !selected } : suggestion;
    });

    this.setState({
      suggestions: newStateSuggestions
    });
  }

  applySuggestions(): DataCube {
    const { type, dataCube } = this.props;
    const { suggestions } = this.state;

    var oldValues: Option[] = (dataCube as any)[type].toArray();
    var newValues = suggestions.filter(s => s.selected).map(s => s.option).concat(oldValues);
    return ImmutableUtils.setProperty(dataCube, type, List(newValues));
  }

  renderSuggestions() {
    const { suggestions } = this.state;
    if (!suggestions) return null;
    return suggestions.map((s => {
      let { option, selected } = s;
      return <div
        className="row"
        key={option.name}
        onClick={this.toggleSuggestion.bind(this, s)}
      >
        <Checkbox
          color={selected ? "hsl(200, 80%, 51%)" : "#cccccc"}
          label={option.title}
          selected={selected}
          onClick={this.toggleSuggestion.bind(this, s)}
        />
        </div>;
    }));
  }

  render() {
    const { onClose, type } = this.props;
    const { suggestions } = this.state;

    const length = List(suggestions).filter((s) => s.selected).size;
    return <Modal
      className="suggestion-modal"
      title={`${type === 'dimensions' ? STRINGS.dimension : STRINGS.measure} ${STRINGS.suggestions}`}
      onClose={onClose}
    >
      <form>
        {this.renderSuggestions()}
      </form>
      <div className="button-bar">
        <Button type="primary" title={`${STRINGS.add} ${length} ${type}`} disabled={length === 0} onClick={this.onAdd.bind(this)}/>
        <Button className="cancel" title="Cancel" type="secondary" onClick={onClose}/>
      </div>

    </Modal>;
  }
}
