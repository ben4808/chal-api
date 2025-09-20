// https://stackoverflow.com/questions/38416020/deep-copy-in-es6-using-the-spread-syntax
export function deepClone(obj: any): any {
    if(typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if(obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if(obj instanceof Map) {
        return new Map(Array.from(obj.entries()));
    }

    if(obj instanceof Array) {
        return obj.reduce((arr, item, i) => {
            arr[i] = deepClone(item);
            return arr;
        }, []);
    }

    if(obj instanceof Object) {
        return Object.keys(obj).reduce((newObj: any, key) => {
            newObj[key] = deepClone(obj[key]);
            return newObj;
        }, {})
    }
}

export function mapKeys<TKey, TVal>(map: Map<TKey, TVal>): TKey[] {
    return Array.from(map.keys()) || [];
}

export function mapValues<TKey, TVal>(map: Map<TKey, TVal>): TVal[] {
    return Array.from(map.values()) || [];
}

export function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
}

export function generateId(): string {
    let charPool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
    let id = "";
    for (let i=0; i<11; i++) {
        id += charPool[getRandomInt(64)];
    }
    return id;
}

export function displayTextToEntry(text: string): string {
  // Convert display text to entry format
  return text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function convertObjectToMap<T extends Record<string, any>>(obj: T): Map<string, any> {
  const map = new Map<string, any>();
  for (const key in obj) {
    // Ensure the key is an own property of the object
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      map.set(key, obj[key]);
    }
  }
  return map;
}

export function deepConvertToObject(data: any): any {
  // If the data is a Map, convert it to an object
  if (data instanceof Map) {
    const obj: Record<string, any> = {};
    for (const [key, value] of data.entries()) {
      obj[key] = deepConvertToObject(value);
    }
    return obj;
  }
  
  // If the data is an array, convert its contents
  if (Array.isArray(data)) {
    return data.map(item => deepConvertToObject(item));
  }
  
  // If the data is a plain object, iterate over its properties
  if (typeof data === 'object' && data !== null) {
    const obj: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        obj[key] = deepConvertToObject(data[key]);
      }
    }
    return obj;
  }

  // Otherwise, return the primitive value as is
  return data;
}
