import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';

export const title = 'Más';

const ITEMS = [
  ['medicacion', 'pill', 'Medicación'],
  ['proteina', 'egg', 'Proteína'],
  ['sintomas', 'activity', 'Síntomas'],
  ['peso', 'scale', 'Peso y medidas'],
  ['analiticas', 'flask', 'Analíticas'],
  ['tension', 'heart', 'Tensión arterial'],
  ['informe', 'file', 'Informe para el médico'],
  ['guia', 'book', 'Guía'],
  ['ajustes', 'settings', 'Ajustes'],
];

export async function render() {
  return html`<section class="card"><ul class="list menu-list">${ITEMS.map(
    ([route, iconName, label]) => html`<li><a href="#/${route}">${icon(iconName)} ${label}</a></li>`,
  )}</ul></section>`;
}
