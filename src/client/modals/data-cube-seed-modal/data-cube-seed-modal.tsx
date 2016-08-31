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

require('./data-cube-seed-modal.css');

import * as React from 'react';
import { AttributeInfo, findByName } from 'plywood';
import { DataCube, Cluster } from "../../../common/models/index";

import { FormLabel, Button, Modal, ImmutableInput, Dropdown, Checkbox, LoadingBar, Notifier } from '../../components/index';
import { STRINGS } from "../../config/constants";
import { Ajax } from '../../utils/ajax/ajax';
import { DATA_CUBE as LABELS } from '../../../common/models/labels';
import { makeTitle } from "../../../common/utils/general/general";
import { generateUniqueName } from '../../../common/utils/string/string';
import { indexByAttribute } from '../../../common/utils/array/array';

import { LoadingMessageDelegate, LoadingMessageState } from '../../delegates/index';

export interface DataCubeSeedModalProps extends React.Props<any> {
  onNext: (newDataCube: DataCube) => void;
  onCancel: () => void;
  dataCubes: DataCube[];
  clusters: Cluster[];
}

export interface ClusterSource {
  cluster: Cluster;
  source: string;
}

export interface DataCubeSeedModalState extends LoadingMessageState {
  newInstance?: DataCube;
  autoFill?: boolean;
  clusterSources?: ClusterSource[];
  clusterSource?: ClusterSource;
  loadingMessage?: string;
}

export class DataCubeSeedModal extends React.Component<DataCubeSeedModalProps, DataCubeSeedModalState> {
  private mounted = false;

  // This delays the loading state by 250ms so it doesn't flicker in case the
  // server responds quickly
  private loadingDelegate: LoadingMessageDelegate;

  constructor() {
    super();
    this.state = {
      autoFill: true,
      clusterSources: [],
      clusterSource: null
    };

    this.loadingDelegate = new LoadingMessageDelegate(this);
  }

  initFromProps(props: DataCubeSeedModalProps) {
    this.setState({
      newInstance: null
    });
  }

  componentWillreceiveProps(nextProps: DataCubeSeedModalProps) {
    this.initFromProps(nextProps);
  }

  componentDidMount() {
    // To make sure the "Create new data cube" buttons has lost focus
    (document.activeElement as any).blur();

    this.mounted = true;
    this.initFromProps(this.props);

    this.loadingDelegate.start('Loading clusters…');

    Ajax.query({ method: "GET", url: 'settings/cluster-sources' })
      .then(
        (resp) => {
          if (!this.mounted) return;
          const { clusters } = this.props;

          var clusterSources = resp.clusterSources.map((cs: { clusterName: string, source: string }): ClusterSource => {
            return {
              cluster: findByName(clusters, cs.clusterName),
              source: cs.source
            };
          });

          this.loadingDelegate.stop();

          this.setState({
            clusterSources,
            clusterSource: clusterSources[0] || null
          });
        },
        (e: Error) => {
          if (!this.mounted) return;
          this.loadingDelegate.stop();
          Notifier.failure('Sorry', `There was a problem loading sources ${e.message}`);
        }
      ).done();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  onNext() {
    const { dataCubes, clusters } = this.props;
    if (!dataCubes || !clusters) return;
    var { clusterSource, autoFill } = this.state;
    if (!clusterSource) return;

    var newDataCube = DataCube.fromClusterAndSource(
      generateUniqueName('dc', name => indexByAttribute(dataCubes, 'name', name) === -1),
      clusterSource.cluster,
      clusterSource.source
    );

    this.loadingDelegate.start('Creating cube…');

    Ajax.query({
      method: "POST",
      url: 'settings/attributes',
      data: {
        clusterName: newDataCube.clusterName,
        source: newDataCube.source
      }
    })
      .then(
        (resp) => {
          var attributes = AttributeInfo.fromJSs(resp.attributes);
          if (autoFill) {
            newDataCube = newDataCube.fillAllFromAttributes(attributes);
          } else {
            newDataCube = newDataCube.changeAttributes(attributes);
          }

          this.loadingDelegate.stop();
          this.props.onNext(newDataCube);
        },
        (xhr: XMLHttpRequest) => {
          this.loadingDelegate.stop();
          Notifier.failure('Woops', 'Something bad happened');
        }
      )
      .done();
  }

  toggleAutoFill() {
    this.setState({
      autoFill: !this.state.autoFill
    });
  }

  onClusterSourceChange(selectedClusterSource: ClusterSource): void {
    const { dataCubes, clusters } = this.props;
    if (!dataCubes || !clusters) return;

    var cubeName = generateUniqueName('dc', name => indexByAttribute(dataCubes, 'name', name) === -1);

    this.setState({
      clusterSource: selectedClusterSource
    });
  }

  render(): JSX.Element {
    const { onNext, onCancel } = this.props;
    const { autoFill, clusterSources, clusterSource, loadingMessage, isLoading } = this.state;

    let ClusterSourceDropdown = Dropdown.specialize<ClusterSource>();

    return <Modal
      className="data-cube-seed-modal"
      title={STRINGS.createDataCube}
      onClose={this.props.onCancel}
      onEnter={this.onNext.bind(this)}
      deaf={isLoading}
    >
      <form>
        { FormLabel.dumbLabel('Source') }

        <ClusterSourceDropdown
          items={clusterSources}
          selectedItem={clusterSource}
          renderItem={(cs: ClusterSource) => cs ? `${cs.cluster.title}: ${cs.source}` : ''}
          keyItem={(cs: ClusterSource) => cs ? `${cs.cluster.name}_${cs.source}` : ''}
          onSelect={this.onClusterSourceChange.bind(this)}
        />

        <Checkbox
          selected={autoFill}
          onClick={this.toggleAutoFill.bind(this)}
          label={STRINGS.autoFillDimensionsAndMeasures}
        />
      </form>

      {isLoading
        ? <LoadingBar label={loadingMessage}/>
        : <div className="button-bar">
          <Button
            type="primary"
            title={`${STRINGS.next}: ${STRINGS.configureDataCube}`}
            disabled={!clusterSource}
            onClick={this.onNext.bind(this)}
          />
          <Button className="cancel" title="Cancel" type="secondary" onClick={onCancel}/>
        </div>
      }

    </Modal>;
  }
}
