'use strict';

import { List, OrderedSet } from 'immutable';
import { compressToBase64, decompressFromBase64 } from 'lz-string';
import { Class, Instance, isInstanceOf, arraysEqual } from 'immutable-class';
import { Timezone, Duration, minute } from 'chronoshift';
import { $, Expression, RefExpression, ChainExpression, ExpressionJS, TimeRange, ApplyAction, SortAction, Set } from 'plywood';
import { listsEqual } from '../../utils/general/general';
import { DataSource } from '../data-source/data-source';
import { Filter, FilterJS } from '../filter/filter';
import { FilterClause } from '../filter-clause/filter-clause';
import { Highlight, HighlightJS } from '../highlight/highlight';
import { Splits, SplitsJS } from '../splits/splits';
import { SplitCombine } from '../split-combine/split-combine';
import { Dimension } from '../dimension/dimension';
import { Measure } from '../measure/measure';
import { Colors, ColorsJS } from '../colors/colors';
import { Manifest, Resolve } from '../manifest/manifest';

const HASH_VERSION = 1;

function constrainDimensions(dimensions: OrderedSet<string>, dataSource: DataSource): OrderedSet<string> {
  return <OrderedSet<string>>dimensions.filter((dimensionName) => Boolean(dataSource.getDimension(dimensionName)));
}

function constrainMeasures(measures: OrderedSet<string>, dataSource: DataSource): OrderedSet<string> {
  return <OrderedSet<string>>measures.filter((measureName) => Boolean(dataSource.getMeasure(measureName)));
}

export interface VisualizationAndResolve {
  visualization: Manifest;
  resolve: Resolve;
}

/**
 * FairGame   - Run all visualizations pretending that there is no current
 * UnfairGame - Run all visualizations but mark current vis as current
 * KeepAlways - Just keep the current one
 */
export enum VisStrategy {
  FairGame,
  UnfairGame,
  KeepAlways
}

export interface EssenceValue {
  dataSources?: List<DataSource>;
  visualizations?: List<Manifest>;

  dataSource: DataSource;
  visualization: Manifest;
  timezone: Timezone;
  filter: Filter;
  splits: Splits;
  selectedMeasures: OrderedSet<string>;
  pinnedDimensions: OrderedSet<string>;
  colors: Colors;
  pinnedSort: string;
  compare: Filter;
  highlight: Highlight;
}

export interface EssenceJS {
  dataSource: string;
  visualization: string;
  timezone: string;
  filter: FilterJS;
  splits: SplitsJS;
  selectedMeasures: string[];
  pinnedDimensions: string[];
  colors?: ColorsJS;
  pinnedSort?: string;
  compare?: FilterJS;
  highlight?: HighlightJS;
}

export interface EssenceContext {
  dataSources: List<DataSource>;
  visualizations: List<Manifest>;
}

var check: Class<EssenceValue, EssenceJS>;
export class CubeEssence implements Instance<EssenceValue, EssenceJS> {
  static isCubeEssence(candidate: any): boolean {
    return isInstanceOf(candidate, CubeEssence);
  }

  static getBaseURL(): string {
    var url = window.location;
    return url.origin + url.pathname;
  }

  static fromHash(hash: string, context: EssenceContext): CubeEssence {
    // trim a potential leading #
    if (hash[0] === '#') hash = hash.substr(1);

    var parts = hash.split('/');
    if (parts.length < 4) return null;
    var dataSource = parts.shift();
    var visualization = parts.shift();
    var version = parseInt(parts.shift(), 10);

    if (version !== 1) return null;

    var jsArray: any[] = null;
    try {
      jsArray = JSON.parse('[' + decompressFromBase64(parts.join('/')) + ']');
    } catch (e) {
      return null;
    }


    if (!Array.isArray(jsArray)) return null;
    var jsArrayLength = jsArray.length;
    if (!(6 <= jsArrayLength && jsArrayLength <= 9)) return null;

    var essence: CubeEssence;
    try {
      essence = CubeEssence.fromJS({
        dataSource: dataSource,
        visualization: visualization,
        timezone: jsArray[0],
        filter: jsArray[1],
        splits: jsArray[2],
        selectedMeasures: jsArray[3],
        pinnedDimensions: jsArray[4],
        pinnedSort: jsArray[5],
        colors: jsArray[6] || null,
        compare: jsArray[7] || null,
        highlight: jsArray[8] || null
      }, context);
    } catch (e) {
      return null;
    }

    return essence;
  }

  static fromDataSource(dataSource: DataSource, context: EssenceContext): CubeEssence {
    var timezone = dataSource.defaultTimezone;

    var filter = dataSource.defaultFilter;
    if (dataSource.timeAttribute) {
      filter = filter.setSelection(dataSource.timeAttribute, $(FilterClause.MAX_TIME_REF_NAME).timeRange('P1D', -1));
    }

    var splits = Splits.EMPTY;
    if (typeof dataSource.options['defaultSplitDimension'] === 'string') {
      var defaultSplitDimension = dataSource.getDimension(dataSource.options['defaultSplitDimension']);
      if (defaultSplitDimension) {
        splits = Splits.fromSplitCombine(SplitCombine.fromExpression(defaultSplitDimension.expression));
      }
      var timeAttribute = dataSource.timeAttribute;
      if (timeAttribute) {
        var now = new Date();
        var maxTime = dataSource.getMaxTimeDate();
        splits = splits.updateWithTimeRange(timeAttribute, FilterClause.evaluate(filter.getSelection(timeAttribute), now, maxTime, timezone), timezone);
      }
    }

    return new CubeEssence({
      dataSources: context.dataSources,
      visualizations: context.visualizations,

      dataSource,
      visualization: null,
      timezone,
      filter,
      splits,
      selectedMeasures: OrderedSet(dataSource.measures.toArray().slice(0, 4).map(m => m.name)),
      pinnedDimensions: dataSource.defaultPinnedDimensions,
      colors: null,
      pinnedSort: dataSource.defaultSortMeasure,
      compare: null,
      highlight: null
    });
  }

  static fromJS(parameters: EssenceJS, context?: EssenceContext): CubeEssence {
    var dataSourceName = parameters.dataSource;
    var visualizationID = parameters.visualization;
    var visualizations = context.visualizations;
    var dataSources = context.dataSources;
    var visualization = visualizations.find(v => v.id === visualizationID);

    var dataSource = dataSources.find((ds) => ds.name === dataSourceName);
    var timezone = Timezone.fromJS(parameters.timezone);
    var filter = Filter.fromJS(parameters.filter).constrainToDimensions(dataSource.dimensions, dataSource.timeAttribute);
    var splits = Splits.fromJS(parameters.splits).constrainToDimensions(dataSource.dimensions);
    var selectedMeasures = constrainMeasures(OrderedSet(parameters.selectedMeasures), dataSource);
    var pinnedDimensions = constrainDimensions(OrderedSet(parameters.pinnedDimensions), dataSource);

    var defaultSortMeasureName = dataSource.defaultSortMeasure;

    var colors = parameters.colors ? Colors.fromJS(parameters.colors) : null;

    var pinnedSort = parameters.pinnedSort || defaultSortMeasureName;
    if (!dataSource.getMeasure(pinnedSort)) pinnedSort = defaultSortMeasureName;

    var compare: Filter = null;
    var compareJS = parameters.compare;
    if (compareJS) {
      compare = Filter.fromJS(compareJS).constrainToDimensions(dataSource.dimensions, dataSource.timeAttribute);
    }

    var highlight: Highlight = null;
    var highlightJS = parameters.highlight;
    if (highlightJS) {
      highlight = Highlight.fromJS(highlightJS).constrainToDimensions(dataSource.dimensions, dataSource.timeAttribute);
    }

    return new CubeEssence({
      dataSources,
      visualizations,

      dataSource,
      visualization,
      timezone,
      filter,
      splits,
      selectedMeasures,
      pinnedDimensions,
      colors,
      pinnedSort,
      compare,
      highlight
    });
  }


  public dataSources: List<DataSource>;
  public visualizations: List<Manifest>;

  public dataSource: DataSource;
  public visualization: Manifest;
  public timezone: Timezone;
  public filter: Filter;
  public splits: Splits;
  public selectedMeasures: OrderedSet<string>;
  public pinnedDimensions: OrderedSet<string>;
  public colors: Colors;
  public pinnedSort: string;
  public compare: Filter;
  public highlight: Highlight;

  public visResolve: Resolve;

  constructor(parameters: EssenceValue) {
    this.dataSources = parameters.dataSources;
    if (!this.dataSources.size) throw new Error('can not have empty dataSource list');
    this.visualizations = parameters.visualizations;

    this.dataSource = parameters.dataSource;
    if (!this.dataSource) throw new Error('must have a dataSource');

    this.timezone = parameters.timezone;
    this.filter = parameters.filter;
    this.splits = parameters.splits;
    this.selectedMeasures = parameters.selectedMeasures;
    this.pinnedDimensions = parameters.pinnedDimensions;
    this.colors = parameters.colors;
    this.pinnedSort = parameters.pinnedSort;
    this.compare = parameters.compare;
    this.highlight = parameters.highlight;

    // Place vis here because it needs to know about splits and colors (and maybe later other things)
    var visualization = parameters.visualization;
    if (!visualization) {
      var visAndResolve = this.getBestVisualization(this.splits, this.colors, null);
      visualization = visAndResolve.visualization;
    }
    this.visualization = visualization;

    var visResolve = visualization.handleCircumstance(this.dataSource, this.splits, this.colors, true);
    if (visResolve.isAutomatic()) {
      var adjustment = visResolve.adjustment;
      this.splits = adjustment.splits;
      this.colors = adjustment.colors || null;
      visResolve = visualization.handleCircumstance(this.dataSource, this.splits, this.colors, true);
      if (!visResolve.isReady()) {
        console.log(visResolve);
        throw new Error('visualization must be ready after automatic adjustment');
      }
    }
    this.visResolve = visResolve;
  }

  public valueOf(): EssenceValue {
    return {
      dataSources: this.dataSources,
      visualizations: this.visualizations,

      dataSource: this.dataSource,
      visualization: this.visualization,
      timezone: this.timezone,
      filter: this.filter,
      splits: this.splits,
      selectedMeasures: this.selectedMeasures,
      pinnedDimensions: this.pinnedDimensions,
      colors: this.colors,
      pinnedSort: this.pinnedSort,
      compare: this.compare,
      highlight: this.highlight
    };
  }

  public toJS(): EssenceJS {
    var selectedMeasures = this.selectedMeasures.toArray();
    var pinnedDimensions = this.pinnedDimensions.toArray();
    var js: EssenceJS = {
      dataSource: this.dataSource.name,
      visualization: this.visualization.id,
      timezone: this.timezone.toJS(),
      filter: this.filter.toJS(),
      splits: this.splits.toJS(),
      selectedMeasures,
      pinnedDimensions
    };
    var defaultSortMeasure = this.dataSource.defaultSortMeasure;
    if (this.colors) js.colors = this.colors.toJS();
    if (this.pinnedSort !== defaultSortMeasure) js.pinnedSort = this.pinnedSort;
    if (this.compare) js.compare = this.compare.toJS();
    if (this.highlight) js.highlight = this.highlight.toJS();
    return js;
  }

  public toJSON(): EssenceJS {
    return this.toJS();
  }

  public toString(): string {
    return `[Essence]`;
  }

  public equals(other: CubeEssence): boolean {
    return CubeEssence.isCubeEssence(other) &&
      this.dataSource.equals(other.dataSource) &&
      this.visualization.id === other.visualization.id &&
      this.timezone.equals(other.timezone) &&
      this.filter.equals(other.filter) &&
      this.splits.equals(other.splits) &&
      this.selectedMeasures.equals(other.selectedMeasures) &&
      this.pinnedDimensions.equals(other.pinnedDimensions) &&
      Boolean(this.colors) === Boolean(other.colors) &&
      (!this.colors || this.colors.equals(other.colors)) &&
      this.pinnedSort === other.pinnedSort &&
      Boolean(this.compare) === Boolean(other.compare) &&
      (!this.compare || this.compare.equals(other.compare)) &&
      Boolean(this.highlight) === Boolean(other.highlight) &&
      (!this.highlight || this.highlight.equals(other.highlight));
  }

  public toHash(): string {
    var js: any = this.toJS();
    var compressed: any[] = [
      js.timezone,         // 0
      js.filter,           // 1
      js.splits,           // 2
      js.selectedMeasures, // 3
      js.pinnedDimensions, // 4
      js.pinnedSort        // 5
    ];
    if (js.colors)      compressed[6] = js.colors;
    if (js.compare)     compressed[7] = js.compare;
    if (js.highlight)   compressed[8] = js.highlight;

    var restJSON: string[] = [];
    for (var i = 0; i < compressed.length; i++) {
      restJSON.push(JSON.stringify(compressed[i] || null));
    }

    return '#' + [
        js.dataSource,
        js.visualization,
        HASH_VERSION,
        compressToBase64(restJSON.join(','))
      ].join('/');
  }

  public getURL(): string {
    return CubeEssence.getBaseURL() + this.toHash();
  }

  public getBestVisualization(splits: Splits, colors: Colors, currentVisualization: Manifest): VisualizationAndResolve {
    var { visualizations, dataSource } = this;
    var visAndResolves = visualizations.toArray().map((visualization) => {
      return {
        visualization,
        resolve: visualization.handleCircumstance(dataSource, splits, colors, visualization === currentVisualization)
      };
    });

    return visAndResolves.sort((vr1, vr2) => Resolve.compare(vr1.resolve, vr2.resolve))[0];
  }

  public getTimeAttribute(): RefExpression {
    return this.dataSource.timeAttribute;
  }

  public getTimeDimension(): Dimension {
    return this.dataSource.getTimeDimension();
  }

  public evaluateSelection(selection: Expression, now: Date = new Date()): TimeRange {
    var { dataSource, timezone } = this;
    var maxTime = dataSource.getMaxTimeDate();
    return FilterClause.evaluate(selection, now, maxTime, timezone);
  }

  public getEffectiveFilter(highlightId: string = null, unfilterDimension: Dimension = null): Filter {
    var { dataSource, filter, highlight, timezone } = this;
    if (highlight && (highlightId !== highlight.owner)) filter = highlight.applyToFilter(filter);
    if (unfilterDimension) filter = filter.remove(unfilterDimension.expression);

    var maxTime = dataSource.getMaxTimeDate();
    return filter.getSpecificFilter(new Date(), maxTime, timezone);
  }

  public getMeasures(): List<Measure> {
    var dataSource = this.dataSource;
    return <List<Measure>>this.selectedMeasures.toList().map(measureName => dataSource.getMeasure(measureName));
  }

  public differentDataSource(other: CubeEssence): boolean {
    return this.dataSource !== other.dataSource;
  }

  public differentTimezone(other: CubeEssence): boolean {
    return !this.timezone.equals(other.timezone);
  }

  public differentFilter(other: CubeEssence): boolean {
    return !this.filter.equals(other.filter);
  }

  public differentSplits(other: CubeEssence): boolean {
    return !this.splits.equals(other.splits);
  }

  public differentColors(other: CubeEssence): boolean {
    if (Boolean(this.colors) !== Boolean(other.colors)) return true;
    if (!this.colors) return false;
    return !this.colors.equals(other.colors);
  }

  public differentSelectedMeasures(other: CubeEssence): boolean {
    return !this.selectedMeasures.equals(other.selectedMeasures);
  }

  public newSelectedMeasures(other: CubeEssence): boolean {
    return !this.selectedMeasures.isSubset(other.selectedMeasures);
  }

  public differentPinnedDimensions(other: CubeEssence): boolean {
    return !this.pinnedDimensions.equals(other.pinnedDimensions);
  }

  public differentPinnedSort(other: CubeEssence): boolean {
    return this.pinnedSort !== other.pinnedSort;
  }

  public differentCompare(other: CubeEssence): boolean {
    if (Boolean(this.compare) !== Boolean(other.compare)) return true;
    return Boolean(this.compare && !this.compare.equals(other.compare));
  }

  public differentHighligh(other: CubeEssence): boolean {
    if (Boolean(this.highlight) !== Boolean(other.highlight)) return true;
    return Boolean(this.highlight && !this.highlight.equals(other.highlight));
  }

  public differentEffectiveFilter(other: CubeEssence, highlightId: string = null, unfilterDimension: Dimension = null): boolean {
    var myEffectiveFilter = this.getEffectiveFilter(highlightId, unfilterDimension);
    var otherEffectiveFilter = other.getEffectiveFilter(highlightId, unfilterDimension);
    return !myEffectiveFilter.equals(otherEffectiveFilter);
  }

  public highlightOn(owner: string): boolean {
    var { highlight } = this;
    if (!highlight) return false;
    return highlight.owner === owner;
  }

  public getSingleHighlightSet(): Set {
    var { highlight } = this;
    if (!highlight) return null;
    return highlight.delta.getSingleClauseSet();
  }

  public getApplyForSort(sort: SortAction): ApplyAction {
    var sortOn = (<RefExpression>sort.expression).name;
    var sortMeasure = this.dataSource.getMeasure(sortOn);
    if (!sortMeasure) return null;
    return sortMeasure.toApplyAction();
  }

  public getCommonSort(): SortAction {
    var splits = this.splits.toArray();
    var commonSort: SortAction = null;
    for (var split of splits) {
      var sort = split.sortAction;
      if (commonSort) {
        if (!commonSort.equals(sort)) return null;
      } else {
        commonSort = sort;
      }
    }
    return commonSort;
  }

  // Modification

  public changeDataSource(dataSource: DataSource): CubeEssence {
    var { dataSources, visualizations } = this;

    if (this.dataSource.equals(dataSource)) return this; // nothing to do

    if (this.dataSource.equalsWithoutMaxTime(dataSource)) { // Updated maxTime
      var value = this.valueOf();
      value.dataSource = dataSource;
      return new CubeEssence(value);
    }

    var dataSourceName = dataSource.name;
    var existingDataSource = dataSources.find((ds) => ds.name === dataSourceName);
    if (!existingDataSource) throw new Error(`unknown DataSource changed: ${dataSourceName}`);

    if (existingDataSource.equals(dataSource)) {
      // Just changing DataSource, nothing to see here.
      return CubeEssence.fromDataSource(dataSource, { dataSources: dataSources, visualizations: visualizations });
    }

    // We are actually updating info within the current dataSource
    if (this.dataSource.name !== dataSource.name) throw new Error('can not change non-selected dataSource');

    var value = this.valueOf();
    value.dataSource = dataSource;
    value.dataSources = <List<DataSource>>dataSources.map((ds) => ds.name === dataSourceName ? dataSource : ds);

    // Make sure that all the elements of state are still valid
    var oldDataSource = this.dataSource;
    value.filter = value.filter.constrainToDimensions(dataSource.dimensions, dataSource.timeAttribute, oldDataSource.timeAttribute);
    value.splits = value.splits.constrainToDimensions(dataSource.dimensions);
    value.selectedMeasures = constrainMeasures(value.selectedMeasures, dataSource);
    value.pinnedDimensions = constrainDimensions(value.pinnedDimensions, dataSource);

    if (value.colors && !dataSource.getDimension(value.colors.dimension)) {
      value.colors = null;
    }

    var defaultSortMeasureName = dataSource.defaultSortMeasure;
    if (!dataSource.getMeasure(value.pinnedSort)) value.pinnedSort = defaultSortMeasureName;

    if (value.compare) {
      value.compare = value.compare.constrainToDimensions(dataSource.dimensions, dataSource.timeAttribute);
    }

    if (value.highlight) {
      value.highlight = value.highlight.constrainToDimensions(dataSource.dimensions, dataSource.timeAttribute);
    }

    return new CubeEssence(value);
  }

  public changeFilter(filter: Filter, removeHighlight: boolean = false): CubeEssence {
    var value = this.valueOf();
    value.filter = filter;

    if (removeHighlight) {
      value.highlight = null;
    }

    var timeAttribute = this.getTimeAttribute();
    if (timeAttribute) {
      var oldTimeSelection = this.filter.getSelection(timeAttribute);
      var newTimeSelection = filter.getSelection(timeAttribute);
      if (newTimeSelection && !newTimeSelection.equals(oldTimeSelection)) {
        value.splits = value.splits.updateWithTimeRange(timeAttribute, this.evaluateSelection(newTimeSelection), this.timezone, true);
      }
    }

    return new CubeEssence(value);
  }

  public changeTimeSelection(check: Expression): CubeEssence {
    var { filter } = this;
    var timeAttribute = this.getTimeAttribute();
    return this.changeFilter(filter.setSelection(timeAttribute, check));
  }

  public changeSplits(splits: Splits, strategy: VisStrategy): CubeEssence {
    var { dataSource, visualization, visResolve, filter, colors } = this;

    var timeAttribute = this.getTimeAttribute();
    if (timeAttribute) {
      splits = splits.updateWithTimeRange(timeAttribute, this.evaluateSelection(filter.getSelection(timeAttribute)), this.timezone);
    }

    // If in manual mode stay there, keep the vis regardless of suggested strategy
    if (visResolve.isManual()) {
      strategy = VisStrategy.KeepAlways;
    }

    if (strategy !== VisStrategy.KeepAlways) {
      var visAndResolve = this.getBestVisualization(splits, colors, (strategy === VisStrategy.FairGame ? null : visualization));
      visualization = visAndResolve.visualization;
    }

    var value = this.valueOf();
    value.splits = splits;
    value.visualization = visualization;
    if (value.highlight) {
      value.filter = value.highlight.applyToFilter(value.filter);
      value.highlight = null;
    }
    return new CubeEssence(value);
  }

  public changeSplit(splitCombine: SplitCombine, strategy: VisStrategy): CubeEssence {
    return this.changeSplits(Splits.fromSplitCombine(splitCombine), strategy);
  }

  public addSplit(split: SplitCombine, strategy: VisStrategy): CubeEssence {
    var { splits } = this;
    return this.changeSplits(splits.addSplit(split), strategy);
  }

  public removeSplit(split: SplitCombine, strategy: VisStrategy): CubeEssence {
    var { splits } = this;
    return this.changeSplits(splits.removeSplit(split), strategy);
  }

  public changeColors(colors: Colors): CubeEssence {
    var value = this.valueOf();
    value.colors = colors;
    return new CubeEssence(value);
  }

  public changeVisualization(visualization: Manifest): CubeEssence {
    var value = this.valueOf();
    value.visualization = visualization;
    return new CubeEssence(value);
  }

  public pin(dimension: Dimension): CubeEssence {
    var value = this.valueOf();
    value.pinnedDimensions = value.pinnedDimensions.add(dimension.name);
    return new CubeEssence(value);
  }

  public unpin(dimension: Dimension): CubeEssence {
    var value = this.valueOf();
    value.pinnedDimensions = value.pinnedDimensions.remove(dimension.name);
    return new CubeEssence(value);
  }

  public getPinnedSortMeasure(): Measure {
    return this.dataSource.getMeasure(this.pinnedSort);
  }

  public changePinnedSortMeasure(measure: Measure): CubeEssence {
    var value = this.valueOf();
    value.pinnedSort = measure.name;
    return new CubeEssence(value);
  }

  public toggleMeasure(measure: Measure): CubeEssence {
    var dataSource = this.dataSource;
    var value = this.valueOf();
    var selectedMeasures = value.selectedMeasures;
    var measureName = measure.name;

    if (selectedMeasures.has(measureName)) {
      value.selectedMeasures = selectedMeasures.delete(measureName);
    } else {
      // Preserve the order of the measures in the datasource
      value.selectedMeasures = OrderedSet(
        dataSource.measures
          .toArray()
          .map(m => m.name)
          .filter((name) => selectedMeasures.has(name) || name === measureName)
      );
    }

    return new CubeEssence(value);
  }

  public acceptHighlight(): CubeEssence {
    var { highlight } = this;
    if (!highlight) return this;
    return this.changeFilter(highlight.applyToFilter(this.filter), true);
  }

  public changeHighlight(owner: string, delta: Filter): CubeEssence {
    var { highlight } = this;

    // If there is already a highlight from someone else accept it
    var value: EssenceValue;
    if (highlight && highlight.owner !== owner) {
      value = this.changeFilter(highlight.applyToFilter(this.filter)).valueOf();
    } else {
      value = this.valueOf();
    }

    value.highlight = new Highlight({
      owner,
      delta
    });
    return new CubeEssence(value);
  }

  public dropHighlight(): CubeEssence {
    var value = this.valueOf();
    value.highlight = null;
    return new CubeEssence(value);
  }

}
check = CubeEssence;
