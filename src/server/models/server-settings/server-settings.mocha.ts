import { expect } from 'chai';
import { testImmutableClass } from '../../../../../immutable-class/build/tester';

import { $, Expression } from 'plywood';
import { ServerSettings } from './server-settings';

describe('ServerSettings', () => {
  it('is an immutable class', () => {
    testImmutableClass(ServerSettings, [

    ]);
  });

});
