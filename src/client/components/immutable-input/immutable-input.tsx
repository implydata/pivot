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
  validator?: RegExp | ((str: string) => boolean);
  toValue?: (str: string) => any;
  fromValue?: (value: any) => string;
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

  isValueValid(value: string): boolean {
    var { validator } = this.props;

    if (!validator) return true;

    if (validator instanceof RegExp) {
      return validator.test(value);
    }

    if (validator instanceof Function) {
      return !!validator(value);
    }

    return true;
  }

  onChange(event: KeyboardEvent) {
    const { path, onChange, instance, validator, onInvalid, toValue } = this.props;

    var newString = (event.target as HTMLInputElement).value as string;

    var newValue: any = toValue ? toValue(newString) : newString;

    console.log(newValue);

    var newInstance: any;
    var invalidValue: string;

    if (validator && !this.isValueValid(newString)) {
      newInstance = instance;
      invalidValue = newValue;
      if (onInvalid) onInvalid(newValue);

    } else {
      try {
        newInstance = ImmutableUtils.setProperty(instance, path, newValue);
      } catch (e) {
        newInstance = instance;
        invalidValue = newValue;
        if (onInvalid) onInvalid(newValue);
      }
    }

    this.setState({newInstance, invalidValue});

    if (onChange) onChange(newInstance, invalidValue === undefined, path);
  }

  render() {
    const { path, fromValue } = this.props;
    const { newInstance, invalidValue } = this.state;
    const isInvalid = invalidValue !== undefined;

    if (!path || !newInstance) return null;

    var value = ImmutableUtils.getProperty(newInstance, path);

    if (fromValue) value = fromValue(value);

    return <input
      className={classNames('immutable-input', {error: isInvalid})}
      ref='me'
      type="text"
      value={(isInvalid ? invalidValue : value) || ''}
      onChange={this.onChange.bind(this)}
    />;
  }
}
