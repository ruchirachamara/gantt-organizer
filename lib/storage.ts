import type { TimelineData } from "./types";
import { DEFAULT_DATA } from "./defaultData";

const DB_NAME = process.env.NEXT_PUBLIC_DB_NAME ?? "gantt-timelines";
const DB_VERSION =
  parseInt(process.env.NEXT_PUBLIC_DB_VERSION ?? "1", 10) || 1;
const STORE = process.env.NEXT_PUBLIC_STORE ?? "timeline";
const KEY = process.env.NEXT_PUBLIC_KEY ?? "timeline:data:v1";

let dbPromise: Promise<IDBDatabase> | null = null;

const isValid = (data: unknown): data is TimelineData => {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as TimelineData).projects)
  );
}

const openDB = (): Promise<IDBDatabase> => {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("indexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error ?? new Error("failed to open DB"));
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
    });
  }
  return dbPromise;
}

const idbGet = <T>(key: string): Promise<T | undefined> => {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

const idbPut = <T>(key: string, value: T): Promise<void> => {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const req = tx.objectStore(STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

const loadLegacyLocalStorage = (): TimelineData | null => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValid(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const loadData = async (): Promise<TimelineData> => {
  if (typeof window === "undefined") return structuredClone(DEFAULT_DATA);
  try {
    const stored = await idbGet<TimelineData>(KEY);
    if (isValid(stored)) return stored;

    const legacy = loadLegacyLocalStorage();
    if (legacy) {
      await idbPut(KEY, legacy);
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        void Promise.resolve();
        throw new Error("failed to remove legacy localStorage item");
      } finally {
        void Promise.resolve();
      }
      return legacy;
    }

    return structuredClone(DEFAULT_DATA);
  } catch {
    const legacy = loadLegacyLocalStorage();
    if (legacy) return legacy;
    return structuredClone(DEFAULT_DATA);
  }
}

export const saveData = async (data: TimelineData): Promise<void> => {
  if (typeof window === "undefined") return;
  try {
    await idbPut(KEY, data);
  } catch {
    void Promise.resolve();
    throw new Error("failed to save data to IndexedDB");
  }
}
