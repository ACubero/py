import { openDb, STORES } from './index.js';
import { localIso } from '../domain/dates.js';

export const BACKUP_VERSION = 1;

export async function exportBackup() {
  const db = await openDb();
  const data = {};
  for (const name of STORES) data[name] = await db.getAll(name);
  return { app: 'wegoby', version: BACKUP_VERSION, exportedAt: localIso(), data };
}

export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object' || backup.app !== 'wegoby') {
    return { ok: false, error: 'El archivo no es una copia de Wegoby.' };
  }
  if (backup.version !== BACKUP_VERSION) {
    return { ok: false, error: 'Versión de copia no compatible.' };
  }
  if (!backup.data || typeof backup.data !== 'object') {
    return { ok: false, error: 'La copia no contiene datos.' };
  }
  for (const [name, rows] of Object.entries(backup.data)) {
    if (!STORES.includes(name)) return { ok: false, error: `Sección desconocida: ${name}.` };
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object')) {
      return { ok: false, error: `Sección dañada: ${name}.` };
    }
    const keyField = name === 'settings' ? 'key' : 'id';
    if (rows.some((row) => row[keyField] === undefined)) return { ok: false, error: `Sección dañada: ${name}.` };
  }
  return { ok: true };
}

export async function importBackup(backup) {
  const check = validateBackup(backup);
  if (!check.ok) throw new Error(check.error);
  const db = await openDb();
  const tx = db.transaction(STORES, 'readwrite');
  for (const name of STORES) {
    const store = tx.objectStore(name);
    await store.clear();
    for (const row of backup.data[name] ?? []) await store.put(row);
  }
  await tx.done;
}
