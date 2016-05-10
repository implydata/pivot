import { Duration, NumberRange, NumberRangeJS } from 'plywood';
export type Granularity = Duration | NumberRange;
export type GranularityJS = string | NumberRangeJS

export function fromJS(input: GranularityJS): Granularity {
  // typescript doesn't like this?: if (input instanceof NumberRangeJS) {}
  // workaround check for typeof because JSed version of Duration is just string.
  if (typeof input === 'object') return NumberRange.fromJS((input as NumberRangeJS));
  return Duration.fromJS((input as string));
}
