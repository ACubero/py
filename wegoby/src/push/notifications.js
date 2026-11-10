import { buildReminderSchedule, dueReminders, REMINDER_TEXT } from '../domain/reminders.js';
import { minutesOfDay, dayKey } from '../domain/dates.js';
import { waterTotal } from '../domain/water.js';

export const LATE_WINDOW_MIN = 60;

export const FALLBACK = { title: 'Wegoby', body: 'Toca para ver tus recordatorios de hoy.', url: '/#/hoy' };

const ACTIONS = {
  water: [{ action: 'water-250', title: '+250 ml' }],
  levo: [{ action: 'med-levo', title: 'Tomada' }],
  calcium: [{ action: 'med-calcium', title: 'Tomado' }],
  iron: [{ action: 'med-iron', title: 'Tomado' }],
};

export function pendingNotifications({ settings, waterRecords, shownLog, now }) {
  const day = dayKey(now);
  const entries = buildReminderSchedule(settings);
  const local = { day, weekday: now.getDay(), minutes: minutesOfDay(now) };
  const goalMet = waterTotal(waterRecords) >= settings.water.goalMl;
  const shown = new Set(shownLog?.day === day ? shownLog.keys : []);
  const due = dueReminders(entries, local, { windowMin: LATE_WINDOW_MIN, waterGoalMetDay: goalMet ? day : null });
  const latestWater = due.filter((entry) => entry.kind === 'water').at(-1);
  return due
    .filter((entry) => entry.kind !== 'water' || entry === latestWater)
    .filter((entry) => !shown.has(`${entry.kind}@${entry.time}`))
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((entry) => ({
      key: `${entry.kind}@${entry.time}`,
      kind: entry.kind,
      ...REMINDER_TEXT[entry.kind],
      actions: ACTIONS[entry.kind] ?? [],
    }));
}
