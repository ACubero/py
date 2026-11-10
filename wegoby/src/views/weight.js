import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { allRecords, addRecord, deleteRecord } from '../db/index.js';
import { dayKey, formatDay, fromDayKey } from '../domain/dates.js';
import { weightStats, WAIST_RISK_CM } from '../domain/weight.js';
import { lineChart } from '../ui/chart.js';
import { loadSettings, deleteButton, sourceNote, formatNumber } from './common.js';

export const title = 'Peso y medidas';

export function weightPoints(records) {
  return [...records]
    .filter((record) => record.kg)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => ({ x: fromDayKey(record.date).getTime(), y: record.kg }));
}

export async function render() {
  const { profile } = await loadSettings('profile');
  const records = await allRecords('weights');
  const stats = weightStats(records, profile.heightCm);
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return html`
    <section class="card">
      <div class="card-title">${icon('scale')}<h2>Resumen</h2></div>
      ${stats
        ? html`<p class="big-number">${formatNumber(stats.currentKg)} kg</p>
          <p>${stats.lostKg >= 0 ? 'Perdidos' : 'Ganados'}: <strong>${formatNumber(Math.abs(stats.lostKg))} kg</strong> (${formatNumber(Math.abs(stats.lostPercent))} %) desde ${formatNumber(stats.startKg)} kg</p>
          ${stats.bmi ? html`<p class="small">IMC: ${formatNumber(stats.bmi)} (orientativo: no distingue músculo de grasa).</p>` : ''}
          ${stats.waistCm ? html`<p class="small">Cintura: ${stats.waistCm} cm${stats.waistRisk ? ` · por encima de ${WAIST_RISK_CM} cm (riesgo cardiovascular aumentado)` : ''}</p>` : ''}
          ${lineChart(weightPoints(records), { label: 'Evolución del peso', unit: 'kg' })}`
        : html`<p class="muted">Aún no hay registros.</p>`}
    </section>
    <section class="card">
      <h2>Nuevo registro</h2>
      <form id="weight-form">
        <div class="field"><label for="wt-date">Fecha</label><input id="wt-date" name="date" type="date" value="${dayKey()}" max="${dayKey()}" required /></div>
        <div class="field"><label for="wt-kg">Peso (kg)</label><input id="wt-kg" name="kg" type="number" inputmode="decimal" min="30" max="300" step="0.1" required /></div>
        <div class="field"><label for="wt-waist">Cintura (cm, opcional)</label><input id="wt-waist" name="waistCm" type="number" inputmode="decimal" min="40" max="200" step="0.5" /><span class="hint">A la altura del ombligo, de pie, al final de una espiración normal.</span></div>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
      <p class="small muted" style="margin-top:.75rem">Pésate una vez por semana, el mismo día, en ayunas y después de orinar.</p>
      ${sourceNote('cintura > 88 cm en mujeres: criterio NCEP ATP III.')}
    </section>
    <section class="card">
      <h2>Historial</h2>
      ${sorted.length
        ? html`<ul class="list">${sorted.map((record) => html`<li><span>${formatDay(record.date)} · ${formatNumber(record.kg)} kg${record.waistCm ? ` · ${record.waistCm} cm` : ''}</span>${deleteButton('weights', record.id)}</li>`)}</ul>`
        : html`<p class="muted">Sin registros.</p>`}
    </section>`;
}

export function bind(root, ctx) {
  root.querySelector('#weight-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await addRecord('weights', readForm(event.currentTarget));
    toast('Peso guardado.');
    ctx.refresh();
  });
  on(root, 'click', '[data-delete]', async (event, button) => {
    if (!confirm('¿Borrar este registro?')) return;
    await deleteRecord('weights', Number(button.dataset.id));
    ctx.refresh();
  });
}
