require('./general.css');

import * as React from 'react';
import { Fn } from '../../../../common/utils/general/general';
import { classNames } from '../../../utils/dom/dom';

import { SvgIcon } from '../../../components/svg-icon/svg-icon';
import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';

import { GENERAL as LABELS } from '../utils/labels';

import { AppSettings, AppSettingsJS } from '../../../../common/models/index';

export interface GeneralProps extends React.Props<any> {
  settings?: AppSettings;
  onSave?: (settings: AppSettings) => void;
}

export interface GeneralState {
  newSettings?: AppSettings;
  hasChanged?: boolean;
  errors?: any;
}

export class General extends React.Component<GeneralProps, GeneralState> {
  constructor() {
    super();

    this.state = {hasChanged: false, errors: {}};
  }

  componentWillReceiveProps(nextProps: GeneralProps) {
    if (nextProps.settings) this.setState({
      newSettings: nextProps.settings,
      hasChanged: false,
      errors: {}
    });
  }

  onChange(newSettings: AppSettings, isValid: boolean, path: string) {
    const { errors } = this.state;
    const settings: AppSettings = this.props.settings;

    errors[path] = !isValid;

    this.setState({
      newSettings,
      errors,
      hasChanged: !settings.equals(newSettings)
    });
  }

  save() {
    if (this.props.onSave) {
      this.props.onSave(this.state.newSettings);
    }
  }

  render() {
    const { hasChanged, newSettings, errors } = this.state;

    if (!newSettings) return null;

    return <div className="general">
      <div className="title-bar">
        <div className="title">General</div>
        {hasChanged ? <Button className="save" title="Save" type="primary" onClick={this.save.bind(this)}/> : null}
      </div>
      <div className="content">
        <form className="vertical">
          <FormLabel
            label="Browser title"
            helpText={LABELS.title.help}
            errorText={errors['customization.title'] ? LABELS.title.error : undefined}
          />
          <ImmutableInput
            instance={newSettings}
            path={'customization.title'}
            onChange={this.onChange.bind(this)}
            focusOnStartUp={true}
            validator={/^.+$/}
          />
        </form>
      </div>
    </div>;
  }
}
