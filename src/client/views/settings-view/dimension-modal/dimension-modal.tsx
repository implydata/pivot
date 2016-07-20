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

require('./dimension-modal.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames, enterKey } from '../../../utils/dom/dom';


import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
import { Modal } from '../../../components/modal/modal';
import { ImmutableDropdown } from '../../../components/immutable-dropdown/immutable-dropdown';

import { Dimension, ListItem } from '../../../../common/models/index';


export interface DimensionModalProps extends React.Props<any> {
  dimension?: Dimension;
  onSave?: (dimension: Dimension) => void;
  onClose?: () => void;
  isCreating?: boolean;
}

export interface DimensionModalState {
  newDimension?: Dimension;
  canSave?: boolean;
}

export class DimensionModal extends React.Component<DimensionModalProps, DimensionModalState> {
  static KINDS: ListItem[] = [
    {label: 'Time', value: 'time'},
    {label: 'String', value: 'string'},
    {label: 'Boolean', value: 'boolean'},
    {label: 'String-geo', value: 'string-geo'}
  ];

  constructor() {
    super();
    this.state = {
      canSave: false
    };
  }

  initStateFromProps(props: DimensionModalProps) {
    if (props.dimension) {
      this.setState({
        newDimension: new Dimension(props.dimension.valueOf()),
        canSave: true
      });
    }
  }

  componentWillReceiveProps(nextProps: DimensionModalProps) {
    this.initStateFromProps(nextProps);
  }

  componentDidMount() {
    this.initStateFromProps(this.props);
  }

  onChange(newDimension: Dimension, isValid: boolean) {
    if (isValid) {
      this.setState({
        newDimension,
        canSave: !this.props.dimension.equals(newDimension)
      });
    } else {
      this.setState({
        canSave: false
      });
    }
  }

  save() {
    this.props.onSave(this.state.newDimension);
  }

  render(): JSX.Element {
    const { isCreating, dimension } = this.props;
    const { newDimension, canSave } = this.state;

    if (!newDimension) return null;

    // This dropdown is so kind
    const KindDropDown = ImmutableDropdown.specialize<ListItem>();

    return <Modal
      className="dimension-modal"
      title={dimension.title}
      onClose={this.props.onClose}
      onEnter={this.save.bind(this)}
    >
      <form className="general vertical">
        { isCreating ? <FormLabel label="Name (you won't be able to change this later)"></FormLabel> : null }
        { isCreating ?
        <ImmutableInput
          focusOnStartUp={isCreating}
          instance={newDimension}
          path={'name'}
          onChange={this.onChange.bind(this)}
          validator={/^.+$/}
        />
        : null }

        <FormLabel label="Title"></FormLabel>
        <ImmutableInput
          focusOnStartUp={!isCreating}
          instance={newDimension}
          path={'title'}
          onChange={this.onChange.bind(this)}
          validator={/^.+$/}
        />

        <FormLabel label="Kind"></FormLabel>
        <KindDropDown
          items={DimensionModal.KINDS}
          instance={newDimension}
          path={'kind'}
          equal={(a: ListItem, b: ListItem) => a.value === b.value}
          renderItem={(a: ListItem) => a.label}
          keyItem={(a: ListItem) => a.value}
          onChange={this.onChange.bind(this)}
        />

        <FormLabel label="Formula"></FormLabel>
        <ImmutableInput
          instance={newDimension}
          path={'formula'}
          onChange={this.onChange.bind(this)}
          validator={/^.+$/}
        />

      </form>

      <div className="button-group">
        {canSave ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
        <Button className="cancel" title="Cancel" type="secondary" onClick={this.props.onClose}/>
      </div>

    </Modal>;
  }

}
