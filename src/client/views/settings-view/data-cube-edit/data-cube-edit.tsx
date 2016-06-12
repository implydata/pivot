require('./data-cube-edit.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { SimpleList } from '../../../components/simple-list/simple-list';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
import { Dropdown, DropdownProps } from '../../../components/dropdown/dropdown';

import { DimensionModal } from '../dimension-modal/dimension-modal';

import { AppSettings, Cluster, DataSource, Dimension, DimensionJS } from '../../../../common/models/index';


export interface DataCubeEditProps extends React.Props<any> {
  settings: AppSettings;
  cubeId?: string;
  tab?: string;
  onSave: (settings: AppSettings) => void;
}

export interface DataCubeEditState {
  tempCube?: DataSource;
  hasChanged?: boolean;
  cube?: DataSource;
  tab?: any;
  editedDimensionIndex?: number;
  pendingAddDimension?: DimensionJS;
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

    this.state = {hasChanged: false};
  }

  componentWillReceiveProps(nextProps: DataCubeEditProps) {
    if (nextProps.settings) {
      this.initFromProps(nextProps);
    }
  }

  initFromProps(props: DataCubeEditProps) {
    let cube = props.settings.dataSources.filter((d) => d.name === props.cubeId)[0];

    this.setState({
      tempCube: cube,
      hasChanged: false,
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
    this.initFromProps(this.props);
  }

  save() {
    const { settings } = this.props;
    const { tempCube, cube } = this.state;

    var newCubes = settings.dataSources;
    newCubes[newCubes.indexOf(cube)] = tempCube;
    var newSettings = settings.changeDataSources(newCubes);

    if (this.props.onSave) {
      this.props.onSave(newSettings);
    }
  }

  goBack() {
    const { cubeId, tab } = this.props;
    var hash = window.location.hash;
    window.location.hash = hash.replace(`/${cubeId}/${tab}`, '');
  }

  onSimpleChange(newCube: DataSource) {
    const { cube } = this.state;

    this.setState({
      tempCube: newCube,
      hasChanged: !cube.equals(newCube)
    });
  }

  renderGeneral(): JSX.Element {
    const helpTexts: any = {};
    const { tempCube } = this.state;

    return <form className="general vertical">
      <FormLabel label="Title" helpText={helpTexts.title}></FormLabel>
      <ImmutableInput instance={tempCube} path={'title'} onChange={this.onSimpleChange.bind(this)}/>

      <FormLabel label="Engine" helpText={helpTexts.engine}></FormLabel>
      <ImmutableInput instance={tempCube} path={'engine'} onChange={this.onSimpleChange.bind(this)}/>

      <FormLabel label="Source" helpText={helpTexts.source}></FormLabel>
      <ImmutableInput instance={tempCube} path={'source'} onChange={this.onSimpleChange.bind(this)}/>
    </form>;
  }

  renderDimensions(): JSX.Element {
    const { tempCube, hasChanged, editedDimensionIndex, pendingAddDimension } = this.state;

    const rows = tempCube.dimensions.toArray().map((dimension) => {
      return {
        title: dimension.title,
        description: dimension.expression.toString(),
        icon: `dim-${dimension.kind}-brand`
      };
    });

    return <div className="list">
      <div className="list-title">
        <div className="label">Dimensions</div>
        <div className="actions">
          <button>Introspect</button>
          <button onClick={this.addDimension.bind(this)}>Add dimension</button>
        </div>
      </div>
      <SimpleList
        rows={rows}
        onEdit={this.editDimension.bind(this)}
        onRemove={this.deleteDimension.bind(this)}
      />
      {editedDimensionIndex !== undefined ? this.renderEditDimensionModal(editedDimensionIndex) : null}
      {pendingAddDimension ? this.renderAddDimensionModal(pendingAddDimension) : null}
    </div>;
  }

  editDimension(index: number) {
    this.setState({editedDimensionIndex: index});
  }

  addDimension() {
    this.setState({pendingAddDimension: {name: '', title: ''}});
  }

  deleteDimension(index: number) {
    const { tempCube } = this.state;
    const newDimensions = tempCube.dimensions.delete(index);
    const newCube = tempCube.changeDimensions(newDimensions);

    this.setState({
      tempCube: newCube,
      hasChanged: !tempCube.equals(newCube)
    });
  }

  renderEditDimensionModal(dimensionIndex: number): JSX.Element {
    const { tempCube } = this.state;
    var dimension = tempCube.dimensions.get(dimensionIndex);

    var onSave = (newDimension: DimensionJS) => {
      const { cube } = this.state;
      const newDimensions = cube.dimensions.update(dimensionIndex, () => Dimension.fromJS(newDimension));
      const newCube = cube.changeDimensions(newDimensions);

      this.setState({tempCube: newCube, editedDimensionIndex: undefined}, this.save);
    };

    var onClose = () => this.setState({editedDimensionIndex: undefined});

    return <DimensionModal dimension={dimension.toJS()} onSave={onSave.bind(this)} onClose={onClose.bind(this)}/>;
  }

  renderAddDimensionModal(dimension: DimensionJS): JSX.Element {
    var onSave = (newDimension: DimensionJS) => {
      const { cube } = this.state;
      const newDimensions = cube.dimensions.push(Dimension.fromJS(newDimension));
      const newCube = cube.changeDimensions(newDimensions);

      this.setState({tempCube: newCube, pendingAddDimension: null}, this.save);
    };

    var onClose = () => this.setState({pendingAddDimension: null});

    return <DimensionModal dimension={dimension} onSave={onSave.bind(this)} onClose={onClose.bind(this)}/>;
  }

  renderMeasures(): JSX.Element {
    const { tempCube } = this.state;

    const rows = tempCube.measures.toArray().map((measure) => {
      return {
        title: measure.title,
        description: measure.expression.toString()
      };
    });

    return <div className="list">
      <div className="list-title">
        <div className="label">Measures</div>
        <div className="actions"></div>
      </div>
      <SimpleList
        rows={rows}
        onEdit={this.editMeasure.bind(this)}
        onRemove={this.deleteMeasure.bind(this)}
      />
    </div>;
  }

  editMeasure(index: number) {

  }

  deleteMeasure(index: number) {

  }

  render() {
    const { tempCube, tab, hasChanged } = this.state;

    if (!tempCube || !tab) return null;

    return <div className="data-cube-edit">
      <div className="title-bar">
        <button className="button back" onClick={this.goBack.bind(this)}>
          <SvgIcon svg={require('../../../icons/full-back-brand.svg')}/>
        </button>
        <div className="title">{tempCube.title}</div>
        {hasChanged ? <div className="button-group">
          <Button className="cancel" title="Cancel" type="secondary" onClick={this.cancel.bind(this)}/>
          <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/>
        </div> : null}
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
