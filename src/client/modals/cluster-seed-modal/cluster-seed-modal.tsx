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

require('./cluster-seed-modal.css');

import * as React from 'react';
import { SupportedType, Cluster } from "../../../common/models/cluster/cluster";

import { FormLabel, Button, Modal } from '../../components/index';
import { STRINGS } from "../../config/constants";
import { Dropdown } from "../../components/dropdown/dropdown";

export interface ClusterSeedModalProps extends React.Props<any> {
  next: (myInput: {host: string, type: SupportedType}) => void;
  onCancel: () => void;
}

export interface ClusterSeedModalState {
  host?: string;
  type?: SupportedType | "";
}

export class ClusterSeedModal extends React.Component<ClusterSeedModalProps, ClusterSeedModalState> {

  constructor() {
    super();
    this.state = {
      host: '',
      type: ''
    };
  }

  onHostChange(e: KeyboardEvent) {
    var host =  (e.target as HTMLInputElement).value; // todo: validation?
    this.setState({ host });
  }

  onTypeChange(type: SupportedType) {
    this.setState({ type });
  }

  render(): JSX.Element {
    const { next, onCancel } = this.props;
    const { host, type } = this.state;

    const TypeDropdown = Dropdown.specialize<SupportedType | "">();

    return <Modal
      className="cluster-seed-modal"
      title={STRINGS.connectNewCluster}
      onClose={this.props.onCancel}
    >
      <form>

        {FormLabel.dumbLabel('type')}
        <TypeDropdown
          items={Cluster.TYPE_VALUES}
          selectedItem={type}
          onSelect={this.onTypeChange.bind(this)}
        />

        {FormLabel.dumbLabel('host')}
        <input onChange={this.onHostChange.bind(this)} />

      </form>
      <div className="button-bar">
        <Button type="primary" title={`${STRINGS.next}: ${STRINGS.configureCluster}`} onClick={next.bind(this, {host, type})}/>
        <Button className="cancel" title="Cancel" type="secondary" onClick={onCancel}/>
      </div>

    </Modal>;
  }

}
