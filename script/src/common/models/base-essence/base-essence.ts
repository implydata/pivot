'use strict';

import { Class, Instance, isInstanceOf } from 'immutable-class';
import { $, Expression } from 'plywood';

// I am: import { BaseEssence } from '../base-essence/base-essence';

export interface BaseEssenceValue {

}

export interface BaseEssenceJS {

}

var check: Class<BaseEssenceValue, BaseEssenceJS>;
export class BaseEssence implements Instance<BaseEssenceValue, BaseEssenceJS> {

  static isBaseEssence(candidate: any): boolean {
    return isInstanceOf(candidate, BaseEssence);
  }

  static fromJS(parameters: BaseEssenceJS): BaseEssence {
    var value: BaseEssenceValue = {
      /* */
    };
    return new BaseEssence(value);
  }

  constructor(parameters: BaseEssenceValue) {

  }

  public valueOf(): BaseEssenceValue {
    return {

    };
  }

  public toJS(): BaseEssenceJS {
    return {

    };
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

}
check = BaseEssence;
