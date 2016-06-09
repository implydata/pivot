require('./data-cube-edit.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { firstUp } from '../../../utils/string/string';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';

import { AppSettings, Cluster, DataSource} from '../../../../common/models/index';

import { SimpleList } from '../../../components/simple-list/simple-list';

export interface DataCubeEditProps extends React.Props<any> {
  settings?: AppSettings;
  cubeId?: string;
  tab?: string;
}

export interface DataCubeEditState {
  newSettings?: AppSettings;
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
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings,
      hasChanged: false,
      cube: nextProps.settings.dataSources.filter((d) => d.name === nextProps.cubeId)[0],
      tab: this.tabs.filter((tab) => tab.value === nextProps.tab)[0]
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

  save() {

  }

  goBack() {
    const { cubeId, tab } = this.props;
    var hash = window.location.hash;
    window.location.hash = hash.replace(`/${cubeId}/${tab}`, '');
  }

  onChange(propertyPath: string, e: KeyboardEvent) {

  }

  renderGeneral(): JSX.Element {
    const helpTexts: any = {};
    const { cube } = this.state;

    return <form className="general vertical">
      <FormLabel label="Title" helpText={helpTexts.title}></FormLabel>
      <input
        type="text"
        value={cube.title}
        onChange={this.onChange.bind(this, 'cube.title')}
      />

      <FormLabel label="Engine" helpText={helpTexts.title}></FormLabel>
      <input
        type="text"
        value={cube.engine}
        onChange={this.onChange.bind(this, 'cube.engine')}
      />

      <FormLabel label="Source" helpText={helpTexts.title}></FormLabel>
      <input
        type="text"
        value={cube.source}
        onChange={this.onChange.bind(this, 'cube.source')}
      />
    </form>;
  }

  editDimension(index: number) {

  }

  deleteDimension(index: number) {

  }

  renderDimensions(): JSX.Element {
    const { cube, hasChanged } = this.state;

    const rows = cube.dimensions.toArray().map((dimension) => {
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
          <button>Add dimension</button>
        </div>
      </div>
      <SimpleList
        rows={rows}
        onEdit={this.editDimension.bind(this)}
        onRemove={this.deleteDimension.bind(this)}
      />
    </div>;
  }

  editMeasure(index: number) {

  }

  deleteMeasure(index: number) {

  }

  renderMeasures(): JSX.Element {
    const { cube, hasChanged } = this.state;

    const rows = cube.measures.toArray().map((measure) => {
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

  render() {
    const { cube, tab, hasChanged } = this.state;

    if (!cube || !tab) return null;

    return <div className="data-cube-edit">
      <div className="title-bar">
        <button className="button back" onClick={this.goBack.bind(this)}>
          <SvgIcon svg={require('../../../icons/full-back-brand.svg')}/>
        </button>
        <div className="title">{cube.title}</div>
        {hasChanged ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
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
