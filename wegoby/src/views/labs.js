import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { allRecords, addRecord, deleteRecord, setSetting } from '../db/index.js';
import { dayKey, formatDay, fromDayKey } from '../domain/dates.js';
import { lineChart } from '../ui/chart.js';
import { loadSettings, deleteButton, alertBox } from './common.js';
import { weightPoints } from './weight.js';

export const title = 'Analíticas';

export async function render() {
  const { labs } = await loadSettings('labs');
  const [records, weights] = await Promise.all([allRecords('labs'), allRecords('weights')]);
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const tshPoints = [...records]
    .filter((record) => record.tsh !== null && record.tsh !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => ({ x: fromDayKey(record.date).getTime(), y: record.tsh }));

  return html`
    ${labs.nextLabDate && labs.nextLabDate >= dayKey()
      ? alertBox({ level: 'info', message: `Próxima analítica: ${formatDay(labs.nextLabDate)}. Te avisaremos la tarde anterior.` })
      : ''}
    <section class="card">
      <div class="card-title">${icon('flask')}<h2>TSH y peso</h2></div>
      <p class="small muted">Al perder peso suele bajar la dosis de levotiroxina necesaria. Compara ambas gráficas con tu endocrino.</p>
      <h3>TSH (mUI/L)</h3>
      ${lineChart(tshPoints, { label: 'Evolución de la TSH', unit: '' })}
      <h3>Peso (kg)</h3>
      ${lineChart(weightPoints(weights), { label: 'Evolución del peso', unit: 'kg' })}
      <p class="small muted">Usa los rangos de referencia de tu laboratorio; el objetivo de TSH lo fija tu endocrino.</p>
    </section>
    <section class="card">
      <h2>Próxima analítica</h2>
      <form id="next-lab" class="row">
        <label class="sr-only" for="lab-next">Fecha</label>
        <input id="lab-next" name="nextLabDate" type="date" value="${labs.nextLabDate ?? ''}" style="flex:1" />
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
      <p class="small muted" style="margin-top:.5rem">Pregunta si debes tomar la levotiroxina antes o después de la extracción ese día.</p>
    </section>
    <section class="card">
      <h2>Añadir resultados</h2>
      <form id="lab-form">
        <div class="field"><label for="lab-date">Fecha</label><input id="lab-date" name="date" type="date" value="${dayKey()}" max="${dayKey()}" required /></div>
        <div class="field"><label for="lab-tsh">TSH (mUI/L)</label><input id="lab-tsh" name="tsh" type="number" step="0.01" min="0" max="200" /></div>
        <div class="field"><label for="lab-ft4">T4 libre</label><input id="lab-ft4" name="ft4" type="number" step="0.01" min="0" max="200" /></div>
        <div class="field"><label for="lab-ca">Calcio</label><input id="lab-ca" name="calcium" type="number" step="0.01" min="0" max="50" /></div>
        <div class="field"><label for="lab-notes">Notas (unidades, otros valores)</label><input id="lab-notes" name="notes" type="text" maxlength="200" /></div>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    </section>
    <section class="card">
      <h2>Historial</h2>
      ${sorted.length
        ? html`<ul class="list">${sorted.map(
            (record) => html`<li><span>${formatDay(record.date)}<br /><span class="small">${[record.tsh !== null ? `TSH ${record.tsh}` : '', record.ft4 !== null ? `T4L ${record.ft4}` : '', record.calcium !== null ? `Ca ${record.calcium}` : ''].filter(Boolean).join(' · ')}${record.notes ? ` · ${record.notes}` : ''}</span></span>${deleteButton('labs', record.id)}</li>`,
          )}</ul>`
        : html`<p class="muted">Sin resultados.</p>`}
    </section>`;
}

export function bind(root, ctx) {
  root.querySelector('#next-lab').addEventListener('submit', async (event) => {
    event.preventDefault();
    await setSetting('labs', { nextLabDate: readForm(event.currentTarget).nextLabDate || null });
    toast('Fecha guardada.');
    ctx.refresh();
  });
  root.querySelector('#lab-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    if (values.tsh === null && values.ft4 === null && values.calcium === null) {
      toast('Introduce al menos un valor.');
      return;
    }
    await addRecord('labs', values);
    toast('Resultados guardados.');
    ctx.refresh();
  });
  on(root, 'click', '[data-delete]', async (event, button) => {
    if (!confirm('¿Borrar este registro?')) return;
    await deleteRecord('labs', Number(button.dataset.id));
    ctx.refresh();
  });
}
