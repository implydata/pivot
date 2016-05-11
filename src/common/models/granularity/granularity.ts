import { TimeBucketAction, NumberBucketAction, ActionJS, Action } from 'plywood';
import { hasOwnProperty } from '../../../common/utils/general/general';

export type Granularity = TimeBucketAction | NumberBucketAction;
export type GranularityJS = string | number | ActionJS

export function granularityFromJS(input: GranularityJS): Granularity {
  if (typeof input === 'number') return NumberBucketAction.fromJS({ size: input });
  if (typeof input === 'string') {
    return TimeBucketAction.fromJS({ duration: input });
  }

  if (typeof input === "object") {
    if (hasOwnProperty(input, 'duration')) return TimeBucketAction.fromJS(input);
    return NumberBucketAction.fromJS(input as ActionJS);
  }

  throw new Error(`input should be of type number, string, or ActionJS`);
}

export function granularityToString(input: Granularity): string {
  if (input instanceof TimeBucketAction) {
    return input.duration.toString();
  } else if (input instanceof NumberBucketAction) {
    return input.size.toString();
  }

  throw new Error(`unrecognized granularity: must be of type TimeBucketAction or NumberBucketAction`);
}

export function granularityEquals(g1: Granularity, g2: Granularity) {
  return (g1 as Action).equals(g2 as Action);
}
