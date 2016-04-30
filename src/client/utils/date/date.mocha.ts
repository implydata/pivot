import { expect } from "chai";
import "../../utils/jsdom-setup";
import { Timezone } from "chronoshift";
import { prependDays, appendDays } from "./date";

var { WallTime } = require('chronoshift');
if (!WallTime.rules) {
  var tzData = require("chronoshift/lib/walltime/walltime-data.js");
  WallTime.init(tzData.rules, tzData.zones);
}

describe('Date', () => {

  it('prepends days', () => {
    var testFirstWeek: Date[] = [];
    for (var i = 1; i < 5; i++) {
      testFirstWeek.push(new Date(Date.UTC(1995, 2, i)));
    }

    var prepended = prependDays(Timezone.UTC, testFirstWeek, 5);
    expect(prepended).to.deep.equal([
      new Date('1995-02-24T00:00:00.000Z'),
      new Date('1995-02-25T00:00:00.000Z'),
      new Date('1995-02-26T00:00:00.000Z'),
      new Date('1995-02-27T00:00:00.000Z'),
      new Date('1995-02-28T00:00:00.000Z'),
      new Date('1995-03-01T00:00:00.000Z'),
      new Date('1995-03-02T00:00:00.000Z'),
      new Date('1995-03-03T00:00:00.000Z'),
      new Date('1995-03-04T00:00:00.000Z')
    ]);
  });

  it('appends days', () => {
    var testWeek: Date[] = [];
    for (var i = 1; i < 5; i++) {
      testWeek.push(new Date(Date.UTC(1995, 2, i)));
    }

    var append = appendDays(Timezone.UTC, testWeek, 5);
    expect(append).to.deep.equal([
      new Date('1995-03-01T00:00:00.000Z'),
      new Date('1995-03-02T00:00:00.000Z'),
      new Date('1995-03-03T00:00:00.000Z'),
      new Date('1995-03-04T00:00:00.000Z'),
      new Date('1995-03-05T00:00:00.000Z'),
      new Date('1995-03-06T00:00:00.000Z'),
      new Date('1995-03-07T00:00:00.000Z'),
      new Date('1995-03-08T00:00:00.000Z'),
      new Date('1995-03-09T00:00:00.000Z')

    ]);
  });
});


