import { parseTime, addDays, fromDayKey, dayKey } from './dates.js';
import { waterReminderTimes, SLOT_MIN } from './water.js';
import { companionDoses } from './meds.js';

export const LAB_REMINDER_TIME = '20:00';

export const REMINDER_TEXT = {
  water: { title: 'Hora de beber agua', body: 'Unos sorbos ahora. Toca para apuntarlo.', url: '/#/agua' },
  dose: { title: 'Hoy toca Wegovy', body: 'Inyección semanal. Toca para registrarla.', url: '/#/dosis' },
  levo: { title: 'Levotiroxina', body: 'En ayunas, solo con agua. Desayuno en 30–60 min.', url: '/#/medicacion' },
  calcium: { title: 'Calcio', body: 'Toma de calcio (separada 4 h de la levotiroxina).', url: '/#/medicacion' },
  iron: { title: 'Hierro', body: 'Toma de hierro (separada 4 h de la levotiroxina).', url: '/#/medicacion' },
  lab: { title: 'Mañana: analítica', body: 'Revisa si debes ir en ayunas y cuándo tomar la levotiroxina.', url: '/#/analiticas' },
};

export function buildReminderSchedule({ treatment, meds, water, labs }) {
  const entries = [];
  if (water && water.remindersEnabled !== false) {
    waterReminderTimes(water).forEach((time) => entries.push({ kind: 'water', time }));
  }
  if (treatment?.startDate) entries.push({ kind: 'dose', weekday: treatment.weekday, time: treatment.doseTime });
  if (meds?.levoEnabled) entries.push({ kind: 'levo', time: meds.levoTime });
  if (meds) companionDoses(meds).forEach((dose) => entries.push(dose));
  if (labs?.nextLabDate) entries.push({ kind: 'lab', date: dayKey(addDays(fromDayKey(labs.nextLabDate), -1)), time: LAB_REMINDER_TIME });
  return entries;
}

export function dueReminders(entries, local, { waterGoalMetDay = null, windowMin = SLOT_MIN } = {}) {
  return entries.filter((entry) => {
    const minutes = parseTime(entry.time);
    if (!(minutes > local.minutes - windowMin && minutes <= local.minutes)) return false;
    if (entry.weekday !== undefined && entry.weekday !== local.weekday) return false;
    if (entry.date !== undefined && entry.date !== local.day) return false;
    if (entry.kind === 'water' && waterGoalMetDay === local.day) return false;
    return true;
  });
}

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localParts(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAY_INDEX[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
