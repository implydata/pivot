export function get(key: string): any {
  let value: any;

  try {
    value = localStorage[key];
  } catch (e) {
    return undefined;
  }

  if (value) {
    try {
      value = JSON.parse(value);
      return value;
    } catch (e) {
      return undefined;
    }
  }

  return undefined;
}

export function set(key: string, value: any) {
  try {
    localStorage[key] = JSON.stringify(value);
  } catch (e) {}
}
