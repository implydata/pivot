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

import { List, OrderedSet } from 'immutable';
import { Class, Instance, isInstanceOf, immutableEqual, immutableArraysEqual, immutableLookupsEqual } from 'immutable-class';
import { Duration, Timezone, second } from 'chronoshift';
import { $, ply, r, Expression, ExpressionJS, External, RefExpression, Dataset,
  Attributes, AttributeInfo, AttributeJSs, SortAction, SimpleFullType, DatasetFullType, PlyTypeSimple,
  CustomDruidAggregations, CustomDruidTransforms, ExternalValue, findByName, overrideByName } from 'plywood';
import { hasOwnProperty, verifyUrlSafeName, makeUrlSafeName, makeTitle, immutableListsEqual } from '../../utils/general/general';
import { getWallTimeString } from '../../utils/time/time';
import { Dimension, DimensionJS } from '../dimension/dimension';
import { Measure, MeasureJS } from '../measure/measure';
import { FilterClause } from '../filter-clause/filter-clause';
import { Filter, FilterJS } from '../filter/filter';
import { Splits, SplitsJS } from '../splits/splits';
import { RefreshRule, RefreshRuleJS } from '../refresh-rule/refresh-rule';
import { Cluster } from '../cluster/cluster';
import { Timekeeper } from "../timekeeper/timekeeper";

const MAX_TIME = 'maxTime';

function formatTimeDiff(diff: number): string {
  diff = Math.round(Math.abs(diff) / 1000); // turn to seconds
  if (diff < 60) return 'less than 1 minute';

  diff = Math.floor(diff / 60); // turn to minutes
  if (diff === 1) return '1 minute';
  if (diff < 60) return diff + ' minutes';

  diff = Math.floor(diff / 60); // turn to hours
  if (diff === 1) return '1 hour';
  if (diff <= 24) return diff + ' hours';

  diff = Math.floor(diff / 24); // turn to days
  return diff + ' days';
}

function checkUnique(dimensions: List<Dimension>, measures: List<Measure>, dataCubeName: string) {
  var seenDimensions: Lookup<number> = {};
  var seenMeasures: Lookup<number> = {};

  if (dimensions) {
    dimensions.forEach((d) => {
      var dimensionName = d.name.toLowerCase();
      if (seenDimensions[dimensionName]) throw new Error(`duplicate dimension name '${d.name}' found in data cube: '${dataCubeName}'`);
      seenDimensions[dimensionName] = 1;
    });
  }

  if (measures) {
    measures.forEach((m) => {
      var measureName = m.name.toLowerCase();
      if (seenMeasures[measureName]) throw new Error(`duplicate measure name '${m.name}' found in data cube: '${dataCubeName}'`);
      if (seenDimensions[measureName]) throw new Error(`name '${m.name}' found in both dimensions and measures in data cube: '${dataCubeName}'`);
      seenMeasures[measureName] = 1;
    });
  }
}

export type Introspection = 'none' | 'no-autofill' | 'autofill-dimensions-only' | 'autofill-measures-only' | 'autofill-all';

export interface DataCubeValue {
  name: string;
  title?: string;
  description?: string;
  clusterName: string;
  source: string;
  group?: string;
  subsetFormula?: string;
  rollup?: boolean;
  options?: DataCubeOptions;
  introspection?: Introspection;
  attributeOverrides?: Attributes;
  attributes?: Attributes;
  derivedAttributes?: Lookup<Expression>;

  dimensions?: List<Dimension>;
  measures?: List<Measure>;
  primaryTimeAttribute?: string;
  defaultTimezone?: Timezone;
  defaultFilter?: Filter;
  defaultSplits?: Splits;
  defaultDuration?: Duration;
  defaultSortMeasure?: string;
  defaultSelectedMeasures?: OrderedSet<string>;
  defaultPinnedDimensions?: OrderedSet<string>;
  refreshRule?: RefreshRule;
}

export interface DataCubeJS {
  name: string;
  title?: string;
  description?: string;
  clusterName: string;
  source: string;
  group?: string;
  subsetFormula?: string;
  rollup?: boolean;
  options?: DataCubeOptions;
  introspection?: Introspection;
  attributeOverrides?: AttributeJSs;
  attributes?: AttributeJSs;
  derivedAttributes?: Lookup<ExpressionJS>;

  dimensions?: DimensionJS[];
  measures?: MeasureJS[];
  primaryTimeAttribute?: string;
  defaultTimezone?: string;
  defaultFilter?: FilterJS;
  defaultSplits?: SplitsJS;
  defaultDuration?: string;
  defaultSortMeasure?: string;
  defaultSelectedMeasures?: string[];
  defaultPinnedDimensions?: string[];
  refreshRule?: RefreshRuleJS;

  longForm?: LongForm;
}

export interface DataCubeOptions {
  customAggregations?: CustomDruidAggregations;
  customTransforms?: CustomDruidTransforms;
  druidContext?: Lookup<any>;
  priority?: number;
  druidTimeAttributeName?: string;

  // Deprecated
  defaultSplits?: SplitsJS;
  defaultSplitDimension?: string;
  skipIntrospection?: boolean;
  disableAutofill?: boolean;
  attributeOverrides?: AttributeJSs;

  // Whatever
  [thing: string]: any;
}

export interface LongForm {
  metricColumn: string;
  possibleAggregates: Lookup<any>;
  addSubsetFilter?: boolean;
  measures: Array<MeasureJS | LongFormMeasure>;
}

export interface LongFormMeasure {
  aggregate: string;
  value: string;
  title: string;
  units?: string;
}

function measuresFromLongForm(longForm: LongForm): Measure[] {
  const { metricColumn, measures, possibleAggregates } = longForm;
  var myPossibleAggregates: Lookup<Expression> = {};
  for (var agg in possibleAggregates) {
    if (!hasOwnProperty(possibleAggregates, agg)) continue;
    myPossibleAggregates[agg] = Expression.fromJSLoose(possibleAggregates[agg]);
  }

  return measures.map((measure) => {
    if (hasOwnProperty(measure, 'name')) {
      return Measure.fromJS(measure as MeasureJS);
    }

    var title = measure.title;
    if (!title) {
      throw new Error('must have title in longForm value');
    }

    var value = (measure as LongFormMeasure).value;
    var aggregate = (measure as LongFormMeasure).aggregate;
    if (!aggregate) {
      throw new Error('must have aggregates in longForm value');
    }

    var myExpression = myPossibleAggregates[aggregate];
    if (!myExpression) throw new Error(`can not find aggregate ${aggregate} for value ${value}`);

    var name = makeUrlSafeName(`${aggregate}_${value}`);
    return new Measure({
      name,
      title: title,
      units: measure.units,
      formula: myExpression.substitute((ex) => {
        if (ex instanceof RefExpression && ex.name === 'filtered') {
          return $('main').filter($(metricColumn).is(r(value)));
        }
        return null;
      }).toString()
    });
  });
}

function filterFromLongForm(longForm: LongForm): Expression {
  var { metricColumn, measures } = longForm;
  var values: string[] = [];
  for (var measure of measures) {
    if (hasOwnProperty(measure, 'aggregate')) values.push((measure as LongFormMeasure).value);
  }
  return $(metricColumn).in(values).simplify();
}

var check: Class<DataCubeValue, DataCubeJS>;
export class DataCube implements Instance<DataCubeValue, DataCubeJS> {
  static DEFAULT_INTROSPECTION: Introspection = 'autofill-all';
  static INTROSPECTION_VALUES: Introspection[] = ['none', 'no-autofill', 'autofill-dimensions-only', 'autofill-measures-only', 'autofill-all'];
  static DEFAULT_DEFAULT_TIMEZONE = Timezone.UTC;
  static DEFAULT_DEFAULT_FILTER = Filter.EMPTY;
  static DEFAULT_DEFAULT_SPLITS = Splits.EMPTY;
  static DEFAULT_DEFAULT_DURATION = Duration.fromJS('P1D');

  static isDataCube(candidate: any): candidate is DataCube {
    return isInstanceOf(candidate, DataCube);
  }

  static processMaxTimeQuery(dataset: Dataset): Date {
    var maxTimeDate = <Date>dataset.data[0][MAX_TIME];
    if (isNaN(maxTimeDate as any)) return null;
    return maxTimeDate;
  }

  static suggestDimensions(attributes: Attributes): Dimension[] {
    var dimensions: Dimension[] = [];

    for (var attribute of attributes) {
      var { name, type, special } = attribute;
      var urlSafeName = makeUrlSafeName(name);

      switch (type) {
        case 'TIME':
          // Add to the start
          dimensions.unshift(new Dimension({
            name: urlSafeName,
            kind: 'time',
            formula: $(name).toString()
          }));
          break;

        case 'STRING':
          if (special !== 'unique' && special !== 'theta') {
            dimensions.push(new Dimension({
              name: urlSafeName,
              formula: $(name).toString()
            }));
          }
          break;

        case 'SET/STRING':
          dimensions.push(new Dimension({
            name: urlSafeName,
            formula: $(name).toString()
          }));
          break;

        case 'BOOLEAN':
          dimensions.push(new Dimension({
            name: urlSafeName,
            kind: 'boolean',
            formula: $(name).toString()
          }));
          break;
      }
    }

    return dimensions;
  }

  static suggestMeasures(attributes: Attributes): Measure[] {
    var measures: Measure[] = [];

    for (var attribute of attributes) {
      var { name, type, special } = attribute;

      switch (type) {
        case 'STRING':
          if (special === 'unique' || special === 'theta') {
            measures = measures.concat(Measure.measuresFromAttributeInfo(attribute));
          }
          break;

        case 'NUMBER':
          var newMeasures = Measure.measuresFromAttributeInfo(attribute);
          newMeasures.forEach((newMeasure) => {
            if (name === 'count') {
              measures.unshift(newMeasure);
            } else {
              measures.push(newMeasure);
            }
          });
          break;
      }
    }

    return measures;
  }

  static fromClusterAndSource(name: string, cluster: Cluster, source: string): DataCube {
    return DataCube.fromJS({
      name,
      title: makeTitle(source),
      clusterName: cluster.name,
      source,
      primaryTimeAttribute: (cluster && cluster.type === 'druid') ? '__time' : null
    });
  }

  static fromJS(parameters: DataCubeJS): DataCube {
    var clusterName = parameters.clusterName || (parameters as any).engine;
    var introspection = parameters.introspection;
    var defaultSplitsJS = parameters.defaultSplits;
    var attributeOverrideJSs = parameters.attributeOverrides;
    var primaryTimeAttribute = parameters.primaryTimeAttribute;

    var options = parameters.options || {};
    if (options.skipIntrospection) {
      if (!introspection) introspection = 'none';
      delete options.skipIntrospection;
    }
    if (options.disableAutofill) {
      if (!introspection) introspection = 'no-autofill';
      delete options.disableAutofill;
    }
    if (options.attributeOverrides) {
      if (!attributeOverrideJSs) attributeOverrideJSs = options.attributeOverrides;
      delete options.attributeOverrides;
    }
    if (options.defaultSplitDimension) {
      options.defaultSplits = options.defaultSplitDimension;
      delete options.defaultSplitDimension;
    }
    if (options.defaultSplits) {
      if (!defaultSplitsJS) defaultSplitsJS = options.defaultSplits;
      delete options.defaultSplits;
    }
    if (!primaryTimeAttribute && (parameters as any).timeAttribute) {
      primaryTimeAttribute = (parameters as any).timeAttribute;
      options.druidTimeAttributeName = primaryTimeAttribute;
    }
    // End Back compat.

    if (introspection && DataCube.INTROSPECTION_VALUES.indexOf(introspection) === -1) {
      throw new Error(`invalid introspection value ${introspection}, must be one of ${DataCube.INTROSPECTION_VALUES.join(', ')}`);
    }

    var refreshRule = parameters.refreshRule ? RefreshRule.fromJS(parameters.refreshRule) : null;

    var attributeOverrides = AttributeInfo.fromJSs(attributeOverrideJSs || []);
    var attributes = AttributeInfo.fromJSs(parameters.attributes || []);
    var derivedAttributes: Lookup<Expression> = null;
    if (parameters.derivedAttributes) {
      derivedAttributes = Expression.expressionLookupFromJS(parameters.derivedAttributes);
    }

    var dimensions = List((parameters.dimensions || []).map((d) => Dimension.fromJS(d)));
    var measures = List((parameters.measures || []).map((m) => Measure.fromJS(m)));

    var subsetFormula = parameters.subsetFormula || (parameters as any).subsetFilter;

    var longForm = parameters.longForm;
    if (longForm) {
      measures = measures.concat(measuresFromLongForm(longForm)) as List<Measure>;

      if (longForm.addSubsetFilter) {
        var subsetExpression = subsetFormula ? Expression.fromJSLoose(parameters.subsetFormula) : Expression.TRUE;
        subsetFormula = JSON.stringify(subsetExpression.and(filterFromLongForm(longForm)).simplify());
      }
    }

    var value: DataCubeValue = {
      name: parameters.name,
      title: parameters.title,
      description: parameters.description,
      clusterName,
      source: parameters.source,
      group: parameters.group,
      subsetFormula,
      rollup: parameters.rollup,
      options,
      introspection,
      attributeOverrides,
      attributes,
      derivedAttributes,
      dimensions,
      measures,
      primaryTimeAttribute,
      defaultTimezone: parameters.defaultTimezone ? Timezone.fromJS(parameters.defaultTimezone) : null,
      defaultFilter: parameters.defaultFilter ? Filter.fromJS(parameters.defaultFilter) : null,
      defaultSplits: defaultSplitsJS ? Splits.fromJS(defaultSplitsJS, { dimensions }) : null,
      defaultDuration: parameters.defaultDuration ? Duration.fromJS(parameters.defaultDuration) : null,
      defaultSortMeasure: parameters.defaultSortMeasure,
      defaultSelectedMeasures: parameters.defaultSelectedMeasures ? OrderedSet(parameters.defaultSelectedMeasures) : null,
      defaultPinnedDimensions: parameters.defaultPinnedDimensions ? OrderedSet(parameters.defaultPinnedDimensions) : null,
      refreshRule
    };
    return new DataCube(value);
  }


  public name: string;
  public title: string;
  public description: string;
  public clusterName: string;
  public source: string;
  public group: string;
  public subsetFormula: string;
  public subsetExpression: Expression;
  public rollup: boolean;
  public options: DataCubeOptions;
  public introspection: Introspection;
  public attributes: Attributes;
  public attributeOverrides: Attributes;
  public derivedAttributes: Lookup<Expression>;
  public dimensions: List<Dimension>;
  public measures: List<Measure>;
  public primaryTimeAttribute: string;
  public defaultTimezone: Timezone;
  public defaultFilter: Filter;
  public defaultSplits: Splits;
  public defaultDuration: Duration;
  public defaultSortMeasure: string;
  public defaultSelectedMeasures: OrderedSet<string>;
  public defaultPinnedDimensions: OrderedSet<string>;
  public refreshRule: RefreshRule;

  constructor(parameters: DataCubeValue) {
    var name = parameters.name;
    if (typeof name !== 'string') throw new Error(`DataCube must have a name`);
    verifyUrlSafeName(name);
    this.name = name;

    this.title = parameters.title;
    this.description = parameters.description || '';
    this.clusterName = parameters.clusterName || 'druid';
    this.source = parameters.source || name;
    this.group = parameters.group || null;
    this.subsetFormula = parameters.subsetFormula;
    this.subsetExpression = parameters.subsetFormula ? Expression.fromJSLoose(parameters.subsetFormula) : Expression.TRUE;
    this.rollup = Boolean(parameters.rollup);
    this.options = parameters.options || {};
    this.introspection = parameters.introspection;
    this.attributes = parameters.attributes || [];
    this.attributeOverrides = parameters.attributeOverrides || [];
    this.derivedAttributes = parameters.derivedAttributes;
    this.primaryTimeAttribute = parameters.primaryTimeAttribute;
    this.defaultTimezone = parameters.defaultTimezone;
    this.defaultFilter = parameters.defaultFilter;
    this.defaultSplits = parameters.defaultSplits;
    this.defaultDuration = parameters.defaultDuration;
    this.defaultSortMeasure = parameters.defaultSortMeasure;
    this.defaultSelectedMeasures = parameters.defaultSelectedMeasures;
    this.defaultPinnedDimensions = parameters.defaultPinnedDimensions;

    var refreshRule = parameters.refreshRule || RefreshRule.query();
    this.refreshRule = refreshRule;

    var dimensions = parameters.dimensions;
    var measures = parameters.measures;
    checkUnique(dimensions, measures, name);

    this.dimensions = dimensions || List([]);
    this.measures = measures || List([]);

    this._validateDefaults();
  }

  public valueOf(): DataCubeValue {
    var value: DataCubeValue = {
      name: this.name,
      title: this.title,
      description: this.description,
      clusterName: this.clusterName,
      source: this.source,
      group: this.group,
      subsetFormula: this.subsetFormula,
      rollup: this.rollup,
      options: this.options,
      introspection: this.introspection,
      attributeOverrides: this.attributeOverrides,
      attributes: this.attributes,
      derivedAttributes: this.derivedAttributes,
      dimensions: this.dimensions,
      measures: this.measures,
      primaryTimeAttribute: this.primaryTimeAttribute,
      defaultTimezone: this.defaultTimezone,
      defaultFilter: this.defaultFilter,
      defaultSplits: this.defaultSplits,
      defaultDuration: this.defaultDuration,
      defaultSortMeasure: this.defaultSortMeasure,
      defaultSelectedMeasures: this.defaultSelectedMeasures,
      defaultPinnedDimensions: this.defaultPinnedDimensions,
      refreshRule: this.refreshRule
    };
    return value;
  }

  public toJS(): DataCubeJS {
    var js: DataCubeJS = {
      name: this.name,
      title: this.title,
      description: this.description,
      clusterName: this.clusterName,
      source: this.source,
      dimensions: this.dimensions.toArray().map(dimension => dimension.toJS()),
      measures: this.measures.toArray().map(measure => measure.toJS()),
      refreshRule: this.refreshRule.toJS()
    };
    if (this.group) js.group = this.group;
    if (this.introspection) js.introspection = this.introspection;
    if (this.subsetFormula) js.subsetFormula = this.subsetFormula;
    if (this.defaultTimezone) js.defaultTimezone = this.defaultTimezone.toJS();
    if (this.defaultFilter) js.defaultFilter = this.defaultFilter.toJS();
    if (this.defaultSplits) js.defaultSplits = this.defaultSplits.toJS();
    if (this.defaultDuration) js.defaultDuration = this.defaultDuration.toJS();
    if (this.defaultSortMeasure) js.defaultSortMeasure = this.defaultSortMeasure;
    if (this.defaultSelectedMeasures) js.defaultSelectedMeasures = this.defaultSelectedMeasures.toArray();
    if (this.defaultPinnedDimensions) js.defaultPinnedDimensions = this.defaultPinnedDimensions.toArray();
    if (this.rollup) js.rollup = true;
    if (this.primaryTimeAttribute) js.primaryTimeAttribute = this.primaryTimeAttribute;
    if (this.attributeOverrides.length) js.attributeOverrides = AttributeInfo.toJSs(this.attributeOverrides);
    if (this.attributes.length) js.attributes = AttributeInfo.toJSs(this.attributes);
    if (this.derivedAttributes) js.derivedAttributes = Expression.expressionLookupToJS(this.derivedAttributes);
    if (Object.keys(this.options).length) js.options = this.options;
    return js;
  }

  public toJSON(): DataCubeJS {
    return this.toJS();
  }

  public toString(): string {
    return `[DataCube: ${this.name}]`;
  }

  public equals(other: DataCube): boolean {
    return DataCube.isDataCube(other) &&
      this.name === other.name &&
      this.title === other.title &&
      this.description === other.description &&
      this.clusterName === other.clusterName &&
      this.source === other.source &&
      this.group === other.group &&
      this.subsetFormula === other.subsetFormula &&
      this.rollup === other.rollup &&
      JSON.stringify(this.options) === JSON.stringify(other.options) &&
      this.introspection === other.introspection &&
      immutableArraysEqual(this.attributeOverrides, other.attributeOverrides) &&
      immutableArraysEqual(this.attributes, other.attributes) &&
      immutableLookupsEqual(this.derivedAttributes, other.derivedAttributes) &&
      immutableListsEqual(this.dimensions, other.dimensions) &&
      immutableListsEqual(this.measures, other.measures) &&
      this.primaryTimeAttribute === other.primaryTimeAttribute &&
      immutableEqual(this.defaultTimezone, other.defaultTimezone) &&
      immutableEqual(this.defaultFilter, other.defaultFilter) &&
      immutableEqual(this.defaultSplits, other.defaultSplits) &&
      immutableEqual(this.defaultDuration, other.defaultDuration) &&
      this.defaultSortMeasure === other.defaultSortMeasure &&
      Boolean(this.defaultSelectedMeasures) === Boolean(other.defaultSelectedMeasures) &&
      (!this.defaultSelectedMeasures || this.defaultSelectedMeasures.equals(other.defaultSelectedMeasures)) &&
      Boolean(this.defaultPinnedDimensions) === Boolean(other.defaultPinnedDimensions) &&
      (!this.defaultPinnedDimensions || this.defaultPinnedDimensions.equals(other.defaultPinnedDimensions)) &&
      this.refreshRule.equals(other.refreshRule);
  }

  private _validateDefaults() {
    var { measures, defaultSortMeasure } = this;

    if (defaultSortMeasure) {
      if (!measures.find((measure) => measure.name === defaultSortMeasure)) {
        throw new Error(`can not find defaultSortMeasure '${defaultSortMeasure}' in data cube '${this.name}'`);
      }
    }
  }

  public toExternal(cluster: Cluster, requester?: Requester.PlywoodRequester<any>): External {
    if (this.clusterName === 'native') throw new Error(`there is no external on a native data cube`);
    const { options } = this;

    var externalValue: ExternalValue = {
      engine: cluster.type,
      suppress: true,
      source: this.source,
      version: cluster.version,
      attributes: this.attributes,
      derivedAttributes: this.derivedAttributes,
      customAggregations: options.customAggregations,
      customTransforms: options.customTransforms,
      filter: this.subsetExpression
    };

    if (requester) {
      externalValue.requester = requester;
    }

    if (cluster.type === 'druid') {
      externalValue.rollup = this.rollup;
      externalValue.introspectionStrategy = cluster.getIntrospectionStrategy();
      externalValue.allowSelectQueries = true;
      externalValue.allowEternity = !this.getPrimaryTimeAttribute();

      if (options.druidTimeAttributeName) {
        externalValue.timeAttribute = options.druidTimeAttributeName;
      }

      var externalContext: Lookup<any> = options.druidContext || {};
      externalContext['timeout'] = cluster.getTimeout();
      if (options.priority) externalContext['priority'] = options.priority;
      externalValue.context = externalContext;
    }

    return External.fromValue(externalValue);
  }

  public getMainTypeContext(): DatasetFullType {
    var { attributes, derivedAttributes } = this;
    if (!attributes) return null;

    var datasetType: Lookup<SimpleFullType> = {};
    for (var attribute of attributes) {
      datasetType[attribute.name] = (attribute as any);
    }

    for (var name in derivedAttributes) {
      datasetType[name] = {
        type: <PlyTypeSimple>derivedAttributes[name].type
      };
    }

    return {
      type: 'DATASET',
      datasetType
    };
  }

  public validateFormulaInMeasureContext(formula: string) {
    var mainTypeContext = this.getMainTypeContext();
    var measureExpression = Expression.parse(formula);

    if (measureExpression.getFreeReferences().indexOf('main') === -1) {
      throw new Error(`Measure formula must contain a $main reference.`);
    }

    var measureTypeContext: DatasetFullType = {
      type: 'DATASET',
      datasetType: {
        main: mainTypeContext
      }
    };

    try {
      measureExpression.referenceCheckInTypeContext(measureTypeContext);
      return true;
    } catch (e) {
      throw new Error(`Invalid formula: ${e.message}`);
    }
  }

  public validateFormula(formula: string): boolean {
    var mainTypeContext = this.getMainTypeContext();
    var formulaExpr = Expression.parse(formula);
    try {
      formulaExpr.referenceCheckInTypeContext(mainTypeContext);
    } catch (e) {
      throw new Error(`Invalid formula: ${e.message}`);
    }
    return true;
  };

  public toClientDataCube(): DataCube {
    var value = this.valueOf();

    // Do not reveal the subset filter to the client
    value.subsetFormula = null;

    // No need for any introspection information on the client
    value.introspection = null;

    // No need for the overrides
    value.attributeOverrides = null;

    value.options = null;

    return new DataCube(value);
  }

  public getMaxTimeQuery(): Expression {
    const primaryTimeExpression = this.getPrimaryTimeExpression();
    if (!primaryTimeExpression) return null;
    return ply().apply(MAX_TIME, $('main').max(primaryTimeExpression));
  }

  public getMaxTime(timekeeper: Timekeeper): Date {
    var { name, refreshRule } = this;
    if (refreshRule.isRealtime()) {
      return timekeeper.now();
    } else if (refreshRule.isFixed()) {
      return refreshRule.time;
    } else { // refreshRule is query
      return timekeeper.getTime(name);
    }
  }

  public updatedText(timekeeper: Timekeeper, timezone: Timezone): string {
    var { refreshRule } = this;
    if (refreshRule.isRealtime()) {
      return 'Updated ~1 second ago';
    } else if (refreshRule.isFixed()) {
      return `Fixed to ${getWallTimeString(refreshRule.time, timezone, true)}`;
    } else { // refreshRule is query
      var maxTime = this.getMaxTime(timekeeper);
      if (maxTime) {
        return `Updated ${formatTimeDiff(timekeeper.now().valueOf() - maxTime.valueOf().valueOf())} ago`;
      } else {
        return null;
      }
    }
  }

  public getDimension(dimensionName: string): Dimension {
    return Dimension.getDimension(this.dimensions, dimensionName);
  }

  public getDimensionByExpression(expression: Expression): Dimension {
    return Dimension.getDimensionByExpression(this.dimensions, expression);
  }

  public getDimensionByKind(kind: string): List<Dimension> {
    return <List<Dimension>>this.dimensions.filter((d) => d.kind === kind);
  }

  public getSuggestedDimensions(): Dimension[] {
    return this.filterDimensions(DataCube.suggestDimensions(this.attributes));
  }

  public getPrimaryTimeAttribute(): string {
    const { primaryTimeAttribute } = this;
    if (primaryTimeAttribute === '!none') return null;
    return primaryTimeAttribute || null;
  }

  public getPrimaryTimeExpression(): Expression {
    var primaryTimeAttribute = this.getPrimaryTimeAttribute();
    return primaryTimeAttribute ? $(primaryTimeAttribute) : null;
  }

  public isPrimaryTimeExpression(ex: Expression): boolean {
    const timeExpression = this.getPrimaryTimeExpression();
    if (!timeExpression) return false;
    return timeExpression.equals(ex);
  }

  public isMandatoryFilter(ex: Expression): boolean {
    // Note: isPrimaryTimeExpression and isMandatoryFilter are the same for now, but they do not have to be
    return this.isPrimaryTimeExpression(ex);
  }

  public getMeasure(measureName: string): Measure {
    return Measure.getMeasure(this.measures, measureName);
  }

  public getMeasureByExpression(expression: Expression): Measure {
    return this.measures.find(measure => measure.expression.equals(expression));
  }

  public getDimensionsForAttribute(attributeName: string): Dimension[] {
    return this.dimensions.toArray().filter((dimension) => {
      return dimension.usesAttribute(attributeName);
    });
  }

  public getMeasuresForAttribute(attributeName: string): Measure[] {
    return this.measures.toArray().filter((measure) => {
      return measure.usesAttribute(attributeName);
    });
  }

  public getSuggestedMeasures(): Measure[] {
    return this.filterMeasures(DataCube.suggestMeasures(this.attributes));
  }

  public filterMeasures(measuresToFilter: Measure[]): Measure[] {
    return measuresToFilter.filter(measure => {
      if (this.getMeasure(measure.name)) return false;
      if (this.getDimension(measure.name)) return false;
      if (this.getMeasureByExpression(measure.expression)) return false;
      return true;
    });
  }

  public changeDimensions(dimensions: List<Dimension>): DataCube {
    var value = this.valueOf();
    value.dimensions = dimensions;
    return new DataCube(value);
  }

  public removeDimension(dimension: Dimension): DataCube {
    var index = this.dimensions.indexOf(dimension);

    if (index === -1) {
      throw new Error(`Unknown dimension : ${dimension.toString()}`);
    }

    var newDimensions = this.dimensions.toArray().concat();
    newDimensions.splice(index, 1);

    return this.changeDimensions(List(newDimensions));
  }

  public removeMeasure(measure: Measure): DataCube {
    var index = this.measures.indexOf(measure);

    if (index === -1) {
      throw new Error(`Unknown measure : ${measure.toString()}`);
    }

    var newMeasures = this.measures.toArray().concat();
    newMeasures.splice(index, 1);

    return this.changeMeasures(List(newMeasures));
  }

  public filterDimensions(dimensionsToFilter: Dimension[]): Dimension[] {
    return dimensionsToFilter.filter(dimension => {
      if (this.getDimension(dimension.name)) return false;
      if (this.getMeasure(dimension.name)) return false;
      if (this.getDimensionByExpression(dimension.expression)) return false;
      return true;
    });
  }

  public rolledUp(): boolean {
    return this.clusterName === 'druid';
  }

  public changeAttributes(attributes: Attributes): DataCube {
    var value = this.valueOf();
    if (value.attributeOverrides) {
      attributes = AttributeInfo.override(attributes, value.attributeOverrides);
    }
    value.attributes = attributes;
    value.attributeOverrides = null;
    return new DataCube(value);
  }

  public updateAttribute(attribute: AttributeInfo): DataCube {
    return this.changeAttributes(overrideByName(this.attributes, attribute));
  }

  public removeAttribute(attributeName: string): DataCube {
    if (!this.attributes) return this;

    var value = this.valueOf();
    value.attributes = value.attributes.filter(attribute => attribute.name !== attributeName);
    value.dimensions = value.dimensions.filter(dimension => !dimension.usesAttribute(attributeName)) as List<Dimension>;
    value.measures = value.measures.filter(measure => !measure.usesAttribute(attributeName)) as List<Measure>;
    return new DataCube(value);
  }

  public appendAttributes(attributes: Attributes): DataCube {
    return this.changeAttributes(this.attributes.concat(attributes));
  }

  public filterAttributes(attributesToFilter: Attributes): Attributes {
    const { attributes } = this;
    return attributesToFilter.filter(attribute => {
      return !findByName(attributes, attribute.name);
    });
  }

  public fillAllFromAttributes(attributes: Attributes): DataCube {
    var newDataCube = this.appendAttributes(this.filterAttributes(attributes));

    var introspection = this.getIntrospection();
    // Most of the time introspection can be assumed to be 'autofill-all' consideration of the introspection value is
    // done as a backwards compatibility measure

    if (introspection === 'autofill-all' || introspection === 'autofill-dimensions-only') {
      newDataCube = newDataCube.appendDimensions(newDataCube.getSuggestedDimensions());
    }

    if (introspection === 'autofill-all' || introspection === 'autofill-measures-only') {
      newDataCube = newDataCube.appendMeasures(newDataCube.getSuggestedMeasures());
    }

    return newDataCube;
  }

  public getIntrospection(): Introspection {
    return this.introspection || DataCube.DEFAULT_INTROSPECTION;
  }

  public getDefaultTimezone(): Timezone {
    return this.defaultTimezone || DataCube.DEFAULT_DEFAULT_TIMEZONE;
  }

  public getDefaultFilter(): Filter {
    var filter = this.defaultFilter || DataCube.DEFAULT_DEFAULT_FILTER;
    var primaryTimeExpression = this.getPrimaryTimeExpression();
    if (primaryTimeExpression) {
      filter = filter.setSelection(
        primaryTimeExpression,
        $(FilterClause.MAX_TIME_REF_NAME).timeRange(this.getDefaultDuration(), -1)
      );
    }
    return filter;
  }

  public getDefaultSplits(): Splits {
    return this.defaultSplits || DataCube.DEFAULT_DEFAULT_SPLITS;
  }

  public getDefaultDuration(): Duration {
    return this.defaultDuration || DataCube.DEFAULT_DEFAULT_DURATION;
  }

  public getDefaultSortMeasure(): string {
    if (this.defaultSortMeasure) {
      return this.defaultSortMeasure;
    }

    if (this.measures.size > 0) {
      return this.measures.first().name;
    }

    return null;
  }

  public getDefaultSelectedMeasures(): OrderedSet<string> {
    return this.defaultSelectedMeasures || (OrderedSet(this.measures.slice(0, 4).map(m => m.name)) as any);
  }

  public getDefaultPinnedDimensions(): OrderedSet<string> {
    return this.defaultPinnedDimensions || (OrderedSet([]) as any);
  }

  public change(propertyName: string, newValue: any): DataCube {
    var v = this.valueOf();

    if (!v.hasOwnProperty(propertyName)) {
      throw new Error(`Unknown property : ${propertyName}`);
    }

    (v as any)[propertyName] = newValue;
    return new DataCube(v);
  }

  public changeDefaultSortMeasure(defaultSortMeasure: string) {
    return this.change('defaultSortMeasure', defaultSortMeasure);
  }

  public changeTitle(title: string) {
    return this.change('title', title);
  }

  public changeDescription(description: string) {
    return this.change('description', description);
  }

  public changeMeasures(measures: List<Measure>) {
    return this.change('measures', measures);
  }

  public appendMeasures(measures: Measure[]) {
    return this.changeMeasures(List(this.measures.toArray().concat(measures)));
  }

  public appendDimensions(dimensions: Dimension[]) {
    return this.changeDimensions(List(this.dimensions.toArray().concat(dimensions)));
  }

  public getDefaultSortAction(): SortAction {
    return new SortAction({
      expression: $(this.getDefaultSortMeasure()),
      direction: SortAction.DESCENDING
    });
  }

  public sameGroup(otherDataCube: DataCube): boolean {
    return Boolean(this.group && this.group === otherDataCube.group);
  }
}
check = DataCube;
