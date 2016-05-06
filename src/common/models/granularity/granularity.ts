import { Duration, NumberRange, NumberRangeJS } from 'plywood';
import { hasOwnProperty } from 'immutable-class';
export type Granularity = Duration | NumberRange;
export type GranularityJS = string | NumberRangeJS

export function fromJS(input: GranularityJS): Granularity {
  // bad way to check 
  if (input.hasOwnProperty('bounds')) return NumberRange.fromJS((input as NumberRangeJS));
  return Duration.fromJS((input as string));
}
