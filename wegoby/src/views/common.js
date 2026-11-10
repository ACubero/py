import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { getSetting, allRecords } from '../db/index.js';
import { SEVERITY_LABELS } from '../domain/symptoms.js';
import { dayKey, addDays, fromDayKey, parseDayParam, dateOnDay } from '../domain/dates.js';

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

export function dayNav(route, day) {
  const today = dayKey();
  const prev = dayKey(addDays(fromDayKey(day), -1));
  const next = dayKey(addDays(fromDayKey(day), 1));
  return html`<nav class="day-nav" aria-label="Elegir día">
    <a class="icon-button" href="#/${route}/${prev}" aria-label="Día anterior">${icon('back')}</a>
    <label class="day-nav-label"><span class="sr-only">Día</span><input type="date" data-day-nav="${route}" value="${day}" max="${today}" /></label>
    ${day < today ? html`<a class="icon-button" href="#/${route}/${next}" aria-label="Día siguiente">${icon('chevron')}</a><a class="btn btn-soft" href="#/${route}">Hoy</a>` : ''}
  </nav>`;
}

export function bindDayNav(root, ctx) {
  root.querySelector('[data-day-nav]')?.addEventListener('change', (event) => {
    const { value, dataset } = event.currentTarget;
    if (value) ctx.navigate(`${dataset.dayNav}/${parseDayParam(value)}`);
  });
}

export function dayField(id, day = dayKey()) {
  return html`<div class="field"><label for="${id}">Fecha</label><input id="${id}" name="day" type="date" value="${day}" max="${dayKey()}" required /></div>`;
}

export function atFor(day) {
  return day === dayKey() ? new Date() : dateOnDay(day);
}
