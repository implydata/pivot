require('./dimension-modal.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames, enterKey } from '../../../utils/dom/dom';


import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
import { Modal } from '../../../components/modal/modal';
import { Dropdown, DropdownProps } from '../../../components/dropdown/dropdown';

import { Dimension, DimensionJS } from '../../../../common/models/index';


export interface DimensionModalProps extends React.Props<any> {
  dimension?: DimensionJS;
  onSave?: (dimension: DimensionJS) => void;
  onClose?: () => void;
}

export interface DimensionModalState {
  newDimension?: DimensionJS;
  canSave?: boolean;
}

export interface DimensionKind {
  label: string;
  value: string;
}


export class DimensionModal extends React.Component<DimensionModalProps, DimensionModalState> {
  private hasInitialized = false;

  private kinds: DimensionKind[] = [
    {label: 'Time', value: 'time'},
    {label: 'String', value: 'string'},
    {label: 'Boolean', value: 'boolean'},
    {label: 'String-geo', value: 'string-geo'}
  ];

  constructor() {
    super();
    this.state = {canSave: false};
    this.globalKeyDownListener = this.globalKeyDownListener.bind(this);
  }

  initStateFromProps(props: DimensionModalProps) {
    if (props.dimension) {
      this.setState({
        newDimension: (Object as any).assign({}, props.dimension),
        canSave: false
      });
    }
  }

  componentWillReceiveProps(nextProps: DimensionModalProps) {
    this.initStateFromProps(nextProps);
  }

  componentDidMount() {
    this.initStateFromProps(this.props);
    window.addEventListener('keydown', this.globalKeyDownListener);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.globalKeyDownListener);
  }

  componentDidUpdate() {
    if (!this.hasInitialized && !!this.refs['name-input']) {
      (this.refs['name-input'] as any).focus();
      this.hasInitialized = true;
    }
  }

  globalKeyDownListener(e: KeyboardEvent) {
    if (enterKey(e) && this.state.canSave) {
      this.save();
    }
  }

  areEqual(a: DimensionJS, b: DimensionJS): boolean {
    // Fails when name is empty, hence the try-catch
    try {
      return Dimension.fromJS(a).equals(Dimension.fromJS(b));
    } catch (e) {
      return false;
    }
  }

  onKindChange(newKind: DimensionKind) {
    var dimension = this.state.newDimension;
    dimension.kind = newKind.value;

    this.setState({
      newDimension: dimension,
      canSave: !this.areEqual(this.props.dimension, dimension)
    });
  }

  onChange(property: string, validator: RegExp, event: KeyboardEvent) {
    var dimension = this.state.newDimension;

    const newValue = (event.target as HTMLInputElement).value;
    (dimension as any)[property] = newValue;

    this.setState({
      newDimension: dimension,
      canSave: validator.test(newValue) && !this.areEqual(this.props.dimension, dimension)
    });
  }

  save() {
    this.props.onSave(this.state.newDimension);
  }

  render(): JSX.Element {
    const { newDimension, canSave } = this.state;

    if (!newDimension) return null;

    var selectedKind: DimensionKind = this.kinds.filter((d) => d.value === newDimension.kind)[0] || this.kinds[0];

    return <Modal
      className="dimension-modal"
      title={newDimension.title}
      onClose={this.props.onClose}
    >
      <form className="general vertical">
        <FormLabel label="Name"></FormLabel>
        <input
          type="text"
          className={/^.+$/.test(newDimension.name) ? '' : 'invalid'}
          value={newDimension.name}
          onChange={this.onChange.bind(this, 'name', /^.+$/)}
          ref='name-input'
        />

        <FormLabel label="Title"></FormLabel>
        <input
          type="text"
          className={/^.+$/.test(newDimension.title) ? '' : 'invalid'}
          value={newDimension.title}
          onChange={this.onChange.bind(this, 'title', /^.+$/)}
        />

        {React.createElement(Dropdown, {
          label: "Kind",
          items: this.kinds,
          selectedItem: selectedKind,
          equal: (a: DimensionKind, b: DimensionKind) => a.value === b.value,
          renderItem: (a: DimensionKind) => a.label,
          keyItem: (a: DimensionKind) => a.value,
          onSelect: this.onKindChange.bind(this)
        } as DropdownProps<DimensionKind>)}
      </form>

      <div className="button-group">
        {canSave ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
        <Button className="cancel" title="Cancel" type="secondary" onClick={this.props.onClose}/>
      </div>

    </Modal>;
  }

}
