require('./settings-view.css');

import * as React from 'react';
import * as Qajax from 'qajax';
import { User, Customization } from '../../../common/models/index';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Stage, Clicker, Essence, DataSource, Filter, Dimension, Measure } from '../../../common/models/index';
import { STRINGS } from '../../config/constants';
import { HomeHeaderBar } from '../home-header-bar/home-header-bar';
import { Fn } from '../../../common/utils/general/general';
import { queryUrlExecutorFactory } from '../../utils/ajax/ajax';
import { Button } from '../button/button';

import { SvgIcon } from '../svg-icon/svg-icon';


import { AppSettings, AppSettingsJS } from '../../../common/models/index';

export interface SettingsViewProps extends React.Props<any> {
  version: string;
  user?: User;
  customization?: Customization;
  onNavClick?: Fn;
  onSettingsChange?: (settings: AppSettings) => void;
}

export interface SettingsViewState {
  errorText?: string;
  messageText?: string;
  settingsText?: string;
}

export class SettingsView extends React.Component<SettingsViewProps, SettingsViewState> {
  public mounted: boolean;

  constructor() {
    super();
    this.state = {
      errorText: '',
      messageText: 'Welcome to the world of settings!',
      settingsText: 'Loading...'
    };

  }

  componentDidMount() {
    this.mounted = true;

    Qajax({
      method: "GET",
      url: 'settings'
    })
      .then(Qajax.filterSuccess)
      .then(Qajax.toJSON)
      .then(
        (resp) => {
          if (!this.mounted) return;
          this.setState({
            errorText: '',
            messageText: '',
            settingsText: JSON.stringify(resp.appSettings, null, 2)
          });
        },
        (xhr: XMLHttpRequest) => {
          if (!this.mounted) return;
          var jsonError = JSON.parse(xhr.responseText);
          this.setState({
            errorText: `Server error: ${jsonError}`,
            messageText: ''
          });
        }
      );
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentWillReceiveProps(nextProps: SettingsViewProps) {

  }

  onChange(event: any) {
    this.setState({
      messageText: '',
      settingsText: event.target.value
    });
  }

  onSave() {
    const { version, onSettingsChange } = this.props;
    const { settingsText } = this.state;

    try {
      var appSettingsJS: AppSettingsJS = JSON.parse(settingsText);
    } catch (e) {
      this.setState({
        errorText: `Could not parse: ${e.message}`,
        messageText: ''
      });
      return;
    }

    try {
      var appSettings = AppSettings.fromJS(appSettingsJS);
    } catch (e) {
      this.setState({
        errorText: `Invalid settings: ${e.message}`,
        messageText: ''
      });
      return;
    }

    Qajax({
      method: "POST",
      url: 'settings',
      data: {
        version: version,
        appSettings: appSettings
      }
    })
      .then(Qajax.filterSuccess)
      .then(Qajax.toJSON)
      .then(
        (status) => {
          if (!this.mounted) return;
          this.setState({
            errorText: '',
            messageText: 'Saved.'
          });
          if (onSettingsChange) {
            onSettingsChange(appSettings.toClientSettings().attachExecutors((dataSource: DataSource) => {
              return queryUrlExecutorFactory(dataSource.name, 'plywood', version);
            }));
          }
        },
        (xhr: XMLHttpRequest) => {
          if (!this.mounted) return;
          var jsonError = JSON.parse(xhr.responseText);
          this.setState({
            errorText: `Server error: ${jsonError}`,
            messageText: ''
          });
        }
      );

  }

  render() {
    const { user, onNavClick, customization } = this.props;
    const { errorText, messageText, settingsText } = this.state;

    return <div className="settings-view">
      <HomeHeaderBar
        user={user}
        onNavClick={onNavClick}
        customization={customization}
        title={STRINGS.settings}
      />
      <div className="container">
        <div className="text-input">
          <textarea value={settingsText} onChange={this.onChange.bind(this)}/>
        </div>
        {errorText ? <div className="error">{errorText}</div> : null}
        {messageText ? <div className="message">{messageText}</div> : null}
        <Button type="primary" onClick={this.onSave.bind(this)} title="Jesus Saves"/>
      </div>
    </div>;
  }
}
