require('./add-collection-tile-modal.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Collection, Essence, CollectionTile, DataCube, SortOn } from '../../../common/models/index';
import { classNames } from '../../utils/dom/dom';
import { generateUniqueName } from '../../../common/utils/string/string';

import { FormLabel, Button, ImmutableInput, Modal, Dropdown, Checkbox } from '../index';

import { STRINGS } from '../../config/constants';

import { COLLECTION_ITEM as LABELS } from '../../../common/models/labels';

export type CollectionMode = 'adding' | 'picking' | 'none';

export interface AddCollectionTileModalProps extends React.Props<any> {
  essence: Essence;

  // If collection is populated, onSave is called with it and the new item
  // Else if the collections property is defined, the modal will ask the user
  // to either pick a collection or to create one.
  collection?: Collection;
  collections?: Collection[];

  dataCube: DataCube;
  onCancel?: () => void;
  onSave?: (collection: Collection, tile: CollectionTile) => void;
}

export interface AddCollectionTileModalState {
  collection?: Collection;
  tile?: CollectionTile;
  errors?: any;
  canSave?: boolean;
  collectionMode?: CollectionMode;
  convertToFixedTime?: boolean;
}

export class AddCollectionTileModal extends React.Component<AddCollectionTileModalProps, AddCollectionTileModalState> {

  constructor() {
    super();
    this.state = {
      canSave: false,
      errors: {},
      collectionMode: 'none'
    };
  }

  getTitleFromEssence(essence: Essence): string {
    var splits = essence.splits;

    if (splits.length() === 0) return essence.selectedMeasures.map(m => {
      return essence.dataCube.getMeasure(m).title;
    }).join(', ');

    var dimensions: string[] = [];
    var measures: string[] = [];

    splits.forEach(split => {
      let dimension = split.getDimension(essence.dataCube.dimensions);
      let sortOn = SortOn.fromSortAction(split.sortAction, essence.dataCube, dimension);
      dimensions.push(dimension.title);
      measures.push(SortOn.getTitle(sortOn));
    });

    return `${dimensions.join(', ')} by ${measures.join(', ')}`;
  }

  initFromProps(props: AddCollectionTileModalProps) {
    const { collection, collections, essence, dataCube } = props;
    var collectionMode: CollectionMode = 'none';

    var selectedCollection: Collection;

    if (collections) {
      collectionMode = collections.length > 0 ? 'picking' : 'adding';
      selectedCollection = collections.length > 0 ? collections[0] : new Collection({
        name: generateUniqueName('c', () => true),
        tiles: [],
        title: 'New collection'
      });
    } else {
      selectedCollection = collection;
    }

    this.setState({
      canSave: !!selectedCollection,
      collection: selectedCollection,
      collectionMode,
      tile: new CollectionTile({
        name: generateUniqueName('i', this.isItemNameUnique.bind(this, selectedCollection)),
        title: this.getTitleFromEssence(essence),
        description: '',
        essence,
        group: null,
        dataCube
      })
    });
  }

  componentDidMount() {
    this.initFromProps(this.props);
  }

  componentWillReceiveProps(nextProps: AddCollectionTileModalProps) {
    if (!this.state.tile) this.initFromProps(nextProps);
  }

  save() {
    const { canSave, collection, tile } = this.state;
    if (canSave && this.props.onSave) this.props.onSave(collection, tile);
  }

  isItemNameUnique(collection: Collection, name: string): boolean {
    if (!collection) return true;

    if (collection.tiles.filter(tile => tile.name === name).length > 0) {
      return false;
    }

    return true;
  }

  updateErrors(path: string, isValid: boolean, error: string): {errors: any, canSave: boolean} {
    var { errors } = this.state;

    errors[path] = isValid ? false : error;

    var canSave = true;
    for (let key in errors) canSave = canSave && (errors[key] === false);

    return {errors, canSave};
  }

  onChange(newCollectionTile: CollectionTile, isValid: boolean, path: string, error: string) {
    var { errors, canSave } = this.updateErrors(path, isValid, error);

    if (isValid) {
      this.setState({
        errors,
        tile: newCollectionTile,
        canSave
      });
    } else {
      this.setState({
        errors,
        canSave: false
      });
    }
  }

  renderCollectionDropdown(): JSX.Element {
    const { collection, tile } = this.state;
    const { collections } = this.props;

    if (!collections || collections.length === 0)  return null;

    const MyDropDown = Dropdown.specialize<Collection>();

    const setCollection = (c: Collection) => {
      let { errors, canSave } = this.updateErrors('collection', true, undefined);

      this.setState({
        collection: c,
        errors,
        canSave,
        tile: tile.change(
          'name',
          generateUniqueName('i', this.isItemNameUnique.bind(this, c))
        )
      });
    };

    return <MyDropDown
      label="Collection"
      items={collections}
      selectedItem={collection}
      renderItem={c => c ? c.title : 'Pick a collection'}
      onSelect={setCollection}
    />;
  }

  renderCollectionPicker() {
    const { collections } = this.props;
    const { tile, collection, collectionMode } = this.state;

    const isCollectionNameUnique = (name: string) => {
      return collections.filter(c => c.name === name).length === 0;
    };

    const toggleCollectionMode = () => {
      let newMode: CollectionMode = collectionMode === 'picking' ? 'adding' : 'picking';
      let collection: Collection = undefined;

      if (newMode === 'adding') {
        collection = new Collection({
          name: generateUniqueName('c', isCollectionNameUnique),
          tiles: [],
          title: 'New collection'
        });
      } else {
        collection = collections[0];
      }

      this.setState({
        collectionMode: newMode,
        collection
      });
    };

    const onCollectionChange = (newCollection: Collection) => {
      let myCollectionTile = tile;

      this.setState({
        collection: newCollection,
        tile: tile.change(
          'name',
          generateUniqueName('i', this.isItemNameUnique.bind(this, newCollection))
        )
      });
    };

    if (collectionMode === 'none') return null;

    if (collectionMode === 'picking') {
      return <div className="collection-picker">
        {this.renderCollectionDropdown()}
        <div className="new-collection" onClick={toggleCollectionMode}>Or add a new collection</div>
      </div>;
    } else {
      return <div className="collection-picker">
        { FormLabel.dumbLabel(`Collection title`) }
        <ImmutableInput
          className="actionable"
          instance={collection}
          path="title"
          onChange={onCollectionChange}
          focusOnStartUp={true}
        />
        { collections.length > 0 ?
          <div className="new-collection" onClick={toggleCollectionMode}>Or pick an existing collection</div>
        : <div className="new-collection disabled">This will be a new collection</div> }
      </div>;
    }
  }

  toggleConvertToFixed() {
    const { essence } = this.props;
    var { tile } = this.state;
    const convertToFixedTime = !this.state.convertToFixedTime;

    if (convertToFixedTime && essence.filter.isRelative()) {
      tile = tile.changeEssence(essence.convertToSpecificFilter());
    } else {
      tile = tile.changeEssence(essence);
    }

    this.setState({
      convertToFixedTime,
      tile
    });
  }

  render(): JSX.Element {
    const { canSave, errors, tile, collectionMode, convertToFixedTime } = this.state;
    const { collections, onCancel, essence } = this.props;

    if (!tile) return null;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);
    var makeTextInput = ImmutableInput.simpleGenerator(tile, this.onChange.bind(this));

    const isRelative = essence.filter.isRelative();

    return <Modal
      className="add-collection-tile-modal"
      title={STRINGS.addNewTile}
      onClose={onCancel}
      onEnter={this.save.bind(this)}
    >
      <form className="general vertical">
        { this.renderCollectionPicker() }

        { makeLabel('title') }
        { makeTextInput('title', /^.+$/, collectionMode !== 'adding') }

        { makeLabel('description') }
        { makeTextInput('description', /^.*$/) }

        { isRelative ?
          <Checkbox
            selected={convertToFixedTime}
            onClick={this.toggleConvertToFixed.bind(this)}
            label={STRINGS.convertToFixedTime}
          />
        : null }

      </form>

      <div className="button-bar">
        <Button
          className={classNames("save", {disabled: !canSave})}
          title="Add to collection"
          type="primary"
          onClick={this.save.bind(this)}
        />
        <Button className="cancel" title="Cancel" type="secondary" onClick={onCancel}/>
      </div>
    </Modal>;
  }
}
