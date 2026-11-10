import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { allRecords, addRecord, setSetting, deleteRecord } from '../db/index.js';
import { dayKey, formatDay, localIso, weekdayName } from '../domain/dates.js';
import {
  doseSchedule,
  doseStatus,
  stepForDay,
  suggestSite,
  siteLabel,
  penStatus,
  lastDose,
  INJECTION_SITES,
} from '../domain/dose.js';
import { loadSettings, alertBox, deleteButton, sourceNote } from './common.js';

export const title = 'Dosis de Wegovy';

function statusCard(status) {
  if (status.state === 'unset') return alertBox({ level: 'info', message: 'Indica el día de inicio en los ajustes de abajo.' });
  if (status.state === 'today') return alertBox({ level: 'warning', message: `Hoy toca la inyección de ${status.mg} mg.` });
  if (status.state === 'upcoming') {
    return alertBox({ level: 'info', message: `Próxima inyección: ${formatDay(status.nextDay)} (${status.mg} mg), dentro de ${status.daysUntil} días.` });
  }
  const { advice } = status;
  return advice.action === 'take'
    ? alertBox({
        level: 'warning',
        message: `Dosis olvidada del ${formatDay(status.nextDay)}. Han pasado ${advice.daysLate} días: según la ficha técnica, si no han pasado más de 5 días, póntela lo antes posible y vuelve a tu día habitual (${formatDay(advice.nextRegularDay)}).`,
      })
    : alertBox({
        level: 'danger',
        message: `Dosis olvidada del ${formatDay(status.nextDay)}. Han pasado más de 5 días: según la ficha técnica, sáltala y ponte la siguiente en tu día habitual (${formatDay(advice.nextRegularDay)}). Nunca dos dosis juntas. Regístrala como saltada.`,
      });
}

export async function render() {
  const { treatment, pen: penSettings } = await loadSettings('treatment', 'pen');
  const [doses, pens] = await Promise.all([allRecords('doses'), allRecords('pens')]);
  const status = doseStatus(treatment, doses);
  const schedule = doseSchedule(treatment.startDate, treatment.steps);
  const today = dayKey();
  const currentStep = stepForDay(schedule, today);
  const latest = lastDose(doses.filter((dose) => !dose.skipped));
  const suggested = suggestSite(latest?.site ?? null);
  const pen = pens.reduce((best, row) => (!best || row.openedDay > best.openedDay ? row : best), null);
  const penInfo = pen ? penStatus(pen, doses, today, penSettings) : null;
  const sorted = [...doses].sort((a, b) => b.day.localeCompare(a.day));
  const defaultMg = status.mg ?? currentStep?.mg ?? '';

  return html`
    ${statusCard(status)}
    <section class="card">
      <div class="card-title">${icon('syringe')}<h2>Registrar inyección</h2></div>
      <form id="dose-form">
        <div class="field"><label for="dose-day">Fecha</label><input id="dose-day" name="day" type="date" value="${today}" max="${today}" required /></div>
        <div class="field"><label for="dose-mg">Dosis (mg)</label><input id="dose-mg" name="mg" type="number" step="0.05" min="0" value="${defaultMg}" required /></div>
        <div class="field"><label for="dose-site">Zona</label>
          <select id="dose-site" name="site">${INJECTION_SITES.map((site) => html`<option value="${site.id}" ${site.id === suggested ? 'selected' : ''}>${site.label}${site.id === suggested ? ' (toca rotar aquí)' : ''}</option>`)}</select>
        </div>
        <div class="field"><label for="dose-notes">Notas</label><input id="dose-notes" name="notes" type="text" /></div>
        <div class="row">
          <button type="submit" class="btn btn-primary">${icon('check')} Registrar</button>
          <button type="button" class="btn" id="dose-skip">Me la he saltado</button>
        </div>
      </form>
    </section>
    <section class="card">
      <h2>Bolígrafo</h2>
      ${penInfo
        ? html`<p>Abierto el ${formatDay(pen.openedDay)}: quedan <strong>${penInfo.dosesLeft}</strong> dosis y <strong>${penInfo.daysLeft}</strong> días de uso.</p>
          ${penInfo.expired ? alertBox({ level: 'danger', message: 'Ha superado el tiempo de uso tras abrirlo: no lo uses, empieza uno nuevo.' }) : ''}
          ${penInfo.empty ? alertBox({ level: 'warning', message: 'Bolígrafo sin dosis: abre uno nuevo.' }) : ''}`
        : html`<p class="muted">Sin bolígrafo registrado.</p>`}
      <button type="button" class="btn" id="pen-new">${icon('plus')} He abierto un bolígrafo nuevo hoy</button>
      <p class="small muted">Comprueba en el prospecto de tu bolígrafo cuántas dosis trae y cuánto tiempo puede usarse una vez abierto; ajústalo abajo.</p>
    </section>
    <section class="card">
      <h2>Calendario de subida de dosis</h2>
      <ul class="list">${schedule.map(
        (step) => html`<li><span><strong>${step.mg} mg</strong> ${step === currentStep ? html`<span class="tag">ahora</span>` : ''}</span><span class="muted small">${formatDay(step.startDay)} → ${step.endDay ? formatDay(step.endDay) : 'mantenimiento'}</span></li>`,
      )}</ul>
      ${sourceNote('ficha técnica de Wegovy (EMA): subida cada 4 semanas hasta 2,4 mg. Tu médico puede retrasar una subida si no la toleras.')}
    </section>
    <section class="card">
      <h2>Historial</h2>
      ${sorted.length
        ? html`<ul class="list">${sorted.map(
            (dose) => html`<li><span>${formatDay(dose.day)} · ${dose.skipped ? 'saltada' : html`${dose.mg} mg · ${siteLabel(dose.site)}`}${dose.notes ? html`<br /><span class="small muted">${dose.notes}</span>` : ''}</span>${deleteButton('doses', dose.id)}</li>`,
          )}</ul>`
        : html`<p class="muted">Aún no hay inyecciones.</p>`}
    </section>
    <section class="card">
      <h2>Ajustes del tratamiento</h2>
      <form id="treatment-form">
        <div class="field"><label for="t-start">Primera inyección</label><input id="t-start" name="startDate" type="date" value="${treatment.startDate ?? ''}" required /></div>
        <div class="field"><label for="t-weekday">Día de la semana</label><select id="t-weekday" name="weekday">${[1, 2, 3, 4, 5, 6, 0].map((index) => html`<option value="${index}" ${index === treatment.weekday ? 'selected' : ''}>${weekdayName(index)}</option>`)}</select>
          <span class="hint">Según la ficha técnica, puedes cambiar el día si pasan al menos 3 días entre dos dosis.</span></div>
        <div class="field"><label for="t-time">Hora del aviso</label><input id="t-time" name="doseTime" type="time" value="${treatment.doseTime}" required /></div>
        <fieldset class="field"><legend>Semanas en cada dosis</legend>
          ${treatment.steps.map(
            (step, index) => html`<div class="row"><span style="min-width:5rem">${step.mg} mg</span>${step.weeks === null
              ? html`<span class="muted">mantenimiento</span>`
              : html`<input aria-label="Semanas con ${step.mg} mg" name="weeks-${index}" type="number" min="1" max="52" value="${step.weeks}" style="max-width:6rem" />`}</div>`,
          )}
        </fieldset>
        <div class="field"><label for="p-doses">Dosis por bolígrafo</label><input id="p-doses" name="dosesPerPen" type="number" min="1" max="10" value="${penSettings.dosesPerPen}" /></div>
        <div class="field"><label for="p-days">Días de uso tras abrirlo</label><input id="p-days" name="inUseDays" type="number" min="1" max="120" value="${penSettings.inUseDays}" /></div>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    </section>`;
}

export function bind(root, ctx) {
  const form = root.querySelector('#dose-form');
  const save = async (skipped) => {
    const values = readForm(form);
    const pens = await allRecords('pens');
    const pen = pens.reduce((best, row) => (!best || row.openedDay > best.openedDay ? row : best), null);
    await addRecord('doses', {
      day: values.day,
      at: localIso(),
      mg: skipped ? null : values.mg,
      site: skipped ? null : values.site,
      penId: skipped ? null : (pen?.id ?? null),
      skipped,
      notes: values.notes,
    });
    toast(skipped ? 'Dosis registrada como saltada.' : 'Inyección registrada.');
    ctx.refresh();
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save(false);
  });
  root.querySelector('#dose-skip').addEventListener('click', () => save(true));
  root.querySelector('#pen-new').addEventListener('click', async () => {
    await addRecord('pens', { openedDay: dayKey() });
    toast('Bolígrafo nuevo registrado.');
    ctx.refresh();
  });
  root.querySelector('#treatment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    const { treatment } = await loadSettings('treatment');
    const steps = treatment.steps.map((step, index) => (step.weeks === null ? step : { ...step, weeks: values[`weeks-${index}`] ?? step.weeks }));
    await setSetting('treatment', { startDate: values.startDate, weekday: Number(values.weekday), doseTime: values.doseTime, steps });
    await setSetting('pen', { dosesPerPen: values.dosesPerPen, inUseDays: values.inUseDays });
    toast('Ajustes guardados.');
    ctx.refresh();
  });
  on(root, 'click', '[data-delete]', async (event, button) => {
    if (!confirm('¿Borrar este registro?')) return;
    await deleteRecord(button.dataset.delete, Number(button.dataset.id));
    ctx.refresh();
  });
}
