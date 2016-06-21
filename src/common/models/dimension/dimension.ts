import { List } from 'immutable';
import { Class, Instance, isInstanceOf, immutableArraysEqual } from 'immutable-class';

import { $, Expression, ExpressionJS, Action, NumberRangeJS, ApplyAction, AttributeInfo } from 'plywood';
import { verifyUrlSafeName, makeTitle, hasOwnProperty } from '../../utils/general/general';
import { Granularity, GranularityJS, granularityFromJS, granularityToJS, granularityEquals } from "../granularity/granularity";

var geoName = /continent|country|city|region/i;
function isGeo(name: string): boolean {
  return geoName.test(name);
}

function typeToKind(type: string): string {
  if (!type) return type;
  return type.toLowerCase().replace(/_/g, '-').replace(/-range$/, '');
}

export const NEVER_BUCKET = "never_bucket";

export type BucketingStrategy = "always_bucket" | "never_bucket";

export interface DimensionValue {
  name: string;
  title?: string;
  expression?: Expression;
  kind?: string;
  url?: string;
  granularities?: Granularity[];
  bucketedBy?: Granularity;
  bucketingStrategy?: BucketingStrategy;
}

export interface DimensionJS {
  name: string;
  title?: string;
  expression?: ExpressionJS | string;
  kind?: string;
  url?: string;
  granularities?: GranularityJS[];
  bucketedBy?: GranularityJS;
  bucketingStrategy?: string;
}

var check: Class<DimensionValue, DimensionJS>;
export class Dimension implements Instance<DimensionValue, DimensionJS> {
  static isDimension(candidate: any): candidate is Dimension {
    return isInstanceOf(candidate, Dimension);
  }

  static getDimension(dimensions: List<Dimension>, dimensionName: string): Dimension {
    if (!dimensionName) return null;
    dimensionName = dimensionName.toLowerCase(); // Case insensitive
    return dimensions.find(dimension => dimension.name.toLowerCase() === dimensionName);
  }

  static getDimensionByExpression(dimensions: List<Dimension>, expression: Expression): Dimension {
    return dimensions.find(dimension => dimension.expression.equals(expression));
  }

  static fromJS(parameters: DimensionJS): Dimension {
    var value: DimensionValue = {
      name: parameters.name,
      title: parameters.title,
      expression: parameters.expression ? Expression.fromJSLoose(parameters.expression) : null,
      kind: parameters.kind || typeToKind((parameters as any).type),
      url: parameters.url
    };
    var granularities = parameters.granularities;
    if (granularities) {
      if (!Array.isArray(granularities) || granularities.length !== 5) {
        throw new Error(`must have list of 5 granularities in dimension '${parameters.name}'`);
      }

      var runningActionType: string = null;
      value.granularities = granularities.map((g) => {
        var granularity = granularityFromJS(g);
        if (runningActionType === null) runningActionType = granularity.action;
        if (granularity.action !== runningActionType) throw new Error("granularities must have the same type of actions");
        return granularity;
      });
    }

    var bucketedBy = parameters.bucketedBy;
    if (bucketedBy) {
      value.bucketedBy = granularityFromJS(bucketedBy);
    }

    if (parameters.bucketingStrategy) {
      value.bucketingStrategy = parameters.bucketingStrategy as BucketingStrategy;
    }

    return new Dimension(value);
  }

  public name: string;
  public title: string;
  public expression: Expression;
  public kind: string;
  public className: string;
  public url: string;
  public granularities: Granularity[];
  public bucketedBy: Granularity;
  public bucketingStrategy: BucketingStrategy;

  constructor(parameters: DimensionValue) {
    var name = parameters.name;
    verifyUrlSafeName(name);
    this.name = name;
    this.title = parameters.title || makeTitle(name);
    this.expression = parameters.expression || $(name);
    var kind = parameters.kind || typeToKind(this.expression.type) || 'string';
    this.kind = kind;

    if (kind === 'string' && isGeo(name)) {
      this.className = 'string-geo';
    } else {
      this.className = kind;
    }
    if (parameters.url) {
      if (typeof parameters.url !== 'string') {
        throw new Error(`unsupported url: ${parameters.url}: only strings are supported`);
      }
      this.url = parameters.url;
    }

    if (parameters.granularities) this.granularities = parameters.granularities;
    if (parameters.bucketedBy) this.bucketedBy = parameters.bucketedBy;
    if (parameters.bucketingStrategy) this.bucketingStrategy = parameters.bucketingStrategy;

  }

  public valueOf(): DimensionValue {
    return {
      name: this.name,
      title: this.title,
      expression: this.expression,
      kind: this.kind,
      url: this.url,
      granularities: this.granularities,
      bucketedBy: this.bucketedBy,
      bucketingStrategy: this.bucketingStrategy
    };
  }

  public toJS(): DimensionJS {
    var js: DimensionJS = {
      name: this.name,
      title: this.title,
      expression: this.expression.toJS(),
      kind: this.kind
    };
    if (this.url) js.url = this.url;
    if (this.granularities) js.granularities = this.granularities.map((g) => { return granularityToJS(g); });
    if (this.bucketedBy) js.bucketedBy = granularityToJS(this.bucketedBy);
    if (this.bucketingStrategy !== null && this.bucketingStrategy !== undefined) js.bucketingStrategy = this.bucketingStrategy;

    return js;
  }

  public toJSON(): DimensionJS {
    return this.toJS();
  }

  public toString(): string {
    return `[Dimension: ${this.name}]`;
  }

  public equals(other: Dimension): boolean {
    return Dimension.isDimension(other) &&
      this.name === other.name &&
      this.title === other.title &&
      this.expression.equals(other.expression) &&
      this.kind === other.kind &&
      this.url === other.url &&
      immutableArraysEqual(this.granularities, other.granularities) &&
      granularityEquals(this.bucketedBy, other.bucketedBy) &&
      this.bucketingStrategy === other.bucketingStrategy;
  }

  public isContinuous() {
    const { kind } = this;
    return kind === 'time' || kind === 'number';
  }

  change(propertyName: string, newValue: any): Dimension {
    var v = this.valueOf();

    if (!v.hasOwnProperty(propertyName)) {
      throw new Error(`Unknown property : ${propertyName}`);
    }

    (v as any)[propertyName] = newValue;
    return new Dimension(v);
  }

  changeKind(newKind: string): Dimension {
    return this.change('kind', newKind);
  }

  changeName(newName: string): Dimension {
    return this.change('name', newName);
  }

  changeTitle(newTitle: string): Dimension {
    return this.change('title', newTitle);
  }

}
check = Dimension;
