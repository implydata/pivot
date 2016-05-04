require('./date-range-picker.css');

import * as React from "react";
import { Timezone, Duration, second, minute, hour, day, week, month, year } from "chronoshift";
import { TimeRange } from "plywood";
import {
  prependDays, appendDays, datesEqual, monthToWeeks, shiftOneDay, getWallTimeMonth,
  getWallTimeDay, wallTimeInclusiveEndEqual
} from "../../utils/date/date";
import { classNames } from "../../utils/dom/dom";
import { getLocale } from "../../config/constants";
import { SvgIcon } from "../svg-icon/svg-icon";
import { DateRangeInput } from "../date-range-input/date-range-input";


export interface DateRangePickerProps extends React.Props<any> {
  startTime?: Date;
  endTime?: Date;
  maxTime?: Date;
  timezone: Timezone;
  onStartChange: (t: Date) => void;
  onEndChange: (t: Date) => void;
}

export interface DateRangePickerState {
  activeMonthStartDate?: Date;
  hoverTimeRange?: TimeRange;
  selectionSet?: boolean;
}

export class DateRangePicker extends React.Component<DateRangePickerProps, DateRangePickerState> {
  constructor() {
    super();
    this.state = {
      activeMonthStartDate: null,
      hoverTimeRange: null,
      selectionSet: false
    };
  }

  componentWillMount() {
    var { startTime, timezone } = this.props;
    if (!startTime) return;
    const flooredStart = month.floor(startTime, timezone);
    this.setState({
      activeMonthStartDate: flooredStart
    });
  }

  navigateToMonth(offset: number): void {
    const { timezone } = this.props;
    const { activeMonthStartDate } = this.state;
    var newDate = month.shift(activeMonthStartDate, timezone, offset);
    this.setState({
      activeMonthStartDate: newDate
    });
  }

  goToPreviousMonth(): void {
    return this.navigateToMonth(-1);
  }

  goToNextMonth(): void {
    return this.navigateToMonth(1);
  }

  calculateHoverTimeRange(mouseEnteredDay: Date) {
    const { startTime, endTime } = this.props;
    var hoverTimeRange: TimeRange = null;
    if (startTime && !endTime) {
      var start = startTime;
      var end = mouseEnteredDay;
      // if mousing over backwards, set end to old start time
      if (mouseEnteredDay < startTime) {
        start = mouseEnteredDay;
        end = startTime;
      }
      hoverTimeRange = new TimeRange({ start, end, bounds: '[]' });
    }

    this.setState({ hoverTimeRange });
  }

  selectNewStart(startDate: Date, isSingleDate: boolean) {
    this.selectNewRange(startDate, null);
    this.setState({ selectionSet: isSingleDate });
  }

  selectNewRange(startDate: Date, endDate?: Date) {
    const { onStartChange, onEndChange, timezone } = this.props;
    onStartChange(startDate);
    // real end points are exclusive so +1 full day to selection (which is floored) to get the real end point
    if (endDate) endDate = shiftOneDay(endDate, timezone);
    onEndChange(endDate);
  }

  selectDay(selection: Date): void {
    const { startTime, endTime } = this.props;
    if (!startTime) return;

    if (endTime) {
      this.calculateHoverTimeRange(selection);
      this.selectNewStart(selection, false);
    } else {
      const isDoubleClickSameDay = datesEqual(selection, startTime);
      if (isDoubleClickSameDay) {
        this.selectNewStart(startTime, true);
        return;
      }
      const isBackwardSelection = selection < startTime;
      if (isBackwardSelection) {
        this.selectNewRange(selection, startTime);
        return;
      }
      this.selectNewRange(startTime, selection);
    }
  }

  getIsSelectable(date: Date): boolean {
    const { hoverTimeRange, selectionSet } = this.state;
    var inHoverTimeRange = false;
    if (hoverTimeRange) {
      inHoverTimeRange = hoverTimeRange.contains(date);
    }
    return inHoverTimeRange && !selectionSet;
  }

  getIsSelectedEdgeEnd(isSingleDate: boolean, candidate: Date) {
    if (isSingleDate) return false;
    const { startTime, endTime, timezone } = this.props;
    const candidateEndPoint = shiftOneDay(candidate, timezone);
    // everything selected from the calendar will have been processed and be a round date.
    // take care of dates coming from preset or timezone or maybe even hash
    const isEndTimeNotRound = day.floor(endTime, timezone).valueOf() !== endTime.valueOf();
    const currentEndPoint = isEndTimeNotRound ? shiftOneDay(day.floor(endTime, timezone), timezone) : endTime;
    return wallTimeInclusiveEndEqual(currentEndPoint, candidateEndPoint, timezone) && endTime > startTime;
  }

  renderDays(weeks: Date[][], monthStart: Date, isSingleDate: boolean): JSX.Element[] {
    const { startTime, endTime, maxTime, timezone } = this.props;
    const nextMonthStart =  month.shift(monthStart, timezone, 1);

    return weeks.map((daysInWeek: Date[], row: number) => {
      return <div className="week" key={row}> { daysInWeek.map((dayDate: Date, column: number) => {
        var isPast = dayDate < monthStart;
        var isFuture = dayDate >= nextMonthStart;
        var isBeyondMaxRange = dayDate > maxTime;
        var isSelectedEdgeStart = datesEqual(dayDate, day.floor(startTime, timezone));
        var isSelectedEdgeEnd = this.getIsSelectedEdgeEnd(isSingleDate, dayDate);
        var className = classNames("day", "value",
          {
            past: isPast,
            future: isFuture,
            "beyond-max-range": isBeyondMaxRange,
            "selectable": this.getIsSelectable(dayDate),
            "selected": startTime < dayDate && dayDate < endTime,
            "selected-edge": isSelectedEdgeStart || isSelectedEdgeEnd
          });

        return <div
          className={className}
          key={column}
          onClick={this.selectDay.bind(this, dayDate)}
          onMouseEnter={this.calculateHoverTimeRange.bind(this, dayDate)}
        >{getWallTimeDay(dayDate, timezone)}</div>;
      })}</div>;
    });
  };

  renderCalendar(startDate: Date, isSingleDate: boolean): JSX.Element[] {
    const { timezone } = this.props;
    var weeks: Date[][] = monthToWeeks(startDate, timezone);
    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];
    const countPrepend = 7 - firstWeek.length;
    const countAppend = 7 - lastWeek.length;
    weeks[0] = prependDays(timezone, firstWeek, countPrepend);
    weeks[weeks.length - 1] = appendDays(timezone, lastWeek, countAppend);
    return this.renderDays(weeks, startDate, isSingleDate);
  }

  renderCalendarNav(startDate: Date): JSX.Element {
    const { timezone } = this.props;

    return <div className="calendar-nav">
      <div
        className='caret left'
        onClick={this.goToPreviousMonth.bind(this)}
      >
        <SvgIcon svg={require('../../icons/full-caret-left.svg')}/>
      </div>
      { getWallTimeMonth(startDate, timezone) }
      <div
        className='caret right'
        onClick={this.goToNextMonth.bind(this)}
      >
        <SvgIcon svg={require('../../icons/full-caret-right.svg')}/>
      </div>
    </div>;
  }

  render() {
    const { startTime, endTime, timezone, onStartChange, onEndChange } = this.props;
    const { activeMonthStartDate } = this.state;
    if (!activeMonthStartDate) return null;

    var isSingleDate = endTime === null || datesEqual(startTime, day.floor(endTime, timezone));
    return <div className="date-range-picker">
      <div className="side-by-side">
        <DateRangeInput type="start" time={startTime} timezone={timezone} onChange={onStartChange.bind(this)}/>
        <DateRangeInput type="end" time={endTime} timezone={timezone} onChange={onEndChange.bind(this)} hide={isSingleDate}/>
      </div>
      <div className="calendar" ref="calendar">
        {this.renderCalendarNav(activeMonthStartDate)}
        <div className="week">
          { getLocale().shortDays.map((day, i) => {
              return <div className="day label" key={day + i}><span className="space"/>{day}</div>;
            })
          }
        </div>
        {this.renderCalendar(activeMonthStartDate, isSingleDate)}
      </div>
    </div>;
  }
}
