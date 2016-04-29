import * as d3 from 'd3';
import { Timezone, WallTime, month, day } from 'chronoshift';
import { TimeRange } from 'plywood';
import { isDate } from "util";
import { getLocale } from "../../config/constants";

const formatWithYear = d3.time.format('%b %-d, %Y');
const formatWithoutYear = d3.time.format('%b %-d');

const formatTimeOfDayWithoutMinutes = d3.time.format('%-I%p');
const formatTimeOfDayWithMinutes = d3.time.format('%-I:%M%p');

export const formatFullMonthAndYear = d3.time.format('%B %Y');

function formatTimeOfDay(d: Date): string {
  return d.getMinutes() ? formatTimeOfDayWithMinutes(d) : formatTimeOfDayWithoutMinutes(d);
}

function isCurrentYear(year: number, timezone: Timezone): boolean {
  var nowWallTime = WallTime.UTCToWallTime(new Date(), timezone.toString());
  return nowWallTime.getFullYear() === year;
}

export enum DisplayYear {
  ALWAYS, NEVER, IF_DIFF
}

export function getEndWallTimeInclusive(exclusiveEnd: Date, timezone: Timezone) {
  return WallTime.UTCToWallTime(new Date(exclusiveEnd.valueOf() - 1), timezone.toString());
}

export function formatTimeRange(timeRange: TimeRange, timezone: Timezone, displayYear: DisplayYear): string {
  var { start, end } = timeRange;
  var startWallTime = WallTime.UTCToWallTime(start, timezone.toString());
  var endWallTime = WallTime.UTCToWallTime(end, timezone.toString());
  var endWallTimeInclusive = getEndWallTimeInclusive(end, timezone);

  var showingYear = true;
  var formatted: string;
  if (startWallTime.getFullYear() !== endWallTimeInclusive.getFullYear()) {
    formatted = [formatWithYear(startWallTime), formatWithYear(endWallTimeInclusive)].join(' - ');
  } else {
    showingYear = displayYear === DisplayYear.ALWAYS || (displayYear === DisplayYear.IF_DIFF && !isCurrentYear(endWallTimeInclusive.getFullYear(), timezone));
    var fmt = showingYear ? formatWithYear : formatWithoutYear;
    if (startWallTime.getMonth() !== endWallTimeInclusive.getMonth() || startWallTime.getDate() !== endWallTimeInclusive.getDate()) {
      formatted = [formatWithoutYear(startWallTime), fmt(endWallTimeInclusive)].join(' - ');
    } else {
      formatted = fmt(startWallTime);
    }
  }

  if (startWallTime.getHours() || startWallTime.getMinutes() || endWallTime.getHours() || endWallTime.getMinutes()) {
    formatted += (showingYear ? ' ' : ', ');

    var startTimeStr = formatTimeOfDay(startWallTime).toLowerCase();
    var endTimeStr = formatTimeOfDay(endWallTime).toLowerCase();

    if (startTimeStr === endTimeStr) {
      formatted += startTimeStr;
    } else {
      if (startTimeStr.substr(-2) === endTimeStr.substr(-2)) {
        startTimeStr = startTimeStr.substr(0, startTimeStr.length - 2);
      }
      formatted += [startTimeStr, endTimeStr].join('-');
    }
  }

  return formatted;
}

// calendar utils

export function monthToWeeks(startDate: Date, tzString: string): Date[][] {
  const weeks: Date[][] = [];
  var week: Date[] = [];
  var firstDayOfMonth = wallTimePreciseToMonth(startDate, tzString);
  for (var i = 1; i <= getCountDaysInMonth(firstDayOfMonth); i++) {
    var activeDay = wallTimePreciseToDay(startDate, i, tzString);
    if (activeDay.getDay() === getLocale().weekStart || 0 && week.length > 0) {
      weeks.push(week);
      week = [];
    }
    week.push(activeDay);
  }
  // push last week
  if (week.length > 0) weeks.push(week);
  return weeks;
}

export function getCountDaysInMonth(date: Date): number {
  if (!isDate(date)) return 0;
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function prependDays(timezone: Timezone, weekPrependTo: Date[], countPrepend: number): Date[] {
  for (var i = 0; i < countPrepend; i++) {
    var firstDate = weekPrependTo[0];
    var shiftedDate = day.shift(firstDate, timezone, - 1);
    weekPrependTo.unshift(shiftedDate);
  }
  return weekPrependTo;
}

export function appendDays(timezone: Timezone, weekAppendTo: Date[], countAppend: number): Date[] {
  for (var i = 0; i < countAppend; i++) {
    var lastDate = weekAppendTo[weekAppendTo.length - 1];
    var shiftedDate = day.shift(lastDate, timezone, 1);
    weekAppendTo.push(shiftedDate);
  }
  return weekAppendTo;
}

export function wallTimeDaysEqual(d1: Date, d2: Date, timezone: string): boolean {
  if (!Boolean(d1) === Boolean(d2)) return false;
  if (d1 === d2 ) return true;
  return wallTimeMonthsEqual(d1, d2, timezone) &&
    WallTime.UTCToWallTime(d1, timezone).getDate() === WallTime.UTCToWallTime(d2, timezone).getDate();
}

export function wallTimeMonthsEqual(d1: Date, d2: Date, timezone: string): boolean {
  if (!Boolean(d1) === Boolean(d2)) return false;
  if (d1 === d2 ) return true;
  var w1 = wallTimePreciseToMonth(d1, timezone);
  var w2 = wallTimePreciseToMonth(d2, timezone);
  return w1.getUTCFullYear() === w2.getUTCFullYear() &&
    w1.getUTCMonth() === w2.getUTCMonth();
}

export function wallTimePreciseToMonth(date: Date, timezone: string): Date {
  return wallTimePreciseToDay(date, 1, timezone);
}

export function wallTimePreciseToDay(date: Date, day: number, timezone: string): Date {
  return wallTimeHelper(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day, 12, 0, 0)), timezone.toString());
}

export function wallTimeHelper(date: Date, timezone: string) {
  return (WallTime.UTCToWallTime(date, timezone) as any)['wallTime'];
}
