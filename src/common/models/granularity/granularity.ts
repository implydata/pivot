import { TimeBucketAction, NumberBucketAction, ActionJS, Action, ActionValue, TimeRange, NumberRange, Duration, PlywoodRange } from 'plywood';
import { day, hour } from 'chronoshift';

import { hasOwnProperty, findFirstBiggerIndex, findExactIndex, findMaxValueIndex, findMinValueIndex } from '../../../common/utils/general/general';
import { getTickDuration } from '../../../common/utils/time/time';

interface Preset {
  granularities: Granularity[];
  checkPoints?: number[];
  bigCheckPoints?: number[];
  goldenGranularities?: Granularity[];
  defaultGranularities?: Granularity[];
  defaultGranularity: Granularity;
  minGranularity: Granularity;
}

const PRESETS: Lookup<Preset> = {
  time: {
    granularities: ['PT1S', 'PT1M', 'PT5M', 'PT15M', 'PT1H', 'PT6H', 'PT8H', 'PT12H', 'P1D', 'P1W', 'P1M', 'P3M', 'P6M', 'P1Y', 'P2Y'].map(granularityFromJS),
    checkPoints: [ 95 * day.canonicalLength, 8 * day.canonicalLength, 8 * hour.canonicalLength, 3 * hour.canonicalLength],
    goldenGranularities: ['P1W', 'P1D', 'PT1H', 'PT5M', 'PT1M'].map(granularityFromJS),
    defaultGranularities: ['PT1M', 'PT5M', 'PT1H', 'P1D', 'P1W'].map(granularityFromJS),
    defaultGranularity: granularityFromJS('P1D'),
    minGranularity: granularityFromJS('PT1M')
  },

  number: {
    granularities: [1, 5, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000].map(granularityFromJS),
    checkPoints: [1, 10, 100, 500, 1000, 10000],
    defaultGranularities: [1, 5, 10, 100, 1000, 10000].map(granularityFromJS),
    defaultGranularity: granularityFromJS(10),
    minGranularity: granularityFromJS(1)
  }
};

export type Granularity = TimeBucketAction | NumberBucketAction;
export type GranularityJS = string | number | ActionJS;
export type BucketUnit = Duration | number;

function getBucketSize(input: Granularity): number {
  if (input instanceof TimeBucketAction) return input.duration.getCanonicalLength();
  if (input instanceof NumberBucketAction) return input.size;
  throw new Error(`unrecognized granularity: ${input} must be of type TimeBucketAction or NumberBucketAction`);
}

function getBucketUnit(input: Granularity): BucketUnit {
  if (input instanceof TimeBucketAction) return input.duration;
  if (input instanceof NumberBucketAction) return input.size;
  throw new Error(`unrecognized granularity: ${input} must be of type TimeBucketAction or NumberBucketAction`);
}

function bucketUnitToGranularity(input: BucketUnit): Granularity {
  if (input instanceof Duration) {
    return new TimeBucketAction({ duration: input });
  } else if (!isNaN(input)) {
    return new NumberBucketAction({ size: input, offset: 0 });
  }
  throw new Error(`unrecognized bucket unit: ${input} must be of type number or Duration`);
}

function startValue(input: PlywoodRange): number {
  return input instanceof TimeRange ? input.start.valueOf() : input.start as number;
}

function endValue(input: PlywoodRange): number {
  return input instanceof TimeRange ? input.end.valueOf() : input.end as number;
}

function getTickNumber(numberRange: NumberRange): number {
  var len = numberRange.end.valueOf() - numberRange.start.valueOf();
  return Math.floor(len / 10);
}

function findBestMatch(array: Granularity[], target: Granularity) {
  var exactMatch = findExactIndex(array, target, getBucketSize);
  if (exactMatch !== -1) {
    return array[exactMatch];
  }
  var minBiggerIdx = findFirstBiggerIndex(array, target, getBucketSize);
  if (minBiggerIdx !== -1) {
    return array[minBiggerIdx];
  }
  return array[findMaxValueIndex(array, getBucketSize)];
}

function generateGranularitySet(allGranularities: Granularity[], bucketedBy: Granularity) {
  var start = findFirstBiggerIndex(allGranularities, bucketedBy, getBucketSize);
  var length = 5;
  var returnGranularities = allGranularities.slice(start, start + length);
  // makes sure the bucket is part of the list
  if (findExactIndex(returnGranularities, bucketedBy, getBucketSize) === -1) {
    returnGranularities = [bucketedBy].concat(returnGranularities.slice(0, returnGranularities.length - 1));
  }

  return returnGranularities;
}


export function granularityFromJS(input: GranularityJS): Granularity {
  if (typeof input === 'number') return NumberBucketAction.fromJS({ size: input });
  if (typeof input === 'string') return TimeBucketAction.fromJS({ duration: input });

  if (typeof input === "object") {
    if (!hasOwnProperty(input, 'action')) {
      throw new Error(`could not recognize object as action`);
    }
    return (Action.fromJS(input as GranularityJS) as Granularity);
  }
  throw new Error(`input should be of type number, string, or action`);
}

export function granularityToString(input: Granularity): string {
  if (input instanceof TimeBucketAction) {
    return input.duration.toString();
  } else if (input instanceof NumberBucketAction) {
    return input.size.toString();
  }

  throw new Error(`unrecognized granularity: ${input} must be of type TimeBucketAction or NumberBucketAction`);
}

export function granularityEquals(g1: Granularity, g2: Granularity) {
  if (!Boolean(g1) === Boolean(g2)) return false;
  if (g1 === g2 ) return true;
  return (g1 as Action).equals(g2 as Action);
}

export function granularityToJS(input: Granularity): GranularityJS {
  var js = input.toJS();

  if (js.action === 'timeBucket') {
    if (Object.keys(js).length === 2) return js.duration;
  }

  if (js.action === 'numberBucket') {
    if (Object.keys(js).length === 2) return js.size;
  }

  return js;
}

export function updateBucketSize(existing: Granularity, newInput: Granularity): Granularity {
  if (newInput instanceof TimeBucketAction) {
    return new TimeBucketAction({
      duration: (newInput as TimeBucketAction).duration,
      timezone: (existing as TimeBucketAction).timezone
    });
  } else if (newInput instanceof NumberBucketAction) {
    var value: ActionValue = { size: (newInput as NumberBucketAction).size };
    if ((existing as NumberBucketAction).offset) value.offset = (existing as NumberBucketAction).offset;
    return new NumberBucketAction(value);
  }
  throw new Error(`unrecognized granularity: ${newInput} must be of type TimeBucket or NumberBucket`);
}

export function getGranularities(kind: string, bucketedBy?: Granularity): Granularity[] {
  if (!bucketedBy) return PRESETS[kind]['defaultGranularities'];

  // make list that makes most sense with bucket
  var allGranularities = PRESETS[kind]['granularities'];
  return generateGranularitySet(allGranularities, bucketedBy);
}

export function getDefaultGranularityForKind(kind: string, bucketedBy?: Granularity): Granularity {
  if (bucketedBy) return bucketedBy;
  return PRESETS[kind]['defaultGranularity'];
}

export function getBestGranularityForRange(inputRange: PlywoodRange, bucketedBy?: Granularity, customGranularities?: Granularity[]): Granularity {
  return bucketUnitToGranularity(getBestBucketUnitForRange(inputRange, bucketedBy, customGranularities));
}

export function getBestBucketUnitForRange(inputRange: PlywoodRange, bucketedBy?: Granularity, customGranularities?: Granularity[]): BucketUnit {
  var rangeLength = endValue(inputRange) - startValue(inputRange);
  var isTime = inputRange instanceof TimeRange;
  var lookup = isTime ? PRESETS['time'] : PRESETS['number'];
  var bucketLength = bucketedBy ? getBucketSize(bucketedBy) : 0;
  var checkPoints = lookup.checkPoints;

  for (var i = 0; i < checkPoints.length; i++) {
    var checkPoint = checkPoints[i];
    if (rangeLength > checkPoint || bucketLength > checkPoint) {
      if (bucketedBy) {
        var granArray = customGranularities || getGranularities(isTime ? 'time' : 'number', bucketedBy);
        var biggerThanBucketed =  findFirstBiggerIndex(granArray, bucketedBy, getBucketSize);
        // this could happen if bucketedBy were 1Y
        if (biggerThanBucketed === -1) return getBucketUnit(lookup.defaultGranularity);
        return getBucketUnit(granArray[biggerThanBucketed]);
      } else {
        var goldenGranularity = lookup.goldenGranularities[i];
        if (!customGranularities) return getBucketUnit(goldenGranularity);
        return isTime ? getBucketUnit(findBestMatch(customGranularities, goldenGranularity)) : Math.round(rangeLength / 100) * 10;
      }
    }
  }

  var minBucket: Granularity = null;
  if (customGranularities) {
    minBucket = customGranularities[findMinValueIndex(customGranularities, getBucketSize)];
  } else {
    minBucket = lookup.minGranularity;
  }
  return bucketLength > getBucketSize(minBucket) ? getBucketUnit(bucketedBy) : getBucketUnit(minBucket);
}

