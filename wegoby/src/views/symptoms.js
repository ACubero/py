import { html } from '../ui/html.js';
import { readForm, toast, on } from '../ui/dom.js';
import { recordsBetween, addRecord, deleteRecord } from '../db/index.js';
import { dayKey, addDays, localIso, formatDay } from '../domain/dates.js';
import { SYMPTOMS, SYMPTOM_GROUPS, SEVERITY_LABELS, evaluateSymptoms } from '../domain/symptoms.js';
import { severityField, alertBox, deleteButton, timeOf, dayField, atFor } from './common.js';

export const title = 'Síntomas';

export async function recentSymptomAlerts(days = 2) {
  const entries = await recordsBetween('symptoms', 'day', dayKey(addDays(new Date(), -days + 1)), dayKey());
  return entries.flatMap(evaluateSymptoms);
}

export async function render() {
  const entries = (await recordsBetween('symptoms', 'day', dayKey(addDays(new Date(), -13)), dayKey())).sort((a, b) => b.at.localeCompare(a.at));
  const groups = Object.entries(SYMPTOM_GROUPS);

  return html`
    ${alertBox({ level: 'info', message: 'Ante un síntoma grave (dolor de pecho, dificultad para respirar, desmayo) llama al 112.' })}
    <form id="symptom-form">
      ${groups.map(
        ([group, label]) => html`<section class="card"><h2>${label}</h2>${SYMPTOMS.filter((symptom) => symptom.group === group).map((symptom) => severityField(symptom.id, symptom.label))}</section>`,
      )}
      <section class="card">
        ${dayField('s-day')}
        <label class="check"><input type="checkbox" name="noFluids24h" /> Llevo más de 24 h sin poder retener líquidos</label>
        <div class="field"><label for="s-notes">Notas</label><textarea id="s-notes" name="notes" rows="2"></textarea></div>
        <button type="submit" class="btn btn-primary btn-block">Guardar</button>
      </section>
    </form>
    <section class="card">
      <h2>Últimos 14 días</h2>
      ${entries.length
        ? html`<ul class="list">${entries.map((entry) => {
            const present = SYMPTOMS.filter((symptom) => entry.items[symptom.id] > 0);
            const alerts = evaluateSymptoms(entry);
            return html`<li><span>${formatDay(entry.day)} ${timeOf(entry.at)}<br /><span class="small">${present.length ? present.map((symptom) => `${symptom.label}: ${SEVERITY_LABELS[entry.items[symptom.id]].toLowerCase()}`).join(' · ') : 'Sin síntomas'}${entry.noFluids24h ? ' · sin retener líquidos 24 h' : ''}</span>${alerts.length ? html`<br /><span class="small" style="color:var(--color-danger)">${alerts.length} aviso(s)</span>` : ''}</span>${deleteButton('symptoms', entry.id)}</li>`;
          })}</ul>`
        : html`<p class="muted">Sin registros.</p>`}
    </section>`;
}

export function bind(root, ctx) {
  root.querySelector('#symptom-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    const items = Object.fromEntries(SYMPTOMS.map((symptom) => [symptom.id, Number(values[symptom.id] ?? 0)]));
    const entry = { at: localIso(atFor(values.day)), day: values.day, items, noFluids24h: values.noFluids24h, notes: values.notes };
    await addRecord('symptoms', entry);
    const alerts = evaluateSymptoms(entry);
    toast(alerts.length ? 'Guardado. Revisa los avisos.' : 'Guardado.');
    await ctx.refresh();
    if (alerts.length) {
      const container = document.querySelector('#app > div');
      container.insertAdjacentHTML('afterbegin', String(html`${alerts.map(alertBox)}`));
    }
  });
  on(root, 'click', '[data-delete]', async (event, button) => {
    if (!confirm('¿Borrar este registro?')) return;
    await deleteRecord('symptoms', Number(button.dataset.id));
    ctx.refresh();
  });
}
