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


require('./attribute-modal.css');

import { STRINGS } from "../../config/constants";
import * as React from 'react';
import { AttributeInfo } from 'plywood';

import { ATTRIBUTE as LABELS } from '../../../common/models/labels';
import { ListItem } from "../../../common/models/list-item/list-item";

import { ImmutableFormDelegate, ImmutableFormState } from "../../delegates/index";
import { FormLabel, ImmutableDropdown, Modal, ImmutableInput, Checkbox, Button } from "../../components/index";

export interface AttributeModalProps extends React.Props<any> {
  attributeInfo: AttributeInfo;
  onSave?: (attribute: AttributeInfo) => void;
  onClose?: () => void;
  onAlternateClick?: () => void;
  onRemove?: () => void;
  mode?: 'create' | 'edit';
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
    {label: '', value: undefined},
    {label: 'Unique', value: 'unique'},
    {label: 'Theta', value: 'theta'},
    {label: 'Histogram', value: 'histogram'}
  ];

  static defaultProps = {
    mode: 'edit'
  };

  public mounted: boolean;
  private delegate: ImmutableFormDelegate<AttributeInfo>;

  constructor() {
    super();
    this.delegate = new ImmutableFormDelegate<AttributeInfo>(this);
  }

  initFromProps(props: AttributeModalProps) {
    if (props.attributeInfo) {
      this.setState({
        newInstance: new AttributeInfo(props.attributeInfo.valueOf()),
        canSave: props.mode === 'create',
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

  toggleSplittable() {
    const { newInstance } = this.state;
    let toggled = newInstance.change('unsplitable', !newInstance.unsplitable);
    return this.delegate.onChange(toggled, true, 'unsplitable', undefined);
  }

  renderAlternateButton() {
    const { onRemove, onAlternateClick, mode } = this.props;

    if (mode === 'create' && onAlternateClick) {
      return <Button className="alternate" title={STRINGS.orViewSuggestedAttributes} type="primary" onClick={onAlternateClick}/>;
    } else if (mode === 'edit' && onRemove) {
      return <Button className="warn" title={STRINGS.removeAttribute} type="warn" onClick={onRemove}/>;
    }

    return null;
  }

  renderButtons() {
    const { attributeInfo, onClose, mode, onRemove } = this.props;
    const { newInstance, canSave } = this.state;
    const saveButtonDisabled = !canSave || (mode === 'edit' && attributeInfo.equals(newInstance));

    const okText = mode === 'create' ? STRINGS.add : STRINGS.save;

    return <div className="grid-row button-bar">
      <div className="grid-col-50">
        <Button type="primary" title={okText} onClick={this.save.bind(this)} disabled={saveButtonDisabled} />
        <Button className="cancel" title={STRINGS.cancel} type="secondary" onClick={onClose}/>
      </div>
      <div className="grid-col-50 right">
        {this.renderAlternateButton()}
      </div>
    </div>;
  }

  render() {
    const { attributeInfo, onClose, mode, onRemove } = this.props;
    const { newInstance, canSave, errors } = this.state;
    const saveButtonDisabled = !canSave || attributeInfo.equals(newInstance);
    if (!newInstance) return null;
    let { unsplitable } = newInstance;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);
    var makeDropdownInput = ImmutableDropdown.simpleGenerator(newInstance, this.delegate.onChange);

    var title: string = null;
    let nameDiv: JSX.Element = null;
    if (mode === 'create') {
      var makeTextInput = ImmutableInput.simpleGenerator(newInstance, this.delegate.onChange);
      nameDiv = <div>
        {makeLabel('name')}
        {makeTextInput('name', /^.+$/, true)}
      </div>;
      title = `${STRINGS.add} ${STRINGS.attribute}`;
    } else {
      title = attributeInfo.name;
    }

    return <Modal
      className="attribute-modal"
      title={title}
      onClose={onClose}
      onEnter={this.save.bind(this)}
    >
      <form>
        {nameDiv}
        {makeLabel('type')}
        {makeDropdownInput('type', AttributeModal.TYPES)}
        {makeLabel('special')}
        {makeDropdownInput('special', AttributeModal.SPECIAL)}
        <div className="row" onClick={this.toggleSplittable.bind(this)}>
          <Checkbox label="Un-Splittable" selected={unsplitable}/>
        </div>
      </form>
      {this.renderButtons()}
    </Modal>;
  }
}
