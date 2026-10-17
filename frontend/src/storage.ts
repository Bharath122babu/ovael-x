/**
 * Safe browser storage wrapper that never throws when localStorage or sessionStorage
 * is disabled, blocked, in a restricted iframe, or in Safari private mode.
 */

type StorageType = "local" | "session";

const memoryFallback: Record<StorageType, Map<string, string>> = {
  local: new Map<string, string>(),
  session: new Map<string, string>(),
};

function getStorage(type: StorageType): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const storage = type === "local" ? window.localStorage : window.sessionStorage;
    if (!storage) return null;
    const testKey = "__ovael_test_probe__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getItem(key: string, type: StorageType = "local"): string | null {
    try {
      const storage = getStorage(type);
      if (storage) return storage.getItem(key);
    } catch {
      // Storage access blocked or restricted
    }
    return memoryFallback[type].get(key) ?? null;
  },

  setItem(key: string, value: string, type: StorageType = "local"): void {
    try {
      const storage = getStorage(type);
      if (storage) {
        storage.setItem(key, value);
        return;
      }
    } catch {
      // Storage quota exceeded or access blocked
    }
    memoryFallback[type].set(key, value);
  },

  removeItem(key: string, type: StorageType = "local"): void {
    try {
      const storage = getStorage(type);
      if (storage) {
        storage.removeItem(key);
        return;
      }
    } catch {
      // Storage access blocked
    }
    memoryFallback[type].delete(key);
  },

  clear(type: StorageType = "local"): void {
    try {
      const storage = getStorage(type);
      if (storage) {
        storage.clear();
        return;
      }
    } catch {
      // Storage access blocked
    }
    memoryFallback[type].clear();
  },
};
