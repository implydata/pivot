require('./filter-options-dropdown.css');

import * as React from 'react';
import { STRINGS } from '../../config/constants';

import { Dropdown, DropdownProps } from "../dropdown/dropdown";
import { SvgIcon } from '../svg-icon/svg-icon';
import { CheckboxType } from '../checkbox/checkbox';

export interface FilterOption {
  name: string;
  svg: string;
  checkType?: CheckboxType;
}

var filterOptions: FilterOption[] = [
  {
    name: STRINGS.include,
    svg: require('../../icons/filter-include.svg'),
    checkType: 'check'
  },
  {
    name: STRINGS.exclude,
    svg: require('../../icons/filter-exclude.svg'),
    checkType: 'cross'
  },
  {
    name: STRINGS.intersection,
    svg: require('../../icons/filter-intersection.svg'),
    checkType: 'check'
  },
  {
    name: STRINGS.stringSearch,
    svg: require('../../icons/filter-string.svg'),
    checkType: 'check'
  },
  {
    name: STRINGS.regex,
    svg: require('../../icons/filter-regex.svg'),
    checkType: 'check'
  }
];


export interface FilterOptionsDropdownProps extends React.Props<any> {
  selectedOption: FilterOption;
  onSelectOption: (o: FilterOption) => void;
}

export interface FilterOptionsDropdownState {
}

export class FilterOptionsDropdown extends React.Component<FilterOptionsDropdownProps, FilterOptionsDropdownState> {
  constructor() {
    super();
  }

  renderFilterOption(option: FilterOption) {
    return <span className="filter-option"><SvgIcon className="icon" svg={option.svg}/><span className="option-label">{option.name}</span></span>;
  }

  render() {
    var { selectedOption, onSelectOption } = this.props;

    var dropdown = React.createElement(Dropdown, {
      className: 'filter-options',
      items: filterOptions,
      selectedItem: selectedOption || filterOptions[0],
      equal: (a, b) => a.name === b.name,
      keyItem: (d) => d.name,
      renderItem: this.renderFilterOption.bind(this),
      renderSelectedItem: (d) => <SvgIcon className="icon" svg={d.svg}/>,
      onSelect: onSelectOption.bind(this)
    } as DropdownProps<FilterOption>);

    return <div className="filter-options-dropdown">{dropdown}</div>;
  }
}
