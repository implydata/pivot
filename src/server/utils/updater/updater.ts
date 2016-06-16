import { immutableEqual } from 'immutable-class';
import { hasOwnProperty } from '../../../common/utils/general/general';

function getName(thing: any): string {
  return thing.name;
}

function noop() {}

export interface UpdatedOptions<T> {
  key?: (thing: T, index?: number) => string;
  equals?: (thingA: T, thingB: T) => boolean;
  onEnter?: (newThing: T) => void;
  onUpdate?: (newThing: T, oldThing: T) => void;
  onExit?: (oldThing: T) => void;
}

export function updater<T>(initialList: T[], updatedList: T[], updatedOptions: UpdatedOptions<T>): void {
  const key = updatedOptions.key || getName;
  const equals = updatedOptions.equals || immutableEqual;
  const onEnter = updatedOptions.onEnter || noop;
  const onUpdate = updatedOptions.onUpdate || noop;
  const onExit = updatedOptions.onExit || noop;

  var initialByKey: Lookup<T> = {};
  for (var i = 0; i < initialList.length; i++) {
    var initialThing = initialList[i];
    var initialThingKey = key(initialThing);
    if (initialByKey[initialThingKey]) throw new Error(`duplicate key '${initialThingKey}'`);
    initialByKey[initialThingKey] = initialThing;
  }

  for (var j = 0; j < updatedList.length; j++) {
    var updatedThing = updatedList[j];
    var updatedThingKey = key(updatedThing);
    var oldThing = initialByKey[updatedThingKey];
    if (oldThing) {
      if (!equals(updatedThing, oldThing)) {
        onUpdate(updatedThing, oldThing);
      }
      delete initialByKey[updatedThingKey];
    } else {
      onEnter(updatedThing);
    }
  }

  for (var k in initialByKey) {
    if (!hasOwnProperty(initialByKey, k)) continue;
    onExit(initialByKey[k]);
  }
}
