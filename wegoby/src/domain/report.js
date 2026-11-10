import { SYMPTOMS } from './symptoms.js';

const inRange = (from, to) => (row) => {
  const day = row.day ?? row.date;
  return day >= from && day <= to;
};

const average = (values) => (values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null);

function dailyAverage(records, field, days) {
  const totals = new Map();
  records.forEach((record) => totals.set(record.day, (totals.get(record.day) ?? 0) + record[field]));
  return days ? Math.round([...totals.values()].reduce((sum, value) => sum + value, 0) / days) : null;
}

export function buildReport(data, from, to, days) {
  const pick = (store) => (data[store] ?? []).filter(inRange(from, to)).sort((a, b) => (a.day ?? a.date).localeCompare(b.day ?? b.date));
  const symptoms = pick('symptoms');
  const symptomDays = SYMPTOMS.map((symptom) => ({
    label: symptom.label,
    days: new Set(symptoms.filter((entry) => (entry.items?.[symptom.id] ?? 0) >= 2).map((entry) => entry.day)).size,
  })).filter((row) => row.days > 0);
  const pain = pick('pain');
  return {
    doses: pick('doses'),
    weights: pick('weights'),
    labs: pick('labs'),
    bp: pick('bp'),
    workouts: pick('workouts'),
    symptomDays,
    noFluidsDays: symptoms.filter((entry) => entry.noFluids24h).length,
    painDuringAvg: average(pain.map((row) => row.during).filter((value) => value !== null)),
    painMorningAvg: average(pain.map((row) => row.morning).filter((value) => value !== null)),
    waterAvgMl: dailyAverage(pick('water'), 'ml', days),
    proteinAvgG: dailyAverage(pick('protein'), 'grams', days),
    medDays: new Set(pick('medLogs').filter((log) => log.kind === 'levo').map((log) => log.day)).size,
  };
}
