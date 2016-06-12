require('./immutable-input.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { firstUp } from '../../utils/string/string';

export interface ImmutableInputProps extends React.Props<any> {
  instance: any;
  path: string;
  onChange?: (newInstance: any, valid: boolean) => void;
  validator?: RegExp;
}

export interface ImmutableInputState {
  newInstance?: any;
  invalidValue?: string;
}

export class ImmutableInput extends React.Component<ImmutableInputProps, ImmutableInputState> {
  constructor() {
    super();
    this.state = {};
  }

  initFromProps(props: ImmutableInputProps) {
    if (props.instance && this.state.invalidValue === undefined) {
      this.setState({
        newInstance: props.instance
      });
    }
  }

  componentWillReceiveProps(nextProps: ImmutableInputProps) {
    this.initFromProps(nextProps);
  }

  componentDidMount() {
    this.initFromProps(this.props);
  }

  changeImmutable(instance: any, path: string, newValue: any): any {
    var bits = path.split('.');
    var lastObject = newValue;
    var currentObject: any;

    var getLastObject = () => {
      let o: any = instance;

      for (let i = 0; i < bits.length; i++) {
        o = o[bits[i]];
      }

      return o;
    };

    while (bits.length) {
      let bit = bits.pop();

      currentObject = getLastObject();

      lastObject = currentObject[`change${firstUp(bit)}`](lastObject);
    }

    return lastObject;
  }

  onChange(event: KeyboardEvent) {
    const { path, onChange, instance, validator } = this.props;

    var newValue: any = (event.target as HTMLInputElement).value;

    var newInstance: any;
    var invalidValue: string;

    if (validator && !validator.test(newValue)) {
      newInstance = this.props.instance;
      invalidValue = newValue;
    } else {
      newInstance = this.changeImmutable(instance, path, newValue);
    }

    this.setState({newInstance, invalidValue});

    if (onChange) {
      onChange(newInstance, invalidValue === undefined);
    }
  }

  render() {
    const { path } = this.props;
    const { newInstance, invalidValue } = this.state;

    if (!path || !newInstance) return null;

    var value = newInstance;
    var bits = path.split('.');
    var bit: string;
    while (bit = bits.shift()) value = value[bit];

    return <input
      type="text"
      value={invalidValue ? invalidValue : value}
      onChange={this.onChange.bind(this)}
    />;
  }
}
