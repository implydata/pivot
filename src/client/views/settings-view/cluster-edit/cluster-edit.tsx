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

require('./cluster-edit.css');

import * as React from 'react';
import * as Q from 'q';

import { Fn, pluralIfNeeded, makeTitle } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { NUM_REGEX } from '../../../../common/utils/string/string';
import { STRINGS } from '../../../config/constants';

import { FormLabel, Button, ImmutableInput, ImmutableDropdown, GlobalEventListener } from '../../../components/index';

import { ImmutableFormDelegate, ImmutableFormState } from '../../../delegates/index';

import { AppSettings, Cluster, ListItem, DataCube } from '../../../../common/models/index';

import { CLUSTER as LABELS } from '../../../../common/models/labels';

export interface ClusterEditProps extends React.Props<any> {
  cluster?: Cluster;
  onSave: (newCluster: Cluster) => Q.Promise<void>;
  isNewCluster?: boolean;
  onCancel?: () => void;
  getSuggestedCubes?: () => DataCube[];
}

export interface ClusterEditState extends ImmutableFormState<Cluster> {
  showCreateCubesModal?: boolean;
}

export class ClusterEdit extends React.Component<ClusterEditProps, ClusterEditState> {
  private delegate: ImmutableFormDelegate<Cluster>;

  constructor() {
    super();
    this.delegate = new ImmutableFormDelegate<Cluster>(this);
  }

  componentWillReceiveProps(nextProps: ClusterEditProps) {
    if (nextProps.cluster) {
      this.initFromProps(nextProps);
    }
  }

  initFromProps(props: ClusterEditProps) {
    this.setState({
      newInstance: new Cluster(props.cluster.valueOf()),
      canSave: true,
      errors: {}
    });
  }

  componentDidMount() {
    if (this.props.cluster) this.initFromProps(this.props);
  }

  cancel() {
    const { isNewCluster } = this.props;

    if (isNewCluster) {
      this.props.onCancel();
      return;
    }

    // Setting newInstance to undefined resets the inputs
    this.setState({newInstance: undefined}, () => this.initFromProps(this.props));
  }

  save() {
    if (this.props.onSave) this.props.onSave(this.state.newInstance);
  }

  goBack() {
    const { cluster } = this.props;
    var hash = window.location.hash;
    window.location.hash = hash.replace(`/${cluster.name}`, '');
  }

  renderGeneral(): JSX.Element {
    const { newInstance, errors } = this.state;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors);
    var makeTextInput = ImmutableInput.simpleGenerator(newInstance, this.delegate.onChange);
    var makeDropdownInput = ImmutableDropdown.simpleGenerator(newInstance, this.delegate.onChange);

    var needsAuth = ['mysql', 'postgres'].indexOf(newInstance.type) > -1;

    return <form className="general vertical">
      {makeLabel('title')}
      {makeTextInput('title', /.*/, true)}

      {makeLabel('host')}
      {makeTextInput('host', /.*/)}

      {makeLabel('type')}
      {makeDropdownInput('type', Cluster.TYPE_VALUES.map(type => {return {value: type, label: type}; }))}

      {makeLabel('timeout')}
      {makeTextInput('timeout', NUM_REGEX)}

      {makeLabel('version')}
      {makeTextInput('version')}

      {needsAuth ? makeLabel('database') : null}
      {needsAuth ? makeTextInput('database') : null}

      {needsAuth ? makeLabel('user') : null}
      {needsAuth ? makeTextInput('user') : null}

      {needsAuth ? makeLabel('password') : null}
      {needsAuth ? makeTextInput('password') : null}

    </form>;
  }

  onEnter() {
    if (this.state.canSave) this.save();
  }

  renderButtons(): JSX.Element {
    const { cluster, isNewCluster } = this.props;
    const { canSave, newInstance } = this.state;
    const hasChanged = !cluster.equals(newInstance);

    const cancelButton = <Button
      className="cancel"
      title={isNewCluster ? "Cancel" : "Revert changes"}
      type="secondary"
      onClick={this.cancel.bind(this)}
    />;

    const saveButton = <Button
      className={classNames("save", {disabled: !canSave || (!isNewCluster && !hasChanged)})}
      title={isNewCluster ? "Connect cluster" : "Save"}
      type="primary"
      onClick={this.save.bind(this)}
    />;

    if (!isNewCluster && !hasChanged) {
      return <div className="button-group">
        {saveButton}
      </div>;
    }

    return <div className="button-group">
      {cancelButton}
      {saveButton}
    </div>;
  }

  getTitle(): string {
    const { isNewCluster } = this.props;
    const { newInstance } = this.state;

    const lastBit = newInstance.title ? `: ${newInstance.title}` : '';

    return (isNewCluster ? STRINGS.connectCluster : STRINGS.editCluster) + lastBit;
  }

  render() {
    const { isNewCluster } = this.props;
    const { newInstance } = this.state;

    if (!newInstance) return null;

    return <div className="cluster-edit">
      <GlobalEventListener enter={this.onEnter.bind(this)}/>
      <div className="title-bar">
        {isNewCluster
          ? null
          : <Button
              className="button back"
              type="secondary"
              svg={require('../../../icons/full-back.svg')}
              onClick={this.goBack.bind(this)}
            />
        }
        <div className="title">{this.getTitle()}</div>
        {this.renderButtons()}
      </div>
      <div className="content">
        {this.renderGeneral()}
      </div>
    </div>;
  }
}
