import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { toast, on } from '../ui/dom.js';
import { allRecords, recordsForDay } from '../db/index.js';
import { dayKey, formatDay } from '../domain/dates.js';
import { doseStatus } from '../domain/dose.js';
import { dailyMedPlan, MED_LABELS } from '../domain/meds.js';
import { waterTotal } from '../domain/water.js';
import { addWater, logMed } from '../services/records.js';
import { loadSettings, progressBar, formatLiters, alertBox } from './common.js';
import { proteinSummary } from './protein.js';
import { recentSymptomAlerts } from './symptoms.js';
import { exerciseWeekCard } from './exercise.js';

export const title = 'Hoy';

function doseLine(status) {
  if (status.state === 'unset') return html`<p class="muted">Configura el tratamiento en Dosis.</p>`;
  if (status.state === 'today') return html`<p class="big-number">Hoy</p><p>${status.mg} mg</p>`;
  if (status.state === 'upcoming') return html`<p class="big-number">${formatDay(status.nextDay)}</p><p class="muted">${status.mg} mg · dentro de ${status.daysUntil} días</p>`;
  return html`<p class="big-number" style="color:var(--color-danger)">Olvidada</p><p>${status.advice.action === 'take' ? 'Póntela hoy (menos de 5 días de retraso).' : 'Sáltala y espera a tu día habitual.'}</p>`;
}

export async function render() {
  const today = dayKey();
  const { treatment, meds, water } = await loadSettings('treatment', 'meds', 'water');
  const [doses, medLogs, waterRecords, protein, alerts] = await Promise.all([
    allRecords('doses'),
    recordsForDay('medLogs', today),
    recordsForDay('water', today),
    proteinSummary(),
    recentSymptomAlerts(),
  ]);
  const status = doseStatus(treatment, doses);
  const pending = dailyMedPlan(meds).filter((dose, index, plan) => {
    const sameKindBefore = plan.slice(0, index + 1).filter((item) => item.kind === dose.kind).length;
    return medLogs.filter((log) => log.kind === dose.kind).length < sameKindBefore;
  });
  const waterMl = waterTotal(waterRecords);
  const seen = new Set();
  const uniqueAlerts = alerts.filter((alert) => !seen.has(alert.id) && seen.add(alert.id));

  return html`
    ${uniqueAlerts.map(alertBox)}
    <a class="card" href="#/dosis" style="display:block;color:inherit;text-decoration:none">
      <div class="card-title">${icon('syringe')}<h2>Wegovy</h2></div>
      ${doseLine(status)}
    </a>
    <section class="card">
      <div class="card-title">${icon('pill')}<h2>Medicación</h2></div>
      ${pending.length
        ? html`<ul class="list">${pending.map((dose) => html`<li><span><strong>${dose.time}</strong> · ${MED_LABELS[dose.kind]}</span><button type="button" class="btn" data-take="${dose.kind}">Tomada</button></li>`)}</ul>`
        : html`<p>${icon('check')} Todo tomado por hoy.</p>`}
    </section>
    <section class="card">
      <div class="card-title">${icon('droplet')}<h2>Agua</h2></div>
      <p><strong>${formatLiters(waterMl)}</strong> de ${formatLiters(water.goalMl)}</p>
      ${progressBar(waterMl, water.goalMl, 'Agua de hoy')}
      <div class="row" style="margin-top:.75rem">
        <button type="button" class="btn btn-primary" data-water="250">+250 ml</button>
        <button type="button" class="btn btn-primary" data-water="500">+500 ml</button>
      </div>
    </section>
    <a class="card" href="#/proteina" style="display:block;color:inherit;text-decoration:none">
      <div class="card-title">${icon('egg')}<h2>Proteína</h2></div>
      <p><strong>${protein.total} g</strong>${protein.target ? html` de ${protein.target} g` : ''}</p>
      ${protein.target ? progressBar(protein.total, protein.target, 'Proteína de hoy') : ''}
    </a>
    ${await exerciseWeekCard()}
    <a class="btn btn-block" href="#/sintomas">${icon('activity')} Apuntar cómo me encuentro</a>`;
}

export function bind(root, ctx) {
  on(root, 'click', '[data-water]', async (event, button) => {
    await addWater(Number(button.dataset.water));
    toast(`+${button.dataset.water} ml`);
    ctx.refresh();
  });
  on(root, 'click', '[data-take]', async (event, button) => {
    await logMed(button.dataset.take);
    toast('Anotado.');
    ctx.refresh();
  });
}
