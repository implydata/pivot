require('./dimensions-list.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { List } from 'immutable';
import { $, Expression, Executor, Dataset } from 'plywood';

import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../../common/models/index';

import { Button } from '../../../components/button/button';
import { Modal } from '../../../components/modal/modal';
import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { SimpleList } from '../../../components/simple-list/simple-list';
import { DimensionModal } from '../dimension-modal/dimension-modal';

export interface DimensionsListProps extends React.Props<any> {
  dimensions: List<Dimension>;
  onChange: (newDimensions: List<Dimension>) => void;
}

export interface DimensionsListState {
  tempDimensions?: List<Dimension>;
  editedIndex?: number;
  nameNeeded?: boolean;
  tempName?: string;
  pendingAddDimension?: Dimension;
}

export class DimensionsList extends React.Component<DimensionsListProps, DimensionsListState> {
  constructor() {
    super();
    this.state = {};
  }

  editDimension(index: number) {
    this.setState({editedIndex: index});
  }

  addDimension() {
    this.setState({nameNeeded: true, tempName: ''});
  }

  componentWillReceiveProps(nextProps: DimensionsListProps) {
    if (nextProps.dimensions) {
      this.setState({tempDimensions: nextProps.dimensions});
    }
  }

  componentDidMount() {
    if (this.props.dimensions) {
      this.setState({tempDimensions: this.props.dimensions});
    }
  }

  deleteDimension(index: number) {
    const { tempDimensions } = this.state;
    this.setState({tempDimensions: tempDimensions.delete(index)}, this.onChange);
  }

  onChange() {
    this.props.onChange(this.state.tempDimensions);
  }

  renderEditDimensionModal(dimensionIndex: number): JSX.Element {
    const { tempDimensions } = this.state;

    var dimension = tempDimensions.get(dimensionIndex);

    var onSave = (newDimension: Dimension) => {
      const newDimensions = tempDimensions.update(dimensionIndex, () => newDimension);
      this.setState({tempDimensions: newDimensions, editedIndex: undefined}, this.onChange);
    };

    var onClose = () => this.setState({editedIndex: undefined});

    return <DimensionModal dimension={dimension} onSave={onSave} onClose={onClose}/>;
  }

  renderAddDimensionModal(dimension: Dimension): JSX.Element {
    var onSave = (newDimension: Dimension) => {
      const { tempDimensions } = this.state;
      const newDimensions = tempDimensions.push(newDimension);

      this.setState(
        {tempDimensions: newDimensions, pendingAddDimension: null},
        this.onChange
      );
    };

    var onClose = () => this.setState({pendingAddDimension: null});

    return <DimensionModal dimension={dimension} onSave={onSave} onClose={onClose}/>;
  }

  renderNameModal(): JSX.Element {
    var canSave = true;
    const { tempName } = this.state;

    const onChange = (e: React.FormEvent) => {
      this.setState({tempName: (e.target as HTMLInputElement).value});
    };

    const onOk = () => {
      this.setState({
        tempName: '',
        nameNeeded: false,
        pendingAddDimension: Dimension.fromJS({name: this.state.tempName})
      });
    };

    const onCancel = () => this.setState({nameNeeded: false, tempName: ''});

    return <Modal
      className="dimension-modal"
      title="Please give a name to this new dimension"
      onClose={onCancel}
      onEnter={onOk}
      startUpFocusOn={'focus-me'}
    >
      <form className="general vertical">
        <FormLabel label="Name"></FormLabel>
        <input id="focus-me" type="text" onChange={onChange} value={tempName}/>
      </form>

      <div className="button-group">
        {canSave ? <Button className="ok" title="OK" type="primary" onClick={onOk}/> : null}
        <Button className="cancel" title="Cancel" type="secondary" onClick={onCancel}/>
      </div>

    </Modal>;
  }

  render() {
    const { dimensions } = this.props;
    const { editedIndex, pendingAddDimension, nameNeeded } = this.state;

    if (!dimensions) return null;

    const rows = dimensions.toArray().map((dimension) => {
      return {
        title: dimension.title,
        description: dimension.expression.toString(),
        icon: `dim-${dimension.kind}`
      };
    });

    return <div className="dimensions-list">
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
      {editedIndex !== undefined ? this.renderEditDimensionModal(editedIndex) : null}
      {pendingAddDimension ? this.renderAddDimensionModal(pendingAddDimension) : null}
      {nameNeeded ? this.renderNameModal() : null}
    </div>;
  }
}
