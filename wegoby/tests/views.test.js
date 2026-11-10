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
