// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll } from 'vitest';
import { openDb, clearAll, setSetting, addRecord } from '../src/db/index.js';
import { dayKey, localIso } from '../src/domain/dates.js';

const VIEWS = ['today', 'onboarding', 'dose', 'meds', 'water', 'protein', 'symptoms', 'exercise', 'weight', 'labs', 'bp', 'report', 'guide', 'settings', 'more'];

async function seed() {
  await openDb();
  await clearAll();
  await setSetting('onboarding', { done: true, disclaimerAccepted: true });
  await setSetting('profile', { birthYear: 1976, heightCm: 165, startWeightKg: 90 });
  await setSetting('treatment', { startDate: '2026-11-02', weekday: 1, doseTime: '10:00' });
  await setSetting('meds', { levoEnabled: true, levoTime: '07:00', calciumEnabled: true, calciumTimes: ['09:00'] });
  await addRecord('weights', { date: '2026-11-02', kg: 90, waistCm: 102 });
  await addRecord('water', { at: localIso(), day: dayKey(), ml: 250 });
  await addRecord('protein', { at: localIso(), day: dayKey(), label: '<script>x</script>', grams: 20 });
  await addRecord('symptoms', { at: localIso(), day: dayKey(), items: { abdominalPain: 3 }, noFluids24h: false, notes: '' });
  await addRecord('doses', { day: '2026-11-02', at: '2026-11-02T10:00:00', mg: 0.25, site: 'abdomen-left', penId: null, skipped: false, notes: '' });
}

describe('views render with seeded data', () => {
  beforeAll(seed);

  for (const name of VIEWS) {
    it(`${name} renders and binds`, async () => {
      const view = await import(`../src/views/${name}.js`);
      const markup = String(await view.render({ params: [], refresh: () => {}, navigate: () => {} }));
      expect(markup.length).toBeGreaterThan(20);
      expect(markup).not.toContain('<script>x</script>');
      expect(markup).not.toContain('[object');
      expect(markup).not.toContain('undefined');
      const container = document.createElement('div');
      container.innerHTML = markup;
      document.body.replaceChildren(container);
      expect(() => view.bind?.(container, { params: [], refresh: () => {}, navigate: () => {} })).not.toThrow();
    });
  }

  it('today shows the severe abdominal pain alert', async () => {
    const view = await import('../src/views/today.js');
    expect(String(await view.render({ params: [] }))).toContain('pancreatitis');
  });

  it('meds flags calcium 2 h after levothyroxine', async () => {
    const view = await import('../src/views/meds.js');
    expect(String(await view.render({ params: [] }))).toContain('Sepáralo al menos 4 h');
  });
});

describe('phase 2 views', () => {
  beforeAll(async () => {
    await seed();
    await setSetting('exercise', { physioCleared: true });
    await addRecord('pain', { day: dayKey(), during: 7, morning: null });
    await addRecord('physioExercises', { name: '<b>excéntrico</b>', sets: '3', reps: '15', load: '', videoUrl: '', notes: '' });
    await addRecord('labs', { date: '2026-11-01', tsh: 1.2, ft4: null, calcium: null, notes: '' });
    await addRecord('labs', { date: '2026-12-01', tsh: 0.8, ft4: null, calcium: null, notes: '' });
    await addRecord('weights', { date: '2026-12-01', kg: 86, waistCm: null });
  });

  it('exercise shows routines, pain alert and escapes physio input once cleared', async () => {
    const view = await import('../src/views/exercise.js');
    const markup = String(await view.render({ params: [] }));
    expect(markup).toContain('Rutina A');
    expect(markup).toContain('Silbernagel');
    expect(markup).toContain('&lt;b&gt;excéntrico&lt;/b&gt;');
    expect(markup).not.toContain('zumba-gold');
  });

  it('exercise detail renders a click-to-load video facade without contacting YouTube', async () => {
    const view = await import('../src/views/exercise.js');
    const markup = String(await view.render({ params: ['glute-bridge'] }));
    expect(markup).toContain('data-video="zkCABP4bzlU"');
    expect(markup).not.toContain('<iframe');
    expect(markup).not.toContain('ytimg');
    expect(String(await view.render({ params: ['zumba-gold'] }))).toContain('no disponible');
  });

  it('weight and labs render charts', async () => {
    const weight = await import('../src/views/weight.js');
    const labs = await import('../src/views/labs.js');
    expect(String(await weight.render({ params: [] }))).toContain('<svg class="chart"');
    expect(String(await labs.render({ params: [] }))).toContain('Evolución de la TSH');
  });
});

describe('phase 3 views', () => {
  it('bp warns on a severe reading', async () => {
    await addRecord('bp', { at: localIso(), day: dayKey(), sys: 185, dia: 100, pulse: 70 });
    const view = await import('../src/views/bp.js');
    expect(String(await view.render({ params: [] }))).toContain('112');
  });
  it('report renders tables for the chosen period', async () => {
    const view = await import('../src/views/report.js');
    const markup = String(await view.render({ params: ['12'] }));
    expect(markup).toContain('Inyecciones');
    expect(markup).toContain('<table>');
  });
  it('guide cites a source on every card', async () => {
    const view = await import('../src/views/guide.js');
    const markup = String(await view.render({ params: [] }));
    const { GUIDE } = await import('../src/data/guide.js');
    expect(markup.match(/Fuente:/g)).toHaveLength(GUIDE.length);
  });
});
