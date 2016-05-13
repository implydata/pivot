var isSupported = false;

var mod = 'test';
try {
    localStorage.setItem(mod, mod);
    localStorage.removeItem(mod);
    isSupported = true;
} catch (e) {
    isSupported = false;
}

export function supported(): boolean {
  return isSupported;
}

export function get(key: string): any {
  if (!isSupported) {
    throw new Error('LocalStorage not supported');
  }

  let value = localStorage[key];

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
  if (!isSupported) {
    throw new Error('LocalStorage not supported');
  }

  localStorage[key] = JSON.stringify(value);
}
