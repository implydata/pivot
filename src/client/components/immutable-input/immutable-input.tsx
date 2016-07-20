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
  onChange?: (myInstance: any, valid: boolean, path?: string) => void;
  onInvalid?: (invalidString: string) => void;
  validator?: RegExp | ((str: string) => boolean);
  stringToValue?: (str: string) => any;
  valueToString?: (value: any) => string;
}

export interface ImmutableInputState {
  myInstance?: any;
  invalidString?: string;
  validString?: string;
}

export class ImmutableInput extends React.Component<ImmutableInputProps, ImmutableInputState> {
  static defaultProps = {
    stringToValue: String,
    valueToString: (value: any) => value ? String(value) : ''
  };

  private focusAlreadyGiven = false;

  constructor() {
    super();
    this.state = {};
  }

  initFromProps(props: ImmutableInputProps) {
    if (!props.instance || !props.path) return;

    var validString: string;

    if (this.state.validString === undefined) {
      validString = props.valueToString(ImmutableUtils.getProperty(props.instance, props.path));
    } else {
      var currentCanonical = props.valueToString(props.stringToValue(this.state.validString));
      var possibleCanonical = props.valueToString(ImmutableUtils.getProperty(props.instance, props.path));

      validString = currentCanonical === possibleCanonical ? this.state.validString : possibleCanonical;
    }

    this.setState({
      myInstance: props.instance,
      invalidString: undefined,
      validString
    });
  }

  componentWillReceiveProps(nextProps: ImmutableInputProps) {
    if (nextProps.instance !== this.state.myInstance) {
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
    const { path, onChange, instance, validator, onInvalid, stringToValue } = this.props;

    var newString = (event.target as HTMLInputElement).value as string;

    var myInstance: any;
    var invalidString: string;
    var validString: string;

    try {
      var newValue: any = stringToValue ? stringToValue(newString) : newString;

      if (validator && !this.isValueValid(newString)) {
        myInstance = instance;
        invalidString = newString;
        if (onInvalid) onInvalid(newValue);

      } else {
        myInstance = ImmutableUtils.setProperty(instance, path, newValue);
        validString = newString;
      }
    } catch (e) {
      myInstance = instance;
      invalidString = newString;
      if (onInvalid) onInvalid(newValue);
    }

    this.setState({
      myInstance,
      invalidString,
      validString
    }, () => {
      if (onChange) onChange(myInstance, invalidString === undefined, path);
    });
  }

  render() {
    const { path, valueToString } = this.props;
    const { myInstance, invalidString, validString } = this.state;
    const isInvalid = invalidString !== undefined;

    if (!path || !myInstance) return null;

    return <input
      className={classNames('immutable-input', {error: isInvalid})}
      ref='me'
      type="text"
      value={(isInvalid ? invalidString : validString) || ''}
      onChange={this.onChange.bind(this)}
    />;
  }
}
