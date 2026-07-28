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

/** Coerce API / jsonb summary or definition payloads to a single string for [[Sense]]. */
export function pickLocalizedText(val: any): string | undefined {
    if (val == null) return undefined;
    if (typeof val === "string") return val;
    if (typeof val === "object") {
        const v = val as Record<string, string>;
        return v.en ?? v[Object.keys(v)[0]];
    }
    return undefined;
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

/**
 * Convert display text to a normalized entry key.
 * Display text may include accents (jalapeño); the entry key does not (JALAPENO).
 * Numerals are preserved.
 */
export function displayTextToEntry(text: string): string {
  /** Latin letters that don't fully decompose via NFD → ASCII base. */
  const accentFrom =
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝŸàáâãäåæçèéêëìíîïðñòóôõöøùúûüýÿāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįıĵķĺļľŀłńņňŋōŏőœŕřśŝşšţťŧũūŭůűųŵŷỹẽĨŨỸ';
  const accentTo =
    'AAAAAAACEEEEIIIIDNOOOOOOUUUUYYaaaaaaaceeeeiiiidnoooooouuuuyyaaaccccddeeeeegggghhiiiiijklllllnnnnoooorrsssstttuuuuuuwyyeIUY';
  const accentMap = new Map([...accentFrom].map((ch, i) => [ch, accentTo[i]]));

  const nfdStripped = text.normalize('NFD').replace(/\p{M}/gu, '');
  let stripped = '';
  for (const ch of nfdStripped) {
    stripped += accentMap.get(ch) ?? ch;
  }
  return stripped.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
