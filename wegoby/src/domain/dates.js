const pad = (value) => String(value).padStart(2, '0');

export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDayKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetween(fromKey, toKey) {
  return Math.round((fromDayKey(toKey) - fromDayKey(fromKey)) / MS_PER_DAY);
}

export function parseTime(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function atTime(dayKeyValue, hhmm) {
  const date = fromDayKey(dayKeyValue);
  const minutes = parseTime(hhmm);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

export function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7;
  return addDays(start, -offset);
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function weekdayName(index) {
  return WEEKDAYS[index];
}

export function formatDay(key) {
  return fromDayKey(key).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function localIso(date = new Date()) {
  return `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function parseDayParam(value, today = dayKey()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return today;
  const date = fromDayKey(value);
  if (Number.isNaN(date.getTime()) || dayKey(date) !== value) return today;
  return value > today ? today : value;
}

export function dateOnDay(key, reference = new Date()) {
  const date = fromDayKey(key);
  date.setHours(reference.getHours(), reference.getMinutes(), reference.getSeconds(), 0);
  return date;
}

export function lastDays(endKey, count) {
  const end = fromDayKey(endKey);
  return Array.from({ length: count }, (_, index) => dayKey(addDays(end, index - count + 1)));
}

export function dayLabel(key, today = dayKey()) {
  if (key === today) return 'Hoy';
  if (key === dayKey(addDays(fromDayKey(today), -1))) return 'Ayer';
  return formatDay(key);
}
