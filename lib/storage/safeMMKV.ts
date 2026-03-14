class MemoryStorage {
  private storage = new Map();

  set(key = '', value = '') {
    if (typeof key !== 'string') throw new Error('Key must be a string');
    const valueType = typeof value;
    const isUint8Array = value !== null && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Uint8Array]';
    const isValidValue = valueType === 'string' || valueType === 'number' || valueType === 'boolean' || isUint8Array;
    if (!isValidValue) throw new Error('Value must be string, number, boolean, or Uint8Array');
    this.storage.set(key, value);
  }

  getString(key = '') {
    if (typeof key !== 'string') throw new Error('Key must be a string');
    const val = this.storage.get(key);
    return typeof val === 'string' ? val : undefined;
  }

  getNumber(key = '') {
    if (typeof key !== 'string') throw new Error('Key must be a string');
    const val = this.storage.get(key);
    return typeof val === 'number' ? val : undefined;
  }

  getBoolean(key = '') {
    if (typeof key !== 'string') throw new Error('Key must be a string');
    const val = this.storage.get(key);
    return typeof val === 'boolean' ? val : undefined;
  }

  delete(key = '') {
    if (typeof key !== 'string') throw new Error('Key must be a string');
    this.storage.delete(key);
  }

  clearAll() {
    this.storage.clear();
  }

  getAllKeys() {
    return Array.from(this.storage.keys());
  }
}

/**
 * A safe wrapper around MMKV that falls back to memory storage
 * if the native module isn't available (common when APK hasn't been rebuilt).
 */
export function createSafeMMKV(options = { id: '' }) {
  if (!options || typeof options !== 'object') throw new Error('Options must be an object');
  const id = options['id'];
  if (typeof id !== 'string') throw new Error('Options.id must be a string');
  try {
    const { MMKV } = require('react-native-mmkv');
    return new MMKV(options);
  } catch (e) {
    console.warn(`[SafeMMKV] Native module not available for ${id}, using memory storage. Rebuild APK to enable persistence.`);
    return new MemoryStorage();
  }
}
