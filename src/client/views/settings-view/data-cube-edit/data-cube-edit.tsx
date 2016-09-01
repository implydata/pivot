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
import { AttributeInfo, Attributes, findByName, Nameable } from 'plywood';
import { classNames } from '../../../utils/dom/dom';
import { Ajax } from '../../../utils/ajax/ajax';

import { generateUniqueName } from '../../../../common/utils/string/string';
import { pluralIfNeeded } from "../../../../common/utils/general/general";
import { Notifier } from '../../../components/notifications/notifications';

import { Duration, Timezone } from 'chronoshift';

import { DATA_CUBES_STRATEGIES_LABELS, STRINGS } from '../../../config/constants';

import { SvgIcon, FormLabel, Button, SimpleTableColumn, SimpleTable, ImmutableInput, ImmutableList, ImmutableDropdown } from '../../../components/index';
import { DimensionModal, MeasureModal, SuggestionModal } from '../../../modals/index';
import { AppSettings, ListItem, Cluster, DataCube, Dimension, DimensionJS, Measure, MeasureJS, Customization } from '../../../../common/models/index';

import { DATA_CUBE as LABELS } from '../../../../common/models/labels';

import { ImmutableFormDelegate, ImmutableFormState } from '../../../delegates/index';

import { DataTable } from '../data-table/data-table';

export interface DataCubeEditProps extends React.Props<any> {
  isNewDataCube?: boolean;
  dataCube?: DataCube;
  clusters?: Cluster[];
  tab?: string;
  onSave: (newDataCube: DataCube) => void;
  onCancel?: () => void;
}

export interface DataCubeEditState extends ImmutableFormState<DataCube> {
  tab?: any;
  modal?: Modal;
}

export interface Tab {
  label: string;
  value: string;
  render: () => JSX.Element;
  icon: string;
}

export interface Modal extends Nameable {
  name: string;
  render: (arg?: any) => JSX.Element;
  active?: boolean;
}

export class DataCubeEdit extends React.Component<DataCubeEditProps, DataCubeEditState> {
  private tabs: Tab[] = [
    { label: 'General', value: 'general', render: this.renderGeneral, icon: require(`../../../icons/full-settings.svg`) },
    { label: 'Data', value: 'data', render: this.renderData, icon: require(`../../../icons/data.svg`) },
    { label: 'Dimensions', value: 'dimensions', render: this.renderDimensions, icon: require(`../../../icons/full-cube.svg`) },
    { label: 'Measures', value: 'measures', render: this.renderMeasures, icon: require(`../../../icons/measures.svg`) },
    { label: 'Other', value: 'other', render: this.renderOther, icon: require(`../../../icons/full-more.svg`) }
  ];

  private modals: Modal[] = [
    { name: 'dimensions', render: this.renderDimensionSuggestions },
    { name: 'measures', render: this.renderMeasureSuggestions }
  ];

  private delegate: ImmutableFormDelegate<DataCube>;

  constructor() {
    super();

    this.delegate = new ImmutableFormDelegate<DataCube>(this);
  }

  componentWillReceiveProps(nextProps: DataCubeEditProps) {
    if (nextProps.dataCube) {
      this.initFromProps(nextProps);
    }
  }

  componentDidMount() {
    if (this.props.dataCube) this.initFromProps(this.props);
  }

  initFromProps(props: DataCubeEditProps) {
    this.setState({
      newInstance: this.state.newInstance || new DataCube(props.dataCube.valueOf()),
      canSave: true,
      errors: {},
      tab: props.isNewDataCube ? this.tabs[0] : this.tabs.filter((tab) => tab.value === props.tab)[0],
      modal: null
    });
  }

  selectTab(tab: Tab) {
    if (this.props.isNewDataCube) {
      this.setState({tab});
    } else {
      var hash = window.location.hash.split('/');
      hash.splice(-1);
      window.location.hash = hash.join('/') + '/' + tab.value;
    }
  }

  renderTabs(activeTab: Tab): JSX.Element[] {
    return this.tabs.map((tab) => {
      return <Button
        className={classNames({active: activeTab.value === tab.value})}
        title={tab.label}
        type="primary"
        svg={tab.icon}
        key={tab.value}
        onClick={this.selectTab.bind(this, tab)}
      />;
    });
  }

  cancel() {
    const { isNewDataCube } = this.props;

    if (isNewDataCube) {
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
    const { dataCube, tab } = this.props;
    var hash = window.location.hash;
    window.location.hash = hash.replace(`/${dataCube.name}/${tab}`, '');
  }

  renderGeneral(): JSX.Element {
    const { clusters } = this.props;
    const { newInstance, errors } = this.state;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors);
    var makeTextInput = ImmutableInput.simpleGenerator(newInstance, this.delegate.onChange);
    var makeDropdownInput = ImmutableDropdown.simpleGenerator(newInstance, this.delegate.onChange);

    var possibleClusters = [
      { value: 'native', label: 'Load a file and serve it natively' }
    ].concat(clusters.map((cluster) => {
      return { value: cluster.name, label: cluster.title };
    }));

    var timezones = Customization.DEFAULT_TIMEZONES.map((tz) => {
      return { label: tz.toString(), value: tz };
    });

    return <form className="general vertical">
      {makeLabel('title')}
      {makeTextInput('title', /.*/, true)}

      {makeLabel('description')}
      {makeTextInput('description')}

      {makeLabel('clusterName')}
      {makeDropdownInput('clusterName', possibleClusters)}

      {makeLabel('source')}
      {makeTextInput('source')}

      {makeLabel('defaultTimezone')}
      {makeDropdownInput('defaultTimezone', timezones) }
    </form>;
  }

  // ---------------------------------------------------

  renderData(): JSX.Element {
    const { newInstance } = this.state;

    const onChange = (newDataCube: DataCube) => {
      this.setState({
        newInstance: newDataCube
      });
    };

    return <DataTable dataCube={newInstance} onChange={onChange}/>;
  }

  openModal(name: string) {
    this.setState({
      modal: findByName(this.modals, name)
    });
  }

  closeModal() {
    this.setState({
      modal: null
    });
  }

  // ---------------------------------------------------

  renderDimensions(): JSX.Element {
    const { newInstance } = this.state;

    const onChange = (newDimensions: List<Dimension>) => {
      const newCube = newInstance.changeDimensions(newDimensions);
      this.setState({
        newInstance: newCube
      });
    };

    const getModal = (item: Dimension) => {
      return <DimensionModal dimension={item} validate={newInstance.validateFormula.bind(newInstance)} />;
    };

    const getNewItem = () => Dimension.fromJS({
      name: generateUniqueName('d', name => !newInstance.dimensions.find(m => m.name === name)),
      title: 'New dimension'
    });

    const getRows = (items: List<Dimension>) => items.toArray().map((dimension) => {
      return {
        title: dimension.title,
        description: dimension.expression.toString(),
        icon: require(`../../../icons/dim-${dimension.kind}.svg`)
      };
    });

    const DimensionsList = ImmutableList.specialize<Dimension>();

    return <DimensionsList
      label={STRINGS.dimensions}
      items={newInstance.dimensions}
      onChange={onChange.bind(this)}
      getModal={getModal}
      getNewItem={getNewItem}
      getRows={getRows}
      toggleSuggestions={this.openModal.bind(this, 'dimensions')}
    />;
  }

  addDimensions(extraDimensions: Dimension[]) {
    const { newInstance } = this.state;
    this.setState({
      newInstance: newInstance.appendDimensions(extraDimensions)
    });
  }

  renderDimensionSuggestions() {
    const { newInstance } = this.state;

    const onOk = {
      label: (n: number) => `${STRINGS.add} ${pluralIfNeeded(n, 'dimension')}`,
      callback: (newDimensions: Dimension[]) => {
        this.addDimensions(newDimensions);
        this.closeModal();
      }
    };

    const onDoNothing = {
      label: () => STRINGS.cancel,
      callback: this.closeModal.bind(this)
    };

    const suggestions = newInstance.getSuggestedDimensions().map(d => {
      return {label: `${d.title} (${d.formula})`, value: d};
    });

    const DimensionSuggestionModal = SuggestionModal.specialize<Dimension>();

    return <DimensionSuggestionModal
      onOk={onOk}
      onDoNothing={onDoNothing}
      onClose={this.closeModal.bind(this)}
      suggestions={suggestions}
      title={`${STRINGS.dimension} ${STRINGS.suggestion}s`}
    />;
  }

  // ---------------------------------------------------

  renderMeasures(): JSX.Element {
    var { newInstance } = this.state;

    const onChange = (newMeasures: List<Measure>) => {

      var { defaultSortMeasure } = newInstance;

      if (defaultSortMeasure) {
        if (!newMeasures.find((measure) => measure.name === defaultSortMeasure)) {
          newInstance = newInstance.changeDefaultSortMeasure(null);
        }
      }

      const newCube = newInstance.changeMeasures(newMeasures);
      this.setState({
        newInstance: newCube
      });
    };

    const getModal = (item: Measure) => {
      return <MeasureModal measure={item} validate={newInstance.validateFormulaInMeasureContext.bind(newInstance)}/>;
    };

    const getNewItem = () => Measure.fromJS({
      name: generateUniqueName('m', name => !newInstance.measures.find(m => m.name === name)),
      title: 'New measure'
    });

    const getRows = (items: List<Measure>) => items.toArray().map((measure) => {
      return {
        title: measure.title,
        description: measure.expression.toString(),
        icon: require(`../../../icons/measures.svg`)
      };
    });

    const MeasuresList = ImmutableList.specialize<Measure>();

    return <MeasuresList
      label={STRINGS.measures}
      items={newInstance.measures}
      onChange={onChange.bind(this)}
      getModal={getModal}
      getNewItem={getNewItem}
      getRows={getRows}
      toggleSuggestions={this.openModal.bind(this, 'measures')}
    />;
  }

  addMeasures(extraMeasures: Measure[]) {
    const { newInstance } = this.state;
    this.setState({
      newInstance: newInstance.appendMeasures(extraMeasures)
    });
  }

  renderMeasureSuggestions() {
    const { newInstance } = this.state;

    const onOk = {
      label: (n: number) => `${STRINGS.add} ${pluralIfNeeded(n, 'measure')}`,
      callback: (newMeasures: Measure[]) => {
        this.addMeasures(newMeasures);
        this.closeModal();
      }
    };

    const onDoNothing = {
      label: () => STRINGS.cancel,
      callback: this.closeModal.bind(this)
    };

    const suggestions = newInstance.getSuggestedMeasures().map(d => {
      return {label: `${d.title} (${d.formula})`, value: d};
    });

    const MeasureSuggestionModal = SuggestionModal.specialize<Measure>();

    return <MeasureSuggestionModal
      onOk={onOk}
      onDoNothing={onDoNothing}
      onClose={this.closeModal.bind(this)}
      suggestions={suggestions}
      title={`${STRINGS.measure} ${STRINGS.suggestion}s`}
    />;
  }

  // ---------------------------------------------------

  renderOther(): JSX.Element {
    const { newInstance, errors } = this.state;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors);

    return <form className="general vertical">

      {makeLabel('options')}
      <ImmutableInput
        instance={newInstance}
        path={'options'}
        onChange={this.delegate.onChange}

        valueToString={(value: AttributeInfo[]) => value ? JSON.stringify(value, null, 2) : undefined}
        stringToValue={(str: string) => str ? JSON.parse(str) : undefined}
        type="textarea"
      />

    </form>;
  }

  renderButtons(): JSX.Element {
    const { dataCube, isNewDataCube } = this.props;
    const { canSave, newInstance } = this.state;
    const hasChanged = !dataCube.equals(newInstance);

    const cancelButton = <Button
      className="cancel"
      title={isNewDataCube ?  "Cancel" : "Revert changes"}
      type="secondary"
      onClick={this.cancel.bind(this)}
    />;

    const saveButton = <Button
      className={classNames("save", {disabled: !canSave || (!isNewDataCube && !hasChanged)})}
      title={isNewDataCube ? "Create cube" : "Save"}
      type="primary"
      onClick={this.save.bind(this)}
    />;

    if (!isNewDataCube && !hasChanged) {
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
    const { isNewDataCube } = this.props;
    const { newInstance } = this.state;

    const lastBit = newInstance.title ? `: ${newInstance.title}` : '';

    return (isNewDataCube ? STRINGS.createDataCube : STRINGS.editDataCube) + lastBit;
  }

  render() {
    const { dataCube, isNewDataCube } = this.props;
    const { tab, newInstance, modal } = this.state;

    if (!newInstance || !tab || !dataCube) return null;

    return <div className="data-cube-edit">
      <div className="title-bar">
        {isNewDataCube
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
        <div className="tabs">
          {this.renderTabs(tab)}
        </div>
        <div className="tab-content">
          {tab.render.bind(this)()}
        </div>
      </div>
      { modal ? modal.render.bind(this)() : null }
    </div>;
  }
}
