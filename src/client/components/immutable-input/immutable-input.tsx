require('./immutable-input.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { firstUp } from '../../utils/string/string';

export interface ImmutableInputProps extends React.Props<any> {
  instance: any;
  path: string;
  onChange?: (newInstance: any) => void;
}

export interface ImmutableInputState {
  newInstance?: any;
}

export class ImmutableInput extends React.Component<ImmutableInputProps, ImmutableInputState> {
  constructor() {
    super();
    this.state = {};
  }

  componentWillReceiveProps(nextProps: ImmutableInputProps) {
    if (nextProps.instance) {
      this.setState({
        newInstance: nextProps.instance
      });
    }
  }

  componentDidMount() {
    if (this.props.instance) {
      this.setState({
        newInstance: this.props.instance
      });
    }
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
    const { path, onChange, instance } = this.props;

    var newValue: any = (event.target as HTMLInputElement).value;
    var newInstance = this.changeImmutable(instance, path, newValue);

    this.setState({newInstance});

    if (onChange) {
      onChange(newInstance);
    }
  }

  render() {
    const { path } = this.props;
    const { newInstance } = this.state;

    if (!path || !newInstance) return null;

    var value = newInstance;
    var bits = path.split('.');
    var bit: string;
    while (bit = bits.shift()) value = value[bit];

    return <input
      type="text"
      value={value}
      onChange={this.onChange.bind(this)}
    />;
  }
}
