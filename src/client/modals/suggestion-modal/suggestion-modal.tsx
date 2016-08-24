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

import { ImmutableFormDelegate } from "../../utils/immutable-form-delegate/immutable-form-delegate";
import { DataCube } from "../../../common/models/data-cube/data-cube";
import { Measure } from "../../../common/models/measure/measure";
import { Checkbox } from "../../components/checkbox/checkbox";
import { ImmutableUtils } from "../../../common/utils/immutable-utils/immutable-utils";

export interface SuggestionModalProps extends React.Props<any> {
  onAdd: (newDataCube: DataCube) => void;
  onCancel: () => void;
  dataCube: DataCube;
  type: 'dimensions' | 'measures';
}
export type Option = Dimension | Measure;

export interface SuggestionModalState {
  newInstance?: DataCube;
  suggestions?: {option: Option, selected: boolean}[];
}

export class SuggestionModal extends React.Component<SuggestionModalProps, SuggestionModalState> {
  private delegate: ImmutableFormDelegate<DataCube>;

  constructor() {
    super();
    this.delegate = new ImmutableFormDelegate<DataCube>(this);
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
      newInstance: newCube,
      suggestions: suggestions.map((s) => { return { option: s, selected: true}; })
    });
  }

  onAdd() {
    this.applySuggestions();
    console.log(this.state.newInstance);
  }

  toggleOption(toggle: {option: Option, selected: boolean}) {
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

  applySuggestions() {
    const { type } = this.props;
    const { newInstance, suggestions } = this.state;

    var oldValues: Option[] = (newInstance as any)[type].toArray();
    var newValues = suggestions.filter(s => s.selected).map(s => s.option).concat(oldValues);
    this.delegate.onChange(
      ImmutableUtils.setProperty(newInstance, type, List(newValues)),
      true,
      type,
      undefined
    );
  }

  renderSuggestions() {
    const { suggestions } = this.state;
    return suggestions.map((s => {
      let { option, selected } = s;
      return <div
        className="row"
        key={option.name}
        onClick={this.toggleOption.bind(this, s)}
      >
        <Checkbox
          color="hsl(200, 80%, 51%)"
          label={option.title}
          selected={selected}
          onClick={this.toggleOption.bind(this, s)}
        />
        </div>;
    }));
  }

  render() {
    const { onCancel, type } = this.props;
    const { newInstance, suggestions } = this.state;
    if (!newInstance) return null;

    const length = List(suggestions).filter((s) => s.selected).size;
    return <Modal
      className="suggestion-modal"
      title={`${type === 'dimensions' ? STRINGS.dimension : STRINGS.measure} ${STRINGS.suggestions}`}
      onClose={onCancel}
    >
      <form>
        {this.renderSuggestions()}
      </form>
      <div className="button-bar">
        <Button type="primary" title={`${STRINGS.add} ${length} ${type}`} disabled={length === 0} onClick={this.onAdd.bind(this)}/>
        <Button className="cancel" title="Cancel" type="secondary" onClick={onCancel}/>
      </div>

    </Modal>;
  }
}
