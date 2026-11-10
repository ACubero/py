import { addRecord, recordsForDay, getSetting, deleteRecord } from '../db/index.js';
import { dayKey, localIso } from '../domain/dates.js';
import { waterTotal } from '../domain/water.js';

const hooks = { water: [] };

export function onWaterChange(hook) {
  hooks.water.push(hook);
}

async function runWaterHooks() {
  const [records, settings] = await Promise.all([recordsForDay('water', dayKey()), getSetting('water')]);
  const total = waterTotal(records);
  await Promise.all(hooks.water.map((hook) => hook({ total, goal: settings.goalMl, day: dayKey() }).catch(() => {})));
  return total;
}

export async function addWater(ml, at = new Date()) {
  await addRecord('water', { at: localIso(at), day: dayKey(at), ml });
  return runWaterHooks();
}

export async function removeRecord(store, id) {
  await deleteRecord(store, id);
  if (store === 'water') await runWaterHooks();
}

export async function logMed(kind, at = new Date()) {
  return addRecord('medLogs', { at: localIso(at), day: dayKey(at), kind });
}
