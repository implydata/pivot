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

require('./data-table.css');

import { Ajax } from '../../../utils/ajax/ajax';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AttributeInfo, Attributes, findByName, Dataset } from 'plywood';

import { titleCase } from '../../../../common/utils/string/string';
import { pluralIfNeeded } from "../../../../common/utils/general/general";

import { STRINGS } from "../../../config/constants";

import { DataCube } from '../../../../common/models/index';

import { classNames } from '../../../utils/dom/dom';

import { SvgIcon, SimpleTable, SimpleTableColumn, Notifier } from '../../../components/index';
import { AttributeModal, SuggestionModal } from '../../../modals/index';

export interface DataTableProps extends React.Props<any> {
  dataCube?: DataCube;
  onChange?: (newDataCube: DataCube) => void;
}

export interface DataTableState {
  editedAttribute?: AttributeInfo;

  showSuggestionsModal?: boolean;
  attributeSuggestions?: Attributes;

  dataset?: Dataset;
  error?: Error;
  loading?: boolean;
}

export class DataTable extends React.Component<DataTableProps, DataTableState> {
  public mounted: boolean;

  constructor() {
    super();

    this.state = {
      loading: false,
      dataset: null,
      error: null
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.fetchData(this.props.dataCube);
  }

  componentWillReceiveProps(nextProps: DataTableProps) {
    const { dataCube } = this.props;

    if (!dataCube.equals(nextProps.dataCube)) {
      this.fetchData(nextProps.dataCube);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  fetchData(dataCube: DataCube): void {
    this.setState({ loading: true });
    Ajax.query({
      method: "POST",
      url: 'settings/preview',
      data: {
        dataCube
      }
    })
      .then(
        (resp: any) => {
          if (!this.mounted) return;
          this.setState({
            dataset: Dataset.fromJS(resp.dataset),
            loading: false
          });
        },
        (error: Error) => {
          if (!this.mounted) return;
          this.setState({
            error,
            loading: false
          });
        }
      );
  }

  renderHeader(attribute: AttributeInfo, isPrimary: boolean, column: SimpleTableColumn, hovered: boolean): JSX.Element {
    const iconPath = `dim-${attribute.type.toLowerCase().replace('/', '-')}`;

    return <div
      className={classNames('header', {hover: hovered})}
      style={{width: column.width}}
      key={attribute.name}
    >
      <div className="cell name">
        <div className="label">{attribute.name}</div>
        <SvgIcon svg={require('../../../icons/full-edit.svg')}/>
      </div>
      <div className="cell type">
        <SvgIcon svg={require(`../../../icons/${iconPath}.svg`)}/>
        <div className="label">{titleCase(attribute.type) + (isPrimary ? ' (primary)' : '')}</div>
      </div>
    </div>;
  }

  onHeaderClick(column: SimpleTableColumn) {
    this.setState({
      editedAttribute: column.data
    });

    // Don't sort
    return false;
  }

  renderEditModal() {
    const { dataCube, onChange } = this.props;
    const { editedAttribute } = this.state;

    if (!editedAttribute) return null;

    const onClose = () => {
      this.setState({
        editedAttribute: null
      });
    };

    const onSave = (newAttribute: AttributeInfo) => {
      onChange(dataCube.updateAttribute(newAttribute));
      onClose();
    };

    const onRemove = () => {
      onClose();
      this.askToRemoveAttribute(editedAttribute);
    };

    return <AttributeModal
      attributeInfo={editedAttribute}
      onClose={onClose}
      onSave={onSave}
      onRemove={onRemove}
    />;
  }

  askToRemoveAttribute(attribute: AttributeInfo) {
    var { dataCube, onChange } = this.props;

    const dependantDimensions = dataCube.getDimensionsForAttribute(attribute.name);
    const dependantMeasures = dataCube.getMeasuresForAttribute(attribute.name);
    const dependants = dependantDimensions.length + dependantMeasures.length;

    const remove = () => {
      onChange(dataCube.removeAttribute(attribute.name));
      Notifier.removeQuestion();
    };

    var message: string | JSX.Element;

    if (dependants > 0) {
      message = <div className="message">
        <p>This attribute has {pluralIfNeeded(dependantDimensions.length, 'dimension')} and {pluralIfNeeded(dependantMeasures.length, 'measure')} relying on it.</p>
        <p>Removing it will remove them as well.</p>
        <div className="dependency-list">
          {dependantDimensions.map(d => <p key={d.name}>{d.title}</p>)}
          {dependantMeasures.map(m => <p key={m.name}>{m.title}</p>)}
        </div>
      </div>;
    } else {
      message = 'This cannot be undone.';
    }

    Notifier.ask({
      title: `Remove the attribute "${attribute.name}"?`,
      message,
      choices: [
        {label: 'Remove', callback: remove, type: 'warn'},
        {label: 'Cancel', callback: Notifier.removeQuestion, type: 'secondary'}
      ],
      onClose: Notifier.removeQuestion
    });
  }

  getColumns(): SimpleTableColumn[] {
    const dataCube = this.props.dataCube as DataCube;
    const primaryTimeAttribute = dataCube.getPrimaryTimeAttribute();

    return dataCube.attributes.map(a => {
      let isPrimary = a.name === primaryTimeAttribute;
      return {
        label: a.name,
        data: a,
        field: a.name,
        width: 170,
        render: this.renderHeader.bind(this, a, isPrimary)
      };
    });
  }

  onFiltersClick() {
    // TODO: do.
  }

  fetchSuggestions() {
    const { dataCube } = this.props;

    Ajax.query({
      method: "POST",
      url: 'settings/attributes',
      data: {
        clusterName: dataCube.clusterName,
        source: dataCube.source
      }
    })
      .then(
        (resp) => {
          this.setState({
            attributeSuggestions: dataCube.filterAttributes(AttributeInfo.fromJSs(resp.attributes))
          });
        },
        (xhr: XMLHttpRequest) => Notifier.failure('Woops', 'Something bad happened')
      )
      .done();
  }

  openSuggestionsModal() {
    this.setState({
      showSuggestionsModal: true
    });

    this.fetchSuggestions();
  }

  closeAttributeSuggestions() {
    this.setState({
      attributeSuggestions: null,
      showSuggestionsModal: false
    });
  }

  renderAttributeSuggestions() {
    const { onChange, dataCube } = this.props;
    const { attributeSuggestions, showSuggestionsModal } = this.state;

    if (!showSuggestionsModal || !attributeSuggestions) return null;

    const getAttributeLabel = (a: AttributeInfo) => {
      var special = a.special ? ` [${a.special}]` : '';
      return `${a.name} as ${a.type}${special}`;
    };

    const onAdd = (extraAttributes: Attributes) => {
      onChange(dataCube.changeAttributes(dataCube.attributes.concat(extraAttributes).sort()));
    };

    const AttributeSuggestionModal = SuggestionModal.specialize<AttributeInfo>();

    return <AttributeSuggestionModal
      onAdd={onAdd}
      onClose={this.closeAttributeSuggestions.bind(this)}
      getLabel={getAttributeLabel}
      options={attributeSuggestions}
      title={`${STRINGS.attribute} ${STRINGS.suggestions}`}

      okLabel={(n) => `${STRINGS.add} ${pluralIfNeeded(n, 'attribute')}`}
    />;
  }

  render() {
    const { dataset } = this.state;

    return <div className="data-table">
      <div className="actions">
        <button onClick={this.onFiltersClick.bind(this)}>{STRINGS.filters}</button>
        <button onClick={this.openSuggestionsModal.bind(this)}>{STRINGS.addAttributes}</button>
      </div>
      <SimpleTable
        columns={this.getColumns()}
        rows={dataset ? dataset.data : []}
        headerHeight={83}
        onHeaderClick={this.onHeaderClick.bind(this)}
      />
      { this.renderEditModal() }
      { this.renderAttributeSuggestions() }
    </div>;
  }
}
