import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { recordsForDay, setSetting, deleteRecord } from '../db/index.js';
import { dayKey } from '../domain/dates.js';
import { dailyMedPlan, medConflicts, suggestCompanionTime, breakfastWindow, MED_LABELS } from '../domain/meds.js';
import { logMed } from '../services/records.js';
import { loadSettings, alertBox, sourceNote, timeOf } from './common.js';

export const title = 'Medicación';

export async function render() {
  const { meds } = await loadSettings('meds');
  const logs = await recordsForDay('medLogs', dayKey());
  const plan = dailyMedPlan(meds);
  const conflicts = medConflicts(meds);
  const breakfast = breakfastWindow(meds.levoTime);
  const takenCount = (kind) => logs.filter((log) => log.kind === kind).length;
  const planCount = {};

  return html`
    <section class="card">
      <h2>Hoy</h2>
      ${plan.length
        ? html`<ul class="list">${plan.map((dose) => {
            planCount[dose.kind] = (planCount[dose.kind] ?? 0) + 1;
            const taken = takenCount(dose.kind) >= planCount[dose.kind];
            const log = logs.filter((row) => row.kind === dose.kind)[planCount[dose.kind] - 1];
            return html`<li><span><strong>${dose.time}</strong> · ${MED_LABELS[dose.kind]}${dose.kind === 'levo' && meds.levoDose ? html` (${meds.levoDose})` : ''}</span>${taken
              ? html`<span class="row"><span class="tag">${icon('check', { size: 16 })} ${timeOf(log.at)}</span><button type="button" class="icon-button" data-undo="${log.id}" aria-label="Deshacer">${icon('trash')}</button></span>`
              : html`<button type="button" class="btn" data-take="${dose.kind}">Tomada</button>`}</li>`;
          })}</ul>`
        : html`<p class="muted">No hay medicación configurada.</p>`}
    </section>
    ${conflicts.map((conflict) =>
      alertBox({
        level: 'warning',
        message: `${MED_LABELS[conflict.kind]} a las ${conflict.time} queda a ${Math.round(conflict.gapMin / 6) / 10} h de la levotiroxina. Sepáralo al menos ${meds.spacingMin / 60} h (sugerencia: ${suggestCompanionTime(meds.levoTime, meds.spacingMin)}).`,
      }),
    )}
    ${meds.levoEnabled
      ? html`<section class="card">
          <div class="card-title">${icon('pill')}<h2>Cómo tomar la levotiroxina</h2></div>
          <ul>
            <li>En ayunas, con un vaso de agua (no café, zumo ni leche).</li>
            <li>Desayuno a partir de las ${breakfast.from} (al menos media hora después).</li>
            <li>Calcio, hierro y antiácidos: sepáralos de la levotiroxina. La ficha española (Eutirox, AEMPS) indica al menos 2 h; otras fichas, como la de EE. UU., 4 h. La app usa ${meds.spacingMin / 60} h: cámbialo abajo si tu médico indica otra cosa.</li>
            <li>Café, soja y comidas muy ricas en fibra pueden reducir su absorción: mantén siempre la misma rutina.</li>
            <li>Al perder peso puedes necesitar menos dosis. Tu endocrino decidirá cuándo revisar la TSH; anota las analíticas en «Analíticas».</li>
          </ul>
          ${sourceNote('ficha técnica de levotiroxina (AEMPS/CIMA). Wegovy (semaglutida) retrasa el vaciado gástrico y puede afectar a la absorción de medicamentos orales (ficha técnica de Wegovy).')}
        </section>`
      : ''}
    <section class="card">
      <h2>Ajustes</h2>
      <form id="meds-form">
        <label class="check"><input type="checkbox" name="levoEnabled" ${meds.levoEnabled ? 'checked' : ''} /> Levotiroxina</label>
        <div class="field"><label for="m-levo-time">Hora</label><input id="m-levo-time" name="levoTime" type="time" value="${meds.levoTime}" /></div>
        <div class="field"><label for="m-levo-dose">Dosis</label><input id="m-levo-dose" name="levoDose" type="text" value="${meds.levoDose}" placeholder="p. ej. 100 µg" /></div>
        <div class="field"><label for="m-spacing">Separación con calcio y hierro</label><select id="m-spacing" name="spacingMin">${[[120, '2 h (mínimo de la ficha española)'], [180, '3 h'], [240, '4 h']].map(([value, label]) => html`<option value="${value}" ${value === meds.spacingMin ? 'selected' : ''}>${label}</option>`)}</select></div>
        <label class="check"><input type="checkbox" name="calciumEnabled" ${meds.calciumEnabled ? 'checked' : ''} /> Calcio o calcitriol</label>
        <div class="field"><label for="m-calcium">Horas del calcio (separadas por comas)</label><input id="m-calcium" name="calciumTimes" type="text" inputmode="numeric" value="${meds.calciumTimes.join(', ')}" pattern="^\\s*\\d{2}:\\d{2}(\\s*,\\s*\\d{2}:\\d{2})*\\s*$" /><span class="hint">Formato 14:00, 21:00</span></div>
        <label class="check"><input type="checkbox" name="ironEnabled" ${meds.ironEnabled ? 'checked' : ''} /> Hierro</label>
        <div class="field"><label for="m-iron">Hora del hierro</label><input id="m-iron" name="ironTime" type="time" value="${meds.ironTime}" /></div>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    </section>`;
}

export function bind(root, ctx) {
  on(root, 'click', '[data-take]', async (event, button) => {
    await logMed(button.dataset.take);
    toast('Anotado.');
    ctx.refresh();
  });
  on(root, 'click', '[data-undo]', async (event, button) => {
    await deleteRecord('medLogs', Number(button.dataset.undo));
    ctx.refresh();
  });
  root.querySelector('#meds-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    const calciumTimes = values.calciumTimes
      .split(',')
      .map((time) => time.trim())
      .filter((time) => /^\d{2}:\d{2}$/.test(time));
    await setSetting('meds', { ...values, spacingMin: Number(values.spacingMin), calciumTimes: calciumTimes.length ? calciumTimes : ['14:00'] });
    toast('Medicación guardada.');
    ctx.refresh();
  });
}
