export const DEFAULT_DOSE_STEPS = [
  { mg: 0.25, weeks: 4 },
  { mg: 0.5, weeks: 4 },
  { mg: 1, weeks: 4 },
  { mg: 1.7, weeks: 4 },
  { mg: 2.4, weeks: null },
];

export const DEFAULTS = {
  onboarding: { done: false, disclaimerAccepted: false },
  profile: { birthYear: null, heightCm: null, startWeightKg: null, sex: 'f' },
  treatment: { startDate: null, weekday: 1, doseTime: '10:00', steps: DEFAULT_DOSE_STEPS },
  pen: { dosesPerPen: 4, inUseDays: 42 },
  meds: {
    levoEnabled: true,
    levoTime: '07:00',
    levoDose: '',
    calciumEnabled: false,
    calciumTimes: ['14:00'],
    ironEnabled: false,
    ironTime: '13:00',
  },
  water: { goalMl: 2000, start: '09:00', bedtime: '23:00', intervalMin: 105, remindersEnabled: true },
  protein: { gPerKg: 1.2, useAdjustedWeight: true },
  exercise: {
    physioCleared: false,
    screening: null,
    zumbaAllowed: false,
    painThreshold: 5,
    weeklyAerobicMin: 150,
    weeklyStrengthDays: 2,
  },
  labs: { nextLabDate: null },
  bp: { enabled: false },
  display: { fontScale: 1.125, theme: 'auto' },
  push: { enabled: false, token: null, waterGoalReportedDay: null },
};
