require('./date-input.css');

import * as React from 'react';
import { Timezone, WallTime } from 'chronoshift';

export interface DateInputProps extends React.Props<any> {
  time: Date;
  timezone: Timezone;
  onChange: (t: Date) => void;
  hide?: boolean;
  type?: string;
}

export interface DateInputState {
  dateString?: string;
}

export class DateInput extends React.Component<DateInputProps, DateInputState> {

  constructor() {
    super();
    this.state = {
      dateString: ''
    };

  }

  // 2015-09-23T17:42:57.636Z
  // 2015-09-23 17:42

  componentDidMount() {
    var { time, timezone } = this.props;
    this.updateStateFromTime(time, timezone);
  }

  componentWillReceiveProps(nextProps: DateInputProps) {
    var { time, timezone } = nextProps;
    this.updateStateFromTime(time, timezone);
  }

  updateStateFromTime(time: Date, timezone: Timezone) {
    if (!time) return;
    if (isNaN(time.valueOf())) {
      this.setState({
        dateString: ''
      });
      return;
    }

    var adjTime = WallTime.UTCToWallTime(time, timezone.toString());
    var timeISO = adjTime.toISOString().replace(/:\d\d(\.\d\d\d)?Z?$/, '').split('T');
    this.setState({
      dateString: timeISO[0]
    });
  }

  dateChange(e: KeyboardEvent) {
    var dateString = (e.target as HTMLInputElement).value.replace(/[^\d-]/g, '').substr(0, 10);
    this.setState({
      dateString
    });

    if (dateString.length === 10) {
      this.changeDate(dateString);
    }
  }

  changeDate(possibleDateString: string): void {
    var { timezone, onChange, type } = this.props;
    var possibleDate = new Date(possibleDateString);
    // add one if end so it passes the inclusive formatting
    var day = type === "end" ? possibleDate.getUTCDate() + 1 : possibleDate.getUTCDate();

    if (isNaN(possibleDate.valueOf())) {
      onChange(null);
    } else {
      // Convert from WallTime to UTC
      var possibleDate = WallTime.WallTimeToUTC(
        timezone.toString(),
        possibleDate.getUTCFullYear(), possibleDate.getUTCMonth(), day,
        possibleDate.getUTCHours(), possibleDate.getUTCMinutes(), possibleDate.getUTCSeconds(),
        possibleDate.getUTCMilliseconds()
      );

      onChange(possibleDate);
    }
  }

  render() {
    const { hide } = this.props;
    const { dateString } = this.state;
    const value = hide ? '' : dateString;

    return <div className="date-input">
      <input className="input-field" value={value} onChange={this.dateChange.bind(this)}/>
    </div>;
  }
}
