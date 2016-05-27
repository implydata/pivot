export function minToAny(): number {
  return null;
}

export function maxToAny(): number {
  return null;
}

export function isStartAny(start: number) {
  return start === null;
}

export function isEndAny(end: number) {
  return end === null;
}

export function isBeyondMin(min: number, start: number) {
  return min && start < min && Math.abs(min - start) > 1;
}

export function isBeyondMax(max: number, end: number) {
  return max && end > max && (Math.abs(end - max)) > 1;
}

export function getNumberOfWholeDigits(n: number) {
  return Math.floor(Math.log(n) / Math.log(10)) + 1;
}
