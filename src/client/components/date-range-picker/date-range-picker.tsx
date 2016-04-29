require('./date-range-picker.css');

import * as React from "react";
import { Timezone, WallTime, Duration, minute, hour, day, week, month, year } from "chronoshift";
import { TimeRange } from "plywood";
import {
  formatFullMonthAndYear,
  prependDays,
  appendDays,
  daysEqualWallTime,
  getEndWallTimeInclusive,
  prepareWeeks,
  wallTimeHelper
} from "../../utils/date/date";
import { classNames } from "../../utils/dom/dom";
import { getLocale } from "../../config/constants";
import { SvgIcon } from "../svg-icon/svg-icon";
import { DateInput } from "../date-input/date-input";


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
    var { startTime } = this.props;
    if (!startTime) return;
    if (isNaN(startTime.valueOf())) {
      this.setState({
        activeMonthStartDate: null
      });
      return;
    }

    this.setState({
      activeMonthStartDate: startTime
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
      hoverTimeRange = new TimeRange({ start, end });
    }

    this.setState({ hoverTimeRange });
  }

  selectDay(selection: Date): void {
    const { onStartChange, onEndChange, startTime, endTime, timezone } = this.props;
    const tzString = timezone.toString();
    var startFloored = day.floor(selection, timezone);
    if (!startTime) return;

    if (endTime) {
      // clicking on end date of range should do nothing
      if (daysEqualWallTime(selection, getEndWallTimeInclusive(endTime, timezone), tzString) && !daysEqualWallTime(startTime, endTime, tzString)) {
        return;
      }
      // clicking outside of time range starts new selection
      this.setState({ selectionSet: false });
      onStartChange(startFloored);
      onEndChange(null);
    } else {

      // double click same day
      if (daysEqualWallTime(selection, startTime, tzString)) {
        onStartChange(selection);
        onEndChange(null);
        this.setState({ selectionSet: true });
        return;
      }
      var end = day.ceil(selection, timezone);
      var endWallTime = wallTimeHelper(end, tzString);
      // if selected backwards, set end to old start time
      if (selection < startTime) {
        onStartChange(day.floor(selection, timezone));
        // shift one day forward to account for the fact that getting inclusive endTime will subtract into previous day.. todo revisit this
        var newEnd = day.ceil(day.shift(startTime, timezone, 1), timezone);
        endWallTime = wallTimeHelper(newEnd, tzString);
      }
      onEndChange(endWallTime);
    }
  }

  getIsSelectable(date: Date): boolean {
    const { hoverTimeRange, selectionSet } = this.state;
    var inHoverTimeRange = false;
    if (hoverTimeRange) {
      inHoverTimeRange = (date > hoverTimeRange.start) && date < hoverTimeRange.end;
    }
    return inHoverTimeRange && !selectionSet;
  }

  renderDays(weeks: Date[][], prependEndCol: number, appendStartCol: number, singleDate: boolean): JSX.Element[] {
    const { startTime, endTime, maxTime, timezone } = this.props;
    const tzString = timezone.toString();
    return weeks.map((daysInWeek: Date[], row: number) => {
      return <div className="week" key={row}> { daysInWeek.map((dayDate: Date, column: number) => {
        var past = row === 0 && column < prependEndCol;
        var future = row === weeks.length - 1 && column >= appendStartCol;
        var beyondMaxRange = dayDate > maxTime;
        var selectedEdgeStart = daysEqualWallTime(dayDate, startTime, tzString);
        var selectedEdgeEnd = singleDate ? false : daysEqualWallTime(dayDate, getEndWallTimeInclusive(endTime, timezone), tzString) && endTime > startTime;
        var className = classNames("day", "value",
          {
            past,
            future,
            "beyond": beyondMaxRange,
            "selectable": this.getIsSelectable(dayDate),
            "selected": startTime < dayDate && dayDate < endTime,
            "selected-edge": selectedEdgeStart || selectedEdgeEnd
          });
        return <div
          className={className}
          key={column}
          onClick={this.selectDay.bind(this, dayDate)}
          onMouseEnter={this.calculateHoverTimeRange.bind(this, dayDate)}
        >{dayDate.getUTCDate()}</div>;
      })}</div>;
    });
  };

  renderCalendar(startDate: Date, isSingleDate: boolean): JSX.Element[] {
    const { timezone } = this.props;
    var weeks: Date[][] = prepareWeeks(startDate, timezone.toString());
    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];
    const countPrepend = 7 - firstWeek.length;
    const countAppend = 7 - lastWeek.length;
    weeks[0] = prependDays(timezone, firstWeek, countPrepend);
    weeks[weeks.length - 1] = appendDays(timezone, lastWeek, countAppend);
    return this.renderDays(weeks, countPrepend, 7 - countAppend, isSingleDate);
  }

  renderCalendarNav(startDate: Date): JSX.Element {
    const { maxTime, timezone } = this.props;
    const startMonth = startDate.getMonth();
    const maxMonth = maxTime.getMonth();
    const wallTime = WallTime.UTCToWallTime(startDate, timezone.toString());

    return <div className="calendar-nav">
      <div
        className={classNames('caret', 'left', {'disabled': startMonth - 1 > maxMonth })}
        onClick={this.goToPreviousMonth.bind(this)}
      >
        <SvgIcon svg={require('../../icons/full-caret-left.svg')}/>
      </div>
      { `${formatFullMonthAndYear(wallTime)} ` }
      <div
        className={classNames('caret', 'right', {'disabled': startMonth + 1 > maxMonth })}
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
    var endTimeInclusive = endTime ? (getEndWallTimeInclusive(endTime, timezone) as any)['wallTime'] : null;
    var isSingleDate = endTime === null || daysEqualWallTime(activeMonthStartDate, endTimeInclusive, timezone.toString());
    return <div className="date-range-picker">
      <div className="side-by-side">
        <DateInput type="start" time={startTime} timezone={timezone} onChange={onStartChange.bind(this)}/>
        <DateInput type="end" time={endTimeInclusive} timezone={timezone} onChange={onEndChange.bind(this)} hide={isSingleDate}/>
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
