require('./add-collection-item-modal.css');

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { $, Expression, Executor, Dataset } from 'plywood';
import { Collection, Essence, CollectionItem, DataCube } from '../../../../common/models/index';
import { classNames } from '../../../utils/dom/dom';

import { FormLabel } from '../../../components/form-label/form-label';
import { Button } from '../../../components/button/button';
import { ImmutableInput } from '../../../components/immutable-input/immutable-input';
import { Modal } from '../../../components/modal/modal';

import { COLLECTION_ITEM as LABELS } from '../../../../common/models/labels';

export interface AddCollectionItemModalProps extends React.Props<any> {
  essence: Essence;
  collection: Collection;
  dataCube: DataCube;
  onCancel?: () => void;
  onSave?: (collectionItem: CollectionItem) => void;
}

export interface AddCollectionItemModalState {
  collectionItem?: CollectionItem;
  errors?: any;
  canSave?: boolean;
}

export class AddCollectionItemModal extends React.Component<AddCollectionItemModalProps, AddCollectionItemModalState> {

  constructor() {
    super();
    this.state = {
      canSave: false,
      errors: {}
    };
  }

  initFromProps(props: AddCollectionItemModalProps) {
    var name = String(Date.now());

    if (!this.isNameUnique(name)) {
      let i = 1;
      while (!this.isNameUnique(`${name}-${i}`)) {
        i++;
      }

      name = `${name}-${i}`;
    }

    this.setState({
      canSave: true,
      collectionItem: new CollectionItem({
        name,
        title: 'New item',
        description: '',
        essence: props.essence,
        group: null,
        dataCube: props.dataCube
      })
    });
  }

  componentDidMount() {
    this.initFromProps(this.props);
  }

  componentWillReceiveProps(nextProps: AddCollectionItemModalProps) {
    if (!this.state.collectionItem) this.initFromProps(nextProps);
  }

  save() {
    if (this.state.canSave) this.props.onSave(this.state.collectionItem);
  }

  isNameUnique(name: string): boolean {
    const { collection } = this.props;

    if (collection.items.filter((item: CollectionItem) => item.name === name).length > 0) {
      return false;
    }

    return true;
  }

  validateName(name: string): boolean {
    if (this.isNameUnique(name)) return true;

    throw new Error(`Another item with this name already exists`);
  }

  onChange(newCollectionItem: CollectionItem, isValid: boolean, path: string, error: string) {
    var { errors } = this.state;

    errors[path] = isValid ? false : error;

    var canSave = true;
    for (let key in errors) canSave = canSave && (errors[key] === false);

    if (isValid) {
      this.setState({
        errors,
        collectionItem: newCollectionItem,
        canSave
      });
    } else {
      this.setState({
        errors,
        canSave: false
      });
    }
  }

  render(): JSX.Element {
    const { canSave, errors, collectionItem } = this.state;

    if (!collectionItem) return null;

    var makeLabel = FormLabel.simpleGenerator(LABELS, errors, true);
    var makeTextInput = ImmutableInput.simpleGenerator(collectionItem, this.onChange.bind(this));

    return <Modal
      className="dimension-modal"
      title={collectionItem.title}
      onClose={this.props.onCancel}
      onEnter={this.save.bind(this)}
    >
      <form className="general vertical">
        {makeLabel('title')}
        {makeTextInput('title', /^.+$/, true)}

        {makeLabel('description')}
        {makeTextInput('description')}

      </form>

      <div className="button-group">
        <Button
          className={classNames("save", {disabled: !canSave})}
          title="Add to collection"
          type="primary"
          onClick={this.save.bind(this)}
        />
        <Button className="cancel" title="Cancel" type="secondary" onClick={this.props.onCancel}/>
      </div>

    </Modal>;
  }
}
