require('./button-group.css');

import * as React from 'react';
import { classNames } from "../../utils/dom/dom";

export interface ButtonGroupProps extends React.Props<any> {
  title?: string;
  className?: string;
}

export interface ButtonGroupState {
}

export class ButtonGroup extends React.Component<ButtonGroupProps, ButtonGroupState> {

  constructor() {
    super();
    // this.state = {};
  }

  render() {
    const { title, children, className } = this.props;

    return <div className={classNames('button-group', className)}>
      <div className="button-group-title">{title}</div>
      <ul>{children}</ul>
    </div>;
  }
}
