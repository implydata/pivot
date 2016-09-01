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

import {
  ImmutableFormDelegate, ImmutableFormState,
  LoadingMessageDelegate, LoadingMessageState
} from '../../delegates/index';

export interface ClusterSeedModalProps extends React.Props<any> {
  onNext: (newCluster: Cluster, sources: string[]) => void;
  onCancel: () => void;
  clusters: Cluster[];
}

export interface ClusterSeedModalState extends ImmutableFormState<Cluster>, LoadingMessageState {}

export class ClusterSeedModal extends React.Component<ClusterSeedModalProps, ClusterSeedModalState> {
  private formDelegate: ImmutableFormDelegate<Cluster>;

  private mounted = false;

  // This delays the loading state by 250ms so it doesn't flicker in case the
  // server responds quickly
  private loadingDelegate: LoadingMessageDelegate;


  constructor() {
    super();
    this.formDelegate = new ImmutableFormDelegate<Cluster>(this);
    this.formDelegate.on('type', this.makeSureHostIsValid.bind(this));

    this.loadingDelegate = new LoadingMessageDelegate(this);
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
    this.mounted = true;
    this.initFromProps(this.props);
  }

  componentWillUnmount() {
    this.mounted = false;
    this.loadingDelegate.unmount();
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
          if (!this.mounted) return;

          this.loadingDelegate.stop();
          var cluster = Cluster.fromJS(resp.cluster);
          cluster = cluster
            .changeTitle(`My ${cluster.type} cluster`)
            .changeTimeout(Cluster.DEFAULT_TIMEOUT)
            ;
          this.props.onNext(cluster, resp.sources);
        },
        (xhr: XMLHttpRequest) => {
          if (!this.mounted) return;

          this.loadingDelegate.stop();
          console.error((xhr as any).message);
          Notifier.failure(`Couldn't connect to cluster`, 'Please check your parameters');
        }
      )
      .done();
  }

  onNext() {
    const { canSave } = this.state;
    if (canSave) {
      this.connect();
      this.loadingDelegate.start('Creating cluster…');
    }
  }

  render(): JSX.Element {
    const { onCancel } = this.props;
    const { newInstance, errors, canSave, loadingMessage, isLoading } = this.state;

    if (!newInstance) return null;
    let clusterType = newInstance.type;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);
    var makeTextInput = ImmutableInput.simpleGenerator(newInstance, this.formDelegate.onChange);
    var makeDropdownInput = ImmutableDropdown.simpleGenerator(newInstance, this.formDelegate.onChange);

    var extraSQLFields: JSX.Element = null;

    if (clusterType === 'mysql' || clusterType === 'postgres') {
      extraSQLFields = <div>
        {makeLabel('database')}
        {makeTextInput('database')}

        {makeLabel('user')}
        {makeTextInput('user')}

        {makeLabel('password')}
        {makeTextInput('password')}
      </div>;
    }

    return <Modal
      className="cluster-seed-modal"
      title={STRINGS.connectNewCluster}
      onClose={this.props.onCancel}
      onEnter={this.onNext.bind(this)}
      deaf={isLoading}
    >
      <form>
        {makeLabel('type')}
        {makeDropdownInput('type', Cluster.TYPE_VALUES.map(type => {return {value: type, label: type}; }))}

        {makeLabel('host')}
        {makeTextInput('host', /^.+$/, true)}

        {extraSQLFields}
      </form>

      {isLoading
        ? <LoadingBar label={loadingMessage}/>

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
