import { describe, it, expect } from 'vitest';
import { ringGeometry, progressRing, hourlyTotals, barChart } from '../src/ui/chart.js';

describe('today charts', () => {
  it('computes ring dash offset and clamps above 100 %', () => {
    expect(ringGeometry(50, 100)).toMatchObject({ percent: 50 });
    const half = ringGeometry(50, 100);
    expect(half.offset).toBeCloseTo(half.circumference / 2, 5);
    expect(ringGeometry(250, 100)).toMatchObject({ percent: 100, offset: 0 });
    expect(ringGeometry(10, 0)).toMatchObject({ percent: 0 });
  });

  it('renders an accessible ring with its label and value', () => {
    const markup = String(progressRing(750, 2000, { label: 'Agua', value: '0,75 L' }));
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Agua: 0,75 L, 38 %"');
    expect(markup).toContain('0,75 L');
  });

  it('buckets records by hour of the day', () => {
    const totals = hourlyTotals([
      { at: '2026-11-10T09:05:00', ml: 250 },
      { at: '2026-11-10T09:40:00', ml: 250 },
      { at: '2026-11-10T13:00:00', ml: 500 },
    ], 'ml', 8, 14);
    expect(totals).toEqual([
      { hour: 8, value: 0 },
      { hour: 9, value: 500 },
      { hour: 10, value: 0 },
      { hour: 11, value: 0 },
      { hour: 12, value: 0 },
      { hour: 13, value: 500 },
      { hour: 14, value: 0 },
    ]);
  });

  it('renders one bar per bucket and marks reminder hours', () => {
    const markup = String(barChart([{ hour: 9, value: 500 }, { hour: 10, value: 0 }], { label: 'Agua por horas', unit: 'ml', marks: [10] }));
    expect(markup.match(/class="bar"/g)).toHaveLength(2);
    expect(markup.match(/class="mark"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Agua por horas"');
  });
});
