require('./settings-menu.css');

import * as React from 'react';
import { Timezone } from 'chronoshift';
import { Fn } from "../../../common/utils/general/general";
import { Stage, Essence } from '../../../common/models/index';
import { STRINGS } from '../../config/constants';
import { BubbleMenu } from '../bubble-menu/bubble-menu';
import { Dropdown, DropdownProps } from '../dropdown/dropdown';
var { WallTime } = require('chronoshift');
if (!WallTime.rules) {
  var tzData = require("chronoshift/lib/walltime/walltime-data.js");
  WallTime.init(tzData.rules, tzData.zones);
}

const TIMEZONES: Timezone[] = [
  new Timezone("Pacific/Niue"), // -11.0
  new Timezone("Pacific/Marquesas"), // -9.5
  new Timezone("America/Tijuana"), // -8.0
  new Timezone("America/St_Johns"), // -3.5
  Timezone.UTC,
  new Timezone("Asia/Kathmandu"), // +5.8
  new Timezone("Asia/Hong_Kong"), // +8.0
  new Timezone("Australia/Broken_Hill"), // +9.5
  new Timezone("Pacific/Kiritimati") // +14.0
];

export interface SettingsMenuProps extends React.Props<any> {
  changeTimezone?: (timezone: Timezone) => void;
  timezone?: Timezone;
  openOn: Element;
  onClose: Fn;
}

export interface SettingsMenuState {
}

export class SettingsMenu extends React.Component<SettingsMenuProps, SettingsMenuState> {

  constructor() {
    super();
    //this.state = {};
  }

  renderTimezonesDropdown() {
    const { timezone, changeTimezone } = this.props;
    return React.createElement(Dropdown, {
      label: STRINGS.timezone,
      selectedItem: timezone,
      items: TIMEZONES,
      onSelect: changeTimezone.bind(this)
    });
  }

  render() {
    const { openOn, onClose } = this.props;

    var stage = Stage.fromSize(200, 200);
    return <BubbleMenu
      className="settings-menu"
      direction="down"
      stage={stage}
      openOn={openOn}
      onClose={onClose}
    >
      {this.renderTimezonesDropdown()}
    </BubbleMenu>;
  }
}
