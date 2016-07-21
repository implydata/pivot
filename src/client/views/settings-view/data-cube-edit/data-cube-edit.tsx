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

require('./data-cube-edit.css');

import * as React from 'react';
import { List } from 'immutable';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';

import { Duration, Timezone } from 'chronoshift';

import { DATA_CUBES_STRATEGIES_LABELS } from '../../../config/constants';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { SimpleList } from '../../../components/simple-list/simple-list';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
import { ImmutableList } from '../../../components/immutable-list/immutable-list';
import { ImmutableDropdown } from '../../../components/immutable-dropdown/immutable-dropdown';

import { DimensionModal } from '../dimension-modal/dimension-modal';
import { MeasureModal } from '../measure-modal/measure-modal';

import { AppSettings, ListItem, Cluster, DataCube, Dimension, DimensionJS, Measure, MeasureJS } from '../../../../common/models/index';

import { CUBE_EDIT as LABELS } from '../utils/labels';


export interface DataCubeEditProps extends React.Props<any> {
  settings: AppSettings;
  cubeId?: string;
  tab?: string;
  onSave: (settings: AppSettings) => void;
}

export interface DataCubeEditState {
  tab?: any;
  cube?: DataCube;

  tempCube?: DataCube;
  hasChanged?: boolean;
  canSave?: boolean;
  errors?: any;
}

export interface Tab {
  label: string;
  value: string;
  render: () => JSX.Element;
}


export class DataCubeEdit extends React.Component<DataCubeEditProps, DataCubeEditState> {
  private tabs: Tab[] = [
    {label: 'General', value: 'general', render: this.renderGeneral},
    {label: 'Dimensions', value: 'dimensions', render: this.renderDimensions},
    {label: 'Measures', value: 'measures', render: this.renderMeasures}
  ];

  constructor() {
    super();

    this.state = {hasChanged: false, errors: {}};
  }

  componentWillReceiveProps(nextProps: DataCubeEditProps) {
    if (nextProps.settings) {
      this.initFromProps(nextProps);
    }
  }

  initFromProps(props: DataCubeEditProps) {
    let cube = props.settings.dataCubes.filter((d) => d.name === props.cubeId)[0];

    this.setState({
      tempCube: new DataCube(cube.valueOf()),
      hasChanged: false,
      canSave: true,
      errors: {},
      cube,
      tab: this.tabs.filter((tab) => tab.value === props.tab)[0]
    });
  }

  selectTab(tab: string) {
    var hash = window.location.hash.split('/');
    hash.splice(-1);
    window.location.hash = hash.join('/') + '/' + tab;
  }

  renderTabs(activeTab: Tab): JSX.Element[] {
    return this.tabs.map(({label, value}) => {
      return <button
        className={classNames({active: activeTab.value === value})}
        key={value}
        onClick={this.selectTab.bind(this, value)}
      >{label}</button>;
    });
  }

  cancel() {
    this.setState({tempCube: undefined}, () => this.initFromProps(this.props));
  }

  save() {
    const { settings } = this.props;
    const { tempCube, cube } = this.state;

    var newCubes = settings.dataCubes;
    newCubes[newCubes.indexOf(cube)] = tempCube;
    var newSettings = settings.changeDataCubes(newCubes);

    if (this.props.onSave) {
      this.props.onSave(newSettings);
    }
  }

  goBack() {
    const { cubeId, tab } = this.props;
    var hash = window.location.hash;
    window.location.hash = hash.replace(`/${cubeId}/${tab}`, '');
  }

  onChange(newCube: DataCube, isValid: boolean, path: string, error: string) {
    const { cube, errors } = this.state;

    errors[path] = isValid ? false : error;

    const hasChanged = !isValid || !cube.equals(newCube);

    var canSave = true;
    for (let key in errors) canSave = canSave && (errors[key] === false);

    if (isValid) {
      this.setState({
        tempCube: newCube,
        canSave,
        errors,
        hasChanged
      });
    } else {
      this.setState({
        canSave,
        errors,
        hasChanged
      });
    }
  }

  getIntrospectionStrategies(): ListItem[] {
    const labels = DATA_CUBES_STRATEGIES_LABELS as any;

    return [{
      label: `Default (${labels[DataCube.DEFAULT_INTROSPECTION]})`,
      value: undefined
    }].concat(DataCube.INTROSPECTION_VALUES.map((value) => {
      return {value, label: labels[value]};
    }));
  }

  renderGeneral(): JSX.Element {
    const { tempCube, errors } = this.state;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors);
    var makeTextInput = ImmutableInput.simpleGenerator(tempCube, this.onChange.bind(this));
    var makeDropDownInput = ImmutableDropdown.simpleGenerator(tempCube, this.onChange.bind(this));

    return <form className="general vertical">
      {makeLabel('title')}
      {makeTextInput('title', /^.+$/, true)}

      {makeLabel('description')}
      {makeTextInput('description')}

      {makeLabel('clusterName')}
      {makeDropDownInput('clusterName', Cluster.TYPE_VALUES.map(type => {return {value: type, label: type}; }))}

      {makeLabel('introspection')}
      {makeDropDownInput('introspection', this.getIntrospectionStrategies())}

      {makeLabel('source')}
      {makeTextInput('source')}

      {makeLabel('defaultDuration')}
      <ImmutableInput
        instance={tempCube}
        path={'defaultDuration'}
        onChange={this.onChange.bind(this)}

        valueToString={(value: Duration) => value ? value.toJS() : undefined}
        stringToValue={(str: string) => str ? Duration.fromJS(str) : undefined}
      />

      {makeLabel('defaultTimezone')}
      <ImmutableInput
        instance={tempCube}
        path={'defaultTimezone'}
        onChange={this.onChange.bind(this)}

        valueToString={(value: Timezone) => value ? value.toJS() : undefined}
        stringToValue={(str: string) => str ? Timezone.fromJS(str) : undefined}
      />

      {makeLabel('defaultSortMeasure')}
      {makeDropDownInput('defaultSortMeasure', tempCube.measures.map(m => { return { value: m.name, label: m.title } ; }).toArray()) }

    </form>;
  }

  renderDimensions(): JSX.Element {
    const { tempCube } = this.state;

    const onChange = (newDimensions: List<Dimension>) => {
      const newCube = tempCube.changeDimensions(newDimensions);
      this.setState({
        tempCube: newCube,
        hasChanged: !this.state.cube.equals(newCube)
      });
    };

    const getModal = (item: Dimension) => <DimensionModal dimension={item}/>;

    const getNewItem = () => Dimension.fromJS({name: 'new-dimension'});

    const getRows = (items: List<Dimension>) => items.toArray().map((dimension) => {
      return {
        title: dimension.title,
        description: dimension.expression.toString(),
        icon: `dim-${dimension.kind}`
      };
    });

    const DimensionsList = ImmutableList.specialize<Dimension>();

    return <DimensionsList
      label="Dimensions"
      items={tempCube.dimensions}
      onChange={onChange.bind(this)}
      getModal={getModal}
      getNewItem={getNewItem}
      getRows={getRows}
    />;
  }

  renderMeasures(): JSX.Element {
    var { tempCube } = this.state;

    const onChange = (newMeasures: List<Measure>) => {

      var { defaultSortMeasure } = tempCube;

      if (defaultSortMeasure) {
        if (!newMeasures.find((measure) => measure.name === defaultSortMeasure)) {
          tempCube = tempCube.changeDefaultSortMeasure(newMeasures.get(0).name);
        }
      }

      const newCube = tempCube.changeMeasures(newMeasures);
      this.setState({
        tempCube: newCube,
        hasChanged: !this.state.cube.equals(newCube)
      });
    };

    const getModal = (item: Measure) => <MeasureModal measure={item}/>;

    const getNewItem = () => Measure.fromJS({name: 'new-measure'});

    const getRows = (items: List<Measure>) => items.toArray().map((measure) => {
      return {
        title: measure.title,
        description: measure.expression.toString(),
        icon: `measure`
      };
    });

    const MeasuresList = ImmutableList.specialize<Measure>();

    return <MeasuresList
      label="Measures"
      items={tempCube.measures}
      onChange={onChange.bind(this)}
      getModal={getModal}
      getNewItem={getNewItem}
      getRows={getRows}
    />;
  }

  renderButtons(): JSX.Element {
    const { hasChanged, canSave } = this.state;

    const cancelButton = <Button
      className="cancel"
      title="Revert changes"
      type="secondary"
      onClick={this.cancel.bind(this)}
    />;

    const saveButton = <Button
      className={classNames("save", {disabled: !canSave || !hasChanged})}
      title="Save"
      type="primary"
      onClick={this.save.bind(this)}
    />;

    if (!hasChanged) {
      return <div className="button-group">
        {saveButton}
      </div>;
    }

    return <div className="button-group">
      {cancelButton}
      {saveButton}
    </div>;
  }

  render() {
    const { tempCube, tab, hasChanged, cube, canSave } = this.state;

    if (!tempCube || !tab || !cube) return null;

    return <div className="data-cube-edit">
      <div className="title-bar">
        <Button className="button back" type="secondary" svg={require('../../../icons/full-back.svg')} onClick={this.goBack.bind(this)}/>
        <div className="title">{cube.title}</div>
        {this.renderButtons()}
      </div>
      <div className="content">
        <div className="tabs">
          {this.renderTabs(tab)}
        </div>
        <div className="tab-content">
          {tab.render.bind(this)()}
        </div>
      </div>

    </div>;
  }
}
