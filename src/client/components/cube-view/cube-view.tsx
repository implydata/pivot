'use strict';
require('./cube-view.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { List } from 'immutable';
import { Expression } from 'plywood';
import { DragManager } from '../../utils/drag-manager/drag-manager';
import { Colors, Clicker, DataSource, Dimension, Essence, Filter, Stage, Manifest, Measure,
  SplitCombine, Splits, VisStrategy, VisualizationProps} from '../../../common/models/index';
// import { ... } from '../../config/constants';

import { DimensionMeasurePanel } from '../dimension-measure-panel/dimension-measure-panel';
import { FilterTile } from '../filter-tile/filter-tile';
import { SplitTile } from '../split-tile/split-tile';
import { VisSelector } from '../vis-selector/vis-selector';
import { ManualFallback } from '../manual-fallback/manual-fallback';
import { DropIndicator } from '../drop-indicator/drop-indicator';
import { PinboardPanel } from '../pinboard-panel/pinboard-panel';

import { visualizations } from '../../visualizations/index';

export interface CubeViewProps extends React.Props<any> {
  maxFilters?: number;
  maxSplits?: number;
  hash: string;
  selectedDataSource: DataSource;
  updateHash: Function;
}

export interface CubeViewState {
  essence?: Essence;
  visualizationStage?: Stage;
  menuStage?: Stage;
  dragOver?: boolean;
}

export class CubeView extends React.Component<CubeViewProps, CubeViewState> {
  static defaultProps = {
    maxFilters: 20,
    maxSplits: 3
  };

  private clicker: Clicker;
  private dragCounter: number;

  constructor() {
    super();
    this.state = {
      essence: null,
      dragOver: false,
    };

    var clicker = {
      changeFilter: (filter: Filter, colors?: Colors) => {
        var { essence } = this.state;
        essence = essence.changeFilter(filter);
        if (colors) essence = essence.changeColors(colors);
        this.setState({ essence });
      },
      changeTimeSelection: (selection: Expression) => {
        var { essence } = this.state;
        this.setState({ essence: essence.changeTimeSelection(selection) });
      },
      changeSplits: (splits: Splits, strategy: VisStrategy, colors?: Colors) => {
        var { essence } = this.state;
        if (colors) essence = essence.changeColors(colors);
        this.setState({ essence: essence.changeSplits(splits, strategy) });
      },
      changeSplit: (split: SplitCombine, strategy: VisStrategy) => {
        var { essence } = this.state;
        this.setState({ essence: essence.changeSplit(split, strategy) });
      },
      addSplit: (split: SplitCombine, strategy: VisStrategy) => {
        var { essence } = this.state;
        this.setState({ essence: essence.addSplit(split, strategy) });
      },
      removeSplit: (split: SplitCombine, strategy: VisStrategy) => {
        var { essence } = this.state;
        this.setState({ essence: essence.removeSplit(split, strategy) });
      },
      changeColors: (colors: Colors) => {
        var { essence } = this.state;
        this.setState({ essence: essence.changeColors(colors) });
      },
      changeVisualization: (visualization: Manifest) => {
        var { essence } = this.state;
        this.setState({ essence: essence.changeVisualization(visualization) });
      },
      pin: (dimension: Dimension) => {
        var { essence } = this.state;
        this.setState({ essence: essence.pin(dimension) });
      },
      unpin: (dimension: Dimension) => {
        var { essence } = this.state;
        this.setState({ essence: essence.unpin(dimension) });
      },
      changePinnedSortMeasure: (measure: Measure) => {
        var { essence } = this.state;
        this.setState({ essence: essence.changePinnedSortMeasure(measure) });
      },
      toggleMeasure: (measure: Measure) => {
        var { essence } = this.state;
        this.setState({ essence: essence.toggleMeasure(measure) });
      },
      changeHighlight: (owner: string, delta: Filter) => {
        var { essence } = this.state;
        this.setState({ essence: essence.changeHighlight(owner, delta) });
      },
      acceptHighlight: () => {
        var { essence } = this.state;
        this.setState({ essence: essence.acceptHighlight() });
      },
      dropHighlight: () => {
        var { essence } = this.state;
        this.setState({ essence: essence.dropHighlight() });
      }
    };
    this.clicker = clicker;
    this.globalResizeListener = this.globalResizeListener.bind(this);
    this.globalKeyDownListener = this.globalKeyDownListener.bind(this);

    (window as any).autoRefresh = () => {
      setInterval(() => {
        var { essence } = this.state;
        var { dataSource } = essence;
        if (!dataSource.shouldUpdateMaxTime()) return;
        DataSource.updateMaxTime(dataSource).then((updatedDataSource) => {
          console.log(`Updated MaxTime for '${updatedDataSource.name}'`);
          this.setState({ essence: essence.updateDataSource(updatedDataSource) });
        });
      }, 1000);
    };
  }

  componentWillMount() {
    var selectedDataSource = this.props.selectedDataSource;
    var essence = this.getEssenceFromHash(this.props.hash) || this.getEssenceFromDataSource(selectedDataSource);
    this.setState({ essence });
  }

  componentDidMount() {
    DragManager.init();
    window.addEventListener('resize', this.globalResizeListener);
    window.addEventListener('keydown', this.globalKeyDownListener);
    this.globalResizeListener();
  }

  componentWillReceiveProps(nextProps: CubeViewProps) {
    var hashEssence = this.getEssenceFromHash(nextProps.hash);
    if (hashEssence && !hashEssence.equals(this.state.essence)) {
      if (nextProps.hash !== this.props.hash) {
        this.setState({ essence: hashEssence });
      } else {
        return;
      }
    } else if (!this.props.selectedDataSource.equals(nextProps.selectedDataSource)) {
      var newEssence = this.state.essence.updateDataSource(nextProps.selectedDataSource);
      this.setState({ essence: newEssence });
    }

  }

  componentWillUpdate(nextProps: CubeViewProps, nextState: CubeViewState): void {
    this.props.updateHash(nextState.essence.toHash());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.globalResizeListener);
    window.removeEventListener('keydown', this.globalKeyDownListener);
  }

  getEssenceFromDataSource(selectedDataSource: DataSource): Essence {
    return Essence.fromDataSource(selectedDataSource, { dataSource: selectedDataSource, visualizations });
  }

  getEssenceFromHash(hash: string): Essence {
    var selectedDataSource = this.props.selectedDataSource;
    if (hash[0] === '#') hash = hash.substr(1);

    var parts = hash.split('/');
    if (parts.length < 4) return null;
    var cubeHash = parts.join('/');

    return Essence.fromHash(cubeHash, { dataSource: selectedDataSource, visualizations });
  }

  globalKeyDownListener(e: KeyboardEvent) {
    // Shortcuts will go here one day
  }

  globalResizeListener() {
    var { container, visualization } = this.refs;
    var containerDOM = ReactDOM.findDOMNode(container);
    var visualizationDOM = ReactDOM.findDOMNode(visualization);
    if (!containerDOM || !visualizationDOM) return;
    this.setState({
      menuStage: Stage.fromClientRect(containerDOM.getBoundingClientRect()),
      visualizationStage: Stage.fromClientRect(visualizationDOM.getBoundingClientRect())
    });
  }

  canDrop(e: DragEvent): boolean {
    return Boolean(DragManager.getDragDimension());
  }

  dragOver(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.dataTransfer.dropEffect = 'move';
    e.preventDefault();
  }

  dragEnter(e: DragEvent) {
    if (!this.canDrop(e)) return;
    var { dragOver } = this.state;
    if (!dragOver) {
      this.dragCounter = 0;
      this.setState({ dragOver: true });
    } else {
      this.dragCounter++;
    }
  }

  dragLeave(e: DragEvent) {
    if (!this.canDrop(e)) return;
    var { dragOver } = this.state;
    if (!dragOver) return;
    if (this.dragCounter === 0) {
      this.setState({ dragOver: false });
    } else {
      this.dragCounter--;
    }
  }

  drop(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.preventDefault();
    var { essence } = this.state;
    this.dragCounter = 0;
    var dimension = DragManager.getDragDimension();
    if (dimension) {
      this.clicker.changeSplit(SplitCombine.fromExpression(dimension.expression), VisStrategy.FairGame);
    }
    this.setState({ dragOver: false });
  }

  triggerFilterMenu(dimension: Dimension) {
    if (!dimension) return;
    (this.refs['filterTile'] as FilterTile).filterMenuRequest(dimension);
  }

  triggerSplitMenu(dimension: Dimension) {
    if (!dimension) return;
    (this.refs['splitTile'] as SplitTile).splitMenuRequest(dimension);
  }

  render() {
    var clicker = this.clicker;

    var { essence, menuStage, visualizationStage, dragOver } = this.state;

    if (!essence) return null;

    var { visualization } = essence;

    var visElement: JSX.Element = null;
    if (essence.visResolve.isReady() && visualizationStage) {
      var visProps: VisualizationProps = {
        clicker,
        essence,
        stage: visualizationStage
      };

      visElement = React.createElement(visualization as any, visProps);
    }

    var manualFallback: JSX.Element = null;
    if (essence.visResolve.isManual()) {
      manualFallback = React.createElement(ManualFallback, {
        clicker,
        essence
      });
    }

    var dropIndicator: JSX.Element = null;
    if (dragOver) {
      dropIndicator = <DropIndicator/>;
    }

    return <div className='cube-view' ref='container'>
      <DimensionMeasurePanel
        clicker={clicker}
        essence={essence}
        menuStage={menuStage}
        triggerFilterMenu={this.triggerFilterMenu.bind(this)}
        triggerSplitMenu={this.triggerSplitMenu.bind(this)}/>

      <div className='center-panel'>
        <div className='center-top-bar'>
          <div className='filter-split-section'>
            <FilterTile ref="filterTile" clicker={clicker} essence={essence} menuStage={visualizationStage}/>
            <SplitTile ref="splitTile" clicker={clicker} essence={essence} menuStage={visualizationStage}/>
          </div>
          <VisSelector clicker={clicker} essence={essence}/>
        </div>
        <div
          className='center-main'
          onDragOver={this.dragOver.bind(this)}
          onDragEnter={this.dragEnter.bind(this)}
          onDragLeave={this.dragLeave.bind(this)}
          onDrop={this.drop.bind(this)}
        >
          <div className='visualization' ref='visualization'>{visElement}</div>
          {manualFallback}
          {dropIndicator}
        </div>
      </div>
      <PinboardPanel clicker={clicker} essence={essence}/>
    </div>;
  }
}
