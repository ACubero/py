import { openDB } from 'idb';
import { DEFAULTS } from '../domain/defaults.js';

export const DB_NAME = 'wegoby';
export const DB_VERSION = 1;

const RECORD_STORES = {
  doses: ['day'],
  pens: [],
  medLogs: ['day'],
  water: ['day'],
  protein: ['day'],
  symptoms: ['day'],
  workouts: ['day'],
  pain: ['day'],
  weights: ['date'],
  labs: ['date'],
  bp: ['day'],
  physioExercises: [],
};

export const STORES = ['settings', ...Object.keys(RECORD_STORES)];

let dbPromise;

export function openDb() {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('settings', { keyPath: 'key' });
        for (const [name, indexes] of Object.entries(RECORD_STORES)) {
          const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
          indexes.forEach((field) => store.createIndex(field, field));
        }
      }
    },
  });
  return dbPromise;
}

const listeners = new Set();

export function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(store) {
  listeners.forEach((listener) => listener(store));
}

export async function addRecord(store, record) {
  const db = await openDb();
  const id = await db.add(store, record);
  notify(store);
  return id;
}

export async function putRecord(store, record) {
  const db = await openDb();
  const id = await db.put(store, record);
  notify(store);
  return id;
}

export async function deleteRecord(store, id) {
  const db = await openDb();
  await db.delete(store, id);
  notify(store);
}

export async function allRecords(store) {
  const db = await openDb();
  return db.getAll(store);
}

export async function recordsByIndex(store, index, query) {
  const db = await openDb();
  return db.getAllFromIndex(store, index, query);
}

export async function recordsForDay(store, day) {
  return recordsByIndex(store, 'day', day);
}

export async function recordsBetween(store, index, fromKey, toKey) {
  return recordsByIndex(store, index, IDBKeyRange.bound(fromKey, toKey));
}

export async function getSetting(key) {
  const db = await openDb();
  const stored = await db.get('settings', key);
  const defaults = DEFAULTS[key];
  if (!stored) return structuredClone(defaults);
  if (defaults && typeof defaults === 'object' && !Array.isArray(defaults)) return { ...defaults, ...stored.value };
  return stored.value;
}

export async function setSetting(key, patch) {
  const current = await getSetting(key);
  const value = current && typeof current === 'object' && !Array.isArray(current) ? { ...current, ...patch } : patch;
  const db = await openDb();
  await db.put('settings', { key, value });
  notify('settings');
  return value;
}

export async function clearAll() {
  const db = await openDb();
  const tx = db.transaction(STORES, 'readwrite');
  await Promise.all([...STORES.map((name) => tx.objectStore(name).clear()), tx.done]);
  notify('*');
}
