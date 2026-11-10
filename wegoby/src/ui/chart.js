import { html, raw } from './html.js';

function scale(points, { width, height, pad }) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const sx = (x) => (maxX === minX ? width / 2 : pad + ((x - minX) / (maxX - minX)) * (width - 2 * pad));
  const sy = (y) => (maxY === minY ? height / 2 : height - pad - ((y - minY) / (maxY - minY)) * (height - 2 * pad));
  return { sx, sy, minY, maxY };
}

const round = (value) => Math.round(value * 10) / 10;

export function linePath(points, size) {
  const { sx, sy } = scale(points, size);
  return points.map((point, index) => `${index ? 'L' : 'M'}${round(sx(point.x))},${round(sy(point.y))}`).join(' ');
}

export function lineChart(points, { label, unit = '', width = 320, height = 140 } = {}) {
  if (points.length < 2) return html`<p class="small muted">Hacen falta al menos 2 registros para la gráfica.</p>`;
  const size = { width, height, pad: 16 };
  const { sx, sy, minY, maxY } = scale(points, size);
  const dots = points.map((point) => `<circle cx="${round(sx(point.x))}" cy="${round(sy(point.y))}" r="3" fill="currentColor"/>`).join('');
  return html`<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}: de ${points[0].y} a ${points.at(-1).y} ${unit}">
    <path d="${linePath(points, size)}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
    ${raw(dots)}
    <text x="2" y="12">${maxY} ${unit}</text>
    <text x="2" y="${height - 4}">${minY} ${unit}</text>
  </svg>`;
}

const RING_RADIUS = 42;

export function ringGeometry(value, max) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const circumference = 2 * Math.PI * RING_RADIUS;
  return { percent, circumference, offset: circumference * (1 - percent / 100) };
}

export function progressRing(value, max, { label, value: display, tone = 'primary' }) {
  const { percent, circumference, offset } = ringGeometry(value, max);
  return html`<figure class="ring ring-${tone}">
    <svg viewBox="0 0 100 100" role="img" aria-label="${label}: ${display}, ${percent} %">
      <circle class="ring-track" cx="50" cy="50" r="${RING_RADIUS}" />
      <circle class="ring-value" cx="50" cy="50" r="${RING_RADIUS}" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 50 50)" />
      <text x="50" y="47" text-anchor="middle" class="ring-percent">${percent}%</text>
      <text x="50" y="64" text-anchor="middle" class="ring-display">${display}</text>
    </svg>
    <figcaption>${label}</figcaption>
  </figure>`;
}

export function hourlyTotals(records, field, fromHour, toHour) {
  const buckets = new Map();
  for (let hour = fromHour; hour <= toHour; hour += 1) buckets.set(hour, 0);
  records.forEach((record) => {
    const hour = Number(record.at.slice(11, 13));
    if (buckets.has(hour)) buckets.set(hour, buckets.get(hour) + record[field]);
  });
  return [...buckets].map(([hour, value]) => ({ hour, value }));
}

export function barChart(buckets, { label, unit, marks = [], width = 320, height = 120 }) {
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);
  const slot = width / buckets.length;
  const barWidth = Math.max(4, slot * 0.6);
  const base = height - 18;
  const bars = buckets.map((bucket, index) => {
    const barHeight = Math.round((bucket.value / max) * (base - 8));
    const x = round(index * slot + (slot - barWidth) / 2);
    const mark = marks.includes(bucket.hour)
      ? raw(`<circle class="mark" cx="${round(x + barWidth / 2)}" cy="${base + 6}" r="2.5"/>`)
      : '';
    const tick = bucket.hour % 3 === 0 ? raw(`<text x="${round(x + barWidth / 2)}" y="${height - 1}" text-anchor="middle">${bucket.hour}h</text>`) : '';
    return html`<rect class="bar" x="${x}" y="${base - barHeight}" width="${round(barWidth)}" height="${Math.max(barHeight, bucket.value ? 2 : 0)}" rx="3"><title>${bucket.hour}:00 · ${bucket.value} ${unit}</title></rect>${mark}${tick}`;
  });
  return html`<svg class="bars" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
    <line class="baseline" x1="0" x2="${width}" y1="${base}" y2="${base}" />
    ${bars}
  </svg>`;
}
