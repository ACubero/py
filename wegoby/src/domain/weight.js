export const WAIST_RISK_CM = 88;

export function bmi(kg, heightCm) {
  if (!kg || !heightCm) return null;
  return kg / (heightCm / 100) ** 2;
}

export function weightStats(records, heightCm) {
  const sorted = [...records].filter((record) => record.kg).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return null;
  const start = sorted[0];
  const current = sorted.at(-1);
  const lostKg = Math.round((start.kg - current.kg) * 10) / 10;
  const waist = [...records].filter((record) => record.waistCm).sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.waistCm ?? null;
  return {
    startKg: start.kg,
    currentKg: current.kg,
    lostKg,
    lostPercent: Math.round((lostKg / start.kg) * 1000) / 10,
    bmi: bmi(current.kg, heightCm),
    waistCm: waist,
    waistRisk: waist !== null && waist > WAIST_RISK_CM,
  };
}
