import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { recordsForDay, setSetting } from '../db/index.js';
import { dayKey } from '../domain/dates.js';
import { waterTotal, waterReminderTimes } from '../domain/water.js';
import { addWater, removeRecord } from '../services/records.js';
import { loadSettings, progressBar, formatLiters, timeOf, sourceNote } from './common.js';
import { pushPanel, bindPushPanel } from './push-panel.js';

export const title = 'Agua';

export async function render() {
  const { water } = await loadSettings('water');
  const records = await recordsForDay('water', dayKey());
  const total = waterTotal(records);
  const times = waterReminderTimes(water);

  return html`
    <section class="card">
      <div class="card-title">${icon('droplet')}<h2>Hoy</h2></div>
      <p class="big-number">${formatLiters(total)} <span class="muted small">de ${formatLiters(water.goalMl)}</span></p>
      ${progressBar(total, water.goalMl, 'Agua de hoy')}
      ${total >= water.goalMl ? html`<p class="small" style="margin-top:.5rem">Objetivo cumplido. Si hace calor, haces ejercicio o tienes vómitos o diarrea, bebe más.</p>` : ''}
      <div class="row" style="margin-top:1rem">
        ${[150, 250, 500].map((ml) => html`<button type="button" class="btn btn-primary" data-add="${ml}">+${ml} ml</button>`)}
      </div>
      <form id="water-custom" class="row" style="margin-top:.75rem">
        <label class="sr-only" for="water-ml">Otra cantidad en ml</label>
        <input id="water-ml" name="ml" type="number" min="10" max="2000" step="10" placeholder="Otra cantidad (ml)" style="flex:1" required />
        <button type="submit" class="btn">Añadir</button>
      </form>
    </section>
    <section class="card">
      <h2>Registro de hoy</h2>
      ${records.length
        ? html`<ul class="list">${records.map((record) => html`<li><span>${timeOf(record.at)} · ${record.ml} ml</span><button type="button" class="icon-button" data-remove="${record.id}" aria-label="Borrar">${icon('trash')}</button></li>`)}</ul>`
        : html`<p class="muted">Aún no has apuntado agua hoy.</p>`}
    </section>
    <section class="card">
      <h2>Consejos</h2>
      <ul>
        <li>A sorbos durante todo el día, sin esperar a tener sed: la semaglutida y la edad reducen la sensación de sed.</li>
        <li>Si te llenas rápido, bebe sobre todo entre comidas.</li>
        <li>Mejor agua, infusiones o caldo; evita bebidas con gas y azucaradas.</li>
        <li>Orina amarillo claro = bien hidratada.</li>
      </ul>
      ${sourceNote('EFSA, valores de referencia de agua: 2,0 L/día de agua total para mujeres adultas (incluye la de los alimentos). Riesgo renal por deshidratación: ficha técnica de Wegovy.')}
    </section>
    ${await pushPanel()}
    <section class="card">
      <h2>Ajustes</h2>
      <form id="water-settings">
        <div class="field"><label for="w-goal">Objetivo diario (ml)</label><input id="w-goal" name="goalMl" type="number" min="500" max="5000" step="100" value="${water.goalMl}" /></div>
        <label class="check"><input type="checkbox" name="remindersEnabled" ${water.remindersEnabled ? 'checked' : ''} /> Avisos para beber</label>
        <div class="field"><label for="w-start">Primer aviso</label><input id="w-start" name="start" type="time" value="${water.start}" /></div>
        <div class="field"><label for="w-bed">Hora de acostarte</label><input id="w-bed" name="bedtime" type="time" value="${water.bedtime}" /><span class="hint">Sin avisos en las 2 h anteriores, para no levantarte de noche.</span></div>
        <div class="field"><label for="w-interval">Cada (minutos)</label><input id="w-interval" name="intervalMin" type="number" min="30" max="240" step="15" value="${water.intervalMin}" /></div>
        <p class="small muted">Avisos previstos: ${times.join(' · ') || 'ninguno'}</p>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    </section>`;
}

export function bind(root, ctx) {
  const add = async (ml) => {
    await addWater(ml);
    toast(`+${ml} ml`);
    ctx.refresh();
  };
  on(root, 'click', '[data-add]', (event, button) => add(Number(button.dataset.add)));
  root.querySelector('#water-custom').addEventListener('submit', (event) => {
    event.preventDefault();
    add(readForm(event.currentTarget).ml);
  });
  on(root, 'click', '[data-remove]', async (event, button) => {
    await removeRecord('water', Number(button.dataset.remove));
    ctx.refresh();
  });
  root.querySelector('#water-settings').addEventListener('submit', async (event) => {
    event.preventDefault();
    await setSetting('water', readForm(event.currentTarget));
    toast('Ajustes guardados.');
    ctx.refresh();
  });
  bindPushPanel(root, ctx);
}
