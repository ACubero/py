import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { allRecords, addRecord, deleteRecord } from '../db/index.js';
import { dayKey, localIso, formatDay } from '../domain/dates.js';
import { evaluateBp } from '../domain/bp.js';
import { deleteButton, alertBox, sourceNote, timeOf } from './common.js';

export const title = 'Tensión arterial';

export async function render() {
  const records = (await allRecords('bp')).sort((a, b) => b.at.localeCompare(a.at));
  const latestAlert = records[0] ? evaluateBp(records[0]) : null;
  return html`
    ${latestAlert ? alertBox(latestAlert) : ''}
    <section class="card">
      <div class="card-title">${icon('heart')}<h2>Nueva medida</h2></div>
      <form id="bp-form">
        <div class="row">
          <div class="field" style="flex:1"><label for="bp-sys">Alta (sistólica)</label><input id="bp-sys" name="sys" type="number" inputmode="numeric" min="60" max="260" required /></div>
          <div class="field" style="flex:1"><label for="bp-dia">Baja (diastólica)</label><input id="bp-dia" name="dia" type="number" inputmode="numeric" min="30" max="160" required /></div>
        </div>
        <div class="field"><label for="bp-pulse">Pulso (opcional)</label><input id="bp-pulse" name="pulse" type="number" inputmode="numeric" min="30" max="220" /></div>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
      <p class="small muted" style="margin-top:.75rem">Mide sentada tras 5 min de reposo, con el brazo apoyado a la altura del corazón, sin café ni tabaco en los 30 min previos. Al perder peso la tensión puede bajar: si tomas medicación para la tensión y notas mareo al levantarte, coméntalo con tu médico.</p>
      ${sourceNote('Guía ESH 2023: hipertensión con medidas en casa a partir de 135/85 de media.')}
    </section>
    <section class="card">
      <h2>Historial</h2>
      ${records.length
        ? html`<ul class="list">${records.map((record) => html`<li><span>${formatDay(record.day)} ${timeOf(record.at)} · <strong>${record.sys}/${record.dia}</strong>${record.pulse ? ` · ${record.pulse} lpm` : ''}</span>${deleteButton('bp', record.id)}</li>`)}</ul>`
        : html`<p class="muted">Sin medidas.</p>`}
    </section>`;
}

export function bind(root, ctx) {
  root.querySelector('#bp-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    await addRecord('bp', { at: localIso(), day: dayKey(), ...values });
    toast('Medida guardada.');
    ctx.refresh();
  });
  on(root, 'click', '[data-delete]', async (event, button) => {
    if (!confirm('¿Borrar esta medida?')) return;
    await deleteRecord('bp', Number(button.dataset.id));
    ctx.refresh();
  });
}
