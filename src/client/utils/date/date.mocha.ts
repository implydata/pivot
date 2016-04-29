import { expect } from "chai";
import "../../utils/jsdom-setup";
import { Timezone } from "chronoshift";
import { prependDays, appendDays, getCountDaysInMonth, daysEqualWallTime, monthsEqualWallTime } from "./date";

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

  it('reports walltime day equality', () => {
    var day1 = new Date("2012-11-04T03:30:00-08:00");
    var day2 = new Date("2012-11-04T10:30:00-08:00");
    expect(daysEqualWallTime(day1, day2, "America/Los_Angeles")).to.equal(true);

    day1 = new Date("2012-11-04T03:30:00-08:00");
    day2 = new Date("2012-11-04T00:00:00-08:00");
    expect(daysEqualWallTime(day1, day2, "America/Los_Angeles")).to.equal(true);

    day1 = new Date("2012-11-30T03:30:00-08:00");
    day2 = new Date("2012-12-30T00:00:00-08:00");
    expect(daysEqualWallTime(day1, day2, "America/Los_Angeles")).to.equal(false);
  });

  it('reports walltime month equality', () => {
    var day1 = new Date("2012-12-04T03:30:00-08:00");
    var day2 = new Date("2012-11-04T10:30:00-08:00");
    expect(monthsEqualWallTime(day1, day2, "America/Los_Angeles")).to.equal(false);

    day1 = new Date("2012-12-31T03:30:00-08:00");
    day2 = new Date("2014-12-31T00:00:00-08:00");
    expect(monthsEqualWallTime(day1, day2, "Europe/Paris")).to.equal(false);

    day1 = new Date("2012-12-31T03:30:00-08:00");
    day2 = new Date("2012-12-30T00:00:00-08:00");
    expect(monthsEqualWallTime(day1, day2, "America/Los_Angeles")).to.equal(true);

    day1 = new Date("2012-01-31T03:30:00-08:00");
    day2 = new Date("2012-01-30T00:00:00-08:00");
    expect(monthsEqualWallTime(day1, day2, "Asia/Kathmandu")).to.equal(true);

  });

  it('calculates days in month properly', () => {
    expect(getCountDaysInMonth(new Date('1987-08-16T04:54:10Z'))).to.equal(31);
    expect(getCountDaysInMonth(new Date('1970-02-26T04:54:10Z'))).to.equal(28);
    expect(getCountDaysInMonth(new Date('2016-02-26T04:54:10Z'))).to.equal(29);
  });
});


