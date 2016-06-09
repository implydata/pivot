require('./general.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';
import { firstUp } from '../../../utils/string/string';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';

import { AppSettings, AppSettingsJS } from '../../../../common/models/index';

export interface GeneralProps extends React.Props<any> {
  settings?: AppSettings;
  onSave?: (settings: AppSettings) => void;
}

export interface GeneralState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
}

export class General extends React.Component<GeneralProps, GeneralState> {
  constructor() {
    super();

    this.state = {hasChanged: false};
  }

  componentWillReceiveProps(nextProps: GeneralProps) {
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings,
      hasChanged: false
    });
  }

  changeOnPath(path: string, instance: any, newValue: any): any {
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

  onChange(propertyPath: string, e: KeyboardEvent) {
    const settings: AppSettings = this.props.settings;

    var newValue: any = (e.target as HTMLInputElement).value;
    var newSettings = this.changeOnPath(propertyPath, settings, newValue);

    this.setState({
      newSettings,
      hasChanged: !settings.equals(newSettings)
    });
  }

  save() {
    if (this.props.onSave) {
      this.props.onSave(this.state.newSettings);
    }
  }

  render() {
    // Put this in i18n, probably
    const helpTexts: any = {
      title: 'The title as it will appear in your browser\'s title bar. Use %v to show the version.'
    };

    const { hasChanged, newSettings } = this.state;

    if (!newSettings) return null;

    return <div className="general">
      <div className="title-bar">
        <div className="title">General</div>
        {hasChanged ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
      </div>
      <div className="content">
        <form className="vertical">
          <FormLabel label="Title" helpText={helpTexts.title}></FormLabel>
          <input
            type="text"
            value={newSettings.customization.title}
            onChange={this.onChange.bind(this, 'customization.title')}
          />
        </form>
      </div>
    </div>;
  }
}
