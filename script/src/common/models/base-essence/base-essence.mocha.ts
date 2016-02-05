'use strict';

import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class/build/tester';

import { $, Expression } from 'plywood';
import { BaseEssence } from './base-essence';

describe('BaseEssence', () => {
  it('is an immutable class', () => {
    testImmutableClass(BaseEssence, [

    ]);
  });

});
