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

require('./string-filter-menu.css');

import * as React from 'react';
import { Fn } from '../../../common/utils/general/general';
import { Stage, Clicker, Essence, Filter, FilterMode, Dimension, DragPosition } from '../../../common/models/index';

import { BubbleMenu } from "../bubble-menu/bubble-menu";
import { PreviewStringFilterMenu } from '../preview-string-filter-menu/preview-string-filter-menu';
import { SelectableStringFilterMenu  } from '../selectable-string-filter-menu/selectable-string-filter-menu';

export interface StringFilterMenuProps extends React.Props<any> {
  clicker: Clicker;
  dimension: Dimension;
  essence: Essence;
  changePosition: DragPosition;
  onClose: Fn;

  direction?: string;
  containerStage?: Stage;
  stage?: Stage;
  openOn?: Element;
  inside?: Element;
}

export interface StringFilterMenuState {
  filterMode?: FilterMode;
}

export class StringFilterMenu extends React.Component<StringFilterMenuProps, StringFilterMenuState> {
  public mounted: boolean;

  constructor() {
    super();
    this.state = {
      filterMode: null
    };
  }

  componentWillMount() {
    var { essence, dimension } = this.props;
    var filterMode = essence.filter.getModeForDimension(dimension);
    if (filterMode && !this.state.filterMode) this.setState({filterMode});
  }

  onSelectFilterOption(filterMode: FilterMode) {
    this.setState({filterMode});
  }

  render() {
    const { dimension, clicker, essence, changePosition, onClose, direction, containerStage, openOn, inside } = this.props;
    const { filterMode } = this.state;
    if (!dimension) return null;
    var menuSize: Stage = null;
    var menuCont: JSX.Element = null;

    if (filterMode === Filter.MATCH) {
      menuSize = Stage.fromSize(350, 410);
      menuCont = <PreviewStringFilterMenu
        dimension={dimension}
        clicker={clicker}
        essence={essence}
        changePosition={changePosition}
        onClose={onClose}
        onSelectFilterOption={this.onSelectFilterOption.bind(this)}
        filterMode={filterMode}

      />;
    } else {
      menuSize = Stage.fromSize(250, 410);
      menuCont = <SelectableStringFilterMenu
        dimension={dimension}
        clicker={clicker}
        essence={essence}
        changePosition={changePosition}
        onClose={onClose}
        onSelectFilterOption={this.onSelectFilterOption.bind(this)}
        filterMode={filterMode}
      />;
    }

    return <BubbleMenu
      className="filter-menu"
      direction={direction}
      containerStage={containerStage}
      stage={menuSize}
      openOn={openOn}
      onClose={onClose}
      inside={inside}
    >
      {menuCont}
    </BubbleMenu>;
  }
}
