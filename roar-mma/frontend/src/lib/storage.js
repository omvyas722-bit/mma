// Storage Utility - localStorage and sessionStorage wrapper with type safety

class StorageManager {
  constructor(storage = localStorage, prefix = '') {
    this.storage = storage;
    this.prefix = prefix;
  }

  // Generate key with prefix
  getKey(key) {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  // Set item with automatic JSON serialization
  set(key, value, options = {}) {
    try {
      const fullKey = this.getKey(key);
      const data = {
        value,
        timestamp: Date.now(),
        expires: options.expires ? Date.now() + options.expires : null,
      };

      this.storage.setItem(fullKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  // Get item with automatic JSON deserialization
  get(key, defaultValue = null) {
    try {
      const fullKey = this.getKey(key);
      const item = this.storage.getItem(fullKey);

      if (!item) return defaultValue;

      const data = JSON.parse(item);

      // Check expiration
      if (data.expires && Date.now() > data.expires) {
        this.remove(key);
        return defaultValue;
      }

      return data.value;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  // Remove item
  remove(key) {
    try {
      const fullKey = this.getKey(key);
      this.storage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  // Clear all items with prefix
  clear() {
    try {
      if (this.prefix) {
        const keys = this.keys();
        keys.forEach(key => this.remove(key));
      } else {
        this.storage.clear();
      }
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  // Check if key exists
  has(key) {
    const fullKey = this.getKey(key);
    return this.storage.getItem(fullKey) !== null;
  }

  // Get all keys with prefix
  keys() {
    const keys = [];
    const prefixLength = this.prefix ? this.prefix.length + 1 : 0;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!this.prefix || key.startsWith(this.prefix + ':')) {
        keys.push(key.substring(prefixLength));
      }
    }

    return keys;
  }

  // Get all items with prefix
  getAll() {
    const items = {};
    this.keys().forEach(key => {
      items[key] = this.get(key);
    });
    return items;
  }

  // Get storage size in bytes
  getSize() {
    let size = 0;
    this.keys().forEach(key => {
      const fullKey = this.getKey(key);
      const item = this.storage.getItem(fullKey);
      if (item) {
        size += item.length + fullKey.length;
      }
    });
    return size;
  }

  // Get storage size in human-readable format
  getSizeFormatted() {
    const bytes = this.getSize();
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // Check if storage is available
  static isAvailable(storage = localStorage) {
    try {
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get remaining storage space (approximate)
  getRemainingSpace() {
    try {
      const testKey = '__test__';
      let low = 0;
      let high = 10 * 1024 * 1024; // 10MB
      let mid;

      while (low < high) {
        mid = Math.floor((low + high) / 2);
        try {
          this.storage.setItem(testKey, 'x'.repeat(mid));
          this.storage.removeItem(testKey);
          low = mid + 1;
        } catch {
          high = mid;
        }
      }

      return low;
    } catch (error) {
      return 0;
    }
  }
}

// Create default instances
export const localStorage = new StorageManager(window.localStorage, 'roar-mma');
export const sessionStorage = new StorageManager(window.sessionStorage, 'roar-mma');

// Typed storage helpers
export class TypedStorage {
  constructor(storage, key) {
    this.storage = storage;
    this.key = key;
  }

  get() {
    return this.storage.get(this.key);
  }

  set(value, options) {
    return this.storage.set(this.key, value, options);
  }

  remove() {
    return this.storage.remove(this.key);
  }

  has() {
    return this.storage.has(this.key);
  }
}

// Predefined storage keys with type safety
export const storageKeys = {
  authToken: new TypedStorage(localStorage, 'auth_token'),
  user: new TypedStorage(localStorage, 'user'),
  theme: new TypedStorage(localStorage, 'theme'),
  sidebarCollapsed: new TypedStorage(localStorage, 'sidebar_collapsed'),
  tablePreferences: new TypedStorage(localStorage, 'table_preferences'),
  recentSearches: new TypedStorage(localStorage, 'recent_searches'),
  lastVisitedPage: new TypedStorage(sessionStorage, 'last_visited_page'),
  formDraft: new TypedStorage(sessionStorage, 'form_draft'),
};

// Storage event listener
export class StorageListener {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.listeners = new Map();
    this.handleStorageEvent = this.handleStorageEvent.bind(this);
    window.addEventListener('storage', this.handleStorageEvent);
  }

  on(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  off(key, callback) {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key).filter(cb => cb !== callback);
      this.listeners.set(key, callbacks);
    }
  }

  handleStorageEvent(event) {
    if (event.storageArea !== this.storage.storage) return;

    const key = event.key;
    if (this.listeners.has(key)) {
      const newValue = event.newValue ? JSON.parse(event.newValue).value : null;
      const oldValue = event.oldValue ? JSON.parse(event.oldValue).value : null;

      this.listeners.get(key).forEach(callback => {
        callback(newValue, oldValue);
      });
    }
  }

  destroy() {
    window.removeEventListener('storage', this.handleStorageEvent);
    this.listeners.clear();
  }
}

// Cache with expiration
export class CacheStorage {
  constructor(storage = localStorage, prefix = 'cache') {
    this.storage = new StorageManager(storage, prefix);
  }

  set(key, value, ttl = 3600000) { // Default 1 hour
    return this.storage.set(key, value, { expires: ttl });
  }

  get(key, defaultValue = null) {
    return this.storage.get(key, defaultValue);
  }

  remove(key) {
    return this.storage.remove(key);
  }

  clear() {
    return this.storage.clear();
  }

  // Clean expired items
  cleanup() {
    const keys = this.storage.keys();
    keys.forEach(key => {
      this.get(key); // This will remove expired items
    });
  }
}

// Create cache instance
export const cache = new CacheStorage();

// Storage quota helper
export async function getStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2),
      available: estimate.quota - estimate.usage,
    };
  }
  return null;
}

// Migrate storage data
export function migrateStorage(oldPrefix, newPrefix) {
  const oldStorage = new StorageManager(window.localStorage, oldPrefix);
  const newStorage = new StorageManager(window.localStorage, newPrefix);

  const items = oldStorage.getAll();
  Object.entries(items).forEach(([key, value]) => {
    newStorage.set(key, value);
  });

  oldStorage.clear();
}

export default localStorage;

// @see test file for usage examples
