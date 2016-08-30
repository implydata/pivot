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

import { classNames } from '../../utils/dom/dom';
import { FormLabel, Button, Modal, ImmutableInput, ImmutableDropdown, LoadingBar } from '../../components/index';
import { STRINGS } from "../../config/constants";
import { Ajax } from '../../utils/ajax/ajax';
import { Notifier } from '../../components/notifications/notifications';
import { CLUSTER as LABELS } from '../../../common/models/labels';
import { generateUniqueName } from '../../../common/utils/string/string';
import { indexByAttribute } from '../../../common/utils/array/array';

import { ImmutableFormDelegate, ImmutableFormState } from '../../utils/immutable-form-delegate/immutable-form-delegate';

export interface ClusterSeedModalProps extends React.Props<any> {
  onNext: (newCluster: Cluster, sources: string[]) => void;
  onCancel: () => void;
  clusters: Cluster[];
}

export interface ClusterSeedModalState extends ImmutableFormState<Cluster> {
  loading?: boolean;
}

export class ClusterSeedModal extends React.Component<ClusterSeedModalProps, ClusterSeedModalState> {
  private delegate: ImmutableFormDelegate<Cluster>;

  constructor() {
    super();
    this.delegate = new ImmutableFormDelegate<Cluster>(this);
    this.delegate.on('type', this.makeSureHostIsValid.bind(this));
  }

  makeSureHostIsValid() {
    const { newInstance } = this.state;
    if (!newInstance.host) this.setState({canSave: false});
  }

  initFromProps(props: ClusterSeedModalProps) {
    const clusters = props.clusters;

    if (!clusters) return;

    this.setState({
      canSave: false,
      newInstance: new Cluster({
        name: generateUniqueName('cl', name => indexByAttribute(clusters, 'name', name) === -1),
        title: 'temp',
        type: 'druid'
      })
    });
  }

  componentWillReceiveProps(nextProps: ClusterSeedModalProps) {
    this.initFromProps(nextProps);
  }

  componentDidMount() {
    this.initFromProps(this.props);
  }

  connect() {
    Ajax.query({
      method: "POST",
      url: 'settings/cluster-connection',
      data: {
        cluster: this.state.newInstance
      }
    })
      .then(
        (resp) => {
          this.setState({loading: false});
          var cluster = Cluster.fromJS(resp.cluster);
          cluster = cluster.changeTitle(`My ${cluster.type} cluster`);
          this.props.onNext(cluster, resp.sources);
        },
        (xhr: XMLHttpRequest) => {
          this.setState({loading: false});
          Notifier.failure('Woops', 'Something bad happened');
        }
      )
      .done();
  }

  onNext() {
    this.connect();
    this.setState({loading: true});
  }

  render(): JSX.Element {
    const { onCancel } = this.props;
    const { newInstance, errors, canSave, loading } = this.state;

    if (!newInstance) return null;
    let clusterType = newInstance.type;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);
    var makeTextInput = ImmutableInput.simpleGenerator(newInstance, this.delegate.onChange);
    var makeDropdownInput = ImmutableDropdown.simpleGenerator(newInstance, this.delegate.onChange);

    var extraSQLFields: JSX.Element = null;

    if (clusterType === 'mysql' || clusterType === 'postgres') {
      extraSQLFields = <div>
        {makeLabel('database')}
        {makeTextInput('database', /^.+$/)}

        {makeLabel('user')}
        {makeTextInput('user', /^.+$/)}

        {makeLabel('password')}
        {makeTextInput('password')}
      </div>;
    }

    return <Modal
      className="cluster-seed-modal"
      title={STRINGS.connectNewCluster}
      onClose={this.props.onCancel}
      deaf={loading}
    >
      <form>
        {makeLabel('type')}
        {makeDropdownInput('type', Cluster.TYPE_VALUES.map(type => {return {value: type, label: type}; }))}

        {makeLabel('host')}
        {makeTextInput('host', /^.+$/)}

        {extraSQLFields}
      </form>

      {loading
        ? <LoadingBar label="Creating cluster…"/>

        : <div className="button-bar">
          <Button
            className={classNames("save", {disabled: !canSave})}
            type="primary"
            title={`${STRINGS.next}: ${STRINGS.configureCluster}`}
            onClick={this.onNext.bind(this)}
          />
          <Button className="cancel" title="Cancel" type="secondary" onClick={onCancel}/>
        </div>
      }

    </Modal>;
  }
}
