import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class/build/tester';

import { $, Expression } from 'plywood';
import { AppSettings } from './app-settings';

describe('AppSettings', () => {
  it('is an immutable class', () => {
    testImmutableClass(AppSettings, [

    ]);
  });

});
