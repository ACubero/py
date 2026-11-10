import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { recordsForDay, addRecord, deleteRecord, setSetting } from '../db/index.js';
import { dayKey, localIso } from '../domain/dates.js';
import { proteinTarget, idealWeightDevine, adjustedWeight, QUICK_FOODS, QUICK_FOODS_NOTE } from '../domain/protein.js';
import { loadSettings, latestWeightKg, progressBar, timeOf, sourceNote, formatNumber } from './common.js';

export const title = 'Proteína';

export async function proteinSummary() {
  const { profile, protein } = await loadSettings('profile', 'protein');
  const weightKg = await latestWeightKg();
  const records = await recordsForDay('protein', dayKey());
  const total = records.reduce((sum, record) => sum + record.grams, 0);
  const target = proteinTarget({ weightKg, heightCm: profile.heightCm, sex: profile.sex, gPerKg: protein.gPerKg, useAdjustedWeight: protein.useAdjustedWeight });
  return { profile, protein, weightKg, records, total, target };
}

export async function render() {
  const { profile, protein, weightKg, records, total, target } = await proteinSummary();
  const reference =
    protein.useAdjustedWeight && profile.heightCm && weightKg ? adjustedWeight(weightKg, idealWeightDevine(profile.heightCm, profile.sex)) : weightKg;

  return html`
    <section class="card">
      <div class="card-title">${icon('egg')}<h2>Hoy</h2></div>
      <p class="big-number">${total} g <span class="muted small">${target ? html`de ${target} g` : 'sin objetivo'}</span></p>
      ${target ? progressBar(total, target, 'Proteína de hoy') : html`<p class="small muted">Indica tu peso y altura para calcular el objetivo.</p>`}
      <p class="small muted" style="margin-top:.5rem">Pon la proteína primero en el plato y repártela en 3–4 tomas.</p>
    </section>
    <section class="card">
      <h2>Añadir rápido</h2>
      <ul class="list">${QUICK_FOODS.map((food) => html`<li><span>${food.label}</span><button type="button" class="btn" data-food="${food.id}">+${food.grams} g</button></li>`)}</ul>
      <p class="small muted">${QUICK_FOODS_NOTE}</p>
      <form id="protein-custom">
        <div class="field"><label for="p-label">Otro alimento</label><input id="p-label" name="label" type="text" placeholder="p. ej. lentejas con pollo" /></div>
        <div class="field"><label for="p-grams">Proteína (g)</label><input id="p-grams" name="grams" type="number" min="1" max="200" required /></div>
        <button type="submit" class="btn btn-primary">Añadir</button>
      </form>
    </section>
    <section class="card">
      <h2>Registro de hoy</h2>
      ${records.length
        ? html`<ul class="list">${records.map((record) => html`<li><span>${timeOf(record.at)} · ${record.label} · ${record.grams} g</span><button type="button" class="icon-button" data-remove="${record.id}" aria-label="Borrar">${icon('trash')}</button></li>`)}</ul>`
        : html`<p class="muted">Aún no has apuntado proteína hoy.</p>`}
    </section>
    <section class="card">
      <h2>Objetivo</h2>
      <p class="small">Cálculo: ${formatNumber(protein.gPerKg, 2)} g por kg × ${reference ? `${formatNumber(reference)} kg` : '—'}${protein.useAdjustedWeight ? ' (peso ajustado)' : ''}.</p>
      <form id="protein-settings">
        <div class="field"><label for="p-gkg">Gramos por kg y día</label><input id="p-gkg" name="gPerKg" type="number" min="0.6" max="2" step="0.1" value="${protein.gPerKg}" /><span class="hint">Pon la cifra que te indique tu médico o dietista-nutricionista.</span></div>
        <label class="check"><input type="checkbox" name="useAdjustedWeight" ${protein.useAdjustedWeight ? 'checked' : ''} /> Usar peso ajustado</label>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
      ${sourceNote('consenso ACLM/ASN/OMA/TOS 2025 sobre nutrición con GLP-1 (prioriza proteína y ejercicio de fuerza); se han propuesto hasta 1,2–1,5 g/kg/día con evidencia limitada. Peso ajustado = peso ideal (Devine) + 0,4 × (peso real − peso ideal), una convención clínica entre varias.')}
    </section>`;
}

export function bind(root, ctx) {
  const add = async (label, grams) => {
    await addRecord('protein', { at: localIso(), day: dayKey(), label, grams });
    toast(`+${grams} g de proteína`);
    ctx.refresh();
  };
  on(root, 'click', '[data-food]', (event, button) => {
    const food = QUICK_FOODS.find((item) => item.id === button.dataset.food);
    add(food.label, food.grams);
  });
  root.querySelector('#protein-custom').addEventListener('submit', (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    add(values.label || 'Otro', values.grams);
  });
  on(root, 'click', '[data-remove]', async (event, button) => {
    await deleteRecord('protein', Number(button.dataset.remove));
    ctx.refresh();
  });
  root.querySelector('#protein-settings').addEventListener('submit', async (event) => {
    event.preventDefault();
    await setSetting('protein', readForm(event.currentTarget));
    toast('Objetivo guardado.');
    ctx.refresh();
  });
}
