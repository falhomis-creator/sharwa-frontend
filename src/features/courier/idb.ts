/**
 * A minimal IndexedDB key/value store for the courier app (FR-38.02, SC-38.5). IndexedDB
 * is per ORIGIN, and every store has its own origin (`<store>.<base>`), so two stores never
 * share a queue or a snapshot (VIII). Every call degrades to a no-op when IndexedDB is
 * unavailable (private mode, old WebView) — the app keeps working online.
 */
const DB = "sharwa-courier";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const req = fn(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      }),
  );
}

export const idb = {
  get: <T>(key: string) => run<T>("readonly", (s) => s.get(key) as IDBRequest<T>),
  set: (key: string, value: unknown) => run("readwrite", (s) => s.put(value, key)).then(() => undefined),
  del: (key: string) => run("readwrite", (s) => s.delete(key)).then(() => undefined),
};

/** Zustand `persist` storage backed by the same IndexedDB store. */
export const idbStateStorage = {
  getItem: async (name: string) => (await idb.get<string>(name)) ?? null,
  setItem: (name: string, value: string) => idb.set(name, value),
  removeItem: (name: string) => idb.del(name),
};
