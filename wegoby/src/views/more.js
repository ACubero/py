import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';

export const title = 'Más';
export const wide = true;

const ITEMS = [
  ['medicacion', 'pill', 'Medicación', ''],
  ['proteina', 'egg', 'Proteína', 'tile-accent'],
  ['sintomas', 'activity', 'Síntomas', 'tile-sun'],
  ['peso', 'scale', 'Peso y medidas', ''],
  ['analiticas', 'flask', 'Analíticas', 'tile-accent'],
  ['tension', 'heart', 'Tensión arterial', 'tile-sun'],
  ['informe', 'file', 'Informe para el médico', ''],
  ['guia', 'book', 'Guía', 'tile-accent'],
  ['ajustes', 'settings', 'Ajustes', 'tile-sun'],
];

export async function render() {
  return html`<ul class="tiles">${ITEMS.map(
    ([route, iconName, label, tone]) => html`<li><a class="tile ${tone}" href="#/${route}">${icon(iconName)}<span>${label}</span></a></li>`,
  )}</ul>`;
}
