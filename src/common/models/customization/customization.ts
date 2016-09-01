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

import { BaseImmutable, Property, isInstanceOf } from 'immutable-class';
import { Timezone } from 'chronoshift';
import { ExternalView, ExternalViewValue } from '../external-view/external-view';

export interface CustomizationValue {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalView[];
  timezones?: Timezone[];
  logoutHref?: string;
}

export interface CustomizationJS {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalViewValue[];
  timezones?: string[];
  logoutHref?: string;
}

export class Customization extends BaseImmutable<CustomizationValue, CustomizationJS> {
  static DEFAULT_TITLE = 'Pivot (%v)';

  static DEFAULT_TIMEZONES: Timezone[] = [
    new Timezone("America/Juneau"), // -9.0
    new Timezone("America/Los_Angeles"), // -8.0
    new Timezone("America/Yellowknife"), // -7.0
    new Timezone("America/Phoenix"), // -7.0
    new Timezone("America/Denver"), // -7.0
    new Timezone("America/Mexico_City"), // -6.0
    new Timezone("America/Chicago"), // -6.0
    new Timezone("America/New_York"), // -5.0
    new Timezone("America/Argentina/Buenos_Aires"), // -4.0
    Timezone.UTC,
    new Timezone("Asia/Jerusalem"), // +2.0
    new Timezone("Europe/Paris"), // +1.0
    new Timezone("Asia/Kathmandu"), // +5.8
    new Timezone("Asia/Hong_Kong"), // +8.0
    new Timezone("Asia/Seoul"), // +9.0
    new Timezone("Pacific/Guam") // +10.0
  ];

  static DEFAULT_LOGOUT_HREF = 'logout';

  static isCustomization(candidate: any): candidate is Customization {
    return isInstanceOf(candidate, Customization);
  }

  static fromJS(parameters: CustomizationJS): Customization {
    return new Customization(BaseImmutable.jsToValue(Customization.PROPERTIES, parameters));
  }

  static PROPERTIES: Property[] = [
    { name: 'title', defaultValue: Customization.DEFAULT_TITLE },
    { name: 'headerBackground', defaultValue: null },
    { name: 'customLogoSvg', defaultValue: null },
    { name: 'externalViews', defaultValue: [], immutableClassArray: (ExternalView as any) },
    { name: 'timezones', defaultValue: Customization.DEFAULT_TIMEZONES, immutableClassArray: (Timezone as any) },
    { name: 'logoutHref', defaultValue: Customization.DEFAULT_LOGOUT_HREF }
  ];

  public title: string;
  public headerBackground: string;
  public customLogoSvg: string;
  public externalViews: ExternalView[];
  public timezones: Timezone[];
  public logoutHref: string;


  constructor(parameters: CustomizationValue) {
    super(parameters);
  }

  public getTitle: () => string;

  public getTitleWithVersion(version: string): string {
    return this.getTitle().replace(/%v/g, version);
  }

  public changeTitle: (title: string) => Customization;
  public getTimezones: () => Timezone[];
  public getLogoutHref: () => string;

}
BaseImmutable.finalize(Customization);
