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

require('./data-cube-filter-modal.css');

import * as React from 'react';
import { findByName } from 'plywood';

import { DataCube } from "../../../common/models/data-cube/data-cube";
import { DATA_CUBE as LABELS } from '../../../common/models/labels';
import { FormLabel, Button, Modal, ImmutableInput } from '../../components/index';

import {
  ImmutableFormDelegate,
  ImmutableFormState
} from "../../delegates/immutable-form-delegate/immutable-form-delegate";
import { STRINGS } from "../../config/constants";

export interface DataCubeFilterModalProps extends React.Props<any> {
  onSave?: (dataCube: DataCube) => void;
  onClose?: () => void;
  dataCube?: DataCube;
}

export interface DataCubeFilterModalState extends ImmutableFormState<DataCube> {
}

export class DataCubeFilterModal extends React.Component<DataCubeFilterModalProps, DataCubeFilterModalState> {
  public mounted: boolean;
  private delegate: ImmutableFormDelegate<DataCube>;

  constructor() {
    super();
    this.delegate = new ImmutableFormDelegate<DataCube>(this);
  }

  initFromProps(props: DataCubeFilterModalProps) {
    if (props.dataCube) {
      this.setState({
        newInstance: new DataCube(props.dataCube.valueOf()),
        canSave: false,
        errors: {}
      });
    }
  }

  componentWillReceiveProps(nextProps: DataCubeFilterModalProps) {
    this.initFromProps(nextProps);
  }

  componentDidMount() {
    this.initFromProps(this.props);
  }

  validate(input: string) {
    const { newInstance } = this.state;
    return newInstance.validateFormula(input);
  }

  save() {
    const { canSave, newInstance } = this.state;
    const { onSave } = this.props;

    if (!canSave) return;
    onSave(newInstance);
  }

  render() {
    const { onClose } = this.props;
    const { newInstance, canSave, errors } = this.state;
    if (!newInstance) return null;
    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);

    return <Modal
      className="data-cube-filter-modal"
      onClose={onClose}
      onEnter={this.save.bind(this)}
      title={STRINGS.subsetFilter}
    >
      <form>
        {makeLabel('subsetFormula')}
        <ImmutableInput
          instance={newInstance}
          path={'subsetFormula'}
          onChange={this.delegate.onChange}
          type="textarea"
          validator={this.validate.bind(this)}
        />
        <div className="button-bar">
          <Button
            type="primary"
            title={`${STRINGS.ok}`}
            disabled={!canSave}
            onClick={this.save.bind(this)}
          />
          <Button className="cancel" title="Cancel" type="secondary" onClick={onClose}/>
        </div>
      </form>
    </Modal>;
  }
}
