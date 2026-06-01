import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('storage', () => {
  let StorageManager, TypedStorage, storageKeys, StorageListener, CacheStorage, lStorage, sStorage, cache, getStorageQuota, migrateStorage;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    const mod = await import('./storage');
    StorageManager = mod.localStorage.constructor;
    TypedStorage = mod.TypedStorage;
    storageKeys = mod.storageKeys;
    StorageListener = mod.StorageListener;
    CacheStorage = mod.CacheStorage;
    lStorage = mod.localStorage;
    sStorage = mod.sessionStorage;
    cache = mod.cache;
    getStorageQuota = mod.getStorageQuota;
    migrateStorage = mod.migrateStorage;
  });

  describe('StorageManager', () => {
    it('set and get with JSON serialize/deserialize', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      sm.set('key1', { foo: 'bar' });
      expect(sm.get('key1')).toEqual({ foo: 'bar' });
    });

    it('get returns defaultValue when key missing', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      expect(sm.get('nonexistent', 42)).toBe(42);
    });

    it('get returns defaultValue when expired', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      const past = Date.now() - 10000;
      window.localStorage.setItem('test:expkey', JSON.stringify({ value: 'old', timestamp: past - 10000, expires: past }));
      expect(sm.get('expkey', 'default')).toBe('default');
    });

    it('expired items are auto-removed on get', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      const past = Date.now() - 10000;
      window.localStorage.setItem('test:expkey', JSON.stringify({ value: 'old', timestamp: past - 10000, expires: past }));
      sm.get('expkey');
      expect(window.localStorage.getItem('test:expkey')).toBeNull();
    });

    it('remove returns true', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      sm.set('key', 'val');
      expect(sm.remove('key')).toBe(true);
    });

    it('remove returns false on error', () => {
      const faulty = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn(() => { throw new Error('fail'); }), clear: vi.fn(), key: vi.fn() };
      const sm = new StorageManager(faulty, 'test');
      expect(sm.remove('key')).toBe(false);
    });

    it('clear with prefix only clears prefixed keys', () => {
      const sm = new StorageManager(window.localStorage, 'myprefix');
      window.localStorage.setItem('other', 'x');
      window.localStorage.setItem('myprefix:key1', 'val1');
      window.localStorage.setItem('myprefix:key2', 'val2');
      sm.clear();
      expect(window.localStorage.getItem('other')).toBe('x');
      expect(window.localStorage.getItem('myprefix:key1')).toBeNull();
    });

    it('clear without prefix clears all', () => {
      const sm = new StorageManager(window.localStorage, '');
      window.localStorage.setItem('a', '1');
      window.localStorage.setItem('b', '2');
      sm.clear();
      expect(window.localStorage.getItem('a')).toBeNull();
    });

    it('has returns true/false', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      sm.set('k', 'v');
      expect(sm.has('k')).toBe(true);
      expect(sm.has('missing')).toBe(false);
    });

    it('keys returns prefixed keys without prefix', () => {
      const sm = new StorageManager(window.localStorage, 'pfx');
      sm.set('a', 1);
      sm.set('b', 2);
      const keys = sm.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys.length).toBe(2);
    });

    it('getAll returns all items as object', () => {
      const sm = new StorageManager(window.localStorage, 'pfx');
      sm.set('x', 10);
      sm.set('y', 20);
      expect(sm.getAll()).toEqual({ x: 10, y: 20 });
    });

    it('getSize returns number of bytes', () => {
      const sm = new StorageManager(window.localStorage, 'pfx');
      sm.set('k', 'v');
      expect(sm.getSize()).toBeGreaterThan(0);
    });

    it('getSizeFormatted returns human readable string', () => {
      const sm = new StorageManager(window.localStorage, 'pfx');
      sm.set('k', 'v');
      expect(sm.getSizeFormatted()).toMatch(/\d+ B/);
    });

    it('isAvailable returns true when storage works', () => {
      expect(StorageManager.isAvailable(window.localStorage)).toBe(true);
    });

    it('isAvailable returns false when storage throws', () => {
      const bad = { setItem: vi.fn(() => { throw new Error('denied'); }) };
      expect(StorageManager.isAvailable(bad)).toBe(false);
    });

    it('getRemainingSpace returns number', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      expect(typeof sm.getRemainingSpace()).toBe('number');
    });

    it('prefixed instance uses prefix correctly', () => {
      const sm = new StorageManager(window.localStorage, 'myprefix');
      sm.set('user', 'john');
      const raw = window.localStorage.getItem('myprefix:user');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw).value).toBe('john');
    });
  });

  describe('TypedStorage', () => {
    it('delegates get/set/remove/has to underlying storage', () => {
      const sm = new StorageManager(window.localStorage, 'test');
      const ts = new TypedStorage(sm, 'mykey');
      ts.set('value1');
      expect(ts.get()).toBe('value1');
      expect(ts.has()).toBe(true);
      ts.remove();
      expect(ts.has()).toBe(false);
    });
  });

  describe('storageKeys', () => {
    it('each key is a TypedStorage instance', () => {
      const keys = storageKeys;
      Object.values(keys).forEach((k) => {
        expect(k).toBeInstanceOf(TypedStorage);
      });
    });
  });

  describe('StorageListener', () => {
    it('on adds callback, handleStorageEvent calls it', () => {
      const listener = new StorageListener(lStorage);
      const cb = vi.fn();
      listener.on('roar-mma:auth_token', cb);
      listener.handleStorageEvent({
        storageArea: window.localStorage,
        key: 'roar-mma:auth_token',
        newValue: JSON.stringify({ value: 'tok123' }),
        oldValue: null,
      });
      expect(cb).toHaveBeenCalledWith('tok123', null);
    });

    it('off removes callback', () => {
      const listener = new StorageListener(lStorage);
      const cb = vi.fn();
      listener.on('auth', cb);
      listener.off('auth', cb);
      listener.handleStorageEvent({ storageArea: window.localStorage, key: 'auth', newValue: null, oldValue: null });
      expect(cb).not.toHaveBeenCalled();
    });

    it('destroy removes event listener', () => {
      const spy = vi.spyOn(window, 'removeEventListener');
      const listener = new StorageListener(lStorage);
      listener.destroy();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('CacheStorage', () => {
    it('set with ttl, get returns cached value', () => {
      const c = new CacheStorage(window.localStorage, 'testcache');
      c.set('data', { foo: 'bar' }, 60000);
      expect(c.get('data')).toEqual({ foo: 'bar' });
    });

    it('expired items return defaultValue', () => {
      const c = new CacheStorage(window.localStorage, 'testcache');
      const past = Date.now() - 10000;
      window.localStorage.setItem('testcache:exp', JSON.stringify({ value: 'old', timestamp: past - 10000, expires: past }));
      expect(c.get('exp', 'default')).toBe('default');
    });

    it('clear removes all cached items', () => {
      const c = new CacheStorage(window.localStorage, 'testcache');
      c.set('a', 1);
      c.set('b', 2);
      c.clear();
      expect(c.get('a')).toBeNull();
      expect(c.get('b')).toBeNull();
    });

    it('remove deletes single item', () => {
      const c = new CacheStorage(window.localStorage, 'testcache');
      c.set('x', 100);
      c.remove('x');
      expect(c.get('x')).toBeNull();
    });

    it('cleanup iterates keys', () => {
      const c = new CacheStorage(window.localStorage, 'testcache');
      c.set('a', 1);
      c.set('b', 2);
      expect(() => c.cleanup()).not.toThrow();
      expect(c.get('a')).toBe(1);
    });
  });

  describe('getStorageQuota', () => {
    it('returns null when navigator.storage unavailable', async () => {
      const orig = navigator.storage;
      Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true });
      const result = await getStorageQuota();
      expect(result).toBeNull();
      Object.defineProperty(navigator, 'storage', { value: orig, configurable: true });
    });

    it('returns shape when navigator.storage.estimate available', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({ usage: 1024, quota: 10240 });
      Object.defineProperty(navigator, 'storage', { value: { estimate: mockEstimate }, configurable: true });
      const result = await getStorageQuota();
      expect(result.usage).toBe(1024);
      expect(result.quota).toBe(10240);
      expect(typeof result.usagePercent).toBe('string');
      expect(result.available).toBe(9216);
    });
  });

  describe('migrateStorage', () => {
    it('copies from old prefix to new and clears old', () => {
      migrateStorage('old', 'new');
      const oldSM = new StorageManager(window.localStorage, 'old');
      oldSM.set('key1', 'val1');
      oldSM.set('key2', 'val2');
      migrateStorage('old', 'new');
      const newSM = new StorageManager(window.localStorage, 'new');
      expect(newSM.get('key1')).toBe('val1');
      expect(newSM.get('key2')).toBe('val2');
      expect(oldSM.get('key1')).toBeNull();
    });
  });
});
