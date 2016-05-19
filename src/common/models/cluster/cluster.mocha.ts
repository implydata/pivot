import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class/build/tester';

import { $, Expression } from 'plywood';
import { Cluster } from './cluster';

describe('Cluster', () => {
  it('is an immutable class', () => {
    testImmutableClass(Cluster, [

    ]);
  });

});
