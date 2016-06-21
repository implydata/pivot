import { Class, Instance, isInstanceOf, isImmutableClass, immutableArraysEqual } from 'immutable-class';
import { ExternalView, ExternalViewValue} from '../external-view/external-view';

export interface CustomizationValue {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalView[];
  tabsMode?: boolean;
}

export interface CustomizationJS {
  title?: string;
  headerBackground?: string;
  customLogoSvg?: string;
  externalViews?: ExternalViewValue[];
  tabsMode?: boolean;
}

var check: Class<CustomizationValue, CustomizationJS>;
export class Customization implements Instance<CustomizationValue, CustomizationJS> {

  static isCustomization(candidate: any): candidate is Customization {
    return isInstanceOf(candidate, Customization);
  }

  static fromJS(parameters: CustomizationJS): Customization {
    var value: CustomizationValue = {
      title: parameters.title,
      headerBackground: parameters.headerBackground,
      customLogoSvg: parameters.customLogoSvg,
      tabsMode: parameters.tabsMode
    };
    var paramViewsJS = parameters.externalViews;
    var externalViews: ExternalView[] = null;
    if (Array.isArray(paramViewsJS)) {
      externalViews = paramViewsJS.map((view, i) => ExternalView.fromJS(view));
      value.externalViews = externalViews;
    }
    return new Customization(value);
  }

  public title: string;
  public headerBackground: string;
  public customLogoSvg: string;
  public externalViews: ExternalView[];
  public tabsMode: boolean;

  constructor(parameters: CustomizationValue) {
    this.title = parameters.title || null;
    this.headerBackground = parameters.headerBackground || null;
    this.customLogoSvg = parameters.customLogoSvg || null;
    this.tabsMode = parameters.tabsMode || false;
    if (parameters.externalViews) this.externalViews = parameters.externalViews;
  }


  public valueOf(): CustomizationValue {
    return {
      title: this.title,
      headerBackground: this.headerBackground,
      customLogoSvg: this.customLogoSvg,
      externalViews: this.externalViews,
      tabsMode: this.tabsMode
    };
  }

  public toJS(): CustomizationJS {
    var js: CustomizationJS = {};
    if (this.title) js.title = this.title;
    if (this.headerBackground) js.headerBackground = this.headerBackground;
    if (this.customLogoSvg) js.customLogoSvg = this.customLogoSvg;
    if (this.externalViews) {
      js.externalViews = this.externalViews.map(view => view.toJS());
    }
    if (this.tabsMode) js.tabsMode = this.tabsMode;
    return js;
  }

  public toJSON(): CustomizationJS {
    return this.toJS();
  }

  public toString(): string {
    return `[custom: (${this.headerBackground}) logo: ${Boolean(this.customLogoSvg)}, externalViews: ${Boolean(this.externalViews)}, tabsMode: ${Boolean(this.tabsMode)}]`;
  }

  public equals(other: Customization): boolean {
    return Customization.isCustomization(other) &&
      this.title === other.title &&
      this.headerBackground === other.headerBackground &&
      this.customLogoSvg === other.customLogoSvg &&
      immutableArraysEqual(this.externalViews, other.externalViews) &&
      this.tabsMode === other.tabsMode;
  }
}

check = Customization;
