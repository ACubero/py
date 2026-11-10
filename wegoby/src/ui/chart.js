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
