import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { toast, on } from '../ui/dom.js';
import { allRecords, recordsForDay } from '../db/index.js';
import { dayKey, formatDay, startOfWeek, parseTime } from '../domain/dates.js';
import { doseStatus } from '../domain/dose.js';
import { dailyMedPlan, MED_LABELS } from '../domain/meds.js';
import { waterTotal, waterReminderTimes } from '../domain/water.js';
import { weeklySummary } from '../domain/exercise.js';
import { addWater, logMed } from '../services/records.js';
import { progressRing, hourlyTotals, barChart } from '../ui/chart.js';
import { loadSettings, formatLiters, alertBox } from './common.js';
import { proteinSummary } from './protein.js';
import { recentSymptomAlerts } from './symptoms.js';

export const title = 'Hoy';
export const wide = true;

function greeting(hour) {
  if (hour < 12) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function doseChip(status) {
  if (status.state === 'unset') return 'Configura Wegovy';
  if (status.state === 'today') return `Hoy: Wegovy ${status.mg} mg`;
  if (status.state === 'upcoming') return `Wegovy en ${status.daysUntil} ${status.daysUntil === 1 ? 'día' : 'días'}`;
  return 'Dosis de Wegovy olvidada';
}

function doseBody(status) {
  if (status.state === 'unset') return html`<p class="muted">Configura el tratamiento.</p>`;
  if (status.state === 'today') return html`<p class="big-number">Hoy</p><p class="muted">${status.mg} mg</p>`;
  if (status.state === 'upcoming') return html`<p class="big-number">${formatDay(status.nextDay)}</p><p class="muted">${status.mg} mg · dentro de ${status.daysUntil} días</p>`;
  return html`<p class="big-number" style="color:var(--color-danger)">Olvidada</p><p>${status.advice.action === 'take' ? 'Póntela hoy (menos de 5 días de retraso).' : 'Sáltala y espera a tu día habitual.'}</p>`;
}

function waterHours(water) {
  const from = Math.floor(parseTime(water.start) / 60);
  const bed = Math.floor(parseTime(water.bedtime) / 60);
  return { from: Math.max(0, Math.min(from, 12)), to: bed > from ? Math.min(23, bed) : 23 };
}

export async function render() {
  const now = new Date();
  const today = dayKey(now);
  const { treatment, meds, water, exercise } = await loadSettings('treatment', 'meds', 'water', 'exercise');
  const [doses, medLogs, waterRecords, workouts, protein, alerts] = await Promise.all([
    allRecords('doses'),
    recordsForDay('medLogs', today),
    recordsForDay('water', today),
    allRecords('workouts'),
    proteinSummary(),
    recentSymptomAlerts(),
  ]);
  const status = doseStatus(treatment, doses);
  const plan = dailyMedPlan(meds);
  const pending = plan.filter((dose, index) => {
    const sameKindBefore = plan.slice(0, index + 1).filter((item) => item.kind === dose.kind).length;
    return medLogs.filter((log) => log.kind === dose.kind).length < sameKindBefore;
  });
  const taken = plan.length - pending.length;
  const waterMl = waterTotal(waterRecords);
  const week = weeklySummary(workouts, dayKey(startOfWeek(now)));
  const hours = waterHours(water);
  const reminderHours = water.remindersEnabled ? waterReminderTimes(water).map((time) => Number(time.slice(0, 2))) : [];
  const seen = new Set();
  const uniqueAlerts = alerts.filter((alert) => !seen.has(alert.id) && seen.add(alert.id));

  return html`
    <section class="hero">
      <p class="hero-date">${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h2 class="hero-title">${greeting(now.getHours())}</h2>
      <div class="chips">
        <a class="chip" href="#/dosis">${icon('syringe')} ${doseChip(status)}</a>
        <a class="chip" href="#/medicacion">${icon('pill')} ${pending.length ? `${pending.length} toma${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''}` : 'Medicación al día'}</a>
      </div>
    </section>
    ${uniqueAlerts.map(alertBox)}
    <section class="card">
      <div class="card-title">${icon('activity')}<h2>Tu día de un vistazo</h2></div>
      <div class="rings">
        ${progressRing(waterMl, water.goalMl, { label: 'Agua', value: formatLiters(waterMl) })}
        ${progressRing(protein.total, protein.target ?? 0, { label: 'Proteína', value: protein.target ? `${protein.total} de ${protein.target} g` : `${protein.total} g`, tone: 'accent' })}
        ${progressRing(taken, plan.length, { label: 'Medicación', value: plan.length ? `${taken} de ${plan.length}` : 'sin pauta', tone: 'ok' })}
        ${progressRing(week.strengthDays, exercise.weeklyStrengthDays, { label: 'Fuerza (semana)', value: exercise.physioCleared ? `${week.strengthDays} de ${exercise.weeklyStrengthDays} días` : 'pendiente', tone: 'sun' })}
      </div>
    </section>
    <div class="dashboard">
      <section class="card span-all">
        <div class="card-title">${icon('droplet')}<h2>Agua por horas</h2></div>
        <p><strong>${formatLiters(waterMl)}</strong> <span class="muted">de ${formatLiters(water.goalMl)}</span></p>
        ${barChart(hourlyTotals(waterRecords, 'ml', hours.from, hours.to), { label: `Agua bebida hoy por horas: ${waterMl} ml`, unit: 'ml', marks: reminderHours })}
        <div class="legend"><span>Agua bebida</span>${reminderHours.length ? html`<span style="--dot:var(--color-accent)">Avisos programados</span>` : ''}</div>
        <div class="quick-actions">
          <button type="button" class="btn btn-primary" data-water="250">${icon('plus')} 250 ml</button>
          <button type="button" class="btn btn-soft" data-water="500">${icon('plus')} 500 ml</button>
        </div>
      </section>
      <a class="card" href="#/dosis">
        <div class="card-title">${icon('syringe')}<h2>Wegovy</h2>${icon('chevron', { size: 20 })}</div>
        ${doseBody(status)}
      </a>
      <section class="card">
        <div class="card-title">${icon('pill')}<h2>Medicación</h2></div>
        ${pending.length
          ? html`<ul class="list">${pending.map((dose) => html`<li><span><strong>${dose.time}</strong> · ${MED_LABELS[dose.kind]}</span><button type="button" class="btn btn-soft" data-take="${dose.kind}">Tomada</button></li>`)}</ul>`
          : html`<p>${icon('check')} Todo tomado por hoy.</p>`}
      </section>
      <a class="card" href="#/sintomas">
        <div class="card-title">${icon('heart')}<h2>¿Cómo te encuentras?</h2>${icon('chevron', { size: 20 })}</div>
        <p class="muted">Apunta náuseas, dolor u otros síntomas. Te avisaremos si alguno requiere consultar.</p>
      </a>
    </div>`;
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
