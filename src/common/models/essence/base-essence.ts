'use strict';

import { Class, Instance, isInstanceOf } from 'immutable-class';
import { $, Expression } from 'plywood';
import { List } from 'immutable';
import { DataSource, DataSourceJS } from "../../../common/models/index";

// I am: import { BaseEssence } from '../base-essence/base-essence';

export interface BaseEssenceValue {
  dataSources?: List<DataSource>;
}

export interface BaseEssenceJS {
  dataSources?: DataSourceJS[];
}

var check: Class<BaseEssenceValue, BaseEssenceJS>;
export class BaseEssence implements Instance<BaseEssenceValue, BaseEssenceJS> {
  static isBaseEssence(candidate: any): boolean {
    return isInstanceOf(candidate, BaseEssence);
  }

  static fromJS(parameters: BaseEssenceJS): BaseEssence {
    var dataSourcesFromJS: List<DataSource> = List(parameters.dataSources.map(dataSource => DataSource.fromJS(dataSource)));
    var value: BaseEssenceValue = {
       dataSources : dataSourcesFromJS
    };
    return new BaseEssence(value);
  }

  constructor(parameters: BaseEssenceValue) {
    this.dataSources = parameters.dataSources;
  }
  public dataSources: List<DataSource>;

  public valueOf(): BaseEssenceValue {
    return {
      dataSources: this.dataSources
    };
  }

  public toJS(): BaseEssenceJS {
    var dataSourcesToJS = this.dataSources.toArray().map(dataSource => dataSource.toJS());

    var js: BaseEssenceJS = {
      dataSources : dataSourcesToJS
    };
    return js;
  }

  public toJSON(): BaseEssenceJS {
    return this.toJS();
  }

  public toString(): string {
    return '[' + BaseEssence + ']';
  }

  public equals(other: BaseEssence): boolean {
    return BaseEssence.isBaseEssence(other); // && more...
  }

  public getDataSourceFromHash(hash: string) : DataSource {
    // can change header from hash
    if (hash[0] === '#') hash = hash.substr(1);
    var parts = hash.split('/');
    if (parts.length < 4) return null;
    var dataSourceName = parts.shift();
    var dataSource = this.dataSources.find((ds) => ds.name === dataSourceName);
    return dataSource;
  }


}
check = BaseEssence;
