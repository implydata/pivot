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

require('./filter-tile.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Q from 'q';
import { Timezone, Duration, hour, day, week } from 'chronoshift';
import { STRINGS, CORE_ITEM_WIDTH, CORE_ITEM_GAP } from '../../config/constants';
import { Stage, Clicker, Essence, Timekeeper, Filter, FilterClause, Dimension, DragPosition } from '../../../common/models/index';
import { getFormattedClause } from '../../../common/utils/formatter/formatter';
import { getMaxItems, SECTION_WIDTH } from '../../utils/pill-tile/pill-tile';

import {
  findParentWithClass, setDragGhost, uniqueId, isInside, transformStyle, getXFromEvent, classNames
} from '../../utils/dom/dom';

import { DragManager } from '../../utils/drag-manager/drag-manager';

import { SvgIcon } from '../svg-icon/svg-icon';
import { FancyDragIndicator } from '../fancy-drag-indicator/fancy-drag-indicator';
import { FilterMenu } from '../filter-menu/filter-menu';
import { BubbleMenu } from '../bubble-menu/bubble-menu';

const FILTER_CLASS_NAME = 'filter';
const ANIMATION_DURATION = 400;

export interface ItemBlank {
  dimension: Dimension;
  source: string;
  clause?: FilterClause;
}

function formatLabelDummy(dimension: Dimension): string {
  return dimension.title;
}

export interface FilterTileProps extends React.Props<any> {
  clicker: Clicker;
  essence: Essence;
  timekeeper: Timekeeper;
  menuStage: Stage;
  getUrlPrefix?: () => string;
}

export interface FilterTileState {
  FilterMenuAsync?: typeof FilterMenu;
  menuOpenOn?: Element;
  menuDimension?: Dimension;
  menuInside?: Element;
  overflowMenuOpenOn?: Element;
  dragPosition?: DragPosition;
  possibleDimension?: Dimension;
  possiblePosition?: DragPosition;
  maxItems?: number;
  maxWidth?: number;
}

export class FilterTile extends React.Component<FilterTileProps, FilterTileState> {
  private overflowMenuId: string;
  private dummyDeferred: Q.Deferred<any>;
  private overflowMenuDeferred: Q.Deferred<Element>;

  constructor() {
    super();
    this.overflowMenuId = uniqueId('overflow-menu-');
    this.state = {
      FilterMenuAsync: null,
      menuOpenOn: null,
      menuDimension: null,
      menuInside: null,
      overflowMenuOpenOn: null,
      dragPosition: null,
      possibleDimension: null,
      possiblePosition: null,
      maxItems: 20
    };
  }

  componentDidMount() {
    require.ensure(['../filter-menu/filter-menu'], (require) => {
      this.setState({
        FilterMenuAsync: require('../filter-menu/filter-menu').FilterMenu
      });
    }, 'filter-menu');
  }

  componentWillReceiveProps(nextProps: FilterTileProps) {
    const { menuStage } = nextProps;

    if (menuStage) {
      var newMaxItems = getMaxItems(menuStage.width, this.getItemBlanks().length);
      if (newMaxItems !== this.state.maxItems) {
        this.setState({
          menuOpenOn: null,
          menuDimension: null,
          menuInside: null,
          possibleDimension: null,
          possiblePosition: null,
          overflowMenuOpenOn: null,
          maxItems: newMaxItems
        });
      }
    }
  }

  componentDidUpdate() {
    var { possibleDimension, overflowMenuOpenOn } = this.state;

    if (possibleDimension) {
      this.dummyDeferred.resolve(null);
    }

    if (overflowMenuOpenOn) {
      var overflowMenu = this.getOverflowMenu();
      if (overflowMenu) this.overflowMenuDeferred.resolve(overflowMenu);
    }
  }

  overflowButtonTarget(): Element {
    return ReactDOM.findDOMNode(this.refs['overflow']);
  }

  getOverflowMenu(): Element {
    return document.getElementById(this.overflowMenuId);
  }

  clickDimension(dimension: Dimension, e: React.MouseEvent) {
    var target = findParentWithClass(e.target as Element, FILTER_CLASS_NAME);
    this.openMenu(dimension, target);
  }

  openMenuOnDimension(dimension: Dimension) {
    var targetRef = this.refs[dimension.name];
    if (targetRef) {
      var target = ReactDOM.findDOMNode(targetRef);
      if (!target) return;
      this.openMenu(dimension, target);
    } else {
      var overflowButtonTarget = this.overflowButtonTarget();
      if (overflowButtonTarget) {
        this.openOverflowMenu(overflowButtonTarget).then(() => {
          var target = ReactDOM.findDOMNode(this.refs[dimension.name]);
          if (!target) return;
          this.openMenu(dimension, target);
        });
      }
    }
  }

  openMenu(dimension: Dimension, target: Element) {
    var { menuOpenOn } = this.state;
    if (menuOpenOn === target) {
      this.closeMenu();
      return;
    }
    var overflowMenu = this.getOverflowMenu();
    var menuInside: Element = null;
    if (overflowMenu && isInside(target, overflowMenu)) {
      menuInside = overflowMenu;
    }
    this.setState({
      menuOpenOn: target,
      menuDimension: dimension,
      menuInside
    });
  }

  closeMenu() {
    var { menuOpenOn, possibleDimension } = this.state;
    if (!menuOpenOn) return;
    var newState: FilterTileState = {
      menuOpenOn: null,
      menuDimension: null,
      menuInside: null,
      possibleDimension: null,
      possiblePosition: null
    };
    if (possibleDimension) {
      // If we are adding a ghost dimension also close the overflow menu
      // This is so it does not remain phantom open with nothing inside
      newState.overflowMenuOpenOn = null;
    }
    this.setState(newState);
  }

  openOverflowMenu(target: Element): Q.Promise<any> {
    if (!target) return Q(null);
    var { overflowMenuOpenOn } = this.state;

    if (overflowMenuOpenOn === target) {
      this.closeOverflowMenu();
      return Q(null);
    }

    this.overflowMenuDeferred = Q.defer() as Q.Deferred<Element>;
    this.setState({ overflowMenuOpenOn: target });
    return this.overflowMenuDeferred.promise;
  }

  closeOverflowMenu() {
    var { overflowMenuOpenOn } = this.state;
    if (!overflowMenuOpenOn) return;
    this.setState({
      overflowMenuOpenOn: null
    });
  }

  removeFilter(itemBlank: ItemBlank, e: MouseEvent) {
    var { essence, clicker } = this.props;
    if (itemBlank.clause) {
      if (itemBlank.source === 'from-highlight') {
        clicker.dropHighlight();
      } else {
        clicker.changeFilter(essence.filter.remove(itemBlank.clause.expression));
      }
    }
    this.closeMenu();
    this.closeOverflowMenu();
    e.stopPropagation();
  }

  dragStart(dimension: Dimension, clause: FilterClause, e: DragEvent) {
    var { essence, getUrlPrefix } = this.props;

    var dataTransfer = e.dataTransfer;
    dataTransfer.effectAllowed = 'all';

    if (getUrlPrefix) {
      var newUrl = essence.getURL(getUrlPrefix());
      dataTransfer.setData("text/url-list", newUrl);
      dataTransfer.setData("text/plain", newUrl);
    }

    DragManager.setDragDimension(dimension, 'filter-tile');

    setDragGhost(dataTransfer, dimension.title);

    this.closeMenu();
    this.closeOverflowMenu();
  }

  calculateDragPosition(e: DragEvent): DragPosition {
    var { essence } = this.props;
    var numItems = essence.filter.length();
    var rect = ReactDOM.findDOMNode(this.refs['items']).getBoundingClientRect();
    var offset = getXFromEvent(e) - rect.left;
    return DragPosition.calculateFromOffset(offset, numItems, CORE_ITEM_WIDTH, CORE_ITEM_GAP);
  }

  canDrop(e: DragEvent): boolean {
    return Boolean(DragManager.getDragDimension());
  }

  dragEnter(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.preventDefault();
    var dragPosition = this.calculateDragPosition(e);
    if (dragPosition.equals(this.state.dragPosition)) return;
    this.setState({ dragPosition });
  }

  dragOver(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.dataTransfer.dropEffect = 'move';
    e.preventDefault();
    var dragPosition = this.calculateDragPosition(e);
    if (dragPosition.equals(this.state.dragPosition)) return;
    this.setState({ dragPosition });
  }

  dragLeave(e: DragEvent) {
    this.setState({ dragPosition: null });
  }

  drop(e: DragEvent) {
    if (!this.canDrop(e)) return;
    e.preventDefault();
    var { clicker, essence } = this.props;
    var { filter, dataCube } = essence;

    var newState: FilterTileState = {
      dragPosition: null
    };

    var dimension = DragManager.getDragDimension();
    if (dimension) {
      var dragPosition = this.calculateDragPosition(e);

      var tryingToReplaceMandatory = false;
      if (dragPosition.replace !== null) {
        var targetClause = filter.clauses.get(dragPosition.replace);
        tryingToReplaceMandatory = targetClause && dataCube.isMandatoryFilter(targetClause.expression);
      }

      var existingClause = filter.clauseForExpression(dimension.expression);
      if (existingClause) {
        var newFilter: Filter;
        if (dragPosition.isReplace()) {
          newFilter = filter.replaceByIndex(dragPosition.replace, existingClause);
        } else {
          newFilter = filter.insertByIndex(dragPosition.insert, existingClause);
        }

        var newFilterSame = filter.equals(newFilter);
        if (!newFilterSame) {
          clicker.changeFilter(newFilter);
        }

        if (DragManager.getDragOrigin() !== 'filter-tile') { // Do not open the menu if it is an internal re-arrange
          if (newFilterSame) {
            this.filterMenuRequest(dimension);
          } else {
            // Wait for the animation to finish to know where to open the menu
            setTimeout(() => {
              this.filterMenuRequest(dimension);
            }, ANIMATION_DURATION + 50);
          }
        }

      } else {
        if (dragPosition && !tryingToReplaceMandatory) {
          this.addDummy(dimension, dragPosition);
        }

      }
    }

    this.setState(newState);
  }

  addDummy(dimension: Dimension, possiblePosition: DragPosition) {
    this.dummyDeferred = Q.defer() as Q.Deferred<Element>;
    this.setState({
      possibleDimension: dimension,
      possiblePosition
    });
    this.dummyDeferred.promise.then(() => {
      this.openMenuOnDimension(dimension);
    });
  }

  // This will be called externally
  filterMenuRequest(dimension: Dimension) {
    var { filter } = this.props.essence;
    if (filter.filteredOn(dimension.expression)) {
      this.openMenuOnDimension(dimension);
    } else {
      this.addDummy(dimension, new DragPosition({ insert: filter.length() }));
    }
  }

  overflowButtonClick() {
    this.openOverflowMenu(this.overflowButtonTarget());
  };

  renderMenu(): JSX.Element {
    var { essence, timekeeper, clicker, menuStage } = this.props;
    var { FilterMenuAsync, menuOpenOn, menuDimension, menuInside, possiblePosition, maxItems, overflowMenuOpenOn } = this.state;
    if (!FilterMenuAsync || !menuDimension) return null;

    if (possiblePosition && possiblePosition.replace === maxItems) {
      possiblePosition = new DragPosition({ insert: possiblePosition.replace });
    }

    return <FilterMenuAsync
      clicker={clicker}
      essence={essence}
      timekeeper={timekeeper}
      containerStage={overflowMenuOpenOn ? null : menuStage}
      openOn={menuOpenOn}
      dimension={menuDimension}
      changePosition={possiblePosition}
      onClose={this.closeMenu.bind(this)}
      inside={menuInside}
    />;
  }

  renderOverflowMenu(overflowItemBlanks: ItemBlank[]): JSX.Element {
    var { overflowMenuOpenOn } = this.state;
    if (!overflowMenuOpenOn) return null;

    var segmentHeight = 29 + CORE_ITEM_GAP;

    var itemY = CORE_ITEM_GAP;
    var filterItems = overflowItemBlanks.map((itemBlank) => {
      var style = transformStyle(0, itemY);
      itemY += segmentHeight;
      return this.renderItemBlank(itemBlank, style);
    });

    return <BubbleMenu
      className="overflow-menu"
      id={this.overflowMenuId}
      direction="down"
      stage={Stage.fromSize(208, itemY)}
      fixedSize={true}
      openOn={overflowMenuOpenOn}
      onClose={this.closeOverflowMenu.bind(this)}
    >
      {filterItems}
    </BubbleMenu>;
  }

  renderOverflow(overflowItemBlanks: ItemBlank[], itemX: number): JSX.Element {
    var style = transformStyle(itemX, 0);

    return <div
      className={classNames('overflow', { 'all-continuous': overflowItemBlanks.every(item => item.dimension.isContinuous()) })}
      ref="overflow"
      key="overflow"
      style={style}
      onClick={this.overflowButtonClick.bind(this)}
    >
      <div className="count">{'+' + overflowItemBlanks.length}</div>
      {this.renderOverflowMenu(overflowItemBlanks)}
    </div>;
  }

  renderRemoveButton(itemBlank: ItemBlank) {
    var { essence } = this.props;
    var dataCube = essence.dataCube;
    if (dataCube.isMandatoryFilter(itemBlank.dimension.expression)) return null;
    return <div className="remove" onClick={this.removeFilter.bind(this, itemBlank)}>
      <SvgIcon svg={require('../../icons/x.svg')}/>
    </div>;
  }

  renderItemLabel(dimension: Dimension, clause: FilterClause, timezone: Timezone): JSX.Element {
    var { title, values } = getFormattedClause(dimension, clause, timezone);

    return <div className="reading">
      {title ? <span className="dimension-title">{title}</span> : null}
      <span className="values">{values}</span>
    </div>;
  }

  renderItemBlank(itemBlank: ItemBlank, style: any): JSX.Element {
    var { essence, timekeeper, clicker } = this.props;
    var { menuDimension } = this.state;

    var { dimension, clause, source } = itemBlank;
    var dimensionName = dimension.name;

    var className = [
      FILTER_CLASS_NAME,
      'type-' + dimension.className,
      source,
      (clause && clause.exclude) ? 'excluded' : 'included',
      dimension === menuDimension ? 'selected' : undefined
    ].filter(Boolean).join(' ');

    var evaluatedClause = dimension.kind === 'time' && clause ? essence.evaluateClause(clause, timekeeper) : clause;
    var timezone = essence.timezone;

    if (source === 'from-highlight') {
      return <div
        className={className}
        key={dimensionName}
        ref={dimensionName}
        onClick={clicker.acceptHighlight.bind(clicker)}
        style={style}
      >
        {this.renderItemLabel(dimension, evaluatedClause, timezone)}
        {this.renderRemoveButton(itemBlank)}
      </div>;
    }

    if (clause) {
      return <div
        className={className}
        key={dimensionName}
        ref={dimensionName}
        draggable={true}
        onClick={this.clickDimension.bind(this, dimension)}
        onDragStart={this.dragStart.bind(this, dimension, clause)}
        style={style}
      >
        {this.renderItemLabel(dimension, evaluatedClause, timezone)}
        {this.renderRemoveButton(itemBlank)}
      </div>;
    } else {
      return <div
        className={className}
        key={dimensionName}
        ref={dimensionName}
        style={style}
      >
        <div className="reading">{formatLabelDummy(dimension)}</div>
        {this.renderRemoveButton(itemBlank)}
      </div>;
    }
  }

  getItemBlanks(): ItemBlank[] {
    var { essence } = this.props;
    var { possibleDimension, possiblePosition, maxItems } = this.state;

    var { dataCube, filter, highlight } = essence;

    var itemBlanks = filter.clauses.toArray()
      .map((clause): ItemBlank => {
        var dimension = dataCube.getDimensionByExpression(clause.expression);
        if (!dimension) return null;
        return {
          dimension,
          source: 'from-filter',
          clause
        };
      })
      .filter(Boolean);

    if (highlight) {
      highlight.delta.clauses.forEach((clause) => {
        var added = false;
        itemBlanks = itemBlanks.map((blank) => {
          if (clause.expression.equals(blank.clause.expression)) {
            added = true;
            return {
              dimension: blank.dimension,
              source: 'from-highlight',
              clause
            };
          } else {
            return blank;
          }
        });
        if (!added) {
          var dimension = dataCube.getDimensionByExpression(clause.expression);
          if (dimension) {
            itemBlanks.push({
              dimension,
              source: 'from-highlight',
              clause
            });
          }
        }
      });
    }

    if (possibleDimension && possiblePosition) {
      var dummyBlank: ItemBlank = {
        dimension: possibleDimension,
        source: 'from-drag'
      };
      if (possiblePosition.replace === maxItems) {
        possiblePosition = new DragPosition({ insert: possiblePosition.replace });
      }
      if (possiblePosition.isInsert()) {
        itemBlanks.splice(possiblePosition.insert, 0, dummyBlank);
      } else {
        itemBlanks[possiblePosition.replace] = dummyBlank;
      }
    }

    return itemBlanks;
  }

  render() {
    var { dragPosition, maxItems } = this.state;
    var itemBlanks = this.getItemBlanks();

    var itemX = 0;
    var filterItems = itemBlanks.slice(0, maxItems).map((item) => {
      var style = transformStyle(itemX, 0);
      itemX += SECTION_WIDTH;
      return this.renderItemBlank(item, style);
    });

    var overflow = itemBlanks.slice(maxItems);
    if (overflow.length > 0) {
      var overFlowStart = filterItems.length * SECTION_WIDTH;
      filterItems.push(this.renderOverflow(overflow, overFlowStart));
    }

    return <div
      className='filter-tile'
      onDragEnter={this.dragEnter.bind(this)}

    >
      <div className="title">{STRINGS.filter}</div>
      <div className="items" ref="items">
        {filterItems}
      </div>
      {dragPosition ? <FancyDragIndicator dragPosition={dragPosition}/> : null}
      {dragPosition ? <div
        className="drag-mask"
        onDragOver={this.dragOver.bind(this)}
        onDragLeave={this.dragLeave.bind(this)}
        onDragExit={this.dragLeave.bind(this)}
        onDrop={this.drop.bind(this)}
      /> : null}
      {this.renderMenu()}
    </div>;
  }
}
