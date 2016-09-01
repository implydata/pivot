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

require('./immutable-list.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { List } from 'immutable';
import { Fn } from "../../../common/utils/general/general";
import { STRINGS } from "../../config/constants";

import { Button } from '../button/button';
import { Modal } from '../modal/modal';
import { SvgIcon } from '../svg-icon/svg-icon';
import { FormLabel } from '../form-label/form-label';
import { SimpleList, SimpleRow } from '../simple-list/simple-list';

export interface ImmutableListProps<T> extends React.Props<any> {
  label?: string;
  items: List<T>;
  onChange: (newItems: List<T>) => void;
  getNewItem: () => T;
  getModal: (item: T) => JSX.Element;
  getRows: (items: List<T>) => SimpleRow[];
  toggleSuggestions?: Fn;
}

export interface ImmutableListState<T> {
  tempItems?: List<T>;
  editedIndex?: number;
  pendingAddItem?: T;
}

export class ImmutableList<T> extends React.Component<ImmutableListProps<T>, ImmutableListState<T>> {

  // Allows usage in TSX :
  // const MyList = ImmutableList.specialize<MyImmutableClass>();
  // then : <MyList ... />
  static specialize<U>() {
    return ImmutableList as { new (): ImmutableList<U>; };
  }

  constructor() {
    super();
    this.state = {};
  }

  editItem(index: number) {
    this.setState({editedIndex: index});
  }

  addItem() {
    this.setState({pendingAddItem: this.props.getNewItem()});
  }

  componentWillReceiveProps(nextProps: ImmutableListProps<T>) {
    if (nextProps.items) {
      this.setState({tempItems: nextProps.items});
    }
  }

  componentDidMount() {
    if (this.props.items) {
      this.setState({tempItems: this.props.items});
    }
  }

  deleteItem(index: number) {
    const { tempItems } = this.state;
    this.setState({tempItems: tempItems.delete(index)}, this.onChange);
  }

  onReorder(oldIndex: number, newIndex: number) {
    var tempItems: List<any> = this.state.tempItems;

    var item = tempItems.get(oldIndex);

    this.setState({
      tempItems: tempItems
        .delete(oldIndex)
        .insert(newIndex > oldIndex ? newIndex - 1 : newIndex, item)
    }, this.onChange);
  }

  onChange() {
    this.props.onChange(this.state.tempItems);
  }

  renderEditModal(itemIndex: number): JSX.Element {
    const { tempItems } = this.state;

    var item = tempItems.get(itemIndex);

    var onSave = (newItem: T) => {
      const newItems = tempItems.update(itemIndex, () => newItem);
      this.setState({tempItems: newItems, editedIndex: undefined}, this.onChange);
    };

    var onClose = () => this.setState({editedIndex: undefined});

    return React.cloneElement(this.props.getModal(item), {onSave, onClose});
  }

  renderAddModal(item: T): JSX.Element {
    var onSave = (newItem: T) => {
      const { tempItems } = this.state;
      const newItems = tempItems.push(newItem);

      this.setState(
        {tempItems: newItems, pendingAddItem: null},
        this.onChange
      );
    };

    var onClose = () => this.setState({pendingAddItem: null});

    return React.cloneElement(this.props.getModal(item), {onSave, onClose, mode: 'create'});
  }

  renderEmpty() {
    const { label, toggleSuggestions } = this.props;
    return <div className="empty-container">
      <div className="empty-message">
        <div className="label">No {label}</div>
        { toggleSuggestions ?
          <div className="actions">{STRINGS.quicklyAddSomeUsing} <a key='suggestions' onClick={toggleSuggestions}>suggestions</a></div>
          : null }
      </div>
    </div>;
  }

  renderList() {
    const { items, getRows } = this.props;
    return <SimpleList
      rows={getRows(items)}
      onEdit={this.editItem.bind(this)}
      onRemove={this.deleteItem.bind(this)}
      onReorder={this.onReorder.bind(this)}
    />;
  }

  render() {
    const { items, label, toggleSuggestions } = this.props;
    const { editedIndex, pendingAddItem } = this.state;

    if (!items) return null;
    return <div className="immutable-list">
      <div className="list-title">
        <div className="label">{label}</div>
        <div className="actions">
          { toggleSuggestions ? <button key='suggestions' onClick={toggleSuggestions}>Suggestions</button> : null }
          <button key='add' onClick={this.addItem.bind(this)}>Add item</button>
        </div>
      </div>
      {items.size === 0 ? this.renderEmpty() : this.renderList()}
      {editedIndex != null ? this.renderEditModal(editedIndex) : null}
      {pendingAddItem ? this.renderAddModal(pendingAddItem) : null}
    </div>;
  }
}
