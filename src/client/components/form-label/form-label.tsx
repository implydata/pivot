require('./form-label.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
import { SvgIcon } from '../svg-icon/svg-icon';

export interface FormLabelProps extends React.Props<any> {
  label?: string;
  helpText?: string;
  errorText?: string;
}

export interface FormLabelState {
  helpVisible: boolean;
}

export class FormLabel extends React.Component<FormLabelProps, FormLabelState> {
  constructor() {
    super();

    this.state = {helpVisible: false};
  }

  onHelpClick() {
    this.setState({helpVisible: !this.state.helpVisible});
  }

  getIcon(): JSX.Element {
    const { helpVisible } = this.state;

    var icons: string[] = ['help-brand-light', 'help-brand'];

    if (helpVisible) icons[0] = 'help-brand';

    return <div className="icon-container" onClick={this.onHelpClick.bind(this)}>
      <SvgIcon className="icon" svg={require(`../../icons/${icons[0]}.svg`)}/>
      <SvgIcon className="icon hover" svg={require(`../../icons/${icons[1]}.svg`)}/>
    </div>;
  }

  render() {
    const { label, helpText } = this.props;
    const { helpVisible } = this.state;

    var help = helpVisible ? <div className="help-text">{helpText}</div> : null;

    return <div className="form-label">
      <div className="label">{label}</div>
      {this.getIcon()}
      {help}
    </div>;
  }
}
