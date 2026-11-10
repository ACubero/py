import { parseTime, formatTime } from './dates.js';

export const SLOT_MIN = 15;
export const NO_REMINDERS_BEFORE_BED_MIN = 120;

export function waterTotal(records) {
  return records.reduce((sum, record) => sum + record.ml, 0);
}

export function waterReminderTimes({ start, bedtime, intervalMin }) {
  const first = Math.ceil(parseTime(start) / SLOT_MIN) * SLOT_MIN;
  let bed = parseTime(bedtime);
  if (bed <= first) bed += 1440;
  const cutoff = Math.floor((bed - NO_REMINDERS_BEFORE_BED_MIN) / SLOT_MIN) * SLOT_MIN;
  const step = Math.max(SLOT_MIN, Math.round(intervalMin / SLOT_MIN) * SLOT_MIN);
  const times = [];
  for (let minutes = first; minutes <= cutoff; minutes += step) times.push(minutes);
  const last = times.at(-1);
  if (last !== undefined && cutoff - last >= step / 2) times.push(cutoff);
  return times.map(formatTime);
}
