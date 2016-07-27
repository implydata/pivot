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

import { Class, Instance, isInstanceOf, immutableArraysEqual } from 'immutable-class';
import { helper } from 'plywood';

import { Manifest } from '../manifest/manifest';
import { CollectionItem, CollectionItemJS, CollectionItemContext } from '../collection-item/collection-item';

export interface CollectionValue {
  title: string;
  items: CollectionItem[];
}

export interface CollectionJS {
  title: string;
  items: CollectionItemJS[];
}

export type CollectionContext = CollectionItemContext;

var check: Class<CollectionValue, CollectionJS>;
export class Collection implements Instance<CollectionValue, CollectionJS> {

  static isCollection(candidate: any): candidate is Collection {
    return isInstanceOf(candidate, Collection);
  }

  static fromJS(parameters: CollectionJS, context?: CollectionContext): Collection {
    if (!context) throw new Error('Collection must have context');

    var items: CollectionItemJS[] = parameters.items || (parameters as any).linkItems || [];

    return new Collection({
      title: parameters.title,
      items: items.map(linkItem => CollectionItem.fromJS(linkItem, context))
    });
  }

  public title: string;
  public items: CollectionItem[];

  constructor(parameters: CollectionValue) {
    this.title = parameters.title;
    this.items = parameters.items;
  }

  public valueOf(): CollectionValue {
    return {
      title: this.title,
      items: this.items
    };
  }

  public toJS(): CollectionJS {
    return {
      title: this.title,
      items: this.items.map(linkItem => linkItem.toJS())
    };
  }

  public toJSON(): CollectionJS {
    return this.toJS();
  }

  public toString(): string {
    return `[LinkViewConfig: ${this.title}]`;
  }

  public equals(other: Collection): boolean {
    return Collection.isCollection(other) &&
      this.title === other.title &&
      immutableArraysEqual(this.items, other.items);
  }

  public defaultLinkItem(): CollectionItem {
    return this.items[0];
  }

  public findByName(name: string): CollectionItem {
    return helper.findByName(this.items, name);
  }

}
check = Collection;
