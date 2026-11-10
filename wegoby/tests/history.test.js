// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll } from 'vitest';
import { openDb, clearAll, setSetting, addRecord, recordsForDay, allRecords } from '../src/db/index.js';
import { dayKey, addDays, parseDayParam, dateOnDay, lastDays, dayLabel } from '../src/domain/dates.js';
import { dailyTotals, dayBarChart } from '../src/ui/chart.js';
import { addWater, logMed } from '../src/services/records.js';

const today = dayKey();
const twoDaysAgo = dayKey(addDays(new Date(), -2));

describe('day helpers', () => {
  it('accepts only real past or current days', () => {
    expect(parseDayParam('2026-11-08', '2026-11-10')).toBe('2026-11-08');
    expect(parseDayParam('2026-11-11', '2026-11-10')).toBe('2026-11-10');
    expect(parseDayParam('2026-02-30', '2026-11-10')).toBe('2026-11-10');
    expect(parseDayParam('x', '2026-11-10')).toBe('2026-11-10');
    expect(parseDayParam(undefined, '2026-11-10')).toBe('2026-11-10');
  });

  it('places the current time on another day', () => {
    const at = dateOnDay('2026-11-08', new Date(2026, 10, 10, 13, 45, 5));
    expect(dayKey(at)).toBe('2026-11-08');
    expect([at.getHours(), at.getMinutes()]).toEqual([13, 45]);
  });

  it('lists the last N days ending on a day and labels them', () => {
    expect(lastDays('2026-11-02', 3)).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
    expect(dayLabel('2026-11-10', '2026-11-10')).toBe('Hoy');
    expect(dayLabel('2026-11-09', '2026-11-10')).toBe('Ayer');
    expect(dayLabel('2026-11-01', '2026-11-10')).not.toMatch(/Hoy|Ayer/);
  });
});

describe('daily charts', () => {
  it('sums a field per day, zero for empty days', () => {
    const rows = [{ day: '2026-11-01', ml: 250 }, { day: '2026-11-01', ml: 500 }, { day: '2026-10-20', ml: 999 }];
    expect(dailyTotals(rows, 'ml', ['2026-10-31', '2026-11-01'])).toEqual([
      { day: '2026-10-31', value: 0 },
      { day: '2026-11-01', value: 750 },
    ]);
  });

  it('renders one bar per day, a goal line and highlights the selected day', () => {
    const markup = String(dayBarChart([{ day: '2026-11-01', value: 750 }, { day: '2026-11-02', value: 0 }], { label: 'Agua 7 días', unit: 'ml', goal: 2000, selected: '2026-11-02' }));
    expect(markup.match(/class="bar[ "]/g)).toHaveLength(2);
    expect(markup).toContain('class="goal"');
    expect(markup).toContain('class="bar bar-selected"');
    expect(markup).toContain('aria-label="Agua 7 días"');
  });
});

describe('registering other days', () => {
  beforeAll(() => {
    const toastEl = document.createElement('div');
    toastEl.id = 'toast';
    document.documentElement.append(toastEl);
  });
  beforeAll(async () => {
    await openDb();
    await clearAll();
    await setSetting('onboarding', { done: true, disclaimerAccepted: true });
    await setSetting('profile', { birthYear: 1976, heightCm: 165, startWeightKg: 90 });
    await setSetting('meds', { levoEnabled: true, levoTime: '07:00' });
    await setSetting('exercise', { physioCleared: true });
  });

  it('stores water and medication on the chosen day', async () => {
    await addWater(300, dateOnDay(twoDaysAgo));
    await logMed('levo', dateOnDay(twoDaysAgo));
    expect((await recordsForDay('water', twoDaysAgo)).map((row) => row.ml)).toEqual([300]);
    expect(await recordsForDay('water', today)).toEqual([]);
    expect((await recordsForDay('medLogs', twoDaysAgo))[0].at.startsWith(twoDaysAgo)).toBe(true);
  });

  it('today view shows the chosen day, day navigation, weekly charts and an exercise entry', async () => {
    const view = await import('../src/views/today.js');
    const markup = String(await view.render({ params: [twoDaysAgo] }));
    expect(markup).toContain(`value="${twoDaysAgo}"`);
    expect(markup).toContain('data-day-nav');
    expect(markup).toContain('0,3 L');
    expect(markup).toContain('Medicación al día');
    expect(markup).toContain('Últimos 7 días');
    expect(markup.match(/class="day-bars"/g)).toHaveLength(3);
    expect(markup).toContain('href="#/ejercicio"');
    expect(markup).toContain('Ir a ejercicios');
  });

  it('today quick water button logs on the chosen day', async () => {
    const view = await import('../src/views/today.js');
    const ctx = { params: [twoDaysAgo], refresh: () => {}, navigate: () => {} };
    const container = document.createElement('div');
    container.innerHTML = String(await view.render(ctx));
    document.body.replaceChildren(container, Object.assign(document.createElement("div"), { id: "toast" }));
    view.bind(container, ctx);
    container.querySelector('[data-water="250"]').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await recordsForDay('water', twoDaysAgo)).map((row) => row.ml).sort()).toEqual([250, 300]);
  });

  it('water, protein and medication views open on the chosen day', async () => {
    for (const name of ['water', 'protein', 'meds']) {
      const view = await import(`../src/views/${name}.js`);
      const markup = String(await view.render({ params: [twoDaysAgo] }));
      expect(markup, name).toContain(`value="${twoDaysAgo}"`);
      expect(markup, name).toContain('data-day-nav');
    }
    const water = String(await (await import('../src/views/water.js')).render({ params: [twoDaysAgo] }));
    expect(water).toContain('300 ml');
  });

  it('workout, symptom and blood-pressure forms accept a date', async () => {
    for (const name of ['exercise', 'symptoms', 'bp']) {
      const view = await import(`../src/views/${name}.js`);
      const markup = String(await view.render({ params: [] }));
      expect(markup, name).toMatch(new RegExp(`name="day" type="date" value="${today}" max="${today}"`));
    }
  });

  it('a workout saved with a past date is stored on that day', async () => {
    const view = await import('../src/views/exercise.js');
    const ctx = { params: [], refresh: () => {}, navigate: () => {} };
    const container = document.createElement('div');
    container.innerHTML = String(await view.render(ctx));
    document.body.replaceChildren(container, Object.assign(document.createElement("div"), { id: "toast" }));
    view.bind(container, ctx);
    const form = container.querySelector('#workout-form');
    form.day.value = twoDaysAgo;
    form.minutes.value = '20';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const saved = (await allRecords('workouts')).find((row) => row.minutes === 20);
    expect(saved.day).toBe(twoDaysAgo);
    expect(saved.at.startsWith(twoDaysAgo)).toBe(true);
  });
});
