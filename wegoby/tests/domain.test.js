import { describe, it, expect } from 'vitest';
import { DEFAULT_DOSE_STEPS } from '../src/domain/defaults.js';
import {
  doseSchedule,
  stepForDay,
  nextDoseDay,
  missedDoseAdvice,
  suggestSite,
  penStatus,
  INJECTION_SITES,
  doseStatus,
} from '../src/domain/dose.js';
import { medConflicts, suggestCompanionTime, breakfastWindow } from '../src/domain/meds.js';
import { waterTotal, waterReminderTimes } from '../src/domain/water.js';
import { idealWeightDevine, adjustedWeight, proteinTarget } from '../src/domain/protein.js';
import { evaluateSymptoms } from '../src/domain/symptoms.js';
import { buildReminderSchedule, dueReminders, localParts } from '../src/domain/reminders.js';
import { DEFAULTS } from '../src/domain/defaults.js';

describe('dose schedule (S2)', () => {
  const schedule = doseSchedule('2026-11-02', DEFAULT_DOSE_STEPS);

  it('escalates every 4 weeks up to 2.4 mg maintenance', () => {
    expect(schedule.map((step) => [step.mg, step.startDay, step.endDay])).toEqual([
      [0.25, '2026-11-02', '2026-11-29'],
      [0.5, '2026-11-30', '2026-12-27'],
      [1, '2026-12-28', '2027-01-24'],
      [1.7, '2027-01-25', '2027-02-21'],
      [2.4, '2027-02-22', null],
    ]);
  });

  it('honours a delayed step configured by the doctor', () => {
    const delayed = doseSchedule('2026-11-02', [{ mg: 0.25, weeks: 4 }, { mg: 0.5, weeks: 8 }, { mg: 1, weeks: null }]);
    expect(stepForDay(delayed, '2027-01-20').mg).toBe(0.5);
    expect(stepForDay(delayed, '2027-01-25').mg).toBe(1);
  });

  it('returns no step before the start date', () => {
    expect(stepForDay(schedule, '2026-11-01')).toBeNull();
    expect(stepForDay(schedule, '2026-11-02').mg).toBe(0.25);
  });

  it('finds the next dose day on the configured weekday', () => {
    expect(nextDoseDay({ startDate: '2026-11-02', weekday: 1 }, [])).toBe('2026-11-02');
    expect(nextDoseDay({ startDate: '2026-11-02', weekday: 1 }, [{ day: '2026-11-02' }])).toBe('2026-11-09');
    expect(nextDoseDay({ startDate: '2026-11-02', weekday: 1 }, [{ day: '2026-11-02' }, { day: '2026-11-12' }])).toBe('2026-11-16');
    expect(nextDoseDay({ startDate: '2026-11-04', weekday: 1 }, [])).toBe('2026-11-09');
  });
});

describe('missed dose (S2, Wegovy SmPC: within 5 days → inject, otherwise skip)', () => {
  const scheduledAt = new Date(2026, 10, 2, 10, 0);
  it('advises taking it up to 5 days late', () => {
    expect(missedDoseAdvice(scheduledAt, new Date(2026, 10, 4, 10, 0)).action).toBe('take');
    expect(missedDoseAdvice(scheduledAt, new Date(2026, 10, 7, 10, 0)).action).toBe('take');
  });
  it('advises skipping after 5 days and points to the next regular day', () => {
    const advice = missedDoseAdvice(scheduledAt, new Date(2026, 10, 7, 10, 1));
    expect(advice.action).toBe('skip');
    expect(advice.nextRegularDay).toBe('2026-11-09');
  });
});

describe('injection site rotation and pens (S2)', () => {
  it('rotates through the six sites', () => {
    expect(suggestSite(null)).toBe(INJECTION_SITES[0].id);
    expect(suggestSite(INJECTION_SITES[0].id)).toBe(INJECTION_SITES[1].id);
    expect(suggestSite(INJECTION_SITES.at(-1).id)).toBe(INJECTION_SITES[0].id);
  });
  it('reports doses and in-use days left', () => {
    const pen = { id: 7, openedDay: '2026-11-02' };
    const doses = [{ penId: 7 }, { penId: 7 }, { penId: 3 }];
    expect(penStatus(pen, doses, '2026-11-12', { dosesPerPen: 4, inUseDays: 42 })).toEqual({
      dosesLeft: 2,
      daysLeft: 32,
      expired: false,
      empty: false,
    });
    expect(penStatus(pen, doses, '2026-12-15', { dosesPerPen: 4, inUseDays: 42 }).expired).toBe(true);
  });
});

describe('levothyroxine spacing (S6)', () => {
  it('flags calcium or iron closer than 4 h to levothyroxine', () => {
    const meds = { ...DEFAULTS.meds, levoTime: '07:00', calciumEnabled: true, calciumTimes: ['09:00', '14:00'], ironEnabled: true, ironTime: '04:00' };
    expect(medConflicts(meds)).toEqual([
      { kind: 'calcium', time: '09:00', gapMin: 120 },
      { kind: 'iron', time: '04:00', gapMin: 180 },
    ]);
  });
  it('accepts exactly 4 h and suggests 4 h after levothyroxine', () => {
    expect(medConflicts({ ...DEFAULTS.meds, levoTime: '07:00', calciumEnabled: true, calciumTimes: ['11:00'] })).toEqual([]);
    expect(suggestCompanionTime('07:00')).toBe('11:00');
  });
  it('computes the breakfast window 30–60 min after the dose', () => {
    expect(breakfastWindow('07:00')).toEqual({ from: '07:30', to: '08:00' });
  });
});

describe('water (S4)', () => {
  it('sums intake', () => {
    expect(waterTotal([{ ml: 250 }, { ml: 500 }])).toBe(750);
  });
  it('plans reminders from start until 2 h before bed, on 15-minute slots', () => {
    expect(waterReminderTimes({ start: '09:00', bedtime: '23:00', intervalMin: 105 })).toEqual([
      '09:00', '10:45', '12:30', '14:15', '16:00', '17:45', '19:30', '21:00',
    ]);
  });
  it('handles bedtime after midnight', () => {
    expect(waterReminderTimes({ start: '20:00', bedtime: '00:30', intervalMin: 120 })).toEqual(['20:00', '22:00']);
  });
});

describe('protein (S5)', () => {
  it('uses Devine ideal weight and 40 % adjusted weight', () => {
    expect(idealWeightDevine(165, 'f')).toBeCloseTo(56.9, 1);
    expect(adjustedWeight(90, 56.9)).toBeCloseTo(70.1, 1);
    expect(adjustedWeight(50, 56.9)).toBe(50);
  });
  it('computes the daily target from g/kg', () => {
    expect(proteinTarget({ weightKg: 90, heightCm: 165, sex: 'f', gPerKg: 1.2, useAdjustedWeight: true })).toBe(84);
    expect(proteinTarget({ weightKg: 90, heightCm: 165, sex: 'f', gPerKg: 1.2, useAdjustedWeight: false })).toBe(108);
    expect(proteinTarget({ weightKg: null, heightCm: 165, sex: 'f', gPerKg: 1.2, useAdjustedWeight: true })).toBeNull();
  });
});

describe('symptom red flags (S6, S9)', () => {
  const levels = (alerts) => alerts.map((alert) => [alert.id, alert.level]);
  it('escalates severe abdominal pain and no fluids for 24 h', () => {
    expect(levels(evaluateSymptoms({ items: { abdominalPain: 3 } }))).toEqual([['abdominal', 'danger']]);
    expect(levels(evaluateSymptoms({ items: {}, noFluids24h: true }))).toEqual([['dehydration', 'danger']]);
  });
  it('warns about thyroid over-replacement and low calcium signs', () => {
    expect(levels(evaluateSymptoms({ items: { palpitations: 2 } }))).toEqual([['thyroid', 'warning']]);
    expect(levels(evaluateSymptoms({ items: { tingling: 2 } }))).toEqual([['calcium', 'warning']]);
    expect(levels(evaluateSymptoms({ items: { tingling: 3 } }))).toEqual([['calcium', 'danger']]);
  });
  it('stays quiet for mild symptoms', () => {
    expect(evaluateSymptoms({ items: { nausea: 2, abdominalPain: 1, palpitations: 1 } })).toEqual([]);
  });
});

describe('reminders shared by app, service worker and push server (S4)', () => {
  const settings = {
    treatment: { ...DEFAULTS.treatment, startDate: '2026-11-02', weekday: 1, doseTime: '10:00' },
    meds: { ...DEFAULTS.meds, levoTime: '07:00', calciumEnabled: true, calciumTimes: ['14:00'] },
    water: { ...DEFAULTS.water, start: '09:00', bedtime: '23:00', intervalMin: 105 },
    labs: { nextLabDate: '2026-11-20' },
  };
  const entries = buildReminderSchedule(settings);

  it('builds entries for every enabled reminder', () => {
    const kinds = entries.map((entry) => entry.kind);
    expect(kinds.filter((kind) => kind === 'water')).toHaveLength(8);
    expect(entries).toContainEqual({ kind: 'dose', weekday: 1, time: '10:00' });
    expect(entries).toContainEqual({ kind: 'levo', time: '07:00' });
    expect(entries).toContainEqual({ kind: 'calcium', time: '14:00' });
    expect(entries).toContainEqual({ kind: 'lab', date: '2026-11-19', time: '20:00' });
  });

  it('fires entries inside the last 15-minute window only', () => {
    const monday = { day: '2026-11-16', weekday: 1, minutes: 600 };
    expect(dueReminders(entries, monday).map((entry) => entry.kind)).toEqual(['dose']);
    expect(dueReminders(entries, { ...monday, minutes: 614 }).map((entry) => entry.kind)).toEqual(['dose']);
    expect(dueReminders(entries, { ...monday, minutes: 615 })).toEqual([]);
    expect(dueReminders(entries, { day: '2026-11-17', weekday: 2, minutes: 600 })).toEqual([]);
  });

  it('skips water once the daily goal was met', () => {
    const at = { day: '2026-11-17', weekday: 2, minutes: 540 };
    expect(dueReminders(entries, at).map((entry) => entry.kind)).toEqual(['water']);
    expect(dueReminders(entries, at, { waterGoalMetDay: '2026-11-17' })).toEqual([]);
    expect(dueReminders(entries, at, { waterGoalMetDay: '2026-11-16' })).toHaveLength(1);
  });

  it('fires the lab reminder on the day before at 20:00', () => {
    expect(dueReminders(entries, { day: '2026-11-19', weekday: 4, minutes: 1200 }).map((entry) => entry.kind)).toEqual(['lab']);
  });

  it('converts an instant to local parts of a time zone', () => {
    expect(localParts(new Date('2026-11-16T09:00:00Z'), 'Europe/Madrid')).toEqual({ day: '2026-11-16', weekday: 1, minutes: 600 });
    expect(localParts(new Date('2026-07-01T22:30:00Z'), 'Europe/Madrid')).toEqual({ day: '2026-07-02', weekday: 4, minutes: 30 });
  });
});

describe('dose status for today (S2)', () => {
  const treatment = { startDate: '2026-11-02', weekday: 1, doseTime: '10:00', steps: DEFAULT_DOSE_STEPS };
  it('is due today on the injection day', () => {
    const status = doseStatus(treatment, [], new Date(2026, 10, 2, 8, 0));
    expect(status).toMatchObject({ nextDay: '2026-11-02', state: 'today', mg: 0.25 });
  });
  it('is upcoming after a dose was registered', () => {
    const status = doseStatus(treatment, [{ day: '2026-11-02' }], new Date(2026, 10, 4, 8, 0));
    expect(status).toMatchObject({ nextDay: '2026-11-09', state: 'upcoming', daysUntil: 5 });
  });
  it('is missed with the SmPC advice when the day passed', () => {
    expect(doseStatus(treatment, [], new Date(2026, 10, 5, 8, 0))).toMatchObject({ state: 'missed', advice: { action: 'take' } });
    expect(doseStatus(treatment, [], new Date(2026, 10, 8, 8, 0))).toMatchObject({ state: 'missed', advice: { action: 'skip', nextRegularDay: '2026-11-09' } });
  });
  it('is unset without a start date', () => {
    expect(doseStatus({ ...treatment, startDate: null }, [], new Date()).state).toBe('unset');
  });
});
