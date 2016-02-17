'use strict';
require('./cube-header-bar.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SvgIcon } from '../svg-icon/svg-icon';
import { $, Expression, Datum, Dataset } from 'plywood';
import { Essence, DataSource } from "../../../common/models/index";

import { Modal } from '../modal/modal';

export interface CubeHeaderBarProps extends React.Props<any> {
  dataSource: DataSource;
  onNavClick: React.MouseEventHandler;
  showLastUpdated?: boolean;
  hideGitHubIcon?: boolean;
  color?: string;
}

export interface CubeHeaderBarState {
  showTestMenu?: boolean;
}

export class CubeHeaderBar extends React.Component<CubeHeaderBarProps, CubeHeaderBarState> {

  constructor() {
    super();
    this.state = {
      showTestMenu: false
    };
  }

  onPanicClick(e: MouseEvent) {
    if (e.altKey) {
      var { dataSource } = this.props;
      console.log('DataSource:', dataSource.toJS());
      return;
    }
    if (e.shiftKey) {
      this.setState({
        showTestMenu: true
      });
      return;
    }
    window.location.assign(Essence.getBaseURL());
  }

  onModalClose() {
    this.setState({
      showTestMenu: false
    });
  }

  renderTestModal() {
    if (!this.state.showTestMenu) return null;
    return <Modal
      className="test-modal"
      title="Test Modal"
      onClose={this.onModalClose.bind(this)}
    >
      <div>Hello 1</div>
      <div>Hello 2</div>
      <div>Hello 3</div>
    </Modal>;
  }

  render() {
    var { onNavClick, showLastUpdated, hideGitHubIcon, color, dataSource } = this.props;

    var updated: JSX.Element = null;
    if (showLastUpdated) {
      var updatedText = dataSource.updatedText();
      if (updatedText) {
        updated = <div className="last-updated">{updatedText}</div>;
      }
    }

    var gitHubIcon: JSX.Element = null;
    if (!hideGitHubIcon) {
      gitHubIcon = <a className="icon-button github" href="https://github.com/implydata/pivot" target="_blank">
        <SvgIcon className="github-icon" svg={require('../../icons/github.svg')}/>
      </a>;
    }

    var headerStyle: React.CSSProperties = null;
    if (color) {
      headerStyle = { background: color };
    }

    return <header className="cube-header-bar" style={headerStyle}>
      <div className="burger-bar" onClick={onNavClick}>
        <div className="menu-icon">
          <SvgIcon svg={require('../../icons/menu.svg')}/>
        </div>
        <div className="title">{dataSource.title}</div>
      </div>
      <div className="right-bar">
        {updated}
        <div className="icon-button panic" onClick={this.onPanicClick.bind(this)}>
          <SvgIcon className="panic-icon" svg={require('../../icons/panic.svg')}/>
        </div>
        <a className="icon-button help" href="https://groups.google.com/forum/#!forum/imply-user-group" target="_blank">
          <SvgIcon className="help-icon" svg={require('../../icons/help.svg')}/>
        </a>
        {gitHubIcon}
      </div>
      {this.renderTestModal()}
    </header>;
  }
}
