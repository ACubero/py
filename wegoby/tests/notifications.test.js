import { describe, it, expect } from 'vitest';
import { pendingNotifications } from '../src/push/notifications.js';
import { DEFAULTS } from '../src/domain/defaults.js';

const settings = {
  treatment: { ...DEFAULTS.treatment, startDate: '2026-11-02', weekday: 1, doseTime: '10:00' },
  meds: { ...DEFAULTS.meds, levoTime: '07:00' },
  water: { ...DEFAULTS.water, start: '09:00', bedtime: '23:00', intervalMin: 105 },
  labs: { nextLabDate: null },
};

describe('service worker notification selection (S4)', () => {
  it('shows the due water reminder with a quick +250 ml action', () => {
    const list = pendingNotifications({ settings, waterRecords: [], shownLog: null, now: new Date(2026, 10, 17, 9, 2) });
    expect(list.map((item) => item.key)).toEqual(['water@09:00']);
    expect(list[0].actions[0].action).toBe('water-250');
    expect(list[0].url).toBe('/#/agua');
  });

  it('tolerates a push delayed up to 60 min and never repeats a shown reminder', () => {
    const now = new Date(2026, 10, 16, 10, 50);
    expect(pendingNotifications({ settings, waterRecords: [], shownLog: null, now }).map((item) => item.key)).toEqual(['dose@10:00', 'water@10:45']);
    expect(pendingNotifications({ settings, waterRecords: [], shownLog: { day: '2026-11-16', keys: ['dose@10:00'] }, now }).map((item) => item.key)).toEqual(['water@10:45']);
    expect(pendingNotifications({ settings, waterRecords: [], shownLog: { day: '2026-11-15', keys: ['dose@10:00'] }, now })).toHaveLength(2);
  });

  it('collapses several overdue water reminders into the latest one', () => {
    const list = pendingNotifications({ settings, waterRecords: [], shownLog: null, now: new Date(2026, 10, 17, 9, 50) });
    expect(list.map((item) => item.key)).toEqual(['water@09:00']);
    const later = pendingNotifications({ settings: { ...settings, water: { ...settings.water, intervalMin: 30 } }, waterRecords: [], shownLog: null, now: new Date(2026, 10, 17, 9, 50) });
    expect(later.map((item) => item.key)).toEqual(['water@09:30']);
  });

  it('suppresses water once the local goal is reached', () => {
    const list = pendingNotifications({ settings, waterRecords: [{ ml: 2000 }], shownLog: null, now: new Date(2026, 10, 17, 9, 2) });
    expect(list).toEqual([]);
  });
});
