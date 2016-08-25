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


import { STRINGS } from "../../config/constants";
require('./attribute-modal.css');

import * as React from 'react';
import { AttributeInfo } from 'plywood';

import { ATTRIBUTE as LABELS } from '../../../common/models/labels';
import { ListItem } from "../../../common/models/list-item/list-item";

import { ImmutableFormDelegate, ImmutableFormState } from "../../utils/immutable-form-delegate/immutable-form-delegate";
import { FormLabel, ImmutableDropdown, Modal, ImmutableInput, Checkbox, Button } from "../../components/index";

const SELECTED = "hsl(200, 80%, 51%)";
const UNSELECTED = "#cccccc";

export interface AttributeModalProps extends React.Props<any> {
  attributeInfo: AttributeInfo;
  onSave?: (attribute: AttributeInfo) => void;
  onClose?: () => void;
}

export interface AttributeModalState extends ImmutableFormState<AttributeInfo> {
}

export class AttributeModal extends React.Component<AttributeModalProps, AttributeModalState> {
  static TYPES: ListItem[] = [
    {label: 'Time', value: 'TIME'},
    {label: 'String', value: 'STRING'},
    {label: 'Set/String', value: 'SET/STRING'},
    {label: 'Boolean', value: 'BOOLEAN'},
    {label: 'Number', value: 'NUMBER'}
  ];


  static SPECIAL: ListItem[] = [
    {label: 'Unique', value: 'unique'},
    {label: 'Theta', value: 'theta'},
    {label: 'Histogram', value: 'histogram'}
  ];

  public mounted: boolean;
  private delegate: ImmutableFormDelegate<AttributeInfo>;

  constructor() {
    super();
    this.delegate = new ImmutableFormDelegate<AttributeInfo>(this);
    // this.state = {};

  }

  initFromProps(props: AttributeModalProps) {
    if (props.attributeInfo) {
      this.setState({
        newInstance: new AttributeInfo(props.attributeInfo.valueOf()),
        canSave: false,
        errors: {}
      });
    }
  }

  componentWillReceiveProps(nextProps: AttributeModalProps) {
    this.initFromProps(nextProps);
  }

  componentDidMount() {
    this.initFromProps(this.props);
  }

  save() {
    if (!this.state.canSave) return;
    this.props.onSave(this.state.newInstance);
  }

  updateThing() {
    const { newInstance } = this.state;
    let toggled = newInstance.change('unsplitable', !newInstance.unsplitable);
    return this.delegate.onChange(toggled, true, 'unsplitable', undefined);
  }

  render() {
    const { attributeInfo, onClose } = this.props;
    const { newInstance, canSave, errors } = this.state;
    const saveButtonDisabled = !canSave || attributeInfo.equals(newInstance);
    if (!newInstance) return null;
    let { unsplitable } = newInstance;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);
    var makeDropdownInput = ImmutableDropdown.simpleGenerator(newInstance, this.delegate.onChange);

    return <Modal
      className="cluster-seed-modal"
      title={attributeInfo.name}
      onClose={onClose}
    >
      <form>
        {makeLabel('type')}
        {makeDropdownInput('type', AttributeModal.TYPES)}
        {makeLabel('special')}
        {makeDropdownInput('special', AttributeModal.SPECIAL)}
        <div
          className="row"
          onClick={this.updateThing.bind(this)}
        >
          <Checkbox
            color={unsplitable ? SELECTED : UNSELECTED}
            label="Un-Splittable"
            selected={unsplitable}
          />
        </div>
      </form>
      <div className="button-bar">
        <Button type="primary" title={STRINGS.save} onClick={this.save.bind(this)} disabled={saveButtonDisabled} />
        <Button className="cancel" title={STRINGS.cancel} type="secondary" onClick={onClose}/>
      </div>
    </Modal>;
  }
}
