import { parseTime, formatTime } from './dates.js';

export const LEVO_SPACING_MIN = 240;

export const MED_LABELS = {
  levo: 'Levotiroxina',
  calcium: 'Calcio',
  iron: 'Hierro',
};

function circularGap(a, b) {
  const diff = Math.abs(parseTime(a) - parseTime(b));
  return Math.min(diff, 1440 - diff);
}

export function companionDoses(meds) {
  const doses = [];
  if (meds.calciumEnabled) meds.calciumTimes.forEach((time) => doses.push({ kind: 'calcium', time }));
  if (meds.ironEnabled) doses.push({ kind: 'iron', time: meds.ironTime });
  return doses;
}

export function medConflicts(meds) {
  if (!meds.levoEnabled) return [];
  return companionDoses(meds)
    .map((dose) => ({ ...dose, gapMin: circularGap(dose.time, meds.levoTime) }))
    .filter((dose) => dose.gapMin < LEVO_SPACING_MIN);
}

export function suggestCompanionTime(levoTime) {
  return formatTime(parseTime(levoTime) + LEVO_SPACING_MIN);
}

export function breakfastWindow(levoTime) {
  const minutes = parseTime(levoTime);
  return { from: formatTime(minutes + 30), to: formatTime(minutes + 60) };
}

export function dailyMedPlan(meds) {
  const plan = meds.levoEnabled ? [{ kind: 'levo', time: meds.levoTime }] : [];
  return [...plan, ...companionDoses(meds)].sort((a, b) => parseTime(a.time) - parseTime(b.time));
}
