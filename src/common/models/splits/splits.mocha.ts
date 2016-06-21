import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class/build/tester';

import { Splits, SplitsJS } from './splits';
import { SplitCombineMock } from "../split-combine/split-combine.mock";
import { DataSourceMock } from "../data-source/data-source.mock";
import { FilterMock } from '../filter/filter.mock';

describe('Splits', () => {
  it('is an immutable class', () => {
    testImmutableClass<SplitsJS>(Splits, [
      [
        {
          expression: { op: 'ref', name: 'language' }
        }
      ],
      [
        {
          expression: { op: 'ref', name: 'time' }

        }
      ],
      [
        {
          expression: { op: 'ref', name: 'time' },
          bucketAction: {
            action: 'in',
            expression: {
              'op': 'literal',
              'value': { 'setType': 'STRING', 'elements': ['he'] },
              'type': 'SET'
            }
          },
          sortAction: {
            action: 'sort',
            direction: 'ascending',
            expression: {
              op: 'ref',
              name: 'time'
            }
          },
          limitAction: {
            action: 'limit',
            limit: 2
          }
        },
        {
          expression: { op: 'ref', name: 'time' }

        },
        {
          expression: { op: 'ref', name: 'time' }

        }
      ]
    ]);
  });

  it('#updateWithFilter respects not bucketing', () => {
    var disabledBucketSplit = Splits.fromJS([SplitCombineMock.USER_ID]);
    var updatedWithFilter = disabledBucketSplit.updateWithFilter(FilterMock.language(), DataSourceMock.twitter().dimensions);
    expect(updatedWithFilter).to.deep.equal(disabledBucketSplit);

    var enabledBucketSplit = Splits.fromJS([SplitCombineMock.TIME_JS]);
    updatedWithFilter = enabledBucketSplit.updateWithFilter(FilterMock.language(), DataSourceMock.twitter().dimensions);
    expect(updatedWithFilter).to.not.deep.equal(enabledBucketSplit);

  });
});
