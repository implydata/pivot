require('./data-cube-edit.css');

import * as React from 'react';
import { List } from 'immutable';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { SimpleList } from '../../../components/simple-list/simple-list';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
import { Dropdown, DropdownProps } from '../../../components/dropdown/dropdown';

import { ImmutableList } from '../immutable-list/immutable-list';

import { DimensionModal } from '../dimension-modal/dimension-modal';
import { MeasureModal } from '../measure-modal/measure-modal';

import { AppSettings, Cluster, DataSource, Dimension, DimensionJS, Measure, MeasureJS } from '../../../../common/models/index';


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
    const { tempCube } = this.state;

    const onChange = (newDimensions: List<Dimension>) => {
      const newCube = tempCube.changeDimensions(newDimensions);
      this.setState({
        tempCube: newCube,
        hasChanged: !this.state.cube.equals(newCube)
      });
    };

    const getModal = (item: Dimension) => <DimensionModal dimension={item}/>;

    const getNewItem = (name: string) => Dimension.fromJS({name});

    const getRows = (items: List<Dimension>) => items.toArray().map((dimension) => {
      return {
        title: dimension.title,
        description: dimension.expression.toString(),
        icon: `dim-${dimension.kind}`
      };
    });

    const DimensionsList = ImmutableList.specialize<Dimension>();

    return <DimensionsList
      items={tempCube.dimensions}
      onChange={onChange.bind(this)}
      getModal={getModal}
      getNewItem={getNewItem}
      getRows={getRows}
    />;
  }

  renderMeasures(): JSX.Element {
    const { tempCube } = this.state;

    const onChange = (newMeasures: List<Measure>) => {
      const newCube = tempCube.changeMeasures(newMeasures);
      this.setState({
        tempCube: newCube,
        hasChanged: !this.state.cube.equals(newCube)
      });
    };

    const getModal = (item: Measure) => <MeasureModal measure={item}/>;

    const getNewItem = (name: string) => Measure.fromJS({name});

    const getRows = (items: List<Measure>) => items.toArray().map((measure) => {
      return {
        title: measure.title,
        description: measure.expression.toString()
      };
    });

    const MeasuresList = ImmutableList.specialize<Measure>();

    return <MeasuresList
      items={tempCube.measures}
      onChange={onChange.bind(this)}
      getModal={getModal}
      getNewItem={getNewItem}
      getRows={getRows}
    />;
  }

  render() {
    const { tempCube, tab, hasChanged } = this.state;

    if (!tempCube || !tab) return null;

    return <div className="data-cube-edit">
      <div className="title-bar">
        <Button className="button back" type="secondary" svg={require('../../../icons/full-back.svg')} onClick={this.goBack.bind(this)}/>
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
