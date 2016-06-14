require('./measure-modal.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames, enterKey } from '../../../utils/dom/dom';


import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
import { Modal } from '../../../components/modal/modal';
import { Dropdown, DropdownProps } from '../../../components/dropdown/dropdown';

import { Measure, MeasureJS } from '../../../../common/models/index';


export interface MeasureModalProps extends React.Props<any> {
  measure?: MeasureJS;
  onSave?: (measure: MeasureJS) => void;
  onClose?: () => void;
}

export interface MeasureModalState {
  newMeasure?: MeasureJS;
  canSave?: boolean;
}

export class MeasureModal extends React.Component<MeasureModalProps, MeasureModalState> {
  private hasInitialized = false;

  constructor() {
    super();
    this.state = {canSave: false};
    this.globalKeyDownListener = this.globalKeyDownListener.bind(this);
  }

  initStateFromProps(props: MeasureModalProps) {
    if (props.measure) {
      this.setState({
        newMeasure: (Object as any).assign({}, props.measure),
        canSave: false
      });
    }
  }

  componentWillReceiveProps(nextProps: MeasureModalProps) {
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

  areEqual(a: MeasureJS, b: MeasureJS): boolean {
    // Fails when name is empty, hence the try-catch
    try {
      return Measure.fromJS(a).equals(Measure.fromJS(b));
    } catch (e) {
      return false;
    }
  }

  onChange(property: string, validator: RegExp, event: KeyboardEvent) {
    var measure = this.state.newMeasure;

    const newValue = (event.target as HTMLInputElement).value;
    (measure as any)[property] = newValue;

    this.setState({
      newMeasure: measure,
      canSave: validator.test(newValue) && !this.areEqual(this.props.measure, measure)
    });
  }

  save() {
    this.props.onSave(this.state.newMeasure);
  }

  render(): JSX.Element {
    const { newMeasure, canSave } = this.state;

    if (!newMeasure) return null;

    return <Modal
      className="dimension-modal"
      title={newMeasure.title}
      onClose={this.props.onClose}
    >
      <form className="general vertical">
        <FormLabel label="Name"></FormLabel>
        <input
          type="text"
          className={/^.+$/.test(newMeasure.name) ? '' : 'invalid'}
          value={newMeasure.name}
          onChange={this.onChange.bind(this, 'name', /^.+$/)}
          ref='name-input'
        />

        <FormLabel label="Title"></FormLabel>
        <input
          type="text"
          className={/^.+$/.test(newMeasure.title) ? '' : 'invalid'}
          value={newMeasure.title}
          onChange={this.onChange.bind(this, 'title', /^.+$/)}
        />

      </form>

      <div className="button-group">
        {canSave ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
        <Button className="cancel" title="Cancel" type="secondary" onClick={this.props.onClose}/>
      </div>

    </Modal>;
  }

}
