require('./bar-chart.css');

import { BaseVisualization, BaseVisualizationState } from '../base-visualization/base-visualization';

import * as React from 'react';
import { List } from 'immutable';
import { generalEqual } from 'immutable-class';
import { $, ply, r, Expression, Executor, Dataset, Datum, PseudoDatum, SortAction, PlywoodValue, Set, TimeRange } from 'plywood';

import {
  Stage,
  Essence,
  DataSource,
  Filter,
  FilterClause,
  Splits,
  SplitCombine,
  Dimension,
  Measure,
  Colors,
  VisualizationProps,
  DatasetLoad,
  Resolve
} from '../../../common/models/index';

import { SPLIT, VIS_H_PADDING } from '../../config/constants';
import { roundToPx, roundToHalfPx, classNames } from '../../utils/dom/dom';
import { VisMeasureLabel } from '../../components/vis-measure-label/vis-measure-label';
import { VerticalAxis } from '../../components/vertical-axis/vertical-axis';
import { BucketMarks } from '../../components/bucket-marks/bucket-marks';
import { GridLines } from '../../components/grid-lines/grid-lines';
import { SegmentBubble } from '../../components/segment-bubble/segment-bubble';
import { Scroller, ScrollerLayout } from '../../components/scroller/scroller';

import { BarCoordinates } from './bar-coordinates';

import handler from './circumstances';

const X_AXIS_HEIGHT = 84;
const Y_AXIS_WIDTH = 60;
const CHART_TOP_PADDING = 10;
const CHART_BOTTOM_PADDING = 20;
const MIN_CHART_HEIGHT = 200;
const MAX_STEP_WIDTH = 140; // Note that the step is bar + empty space around it. The width of the rectangle is step * BAR_PROPORTION
const MIN_STEP_WIDTH = 20;
const BAR_PROPORTION = 0.8;
const BARS_MIN_PAD_LEFT = 30;
const BARS_MIN_PAD_RIGHT = 6;
const HOVER_BUBBLE_V_OFFSET = 8;
const SELECTION_PAD = 3.5; // Must be a x.5
const SELECTION_CORNERS = 2;
const SELECTION_DASHARRAY = "3,3"; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray

export interface BubbleInfo {
  measure: Measure;
  chartIndex: number;
  path: Datum[];
  coordinates: BarCoordinates;
  splitIndex?: number;
  segmentLabel?: string;
}

export interface BarChartState extends BaseVisualizationState {
  hoverInfo?: BubbleInfo;
  selectionInfo?: BubbleInfo;

  // Cached props
  xTicks?: PlywoodValue[];
  scaleX?: d3.scale.Ordinal<string, number>;
}

function getFilterFromDatum(splits: Splits, dataPath: Datum[], dataSource: DataSource): Filter {
  return new Filter(List(dataPath.map((datum, i) => {
    var split = splits.get(i);
    var segment: any = datum[split.getDimension(dataSource.dimensions).name];

    return new FilterClause({
      expression: split.expression,
      selection: r(TimeRange.isTimeRange(segment) ? segment : Set.fromJS([segment]))
    });
  })));
}

export class BarChart extends BaseVisualization<BarChartState> {
  public static id = 'bar-chart';
  public static title = 'Bar Chart';

  public static handleCircumstance = handler.evaluate.bind(handler);

  private coordinatesCache: BarCoordinates[][] = [];

  constructor() {
    super();
  }

  getDefaultState(): BarChartState {
    var s = super.getDefaultState() as BarChartState;

    s.hoverInfo = null;

    return s;
  }

  componentWillReceiveProps(nextProps: VisualizationProps) {
    this.precalculate(nextProps);
    var { essence } = this.props;
    var nextEssence = nextProps.essence;
    if (
      nextEssence.differentDataSource(essence) ||
      nextEssence.differentEffectiveFilter(essence, BarChart.id) ||
      nextEssence.differentEffectiveSplits(essence) ||
      nextEssence.newEffectiveMeasures(essence)
    ) {
      this.fetchData(nextEssence);
    }
  }

  calculateMousePosition(x: number, y: number): BubbleInfo {
    var { essence } = this.props;
    var { datasetLoad, scaleX } = this.state;

    var measures = essence.getEffectiveMeasures().toArray();
    var chartStage = this.getSingleChartStage();
    var chartHeight = this.getOuterChartHeight(chartStage);

    if (y >= chartHeight * measures.length) return; // on x axis
    if (x >= chartStage.width) return; // on y axis


    var chartIndex = Math.floor(y / chartHeight);

    var chartCoordinates = this.getBarsCoordinates(chartIndex, scaleX);

    var { path, coordinates } = this.findBarCoordinatesForX(x, chartCoordinates, []);

    return {
      path: this.findPathForIndices(path),
      measure: measures[chartIndex],
      chartIndex,
      coordinates: coordinates
    };
  }

  findPathForIndices(indices: number[]): Datum[] {
    var { datasetLoad } = this.state;
    var mySplitDataset = datasetLoad.dataset.data[0][SPLIT] as Dataset;

    var path: Datum[] = [];
    var currentData: Dataset = mySplitDataset;
    indices.forEach((i) => {
      let datum = currentData.data[i];
      path.push(datum);
      currentData = (datum[SPLIT] as Dataset);
    });

    return path;
  }

  findBarCoordinatesForX(x: number, coordinates: BarCoordinates[], currentPath: number[]): { path: number[], coordinates: BarCoordinates } {
    for (let i = 0; i < coordinates.length; i++) {
      if (coordinates[i].isXWithin(x)) {
        currentPath.push(i);
        if (coordinates[i].hasChildren()) {
          return this.findBarCoordinatesForX(x, coordinates[i].children, currentPath);
        } else {
          return { path: currentPath, coordinates: coordinates[i] };
        }
      }
    }

    return {path: [], coordinates: null };
  }

  onSimpleScroll(scrollTop: number, scrollLeft: number) {
    this.setState({scrollLeft, scrollTop});
  }

  onMouseMove(x: number, y: number) {
    this.setState({hoverInfo: this.calculateMousePosition(x, y)});
  }

  onClick(x: number, y: number) {
    const selectionInfo = this.calculateMousePosition(x, y);
    const { essence, clicker } = this.props;

    if (!selectionInfo.coordinates) {
      clicker.dropHighlight();
      this.setState({selectionInfo: null});
      return;
    }

    const { path, chartIndex } = selectionInfo;

    const { splits, dataSource } = essence;
    var measures = essence.getEffectiveMeasures().toArray();

    var rowHighlight = getFilterFromDatum(splits, path, dataSource);

    if (essence.highlightOn(BarChart.id, measures[chartIndex].name)) {
      if (rowHighlight.equals(essence.highlight.delta)) {
        clicker.dropHighlight();
        this.setState({selectionInfo: null});
        return;
      }
    }

    this.setState({selectionInfo});
    clicker.changeHighlight(BarChart.id, measures[chartIndex].name, rowHighlight);
  }

  getYExtent(data: Datum[], measure: Measure): number[] {
    var measureName = measure.name;
    var getY = (d: Datum) => d[measureName] as number;
    return d3.extent(data, getY);
  }

  getYScale(dataset: Dataset, measure: Measure, yAxisStage: Stage): d3.scale.Linear<number, number> {
    var { essence } = this.props;

    var splitLength = essence.splits.length();
    var leafData = dataset.flatten({
      order: 'preorder',
      nestingName: '__nest',
      parentName: '__parent'
    }).filter((d: Datum) => d['__nest'] === splitLength - 1);

    var extentY = this.getYExtent(leafData, measure);

    return d3.scale.linear()
      .domain([Math.min(extentY[0] * 1.1, 0), Math.max(extentY[1] * 1.1, 0)])
      .range([yAxisStage.height, yAxisStage.y]);
  }

  hasValidYExtent(measure: Measure, data: Datum[]): boolean {
    let [yMin, yMax] = this.getYExtent(data, measure);
    return !isNaN(yMin) && !isNaN(yMax);
  }

  getSingleChartStage(): Stage {
    const { essence, stage } = this.props;
    const { scaleX } = this.state;

    const { stepWidth } = this.getBarDimensions(scaleX.rangeBand());
    const xTicks = scaleX.domain();
    const width = roundToPx(scaleX(xTicks[xTicks.length - 1])) + stepWidth;

    const measures = essence.getEffectiveMeasures().toArray();
    const availableHeight = stage.height - X_AXIS_HEIGHT;
    const height = Math.max(MIN_CHART_HEIGHT, Math.floor(availableHeight / measures.length));

    return new Stage({
      x: 0,
      y: CHART_TOP_PADDING,
      width,
      height: height - CHART_TOP_PADDING
    });
  }

  getOuterChartHeight(chartStage: Stage): number {
    return chartStage.height + CHART_TOP_PADDING + CHART_BOTTOM_PADDING;
  }

  getAxisStages(chartStage: Stage): {xAxisStage: Stage, yAxisStage: Stage} {
    return {
      xAxisStage: new Stage({x: chartStage.x, y: 0, height: X_AXIS_HEIGHT, width: chartStage.width}),
      yAxisStage: new Stage({x: 0, y: chartStage.y, height: chartStage.height, width: Y_AXIS_WIDTH + VIS_H_PADDING})
    };
  }

  getScrollerLayout(chartStage: Stage, xAxisStage: Stage, yAxisStage: Stage): ScrollerLayout {
    var { essence, stage } = this.props;
    var measures = essence.getEffectiveMeasures().toArray();

    return {
      // Inner dimensions
      bodyWidth: chartStage.width,
      bodyHeight: (chartStage.height + CHART_TOP_PADDING + CHART_BOTTOM_PADDING) * measures.length - CHART_BOTTOM_PADDING,

      // Gutters
      top: 0,
      right: yAxisStage.width,
      bottom: xAxisStage.height,
      left: 0
    };
  }

  getBarDimensions(xRangeBand: number): {stepWidth: number, barWidth: number, barOffset: number} {
    var stepWidth = xRangeBand;
    var barWidth = Math.max(stepWidth * BAR_PROPORTION, 0);
    var barOffset = (stepWidth - barWidth) / 2;

    return { stepWidth, barWidth, barOffset };
  }

  getBubbleTopOffset(y: number, chartIndex: number, chartStage: Stage): number {
    const { scrollTop } = this.state;
    const oneChartHeight = this.getOuterChartHeight(chartStage);
    const chartsAboveMe = oneChartHeight * chartIndex;

    return chartsAboveMe - scrollTop + y - HOVER_BUBBLE_V_OFFSET + CHART_TOP_PADDING;
  }

  getBubbleLeftOffset(x: number): number {
    const { stage } = this.props;
    const { scrollLeft } = this.state;

    return stage.x + VIS_H_PADDING + x - scrollLeft;
  }

  renderSelectionBubble(hoverInfo: BubbleInfo): JSX.Element {
    const { essence, stage, clicker, openRawDataModal } = this.props;
    const chartStage = this.getSingleChartStage();
    const { measure, path, chartIndex, segmentLabel, coordinates } = hoverInfo;

    const { splits, dataSource } = essence;
    const dimension = splits.get(hoverInfo.splitIndex).getDimension(dataSource.dimensions);

    const leftOffset = this.getBubbleLeftOffset(coordinates.middleX);
    const topOffset = this.getBubbleTopOffset(coordinates.y, chartIndex, chartStage);

    if (topOffset <= 0) return null;

    return <SegmentBubble
      left={leftOffset}
      top={stage.y + topOffset}
      dimension={dimension}
      segmentLabel={segmentLabel}
      measureLabel={measure.formatDatum(path[path.length - 1])}
      clicker={clicker}
      openRawDataModal={openRawDataModal}
      onClose={this.onBubbleClose.bind(this)}
    />;
  }

  onBubbleClose() {
    this.setState({selectionInfo: null});
  }

  renderHoverBubble(hoverInfo: BubbleInfo): JSX.Element {
    const { stage } = this.props;
    const chartStage = this.getSingleChartStage();
    const { measure, path, chartIndex, segmentLabel, coordinates } = hoverInfo;

    const leftOffset = this.getBubbleLeftOffset(coordinates.middleX);
    const topOffset = this.getBubbleTopOffset(coordinates.y, chartIndex, chartStage);

    if (topOffset <= 0) return null;

    return <SegmentBubble
      top={stage.y + topOffset}
      left={leftOffset}
      segmentLabel={segmentLabel}
      measureLabel={measure.formatDatum(path[path.length - 1])}
    />;
  }

  isSelected(path: Datum[], measure: Measure): boolean {
    const { essence } = this.props;
    const { splits, dataSource } = essence;

    if (essence.highlightOnDifferentMeasure(BarChart.id, measure.name)) return false;

    if (essence.highlightOn(BarChart.id, measure.name)) {
      return essence.highlight.delta.equals(getFilterFromDatum(splits, path, dataSource));
    }

    return false;
  }

  hasAnySelectionGoingOn(): boolean {
    return this.props.essence.highlightOn(BarChart.id);
  }

  isHovered(path: Datum[], measure: Measure): boolean {
    const { essence } = this.props;
    const { hoverInfo } = this.state;
    const { splits, dataSource } = essence;

    if (this.hasAnySelectionGoingOn()) return false;
    if (!hoverInfo) return false;
    if (hoverInfo.measure !== measure) return false;

    const filter = (p: Datum[]) => getFilterFromDatum(splits, p, dataSource);

    return filter(hoverInfo.path).equals(filter(path));
  }

  renderBars(
    data: Datum[],
    measure: Measure,
    chartIndex: number,
    chartStage: Stage,
    xAxisStage: Stage,
    coordinates: BarCoordinates[],
    splitIndex = 0,
    path: Datum[] = []
  ): {bars: JSX.Element[], labels: JSX.Element[], bubble?: JSX.Element} {
    const { essence } = this.props;
    const { selectionInfo } = this.state;

    var bars: JSX.Element[] = [];
    var labels: JSX.Element[] = [];

    const dimension = essence.splits.get(splitIndex).getDimension(essence.dataSource.dimensions);
    const splitLength = essence.splits.length();

    data.forEach((d, i) => {
      let segmentValue = d[dimension.name];
      let segmentValueStr = String(segmentValue);
      let subPath = path.concat(d);

      let bar: JSX.Element;
      let highlight: JSX.Element = null;
      let bubble: JSX.Element = null;
      let subCoordinates = coordinates[i];
      let { x, y, height, width, stepWidth, barWidth, barOffset } = coordinates[i];


      if (splitIndex < splitLength - 1) {
        let subData: Datum[] = (d[SPLIT] as Dataset).data;
        let result: any = this.renderBars(subData, measure, chartIndex, chartStage, xAxisStage, subCoordinates.children, splitIndex + 1, subPath);

        bar = result.bars;
      } else {

        let bubbleInfo: BubbleInfo = {
          measure,
          chartIndex,
          path: subPath,
          coordinates: subCoordinates,
          segmentLabel: segmentValueStr,
          splitIndex
        };

        let isHovered = this.isHovered(subPath, measure);
        if (isHovered) {
          bubble = this.renderHoverBubble(bubbleInfo);
        }

        let selected = this.isSelected(subPath, measure);
        if (selected) {
          bubble = this.renderSelectionBubble(bubbleInfo);
          highlight = <rect
            className="selection"
            x={barOffset - SELECTION_PAD}
            y={roundToPx(y) - SELECTION_PAD}
            width={roundToPx(barWidth + SELECTION_PAD * 2)}
            height={roundToPx(Math.abs(height) + SELECTION_PAD * 2)}
            rx={SELECTION_CORNERS}
            ry={SELECTION_CORNERS}
            strokeDasharray={SELECTION_DASHARRAY}
          />;
        }

        bar = <g
          className={classNames('bar', { selected: selected, 'not-selected': (!!selectionInfo && !selected), isHovered })}
          key={segmentValueStr}
          transform={`translate(${roundToPx(x)}, 0)`}
          >
          <rect
            className="background"
            width={roundToPx(barWidth)}
            height={roundToPx(Math.abs(height))}
            x={barOffset}
            y={roundToPx(y)}
          />
          {highlight}
          {bubble}
        </g>;

      }

      bars.push(bar);

      if (splitIndex === 0) {
        labels.push(<div
          className="slanty-label"
          key={segmentValueStr}
          style={{ right: xAxisStage.width - (x + stepWidth / 2) }}
        >{segmentValueStr}</div>);
      }
    });

    return { bars, labels };
  }

  renderXAxis(data: Datum[], coordinates: BarCoordinates[], xAxisStage: Stage): JSX.Element {
    const { essence } = this.props;
    const { xTicks, scaleX } = this.state;

    const dimension = essence.splits.get(0).getDimension(essence.dataSource.dimensions);

    var labels: JSX.Element[] = data.map((d, i) => {
      let segmentValueStr = String(d[dimension.name]);
      let coordinate = coordinates[i];

      return <div
        className="slanty-label"
        key={segmentValueStr}
        style={{ right: xAxisStage.width - (coordinate.x + coordinate.stepWidth / 2) }}
      >{segmentValueStr}</div>;
    });

    return <div className="x-axis" style={{width: xAxisStage.width}}>
      <svg style={xAxisStage.getWidthHeight()} viewBox={xAxisStage.getViewBox()}>
        <BucketMarks stage={xAxisStage} ticks={xTicks} scale={scaleX}/>
        <line
          className="vis-bottom"
          x1="0"
          x2={xAxisStage.width}
          y1="0"
          y2="0"
        />
      </svg>
      {labels}
    </div>;
  }

  getYAxisStuff(dataset: Dataset, measure: Measure, chartStage: Stage, chartIndex: number): {
    yGridLines: JSX.Element, yAxis: JSX.Element, yScale: d3.scale.Linear<number, number>
  } {
    var { essence } = this.props;
    var { yAxisStage } = this.getAxisStages(chartStage);

    var yScale = this.getYScale(dataset, measure, yAxisStage);
    var yTicks = yScale.ticks(5);

    var yGridLines: JSX.Element = <GridLines
      orientation="horizontal"
      scale={yScale}
      ticks={yTicks}
      stage={chartStage}
    />;

    var axisStage = yAxisStage.changeY(yAxisStage.y + (chartStage.height + CHART_TOP_PADDING + CHART_BOTTOM_PADDING) * chartIndex);

    var topLineExtend = CHART_BOTTOM_PADDING;
    if (chartIndex !== 0) topLineExtend += CHART_TOP_PADDING;

    var yAxis: JSX.Element = <VerticalAxis
      key={measure.name}
      stage={axisStage}
      ticks={yTicks}
      scale={yScale}
      topLineExtend={topLineExtend}
      hideZero={true}
    />;

    return { yGridLines, yAxis, yScale };
  }

  renderChart(dataset: Dataset, coordinates: BarCoordinates[], measure: Measure, chartIndex: number, chartStage: Stage, getX: any): {yAxis: JSX.Element, chart: JSX.Element} {
    const { xTicks, scaleX } = this.state;
    var mySplitDataset = dataset.data[0][SPLIT] as Dataset;

    // Invalid data, early return
    if (!this.hasValidYExtent(measure, mySplitDataset.data)) {
      return {
        chart: <div className="measure-bar-chart" key={measure.name}>
          <svg style={chartStage.getWidthHeight(0, CHART_BOTTOM_PADDING)} viewBox={chartStage.getViewBox(0, CHART_BOTTOM_PADDING)}/>
          <VisMeasureLabel measure={measure} datum={dataset.data[0]}/>
        </div>,
        yAxis: null
      };

    }

    let { xAxisStage, yAxisStage } = this.getAxisStages(chartStage);

    var { yAxis, yGridLines } = this.getYAxisStuff(mySplitDataset, measure, chartStage, chartIndex);

    var { bars, labels } = this.renderBars(mySplitDataset.data, measure, chartIndex, chartStage, xAxisStage, coordinates);

    var chart = <div className="measure-bar-chart" key={measure.name}>
      <svg style={chartStage.getWidthHeight(0, CHART_BOTTOM_PADDING)} viewBox={chartStage.getViewBox(0, CHART_BOTTOM_PADDING)}>
        {yGridLines}
        <g className="bars" transform={chartStage.getTransform()}>{bars}</g>
      </svg>
      <VisMeasureLabel measure={measure} datum={dataset.data[0]}/>
    </div>;

    return {chart, yAxis};
  }

  precalculate(props: VisualizationProps, datasetLoad: DatasetLoad = null) {
    const { registerDownloadableDataset, essence, stage } = props;
    const { splits, dataSource} = essence;
    const dimension = splits.get(0).getDimension(dataSource.dimensions);

    this.coordinatesCache = [];

    var existingDatasetLoad = this.state.datasetLoad;
    var newState: BarChartState = {};
    if (datasetLoad) {
      // Always keep the old dataset while loading (for now)
      if (datasetLoad.loading) datasetLoad.dataset = existingDatasetLoad.dataset;

      newState.datasetLoad = datasetLoad;
    } else {
      datasetLoad = this.state.datasetLoad;
    }

    var { dataset } = datasetLoad;
    if (dataset && splits.length()) {
      if (registerDownloadableDataset) registerDownloadableDataset(dataset);

      var getX = (d: Datum) => d[dimension.name] as string;

      var mySplitDataset = dataset.data[0][SPLIT] as Dataset;

      var xTicks = mySplitDataset.data.map(getX);
      var numSteps = xTicks.length;
      var overallWidth = stage.width - VIS_H_PADDING * 2 - Y_AXIS_WIDTH;
      var maxAvailableWidth = overallWidth - BARS_MIN_PAD_LEFT - BARS_MIN_PAD_RIGHT;
      var stepWidth = Math.max(Math.min(maxAvailableWidth / numSteps, MAX_STEP_WIDTH * essence.splits.length()), MIN_STEP_WIDTH);
      var usedWidth = stepWidth * numSteps;
      var padLeft = Math.max(BARS_MIN_PAD_LEFT, (overallWidth - usedWidth) / 2);

      newState.xTicks = xTicks;
      newState.scaleX = d3.scale.ordinal()
        .domain(xTicks)
        .rangeBands([padLeft, padLeft + usedWidth]);
    }

    this.setState(newState);
  }

  getBarsCoordinates(chartIndex: number, scaleX: d3.scale.Ordinal<string, number>): BarCoordinates[] {
    if (!!this.coordinatesCache[chartIndex]) {
      return this.coordinatesCache[chartIndex];
    }

    const { essence } = this.props;
    const { datasetLoad } = this.state;
    const { splits, dataSource} = essence;


    const measure = essence.getEffectiveMeasures().toArray()[chartIndex];
    const dataset = datasetLoad.dataset.data[0][SPLIT] as Dataset;
    const dimension = splits.get(0).getDimension(dataSource.dimensions);

    var chartStage = this.getSingleChartStage();
    var { yScale } = this.getYAxisStuff(dataset, measure, chartStage, chartIndex);

    this.coordinatesCache[chartIndex] = this.getSubCoordinates(
      dataset.data,
      measure,
      chartStage,
      (d: Datum) => d[dimension.name] as string,
      scaleX,
      yScale
    );

    return this.coordinatesCache[chartIndex];
  }

  getSubCoordinates(
    data: Datum[],
    measure: Measure,
    chartStage: Stage,
    getX: (d: Datum, i: number) => string,
    scaleX: d3.scale.Ordinal<string, number>,
    scaleY: d3.scale.Linear<number, number>,
    splitIndex = 0
  ): BarCoordinates[] {
    const { essence } = this.props;

    var { stepWidth, barWidth, barOffset } = this.getBarDimensions(scaleX.rangeBand());

    var coordinates: BarCoordinates[] = data.map((d, i) => {
      let x = scaleX(getX(d, i));
      let y = scaleY(d[measure.name] as number);
      let h = scaleY(0) - y;
      var children: BarCoordinates[] = [];
      var coordinate = new BarCoordinates({
        x,
        y: h >= 0 ? y : scaleY(0),
        width: roundToPx(barWidth),
        height: roundToPx(Math.abs(h)),
        stepWidth,
        barWidth,
        barOffset,
        children
      });

      if (splitIndex < essence.splits.length() - 1) {
        let subStage: Stage = new Stage({x: x, y: chartStage.y, width: barWidth, height: chartStage.height});
        let subSplit: SplitCombine = essence.splits.get(splitIndex + 1);
        let subGetX: any = (d: Datum, i: number) => String(i);
        let subData: Datum[] = (d[SPLIT] as Dataset).data;
        let subScaleX = d3.scale.ordinal()
          .domain(d3.range(0, subSplit.limitAction.limit).map(String))
          .rangeBands([x + barOffset, x + subStage.width]);

        coordinate.children = this.getSubCoordinates(subData, measure, subStage, subGetX, subScaleX, scaleY, splitIndex + 1);
      }

      return coordinate;
    });

    return coordinates;
  }

  renderRightGutter(measures: Measure[], yAxisStage: Stage, yAxes: JSX.Element[]): JSX.Element {
    var yAxesStage = yAxisStage.changeHeight((yAxisStage.height + CHART_TOP_PADDING + CHART_BOTTOM_PADDING) * measures.length);

    return <svg style={yAxesStage.getWidthHeight()} viewBox={yAxesStage.getViewBox()}>
      {yAxes}
    </svg>;
  }

  renderInternals() {
    const { essence, stage } = this.props;
    const { datasetLoad, scaleX } = this.state;
    const { splits, dataSource } = essence;
    const dimension = splits.get(0).getDimension(dataSource.dimensions);

    var scrollerLayout: ScrollerLayout;
    var measureCharts: JSX.Element[] = [];
    var xAxis: JSX.Element;
    var rightGutter: JSX.Element;

    if (datasetLoad.dataset && splits.length()) {
      let yAxes: JSX.Element[] = [];
      let measures = essence.getEffectiveMeasures().toArray();

      let getX = (d: Datum) => d[dimension.name] as string;

      let chartStage = this.getSingleChartStage();
      let { xAxisStage, yAxisStage } = this.getAxisStages(chartStage);
      xAxis = this.renderXAxis((datasetLoad.dataset.data[0][SPLIT] as Dataset).data, this.getBarsCoordinates(0, scaleX), xAxisStage);


      measures.forEach((measure, chartIndex) => {
        let mySplitDataset = datasetLoad.dataset.data[0][SPLIT] as Dataset;
        let coordinates = this.getBarsCoordinates(chartIndex, scaleX);
        let { yAxis, chart } = this.renderChart(datasetLoad.dataset, coordinates, measure, chartIndex, chartStage, getX);

        measureCharts.push(chart);
        yAxes.push(yAxis);
      });

      scrollerLayout = this.getScrollerLayout(chartStage, xAxisStage, yAxisStage);
      rightGutter = this.renderRightGutter(measures, chartStage, yAxes);
    }

    return <div
      className="internals measure-bar-charts"
      style={{maxHeight: stage.height}}
     >
       <Scroller
        layout={scrollerLayout}

        bottomGutter={xAxis}
        rightGutter={rightGutter}

        body={measureCharts}

        onClick={this.onClick.bind(this)}
        onMouseMove={this.onMouseMove.bind(this)}
        onScroll={this.onSimpleScroll.bind(this)}

      />
    </div>;
  }
}
