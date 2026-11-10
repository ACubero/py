import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { getSetting, allRecords } from '../db/index.js';
import { SEVERITY_LABELS } from '../domain/symptoms.js';

export async function loadSettings(...keys) {
  const values = await Promise.all(keys.map((key) => getSetting(key)));
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}

export async function latestWeightKg() {
  const weights = await allRecords('weights');
  const latest = weights.reduce((best, row) => (!best || row.date > best.date ? row : best), null);
  return latest?.kg ?? (await getSetting('profile')).startWeightKg;
}

export function alertBox({ level, message }) {
  const iconName = level === 'info' ? 'info' : 'alert';
  return html`<div class="alert alert-${level}" role="${level === 'danger' ? 'alert' : 'status'}">${icon(iconName)}<div>${message}</div></div>`;
}

export function progressBar(value, max, label) {
  const percent = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return html`<div class="progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>`;
}

export function severityField(name, label, value = 0) {
  return html`<fieldset class="field">
    <legend>${label}</legend>
    <div class="segmented">
      ${SEVERITY_LABELS.map(
        (text, index) =>
          html`<label><input type="radio" name="${name}" value="${index}" ${index === value ? 'checked' : ''} /><span>${text}</span></label>`,
      )}
    </div>
  </fieldset>`;
}

export function formatLiters(ml) {
  return `${(ml / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} L`;
}

export function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString('es-ES', { maximumFractionDigits: digits });
}

export function timeOf(isoLocal) {
  return isoLocal.slice(11, 16);
}

export function deleteButton(store, id, label = 'Borrar') {
  return html`<button type="button" class="icon-button" data-delete="${store}" data-id="${id}" aria-label="${label}">${icon('trash')}</button>`;
}

export function sourceNote(text) {
  return html`<p class="small muted">${icon('book', { size: 16 })} Fuente: ${text}</p>`;
}
