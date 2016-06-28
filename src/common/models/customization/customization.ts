import { Class, Instance, isInstanceOf, isImmutableClass, immutableArraysEqual } from 'immutable-class';
import { Timezone } from 'chronoshift';
import { ExternalView, ExternalViewValue} from '../external-view/external-view';

export interface CustomizationValue {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalView[];
  timezones?: Timezone[];
}

export interface CustomizationJS {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalViewValue[];
  timezones?: string[];
}

var check: Class<CustomizationValue, CustomizationJS>;
export class Customization implements Instance<CustomizationValue, CustomizationJS> {
  static DEFAULT_TITLE = 'Pivot (%v)';

  static isCustomization(candidate: any): candidate is Customization {
    return isInstanceOf(candidate, Customization);
  }

  static fromJS(parameters: CustomizationJS): Customization {
    var value: CustomizationValue = {
      title: parameters.title,
      headerBackground: parameters.headerBackground,
      customLogoSvg: parameters.customLogoSvg
    };
    var paramViewsJS = parameters.externalViews;
    var externalViews: ExternalView[] = null;
    if (Array.isArray(paramViewsJS)) {
      externalViews = paramViewsJS.map((view, i) => ExternalView.fromJS(view));
      value.externalViews = externalViews;
    }

    var timezonesJS = parameters.timezones;
    var timezones: Timezone[] = null;
    if (Array.isArray(timezonesJS)) {
      timezones = timezonesJS.map((tz) => {
        try {
          return Timezone.fromJS(tz);
        } catch (e) {
          throw new Error(`unrecognized timezone: '${tz}'`);
        }
      });
      value.timezones = timezones;
    }

    return new Customization(value);
  }

  public title: string;
  public headerBackground: string;
  public customLogoSvg: string;
  public externalViews: ExternalView[];
  public timezones: Timezone[];


  constructor(parameters: CustomizationValue) {
    this.title = parameters.title || Customization.DEFAULT_TITLE;
    this.headerBackground = parameters.headerBackground || null;
    this.customLogoSvg = parameters.customLogoSvg || null;
    if (parameters.externalViews) this.externalViews = parameters.externalViews;
    if (parameters.timezones) this.timezones = parameters.timezones;
  }


  public valueOf(): CustomizationValue {
    return {
      title: this.title,
      headerBackground: this.headerBackground,
      customLogoSvg: this.customLogoSvg,
      externalViews: this.externalViews,
      timezones: this.timezones
    };
  }

  public toJS(): CustomizationJS {
    var js: CustomizationJS = {};
    if (this.title !== Customization.DEFAULT_TITLE) js.title = this.title;
    if (this.headerBackground) js.headerBackground = this.headerBackground;
    if (this.customLogoSvg) js.customLogoSvg = this.customLogoSvg;
    if (this.externalViews) {
      js.externalViews = this.externalViews.map(view => view.toJS());
    }
    if (this.timezones) {
      js.timezones = this.timezones.map(tz => tz.toJS());
    }
    return js;
  }

  public toJSON(): CustomizationJS {
    return this.toJS();
  }

  public toString(): string {
    return `[custom: (${this.headerBackground}) logo: ${Boolean(this.customLogoSvg)}, externalViews: ${Boolean(this.externalViews)}, timezones: ${Boolean(this.timezones)}]`;
  }

  public equals(other: Customization): boolean {
    return Customization.isCustomization(other) &&
      this.title === other.title &&
      this.headerBackground === other.headerBackground &&
      this.customLogoSvg === other.customLogoSvg &&
      immutableArraysEqual(this.externalViews, other.externalViews) &&
      immutableArraysEqual(this.timezones, other.timezones);
  }

  public getTitle(version: string): string {
    return this.title.replace(/%v/g, version);
  }

  public changeTitle(title: string): Customization {
    var value = this.valueOf();

    value.title = title;

    return new Customization(value);
  }
}

check = Customization;
