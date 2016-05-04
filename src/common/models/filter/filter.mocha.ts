import { expect } from 'chai';
import { testImmutableClass } from 'immutable-class/build/tester';

import { $, Expression } from 'plywood';
import { Filter, FilterJS } from './filter';

describe('Filter', () => {
  it('is an immutable class', () => {
    testImmutableClass<FilterJS>(Filter, [
      { op: 'literal', value: true },
      {
        "op": "chain", "expression": { "op": "ref", "name": "language" },
        "action": {
          "action": "overlap",
          "expression": {
            "op": "literal",
            "value": { "setType": "STRING", "elements": ["en"] },
            "type": "SET"
          }
        }
      },
      {
        "op": "chain", "expression": { "op": "ref", "name": "time" },
        "action": {
          "action": "in",
          "expression": {
            "op": "literal",
            "value": { "start": new Date("2013-02-26T19:00:00.000Z"), "end": new Date("2013-02-26T22:00:00.000Z") },
            "type": "TIME_RANGE"
          }
        }
      },
      {
        "op": "chain", "expression": { "op": "ref", "name": "language" },
        "action": {
          "action": "overlap",
          "expression": {
            "op": "literal",
            "value": { "setType": "STRING", "elements": ["he"] },
            "type": "SET"
          }
        }
      },
      {
        "op": "chain",
        "expression": { "op": "ref", "name": "language" },
        "actions": [
          {
            "action": "overlap",
            "expression": {
              "op": "literal",
              "value": { "setType": "STRING", "elements": ["he"] },
              "type": "SET"
            }
          },
          {
            "action": "and",
            "expression": {
              "op": "chain", "expression": { "op": "ref", "name": "namespace" },
              "action": {
                "action": "overlap",
                "expression": {
                  "op": "literal",
                  "value": { "setType": "STRING", "elements": ["wikipedia"] },
                  "type": "SET"
                }
              }
            }
          }
        ]
      },

      // Dynamic
      {
        "op": "chain", "expression": { "op": "ref", "name": "time" },
        "action": {
          "action": "in",
          "expression": {
            op: 'chain',
            expression: { op: 'ref', name: 'n' },
            action: { action: 'timeRange', duration: 'P1D', step: -1 }
          }
        }
      }
    ]);
  });

  it('works in empty case', () => {
    var filter = Filter.EMPTY;

    expect(filter.toExpression().toJS()).to.deep.equal({
      "op": "literal",
      "value": true
    });
  });

  it('add works', () => {
    var filter = Filter.EMPTY;
    var $language = $('language');

    filter = filter.addValue($language, 'en');

    var ex = $language.overlap(['en']);
    expect(filter.toExpression().toJS()).to.deep.equal(ex.toJS());

    filter = filter.addValue($language, null);

    var ex = $language.overlap(['en', null]);
    expect(filter.toExpression().toJS()).to.deep.equal(ex.toJS());
  });

  it('upgrades', () => {
    var filter = Filter.fromJS({
      "op": "chain",
      "expression": { "op": "ref", "name": "language" },
      "actions": [
        {
          "action": "in",
          "expression": {
            "op": "literal",
            "value": { "setType": "STRING", "elements": ["he"] },
            "type": "SET"
          }
        },
        {
          "action": "and",
          "expression": {
            "op": "chain", "expression": { "op": "ref", "name": "namespace" },
            "action": {
              "action": "in",
              "expression": {
                "op": "literal",
                "value": { "setType": "STRING", "elements": ["wikipedia"] },
                "type": "SET"
              }
            }
          }
        }
      ]
    });

    expect(filter.toJS()).to.deep.equal({
      "op": "chain",
      "expression": { "op": "ref", "name": "language" },
      "actions": [
        {
          "action": "overlap",
          "expression": {
            "op": "literal",
            "value": { "setType": "STRING", "elements": ["he"] },
            "type": "SET"
          }
        },
        {
          "action": "and",
          "expression": {
            "op": "chain", "expression": { "op": "ref", "name": "namespace" },
            "action": {
              "action": "overlap",
              "expression": {
                "op": "literal",
                "value": { "setType": "STRING", "elements": ["wikipedia"] },
                "type": "SET"
              }
            }
          }
        }
      ]
    });

  });
});
