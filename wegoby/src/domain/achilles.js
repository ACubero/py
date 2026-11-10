import { addDays, dayKey, fromDayKey, startOfWeek } from './dates.js';

const ADVICE = 'Según el modelo de control del dolor (Silbernagel, 2007), baja la carga en la próxima sesión y coméntalo con tu fisioterapeuta.';

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function evaluatePain(logs, threshold = 5, today = null) {
  const sorted = [...logs].sort((a, b) => a.day.localeCompare(b.day));
  const latest = sorted.at(-1);
  if (!latest) return [];
  const alerts = [];
  if (latest.during !== null && latest.during > threshold) {
    alerts.push({ id: 'during', level: 'warning', message: `Dolor del tendón durante el ejercicio por encima de ${threshold}/10. ${ADVICE}` });
  }
  if (latest.morning !== null && latest.morning > threshold) {
    alerts.push({ id: 'morning', level: 'warning', message: `El dolor no se ha calmado a la mañana siguiente (más de ${threshold}/10). ${ADVICE}` });
  }
  const mornings = sorted.filter((log) => log.morning !== null);
  const [previous, last] = mornings.slice(-2);
  if (last && previous && last === latest && last.morning > previous.morning && last.morning <= threshold) {
    alerts.push({ id: 'increasing', level: 'warning', message: `El dolor o la rigidez de la mañana ha aumentado respecto al día anterior. ${ADVICE}` });
  }
  if (!alerts.length) {
    const reference = fromDayKey(today ?? latest.day);
    const thisWeek = dayKey(startOfWeek(reference));
    const lastWeek = dayKey(addDays(startOfWeek(reference), -7));
    const current = average(mornings.filter((log) => log.day >= thisWeek).map((log) => log.morning));
    const before = average(mornings.filter((log) => log.day >= lastWeek && log.day < thisWeek).map((log) => log.morning));
    if (current !== null && before !== null && current > before) {
      alerts.push({ id: 'weekly', level: 'warning', message: `El dolor de la mañana empeora respecto a la semana pasada. ${ADVICE}` });
    }
  }
  return alerts;
}
