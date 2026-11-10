import { addDays, dayKey, fromDayKey, daysBetween, MS_PER_DAY } from './dates.js';

export const MISSED_DOSE_LIMIT_DAYS = 5;

export const INJECTION_SITES = [
  { id: 'abdomen-left', label: 'Abdomen izquierdo' },
  { id: 'abdomen-right', label: 'Abdomen derecho' },
  { id: 'thigh-left', label: 'Muslo izquierdo' },
  { id: 'thigh-right', label: 'Muslo derecho' },
  { id: 'arm-left', label: 'Brazo izquierdo' },
  { id: 'arm-right', label: 'Brazo derecho' },
];

export function siteLabel(id) {
  return INJECTION_SITES.find((site) => site.id === id)?.label ?? id;
}

export function doseSchedule(startDate, steps) {
  if (!startDate) return [];
  let cursor = fromDayKey(startDate);
  return steps.map((step, index) => {
    const startDay = dayKey(cursor);
    if (step.weeks === null || step.weeks === undefined) return { index, mg: step.mg, startDay, endDay: null };
    const end = addDays(cursor, step.weeks * 7 - 1);
    cursor = addDays(end, 1);
    return { index, mg: step.mg, startDay, endDay: dayKey(end) };
  });
}

export function stepForDay(schedule, day) {
  return schedule.find((step) => day >= step.startDay && (step.endDay === null || day <= step.endDay)) ?? null;
}

function nextWeekdayOnOrAfter(day, weekday) {
  const date = fromDayKey(day);
  return dayKey(addDays(date, (weekday - date.getDay() + 7) % 7));
}

export function lastDose(doses) {
  return doses.reduce((latest, dose) => (!latest || dose.day > latest.day ? dose : latest), null);
}

export function nextDoseDay(treatment, doses) {
  if (!treatment.startDate) return null;
  const latest = lastDose(doses);
  const from = latest ? dayKey(addDays(fromDayKey(latest.day), 1)) : treatment.startDate;
  return nextWeekdayOnOrAfter(from < treatment.startDate ? treatment.startDate : from, treatment.weekday);
}

export function missedDoseAdvice(scheduledAt, now) {
  const lateMs = now - scheduledAt;
  let next = addDays(scheduledAt, 7);
  while (dayKey(next) <= dayKey(now)) next = addDays(next, 7);
  return {
    action: lateMs <= MISSED_DOSE_LIMIT_DAYS * MS_PER_DAY ? 'take' : 'skip',
    daysLate: Math.floor(lateMs / MS_PER_DAY),
    nextRegularDay: dayKey(next),
  };
}

export function suggestSite(lastSiteId) {
  const index = INJECTION_SITES.findIndex((site) => site.id === lastSiteId);
  return INJECTION_SITES[(index + 1) % INJECTION_SITES.length].id;
}

export function penStatus(pen, doses, today, penSettings) {
  const used = doses.filter((dose) => dose.penId === pen.id && !dose.skipped).length;
  const daysLeft = penSettings.inUseDays - daysBetween(pen.openedDay, today);
  const dosesLeft = Math.max(0, penSettings.dosesPerPen - used);
  return { dosesLeft, daysLeft: Math.max(0, daysLeft), expired: daysLeft < 0, empty: dosesLeft === 0 };
}

export function doseStatus(treatment, doses, now = new Date()) {
  const nextDay = nextDoseDay(treatment, doses);
  if (!nextDay) return { state: 'unset' };
  const today = dayKey(now);
  const schedule = doseSchedule(treatment.startDate, treatment.steps);
  const mg = stepForDay(schedule, nextDay)?.mg ?? null;
  if (nextDay === today) return { state: 'today', nextDay, mg };
  if (nextDay > today) return { state: 'upcoming', nextDay, mg, daysUntil: daysBetween(today, nextDay) };
  const [hours, minutes] = treatment.doseTime.split(':').map(Number);
  const scheduledAt = fromDayKey(nextDay);
  scheduledAt.setHours(hours, minutes, 0, 0);
  return { state: 'missed', nextDay, mg, advice: missedDoseAdvice(scheduledAt, now) };
}

export function withMaintenance72(steps, enabled) {
  const has72 = steps.at(-1).mg === 7.2;
  if (enabled && !has72) return [...steps.slice(0, -1), { ...steps.at(-1), weeks: steps.at(-1).weeks ?? 4 }, { mg: 7.2, weeks: null }];
  if (!enabled && has72) return [...steps.slice(0, -2), { ...steps.at(-2), weeks: null }];
  return steps;
}
