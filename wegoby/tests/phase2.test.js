import { describe, it, expect } from 'vitest';
import { EXERCISES, ROUTINES, getExercise } from '../src/data/exercises.js';
import { visibleExercises, progressionFor, weeklySummary } from '../src/domain/exercise.js';
import { evaluatePain } from '../src/domain/achilles.js';
import { weightStats, bmi } from '../src/domain/weight.js';
import { evaluateBp } from '../src/domain/bp.js';
import { linePath } from '../src/ui/chart.js';

describe('exercise catalog (S3, S6)', () => {
  it('has unique ids and every routine item exists', () => {
    const ids = EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    Object.values(ROUTINES).flatMap((routine) => routine.items).forEach((id) => expect(getExercise(id)).toBeTruthy());
  });

  it('never includes jumps, step-ups, running or calf raises', () => {
    const text = EXERCISES.map((exercise) => `${exercise.id} ${exercise.name}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/salt|jump|step-up|escal[oó]n|correr|run|gemel|calf/);
  });

  it('stores verified YouTube ids with channel and date', () => {
    EXERCISES.flatMap((exercise) => exercise.videos).forEach((video) => {
      expect(video.id).toMatch(/^[\w-]{11}$/);
      expect(video.channel.trim()).toBe(video.channel);
      expect(video.verifiedAt).toBe('2026-11-10');
    });
  });

  it('hides Zumba-style standing dance unless the physio allows it', () => {
    expect(visibleExercises({ zumbaAllowed: false }).some((exercise) => exercise.achilles === 'avoid')).toBe(false);
    expect(visibleExercises({ zumbaAllowed: true }).some((exercise) => exercise.id === 'zumba-gold')).toBe(true);
  });

  it('progresses volume by weeks of training', () => {
    expect(progressionFor(0)).toMatchObject({ sets: '1–2', reps: '8–10' });
    expect(progressionFor(2)).toMatchObject({ sets: '2–3', reps: '10–12' });
    expect(progressionFor(6)).toMatchObject({ sets: '3', reps: '10–12' });
  });

  it('summarises a week against WHO targets', () => {
    const workouts = [
      { day: '2026-11-09', type: 'aerobic', minutes: 30 },
      { day: '2026-11-10', type: 'strength', minutes: 35 },
      { day: '2026-11-10', type: 'physio', minutes: 15 },
      { day: '2026-11-12', type: 'strength', minutes: 30 },
      { day: '2026-11-16', type: 'aerobic', minutes: 60 },
    ];
    expect(weeklySummary(workouts, '2026-11-09')).toEqual({ aerobicMin: 30, strengthDays: 2, sessions: 4 });
  });
});

describe('Achilles pain monitoring (S6, Silbernagel 2007)', () => {
  const ids = (alerts) => alerts.map((alert) => alert.id);
  it('accepts pain up to the threshold that settles by morning', () => {
    expect(evaluatePain([{ day: '2026-11-09', during: 5, morning: 2 }, { day: '2026-11-10', during: 4, morning: 2 }], 5)).toEqual([]);
  });
  it('flags pain above the threshold during exercise or next morning', () => {
    expect(ids(evaluatePain([{ day: '2026-11-10', during: 6, morning: null }], 5))).toEqual(['during']);
    expect(ids(evaluatePain([{ day: '2026-11-10', during: 3, morning: 6 }], 5))).toEqual(['morning']);
  });
  it('flags morning pain that increases from one day to the next', () => {
    expect(ids(evaluatePain([{ day: '2026-11-09', during: 2, morning: 1 }, { day: '2026-11-10', during: 2, morning: 3 }], 5))).toEqual(['increasing']);
  });
  it('flags a weekly worsening trend', () => {
    const logs = [
      { day: '2026-11-02', during: 2, morning: 1 },
      { day: '2026-11-04', during: 2, morning: 1 },
      { day: '2026-11-09', during: 3, morning: 3 },
      { day: '2026-11-11', during: 3, morning: 3 },
    ];
    expect(ids(evaluatePain(logs, 5, '2026-11-11'))).toEqual(['weekly']);
  });
});

describe('weight (S5)', () => {
  it('computes loss, BMI and waist risk', () => {
    const stats = weightStats([{ date: '2026-11-02', kg: 90, waistCm: 102 }, { date: '2026-12-02', kg: 85.5, waistCm: 98 }], 165);
    expect(stats).toMatchObject({ startKg: 90, currentKg: 85.5, lostKg: 4.5, lostPercent: 5, waistCm: 98, waistRisk: true });
    expect(bmi(85.5, 165)).toBeCloseTo(31.4, 1);
    expect(weightStats([], 165)).toBeNull();
  });
});

describe('blood pressure (S5)', () => {
  it('classifies home readings', () => {
    expect(evaluateBp({ sys: 182, dia: 100 }).level).toBe('danger');
    expect(evaluateBp({ sys: 120, dia: 112 }).level).toBe('danger');
    expect(evaluateBp({ sys: 138, dia: 80 }).level).toBe('warning');
    expect(evaluateBp({ sys: 125, dia: 80 })).toBeNull();
  });
});

describe('chart', () => {
  it('maps points into the viewbox', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 10 }], { width: 100, height: 50, pad: 0 })).toBe('M0,50 L100,0');
    expect(linePath([{ x: 0, y: 5 }], { width: 100, height: 50, pad: 0 })).toBe('M50,25');
  });
});

import { buildReport } from '../src/domain/report.js';

describe('doctor report (T29)', () => {
  it('summarises only the selected period', () => {
    const data = {
      doses: [{ day: '2026-10-01', mg: 0.25 }, { day: '2026-11-02', mg: 0.25 }],
      weights: [{ date: '2026-11-02', kg: 90 }],
      labs: [],
      bp: [],
      workouts: [{ day: '2026-11-03', minutes: 30 }],
      symptoms: [
        { day: '2026-11-03', items: { nausea: 2, vomiting: 1 }, noFluids24h: false },
        { day: '2026-11-04', items: { nausea: 3 }, noFluids24h: true },
      ],
      pain: [{ day: '2026-11-03', during: 4, morning: 2 }, { day: '2026-11-04', during: 2, morning: null }],
      water: [{ day: '2026-11-03', ml: 1500 }, { day: '2026-11-03', ml: 500 }, { day: '2026-11-04', ml: 1000 }],
      protein: [{ day: '2026-11-03', grams: 70 }],
      medLogs: [{ day: '2026-11-03', kind: 'levo' }, { day: '2026-11-03', kind: 'levo' }, { day: '2026-11-04', kind: 'calcium' }],
    };
    const report = buildReport(data, '2026-11-01', '2026-11-07', 7);
    expect(report.doses).toHaveLength(1);
    expect(report.symptomDays).toEqual([{ label: 'Náuseas', days: 2 }]);
    expect(report.noFluidsDays).toBe(1);
    expect(report.painDuringAvg).toBe(3);
    expect(report.painMorningAvg).toBe(2);
    expect(report.waterAvgMl).toBe(429);
    expect(report.proteinAvgG).toBe(10);
    expect(report.medDays).toBe(1);
  });
});

describe('no pool, bike or walking activities (L13)', () => {
  it('excludes aquagym, stationary bike and walking from the catalog', () => {
    const ids = EXERCISES.map((exercise) => exercise.id);
    expect(ids).not.toContain('aquagym');
    expect(ids).not.toContain('stationary-bike');
    expect(ids).not.toContain('walking');
    expect(JSON.stringify(EXERCISES).toLowerCase()).not.toMatch(/piscina|aquagym|nataci|bici|caminar/);
  });
});
