import { Duration, NumberRange, NumberRangeJS } from 'plywood';
export type Granularity = Duration | NumberRange;
export type GranularityJS = string | NumberRangeJS

export function fromJS(input: GranularityJS): Granularity {
  // typescript doesn't like this?
  /* if (input instanceof NumberRangeJS) {} */
  // workaround
  if (typeof input === 'object') return NumberRange.fromJS((input as NumberRangeJS));
  return Duration.fromJS((input as string));
}
