require('./immutable-input.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { ImmutableUtils } from '../../../common/utils/index';
import { classNames } from '../../utils/dom/dom';

import { firstUp } from '../../../common/utils/string/string';

export interface ImmutableInputProps extends React.Props<any> {
  instance: any;
  path: string;
  focusOnStartUp?: boolean;
  onChange?: (newInstance: any, valid: boolean, path?: string) => void;
  onInvalid?: (invalidValue: string) => void;
  validator?: RegExp;
}

export interface ImmutableInputState {
  newInstance?: any;
  invalidValue?: string;
}

export class ImmutableInput extends React.Component<ImmutableInputProps, ImmutableInputState> {
  private focusAlreadyGiven =  false;

  constructor() {
    super();
    this.state = {};
  }

  initFromProps(props: ImmutableInputProps) {
    if (!props.instance || !props.path) return;

    this.setState({
      newInstance: props.instance,
      invalidValue: undefined
    });
  }

  componentWillReceiveProps(nextProps: ImmutableInputProps) {
    if (nextProps.instance !== this.state.newInstance) {
      this.initFromProps(nextProps);
    }
  }

  componentDidUpdate() {
    this.maybeFocus();
  }

  componentDidMount() {
    this.initFromProps(this.props);

    this.maybeFocus();
  }

  maybeFocus() {
    if (!this.focusAlreadyGiven && this.props.focusOnStartUp && this.refs['me']) {
      (ReactDOM.findDOMNode(this.refs['me']) as any).focus();
      this.focusAlreadyGiven = true;
    }
  }

  onChange(event: KeyboardEvent) {
    const { path, onChange, instance, validator, onInvalid } = this.props;

    var newValue: any = (event.target as HTMLInputElement).value;

    var newInstance: any;
    var invalidValue: string;

    if (validator && !validator.test(newValue)) {
      newInstance = this.props.instance;
      invalidValue = newValue;

      if (onInvalid) onInvalid(newValue);

    } else {
      newInstance = ImmutableUtils.setProperty(instance, path, newValue);
    }

    this.setState({newInstance, invalidValue});

    if (onChange) onChange(newInstance, invalidValue === undefined, path);
  }

  render() {
    const { path } = this.props;
    const { newInstance, invalidValue } = this.state;

    if (!path || !newInstance) return null;

    const value = ImmutableUtils.getProperty(newInstance, path);

    return <input
      className={classNames('immutable-input', {error: invalidValue !== undefined})}
      ref='me'
      type="text"
      value={invalidValue !== undefined ? invalidValue : value}
      onChange={this.onChange.bind(this)}
    />;
  }
}
