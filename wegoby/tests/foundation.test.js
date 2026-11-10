import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { html, raw, escapeHtml } from '../src/ui/html.js';
import { dayKey, addDays, parseTime, formatTime, startOfWeek } from '../src/domain/dates.js';
import { openDb, addRecord, allRecords, getSetting, setSetting, clearAll, STORES } from '../src/db/index.js';
import { exportBackup, importBackup, validateBackup } from '../src/db/backup.js';
import { DEFAULTS } from '../src/domain/defaults.js';

describe('html escaping', () => {
  it('escapes interpolated values', () => {
    expect(String(html`<p>${'<img src=x onerror=alert(1)>'}</p>`)).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });
  it('keeps raw fragments and joins arrays', () => {
    expect(String(html`<ul>${['a', 'b'].map((item) => html`<li>${item}</li>`)}</ul>`)).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(String(html`<b>${raw('<i>x</i>')}</b>`)).toBe('<b><i>x</i></b>');
  });
  it('escapes quotes for attributes', () => {
    expect(escapeHtml(`"'&`)).toBe('&quot;&#39;&amp;');
  });
  it('renders null and false as empty', () => {
    expect(String(html`<p>${null}${false}${undefined}</p>`)).toBe('<p></p>');
  });
});

describe('dates', () => {
  it('builds local day keys and adds days', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });
  it('parses and formats HH:MM', () => {
    expect(parseTime('07:30')).toBe(450);
    expect(formatTime(450)).toBe('07:30');
    expect(formatTime(1440 + 15)).toBe('00:15');
  });
  it('starts weeks on Monday', () => {
    expect(dayKey(startOfWeek(new Date(2026, 10, 15)))).toBe('2026-11-09');
    expect(dayKey(startOfWeek(new Date(2026, 10, 9)))).toBe('2026-11-09');
  });
});

describe('database', () => {
  beforeEach(async () => {
    await openDb();
    await clearAll();
  });

  it('stores and lists records', async () => {
    await addRecord('water', { at: '2026-11-10T09:00:00', day: '2026-11-10', ml: 250 });
    const records = await allRecords('water');
    expect(records).toHaveLength(1);
    expect(records[0].ml).toBe(250);
    expect(records[0].id).toBeTypeOf('number');
  });

  it('returns defaults merged with stored settings', async () => {
    expect(await getSetting('water')).toEqual(DEFAULTS.water);
    await setSetting('water', { goalMl: 2500 });
    expect(await getSetting('water')).toEqual({ ...DEFAULTS.water, goalMl: 2500 });
  });
});

describe('backup', () => {
  beforeEach(async () => {
    await openDb();
    await clearAll();
  });

  it('round-trips every store', async () => {
    await addRecord('weights', { date: '2026-11-10', kg: 82.5 });
    await setSetting('water', { goalMl: 2200 });
    const backup = await exportBackup();
    expect(backup.app).toBe('wegoby');
    expect(Object.keys(backup.data).sort()).toEqual([...STORES].sort());
    await clearAll();
    await importBackup(backup);
    expect((await allRecords('weights'))[0].kg).toBe(82.5);
    expect((await getSetting('water')).goalMl).toBe(2200);
  });

  it('rejects foreign or malformed files without touching data', async () => {
    await addRecord('weights', { date: '2026-11-10', kg: 80 });
    expect(validateBackup({ app: 'other' }).ok).toBe(false);
    expect(validateBackup({ app: 'wegoby', version: 1, data: { unknown: [] } }).ok).toBe(false);
    expect(validateBackup({ app: 'wegoby', version: 1, data: { weights: 'x' } }).ok).toBe(false);
    await expect(importBackup({ app: 'other' })).rejects.toThrow();
    expect(await allRecords('weights')).toHaveLength(1);
  });
});
