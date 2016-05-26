import { day, hour, minute } from 'chronoshift';
import { TimeBucketAction, NumberBucketAction, ActionJS, Action, ActionValue, TimeRange, Duration, PlywoodRange } from 'plywood';

import { hasOwnProperty, findFirstBiggerIndex, findExactIndex, findMaxValueIndex, findMinValueIndex } from '../../../common/utils/general/general';

interface Preset {
  getSupportedGranularities?: () => Granularity[];
  defaultGranularities?: Granularity[];
  bigGranularities?: Granularity[];
  granularityComputer?: GranularityComputer;
}

interface GranularityComputer {
  checkers: ((rangeLength: number, bucketLength: number) => Granularity)[];
  bigCheckers?: ((rangeLength: number, bucketLength: number) => Granularity)[];
  defaultGranularity: Granularity;
  minGranularity: Granularity;
}


var initCheck = (checkPoint: number, value?: GranularityJS) => {
  return (rangeLength: number, bucketLength: number) => {
    var returnValue = value || Math.round(rangeLength / 10) * 10;
    if (rangeLength > checkPoint || bucketLength > checkPoint) return granularityFromJS(returnValue);
    return null;
  };
};

function days(value: number) {
  return value * day.canonicalLength;
}

function hours(value: number) {
  return value * hour.canonicalLength;
}

function minutes(value: number) {
  return value * minute.canonicalLength;
}

const PRESETS: Lookup<Preset> = {
  time: {
    getSupportedGranularities: () => {
      return ['PT1S', 'PT1M', 'PT5M', 'PT15M', 'PT1H', 'PT6H', 'PT8H', 'PT12H', 'P1D', 'P1W', 'P1M', 'P3M', 'P6M', 'P1Y', 'P2Y'].map(granularityFromJS);
    },
    defaultGranularities: ['PT1M', 'PT5M', 'PT1H', 'P1D', 'P1W'].map(granularityFromJS),
    bigGranularities: ['P1M', 'P1W', 'P1D', 'PT12H', 'PT6H', 'PT1H', 'PT5M'].map(granularityFromJS),
    granularityComputer: {
      checkers: [initCheck(days(95), 'P1W'), initCheck(days(8), 'P1D'), initCheck(hours(8), 'PT1H'), initCheck(hours(3), 'PT5M')],
      bigCheckers: [
        initCheck(days(95), 'P1M'),
        initCheck(days(20), 'P1W'),
        initCheck(days(6), 'P1D'),
        initCheck(days(2), 'PT12H'),
        initCheck(hours(23), 'PT6H'),
        initCheck(hours(3), 'PT1H'),
        initCheck(minutes(30), 'PT5M')
      ],
      defaultGranularity: granularityFromJS('P1D'),
      minGranularity: granularityFromJS('PT1M')
    }
  },

  number: {
    getSupportedGranularities: () => {
      var vals: Granularity[] = [];
      for (var i = 0; i < 10; i++) {
        vals.push(granularityFromJS(Math.pow(10, i)));
      }
      return vals;
    },
    defaultGranularities: [1, 10, 50, 1000, 10000].map(granularityFromJS),
    granularityComputer: {
      checkers: [initCheck(10000), initCheck(1000), initCheck(500), initCheck(100)],
      defaultGranularity: granularityFromJS(10),
      minGranularity: granularityFromJS(1)
    }
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

export function getGranularities(kind: string, bucketedBy?: Granularity, big?: boolean): Granularity[] {
  var bigGranularities = PRESETS[kind]['bigGranularities'];
  if (!bucketedBy) return big && bigGranularities ? bigGranularities : PRESETS[kind]['defaultGranularities'];

  // make list that makes most sense with bucket
  var allGranularities = PRESETS[kind].getSupportedGranularities();
  return generateGranularitySet(allGranularities, bucketedBy);
}

export function getDefaultGranularityForKind(kind: string, bucketedBy?: Granularity): Granularity {
  if (bucketedBy) return bucketedBy;
  return PRESETS[kind].granularityComputer.defaultGranularity;
}

export function getBestGranularityForRange(inputRange: PlywoodRange, bigChecker: boolean, bucketedBy?: Granularity, customGranularities?: Granularity[]): Granularity {
  return bucketUnitToGranularity(getBestBucketUnitForRange(inputRange, bigChecker, bucketedBy, customGranularities));
}

export function getBestBucketUnitForRange(inputRange: PlywoodRange, bigChecker: boolean, bucketedBy?: Granularity, customGranularities?: Granularity[]): BucketUnit {
  var rangeLength = endValue(inputRange) - startValue(inputRange);
  var isTime = inputRange instanceof TimeRange;
  var lookup = isTime ? PRESETS['time'] : PRESETS['number'];
  var bucketLength = bucketedBy ? getBucketSize(bucketedBy) : 0;
  var helper = lookup.granularityComputer;
  var checkPoints = bigChecker && helper.bigCheckers ? helper.bigCheckers : helper.checkers;

  for (var i = 0; i < checkPoints.length; i++) {
    var check = checkPoints[i];
    var returnVal = check(rangeLength, bucketLength);
    if (returnVal !== null) {
      if (bucketedBy) {
        var granArray = customGranularities || getGranularities(isTime ? 'time' : 'number', bucketedBy);
        var biggerThanBucketed =  findFirstBiggerIndex(granArray, bucketedBy, getBucketSize);
        // this could happen if bucketedBy were very big or if custom granularities are smaller than maker action
        if (biggerThanBucketed === -1) return getBucketUnit(helper.defaultGranularity);
        return getBucketUnit(granArray[biggerThanBucketed]);
      } else {
        if (!customGranularities) return getBucketUnit(returnVal);
        return getBucketUnit(findBestMatch(customGranularities, returnVal));
      }
    }
  }

  var minBucket = customGranularities ? customGranularities[findMinValueIndex(customGranularities, getBucketSize)] : helper.minGranularity;
  var granularity = bucketLength > getBucketSize(minBucket) ? bucketedBy : minBucket;
  return getBucketUnit(granularity);
}

