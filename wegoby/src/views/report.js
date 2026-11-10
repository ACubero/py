import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { openDb, STORES } from '../db/index.js';
import { dayKey, addDays, formatDay } from '../domain/dates.js';
import { buildReport } from '../domain/report.js';
import { siteLabel, doseSchedule, stepForDay } from '../domain/dose.js';
import { loadSettings, formatNumber } from './common.js';

export const title = 'Informe para el médico';

const PERIODS = [4, 8, 12, 26];

async function loadAll() {
  const db = await openDb();
  const data = {};
  for (const store of STORES.filter((name) => name !== 'settings')) data[store] = await db.getAll(store);
  return data;
}

function table(headers, rows) {
  if (!rows.length) return html`<p class="muted small">Sin datos en el periodo.</p>`;
  return html`<div class="table-wrap"><table><thead><tr>${headers.map((header) => html`<th>${header}</th>`)}</tr></thead><tbody>${rows.map((row) => html`<tr>${row.map((cell) => html`<td>${cell ?? '—'}</td>`)}</tr>`)}</tbody></table></div>`;
}

export async function render(ctx) {
  const weeks = PERIODS.includes(Number(ctx.params[0])) ? Number(ctx.params[0]) : 8;
  const to = dayKey();
  const from = dayKey(addDays(new Date(), -weeks * 7 + 1));
  const { profile, treatment, meds } = await loadSettings('profile', 'treatment', 'meds');
  const report = buildReport(await loadAll(), from, to, weeks * 7);
  const step = stepForDay(doseSchedule(treatment.startDate, treatment.steps), to);
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null;

  return html`
    <section class="card no-print">
      <div class="row">${PERIODS.map((value) => html`<a class="btn ${value === weeks ? 'btn-primary' : ''}" href="#/informe/${value}">${value} sem.</a>`)}</div>
      <button type="button" class="btn btn-primary btn-block" id="print" style="margin-top:.75rem">${icon('file')} Imprimir o guardar en PDF</button>
      <p class="small muted" style="margin-top:.5rem">En Android: Imprimir → «Guardar como PDF», y compártelo con tu médico.</p>
    </section>
    <section class="card">
      <h2>Resumen · ${formatDay(from)} – ${formatDay(to)}</h2>
      <p>${age ? `${age} años · ` : ''}${profile.heightCm ? `${profile.heightCm} cm · ` : ''}Wegovy desde ${treatment.startDate ? formatDay(treatment.startDate) : '—'}${step ? ` · dosis actual prevista ${step.mg} mg` : ''}</p>
      <p>Levotiroxina: ${meds.levoEnabled ? `${meds.levoDose || 'dosis no indicada'} a las ${meds.levoTime}; marcada como tomada ${report.medDays} de ${weeks * 7} días` : 'no'}</p>
      <p>Media diaria: agua ${report.waterAvgMl !== null ? `${formatNumber(report.waterAvgMl / 1000, 2)} L` : '—'} · proteína ${report.proteinAvgG ?? '—'} g</p>
    </section>
    <section class="card">
      <h2>Inyecciones</h2>
      ${table(['Fecha', 'Dosis', 'Zona', 'Notas'], report.doses.map((dose) => [formatDay(dose.day), dose.skipped ? 'saltada' : `${dose.mg} mg`, dose.site ? siteLabel(dose.site) : null, dose.notes || null]))}
    </section>
    <section class="card">
      <h2>Peso y cintura</h2>
      ${table(['Fecha', 'Peso (kg)', 'Cintura (cm)'], report.weights.map((row) => [formatDay(row.date), formatNumber(row.kg), row.waistCm]))}
    </section>
    <section class="card">
      <h2>Analíticas</h2>
      ${table(['Fecha', 'TSH', 'T4 libre', 'Calcio', 'Notas'], report.labs.map((row) => [formatDay(row.date), row.tsh, row.ft4, row.calcium, row.notes || null]))}
    </section>
    <section class="card">
      <h2>Síntomas (días con intensidad moderada o intensa)</h2>
      ${table(['Síntoma', 'Días'], report.symptomDays.map((row) => [row.label, row.days]))}
      ${report.noFluidsDays ? html`<p><strong>Días sin retener líquidos 24 h: ${report.noFluidsDays}</strong></p>` : ''}
    </section>
    <section class="card">
      <h2>Ejercicio y tendón de Aquiles</h2>
      <p>Sesiones: ${report.workouts.length} · minutos totales: ${report.workouts.reduce((sum, workout) => sum + (workout.minutes ?? 0), 0)}</p>
      <p>Dolor medio del tendón (0–10): durante ${report.painDuringAvg ?? '—'} · por la mañana ${report.painMorningAvg ?? '—'}</p>
    </section>
    <section class="card">
      <h2>Tensión arterial</h2>
      ${table(['Fecha', 'Tensión', 'Pulso'], report.bp.map((row) => [formatDay(row.day), `${row.sys}/${row.dia}`, row.pulse]))}
    </section>
    <p class="small muted">Generado con Wegoby el ${formatDay(to)}. Datos registrados por la paciente.</p>`;
}

export function bind(root) {
  root.querySelector('#print').addEventListener('click', () => window.print());
}
