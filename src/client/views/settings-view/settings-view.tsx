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

require('./settings-view.css');

import * as React from 'react';
import * as Q from 'q';

import { AttributeInfo } from 'plywood';
import { DataCube, User, Customization } from '../../../common/models/index';
import { MANIFESTS } from '../../../common/manifests/index';
import { STRINGS } from '../../config/constants';
import { Fn, pluralIfNeeded } from '../../../common/utils/general/general';
import { Ajax } from '../../utils/ajax/ajax';
import { indexByAttribute } from '../../../common/utils/array/array';
import { ImmutableUtils } from '../../../common/utils/immutable-utils/immutable-utils';

import { classNames } from '../../utils/dom/dom';
import { Notifier } from '../../components/notifications/notifications';

import { Button, SvgIcon, Router, Route } from '../../components/index';

import { ClusterSeedModal, DataCubeSeedModal, SuggestionModal, SuggestionModalAction } from '../../modals/index';

import { AppSettings, Cluster } from '../../../common/models/index';

import { SettingsHeaderBar } from './settings-header-bar/settings-header-bar';

import { Clusters } from './clusters/clusters';
import { ClusterEdit } from './cluster-edit/cluster-edit';
import { DataCubes } from './data-cubes/data-cubes';
import { DataCubeEdit } from './data-cube-edit/data-cube-edit';
import { Other } from './other/other';

export interface SettingsViewProps extends React.Props<any> {
  user?: User;
  customization?: Customization;
  onNavClick?: Fn;
  onSettingsChange?: (settings: AppSettings) => void;
}

export interface TempCubes {
  names: string[];
  cluster: Cluster;
}

export interface SettingsViewState {
  settings?: AppSettings;
  breadCrumbs?: string[];

  tempCluster?: Cluster;
  tempClusterSources?: TempCubes;
  tempDataCube?: DataCube;
}

const PATHS = {
  clusters: 'clusters',
  dataCubes: 'data-cubes',
  newDataCube: 'new-data-cube',
  other: 'other'
};

const VIEWS = [
  {label: 'Clusters', value: PATHS.clusters, svg: require('../../icons/full-cluster.svg')},
  {label: 'Data Cubes', value: PATHS.dataCubes, svg: require('../../icons/full-cube.svg')},
  {label: 'Other', value: PATHS.other, svg: require('../../icons/full-more.svg')}
];

function autoFillDataCube(dataCube: DataCube, cluster: Cluster): Q.Promise<DataCube> {
  return Ajax.query({
    method: "POST",
    url: 'settings/attributes',
    data: {
      cluster: cluster,
      source: dataCube.source
    }
  })
    .then((resp) => {
      var attributes = AttributeInfo.fromJSs(resp.attributes);
      return dataCube.fillAllFromAttributes(attributes);
    });
}

export class SettingsView extends React.Component<SettingsViewProps, SettingsViewState> {
  private mounted = false;

  constructor() {
    super();
    this.state = {};
  }

  componentDidMount() {
    this.mounted = true;

    Ajax.query({ method: "GET", url: 'settings' })
      .then(
        (resp) => {
          if (!this.mounted) return;
          this.setState({
            settings: AppSettings.fromJS(resp.appSettings, { visualizations: MANIFESTS })
          });
        },
        (e: Error) => {
          if (!this.mounted) return;
          Notifier.failure('Sorry', `The settings couldn't be loaded ${e.message}`);
        }
      ).done();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  onSave(settings: AppSettings, okMessage?: string): Q.Promise<any> {
    const { onSettingsChange } = this.props;

    return Ajax.query({
      method: "POST",
      url: 'settings',
      data: {appSettings: settings}
    })
      .then(
        (status) => {
          this.setState({settings});
          if (okMessage !== null) {
            Notifier.clear();
            Notifier.success(okMessage || 'Settings saved');
          }

          if (onSettingsChange) {
            onSettingsChange(settings.toClientSettings());
          }
        },
        (e: Error) => Notifier.failure('Woops', 'Something bad happened')
      );
  }

  selectTab(value: string) {
    window.location.hash = `settings/${value}`;
    this.setState({
      tempCluster: null,
      tempClusterSources: null,
      tempDataCube: null
    });
  }

  renderLeftButtons(breadCrumbs: string[]): JSX.Element[] {
    if (!breadCrumbs || !breadCrumbs.length) return [];

    return VIEWS.map(({label, value, svg}) => {
      return <Button
        className={classNames({active: breadCrumbs[0] === value})}
        title={label}
        type="primary"
        svg={svg}
        key={value}
        onClick={this.selectTab.bind(this, value)}
      />;
    });
  }

  onURLChange(breadCrumbs: string[]) {
    this.setState({breadCrumbs});
  }


  // -- Cluster creation flow

  createCluster(newCluster: Cluster, sources: string[]) {
    this.setState({
      tempCluster: newCluster,
      tempClusterSources: {
        names: sources,
        cluster: newCluster
      }
    });
  }

  addCluster(newCluster: Cluster) {
    var { settings } = this.state;
    settings = ImmutableUtils.addInArray(settings, 'clusters', newCluster);

    this.onSave(settings, 'Cluster created').then(this.backToClustersView.bind(this));
  }

  backToClustersView() {
    this.setState({
      tempCluster: null
    });
    window.location.hash = '#settings/clusters';
  }

  updateCluster(newCluster: Cluster) {
    const { settings } = this.state;

    const index = indexByAttribute(settings.clusters, 'name', newCluster.name);

    this.onSave(
      ImmutableUtils.addInArray(settings, 'clusters', newCluster, index)
    ).then(this.backToClustersView.bind(this));
  }

  addDependantCubes(cluster: Cluster, cubes: DataCube[]) {
    return Q.all(cubes.map((cube) => autoFillDataCube(cube, cluster)))
      .then(this.addDataCubes.bind(this))
      .then(
        () => {
          Notifier.clear();
          Notifier.success('Data cubes created', {
            label: 'View first one',
            callback: () => window.location.hash = `#settings/${PATHS.dataCubes}/${cubes[0].name}`
          });
        },
        (e: Error) => {
          console.error(e);
          Notifier.failure('Woops', 'Something bad happened');
        }
      );
  }

  renderCreateCubesModal(): JSX.Element {
    const { settings, tempClusterSources } = this.state;
    const { names, cluster } = tempClusterSources;

    const CubesSuggestionModal = SuggestionModal.specialize<DataCube>();

    const closeModal = () => this.setState({tempClusterSources: null});

    const onOk: SuggestionModalAction<DataCube> = {
      label: (n) => `${STRINGS.create} ${pluralIfNeeded(n, 'data cube')}`,
      callback: (cubes: DataCube[]) => this.addDependantCubes(cluster, cubes).then(closeModal)
    };

    const onDoNothing: SuggestionModalAction<DataCube> = {
      label: () => STRINGS.noIllCreateThem,
      callback: closeModal
    };

    const suggestions = tempClusterSources.names.map((source, i) => {
      // ToDo: make the name generation here better;
      let cube = DataCube.fromClusterAndSource(`${cluster.name}_${i}`, cluster, source);
      return {label: cube.title, value: cube};
    });

    return <CubesSuggestionModal
      onOk={onOk}
      onDoNothing={onDoNothing}
      onClose={closeModal}
      suggestions={suggestions}
      title={STRINGS.createDataCubesFromCluster}
    />;
  }

  // !-- Cluster creation flow

  // -- DataCubes creation flow
  createDataCube(newDataCube: DataCube) {
    this.setState({
      tempDataCube: newDataCube
    });
  }

  addDataCube(newDataCube: DataCube) {
    this.onSave(
      this.state.settings.appendDataCubes([newDataCube]),
      'Data cube created'
    ).then(this.backToDataCubesView.bind(this));
  }

  addDataCubes(dataCubes: DataCube[]) {
    return this.onSave(this.state.settings.appendDataCubes(dataCubes), null);
  }

  backToDataCubesView() {
    window.location.hash = `#settings/${PATHS.dataCubes}`;

    this.setState({
      tempDataCube: null
    });
  }

  updateDataCube(newDataCube: DataCube) {
    const { settings } = this.state;

    const index = indexByAttribute(settings.dataCubes, 'name', newDataCube.name);

    this.onSave(
      ImmutableUtils.addInArray(settings, 'dataCubes', newDataCube, index)
    ).then(this.backToDataCubesView.bind(this));
  }
  // !-- DataCubes creation flow


  shouldHaveLeftButtons(): boolean {
    const { breadCrumbs } = this.state;

    if (!breadCrumbs) return true;

    if (breadCrumbs.length === 1) return true;

    if (breadCrumbs[0] === PATHS.dataCubes && breadCrumbs[1] !== PATHS.newDataCube) return false;

    return true;
  }

  render() {
    const { user, onNavClick, customization } = this.props;
    const { settings, breadCrumbs, tempCluster, tempClusterSources, tempDataCube } = this.state;

    if (!settings) return null;

    const hasLeftButtons = this.shouldHaveLeftButtons();

    const inflateCluster = (key: string, value: string): {key: string, value: any} => {
      if (key !== 'clusterId') return {key, value};

      // TODO : Here we could redirect to another location if the cluster is nowhere to be found.
      // Something along the lines of "This cluster doesn't exist. Or we lost it. We're not sure."

      return {
        key: 'cluster',
        value: settings.clusters.filter((d) => d.name === value)[0]
      };
    };

    const inflateDataCube = (key: string, value: string): {key: string, value: any} => {
      if (key !== 'dataCubeId') return {key, value};

      return {
        key: 'dataCube',
        value: settings.dataCubes.filter((d) => d.name === value)[0]
      };
    };

    return <div className='settings-view'>

      <SettingsHeaderBar
        user={user}
        onNavClick={onNavClick}
        customization={customization}
        title={STRINGS.settings}
      />

      { hasLeftButtons
        ? <div className="left-panel">
            {this.renderLeftButtons(breadCrumbs)}
          </div>
        : null
      }

      <div className={classNames('main-panel', {'full-width': !hasLeftButtons})}>

        <Router rootFragment="settings" onURLChange={this.onURLChange.bind(this)}>

          <Route fragment={PATHS.clusters}>
            <Clusters settings={settings} onSave={this.onSave.bind(this)}/>
            { tempClusterSources ? this.renderCreateCubesModal() : null }

            <Route fragment="new-cluster">
              { tempCluster ? null : <Clusters settings={settings} onSave={this.onSave.bind(this)}/> }

              { tempCluster
                ? <ClusterEdit
                    isNewCluster={true}
                    cluster={tempCluster}
                    onSave={this.addCluster.bind(this)}
                    onCancel={this.backToClustersView.bind(this)}
                  />
                : <ClusterSeedModal
                    onNext={this.createCluster.bind(this)}
                    onCancel={this.backToClustersView.bind(this)}
                    clusters={settings.clusters}
                  />
              }
            </Route>

            <Route fragment=":clusterId" inflate={inflateCluster}>
              <ClusterEdit onSave={this.updateCluster.bind(this)}/>
            </Route>
          </Route>

          <Route fragment={PATHS.dataCubes}>
            <DataCubes settings={settings} onSave={this.onSave.bind(this)}/>

            <Route fragment={PATHS.newDataCube}>
              { tempDataCube ? null : <DataCubes settings={settings} onSave={this.onSave.bind(this)}/> }

              { tempDataCube
                ? <DataCubeEdit
                    clusters={settings.clusters}
                    isNewDataCube={true}
                    dataCube={tempDataCube}
                    onSave={this.addDataCube.bind(this)}
                    onCancel={this.backToDataCubesView.bind(this)}
                  />
                : <DataCubeSeedModal
                    onNext={this.createDataCube.bind(this)}
                    onCancel={this.backToDataCubesView.bind(this)}
                    dataCubes={settings.dataCubes}
                    clusters={settings.clusters}
                  />
              }
            </Route>

            <Route fragment=":dataCubeId/:tab=general"  inflate={inflateDataCube}>
              <DataCubeEdit onSave={this.updateDataCube.bind(this)} clusters={settings.clusters}/>
            </Route>

          </Route>

          <Route fragment={PATHS.other}>
            <Other settings={settings} onSave={this.onSave.bind(this)}/>
          </Route>

        </Router>
      </div>
     </div>;
  }
}
