interface SafeMMKV {
  set: (key: string, value: string | number | boolean | Uint8Array) => void;
  getString: (key: string) => string | undefined;
  getNumber: (key: string) => number | undefined;
  getBoolean: (key: string) => boolean | undefined;
  delete: (key: string) => void;
  clearAll: () => void;
  getAllKeys: () => string[];
}

class MemoryStorage implements SafeMMKV {
  private storage = new Map<string, any>();

  set(key, value) {
    this.storage.set(key, value);
  }

  getString(key: string) {
    const val = this.storage.get(key);
    return typeof val === 'string' ? val : undefined;
  }

  getNumber(key: string) {
    const val = this.storage.get(key);
    return typeof val === 'number' ? val : undefined;
  }

  getBoolean(key: string) {
    const val = this.storage.get(key);
    return typeof val === 'boolean' ? val : undefined;
  }

  delete(key: string) {
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
export function createSafeMMKV(options: { id: string }): SafeMMKV {
  try {
    const { MMKV } = require('react-native-mmkv');
    return new MMKV(options);
  } catch (e) {
    console.warn(`[SafeMMKV] Native module not available for ${options.id}, using memory storage. Rebuild APK to enable persistence.`);
    return new MemoryStorage();
  }
}
