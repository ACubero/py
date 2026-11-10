import { EXERCISES } from '../data/exercises.js';
import { addDays, dayKey, fromDayKey } from './dates.js';

export function visibleExercises({ zumbaAllowed }) {
  return EXERCISES.filter((exercise) => exercise.achilles !== 'avoid' || zumbaAllowed);
}

const PHASES = [
  { fromWeek: 0, label: 'Semanas 1–2: aprender la técnica', sets: '1–2', reps: '8–10', rest: '90 s' },
  { fromWeek: 2, label: 'Semanas 3–6: consolidar', sets: '2–3', reps: '10–12', rest: '60–90 s' },
  { fromWeek: 6, label: 'Desde la semana 7: progresar', sets: '3', reps: '10–12', rest: '60–90 s', note: 'Sube la carga cuando hagas 12 repeticiones con buena técnica y esfuerzo de 5–7 sobre 10.' },
];

export function progressionFor(weeksTrained) {
  return [...PHASES].reverse().find((phase) => weeksTrained >= phase.fromWeek);
}

export function weeksSinceFirstStrength(workouts, today = dayKey()) {
  const strength = workouts.filter((workout) => workout.type === 'strength' || workout.type === 'physio');
  if (!strength.length) return 0;
  const first = strength.reduce((min, workout) => (workout.day < min ? workout.day : min), strength[0].day);
  return Math.floor((fromDayKey(today) - fromDayKey(first)) / (7 * 86_400_000));
}

export function weeklySummary(workouts, weekStartKey) {
  const end = dayKey(addDays(fromDayKey(weekStartKey), 6));
  const inWeek = workouts.filter((workout) => workout.day >= weekStartKey && workout.day <= end);
  return {
    aerobicMin: inWeek.filter((workout) => workout.type === 'aerobic').reduce((sum, workout) => sum + (workout.minutes ?? 0), 0),
    strengthDays: new Set(inWeek.filter((workout) => workout.type === 'strength' || workout.type === 'physio').map((workout) => workout.day)).size,
    sessions: inWeek.length,
  };
}

export const RPE_HINT = 'Esfuerzo de 0 a 10: 5–7 significa que puedes hablar pero no cantar.';
