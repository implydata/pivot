require('./string-filter-menu-controls.css');

import * as React from 'react';
import { Fn } from "../../../common/utils/general/general";
import { FilterMode } from "../../../common/models/filter/filter";
import { MAX_SEARCH_LENGTH } from "../../config/constants";

import { ClearableInput } from "../clearable-input/clearable-input";
import { FilterOptionsDropdown } from "../filter-options-dropdown/filter-options-dropdown";

export interface StringFilterMenuControlsProps extends React.Props<any> {
  onSelectFilterOption: Fn;
  searchText: string;
  placeholder: string;
  filterMode: FilterMode;
  noWorkToDo: boolean;
  updateFetchQueued: Fn;
  updateSearchText: (t: string) => void;
}

export interface StringFilterMenuControlsState {
}

export class StringFilterMenuControls extends React.Component<StringFilterMenuControlsProps, StringFilterMenuControlsState> {
  public mounted: boolean;

  onSearchChange(text: string) {
    var { searchText, noWorkToDo, updateFetchQueued, updateSearchText } = this.props;
    var newSearchText = text.substr(0, MAX_SEARCH_LENGTH);

    // If the user is just typing in more and there are already < TOP_N results then there is nothing to do
    if (newSearchText.indexOf(searchText) !== -1 && noWorkToDo) {
      updateSearchText(newSearchText);
    } else {
      updateSearchText(newSearchText);
      updateFetchQueued();
    }
  }


  render() {
    const { onSelectFilterOption, placeholder, filterMode, searchText } = this.props;

    return <div className="string-filter-menu-controls">
      <div className="side-by-side">
        <FilterOptionsDropdown
          selectedOption={filterMode}
          onSelectOption={onSelectFilterOption.bind(this)}
        />
        <div className="search-box">
          <ClearableInput
            placeholder={placeholder}
            focusOnMount={true}
            value={searchText}
            onChange={this.onSearchChange.bind(this)}
          />
        </div>
      </div>
    </div>;
  }
}
