const DB_NAME = 'dlwms_level2000';
const DB_VERSION = 1;
const STORES = ['remises', 'kv', 'audit', 'syncOps'];

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('remises')) db.createObjectStore('remises', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('audit')) db.createObjectStore('audit', { keyPath: 'auditId' });
      if (!db.objectStoreNames.contains('syncOps')) db.createObjectStore('syncOps', { keyPath: 'opId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode, worker) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = worker(store);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

export const storageEngine = {
  stores: STORES,
  async init() {
    await openDb();
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => false);
  },
  put(store, value) { return tx(store, 'readwrite', (s) => s.put(value)); },
  async get(store, key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async getAll(store) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
  async nextCounter(key, prefix, width = 4) {
    const current = await this.get('kv', key);
    const value = (current?.value || 0) + 1;
    await this.put('kv', { key, value });
    return `${prefix}${String(value).padStart(width, '0')}`;
  }
};
