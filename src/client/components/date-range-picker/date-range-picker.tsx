require('./date-range-picker.css');

import * as React from "react";
import { Timezone, WallTime, Duration, minute, hour, day, week, month, year } from "chronoshift";
import { TimeRange } from "plywood";
import { formatFullMonthAndYear, prependDays, appendDays, wallTimeDaysEqual,
  getEndWallTimeInclusive, monthToWeeks, wallTimeHelper } from "../../utils/date/date";
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

  selectNewStart(startDate: Date, isSingleDate: boolean) {
    this.selectNewRange(startDate, null);
    this.setState({ selectionSet: isSingleDate });
  }

  selectNewRange(startDate: Date, endDate?: Date) {
    const { onStartChange, onEndChange } = this.props;
    onStartChange(startDate);
    onEndChange(endDate);
  }

  selectDay(selection: Date): void {
    const { startTime, endTime, timezone } = this.props;
    const timezoneString = timezone.toString();
    if (!startTime) return;
    const selectionFloored = day.floor(selection, timezone);

    if (endTime) {
      const isEndDayClick = wallTimeDaysEqual(selection, getEndWallTimeInclusive(endTime, timezone), timezoneString)
        && !wallTimeDaysEqual(startTime, endTime, timezoneString);
      if (isEndDayClick) return;
      this.selectNewStart(selectionFloored, false);
    } else {
      const isDoubleClickSameDay = wallTimeDaysEqual(selection, startTime, timezoneString);
      if (isDoubleClickSameDay) {
        this.selectNewStart(selection, true);
        return;
      }
      const isBackwardSelection = selection < startTime;
      if (isBackwardSelection) {
        var endFromOldStart = day.ceil(new Date(startTime.valueOf() + 1), timezone);
        var endWallTime = wallTimeHelper(endFromOldStart, timezoneString);
        this.selectNewRange(selectionFloored, endWallTime);
      } else {
        this.selectNewRange(startTime, wallTimeHelper(day.ceil(selection, timezone), timezoneString));
      }
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

  getIsSelectedEdgeEnd(isSingleDate: boolean, candidate: Date) {
    if (isSingleDate) return false;
    const { startTime, endTime, timezone } = this.props;
    const wallTimeInclusiveEnd = getEndWallTimeInclusive(endTime, timezone);
    return wallTimeDaysEqual(candidate, wallTimeInclusiveEnd, timezone.toString()) && endTime > startTime;
  }

  renderDays(weeks: Date[][], prependEndCol: number, appendStartCol: number, isSingleDate: boolean): JSX.Element[] {
    const { startTime, endTime, maxTime, timezone } = this.props;
    const tzString = timezone.toString();
    return weeks.map((daysInWeek: Date[], row: number) => {
      return <div className="week" key={row}> { daysInWeek.map((dayDate: Date, column: number) => {
        var isPast = row === 0 && column < prependEndCol;
        var isFuture = row === weeks.length - 1 && column >= appendStartCol;
        var isBeyondMaxRange = dayDate > maxTime;
        var isSelectedEdgeStart = wallTimeDaysEqual(dayDate, startTime, tzString);
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
        >{dayDate.getUTCDate()}</div>;
      })}</div>;
    });
  };

  renderCalendar(startDate: Date, isSingleDate: boolean): JSX.Element[] {
    const { timezone } = this.props;
    var weeks: Date[][] = monthToWeeks(startDate, timezone.toString());
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
    var isSingleDate = endTime === null;
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
