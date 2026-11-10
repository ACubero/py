import { html } from '../ui/html.js';
import { readForm, toast } from '../ui/dom.js';
import { setSetting, addRecord } from '../db/index.js';
import { dayKey, weekdayName } from '../domain/dates.js';
import { DEFAULTS } from '../domain/defaults.js';

export const title = 'Bienvenida';

export const DISCLAIMER =
  'Wegoby registra y recuerda; no sustituye a tu médico. Las cifras siguen la ficha técnica de cada medicamento y guías citadas, y puedes ajustarlas a lo que te paute tu equipo sanitario. Ante un síntoma grave llama al 112.';

export const SCREENING_QUESTIONS = [
  { id: 'heartDisease', text: '¿Tienes diagnosticada alguna enfermedad cardíaca, renal o diabetes?' },
  { id: 'symptomsOnEffort', text: '¿Notas dolor en el pecho, falta de aire desproporcionada o mareo al hacer esfuerzos?' },
  { id: 'jointPain', text: '¿Tienes dolor articular o tendinoso que empeora con el ejercicio?' },
];

function weekdayOptions(selected) {
  return [1, 2, 3, 4, 5, 6, 0].map(
    (index) => html`<option value="${index}" ${index === selected ? 'selected' : ''}>${weekdayName(index)}</option>`,
  );
}

export async function render() {
  return html`
    <section class="card">
      <h2>Antes de empezar</h2>
      <p>${DISCLAIMER}</p>
    </section>
    <form id="onboarding" class="stack">
      <section class="card">
        <h2>Tus datos</h2>
        <div class="field"><label for="birthYear">Año de nacimiento</label><input id="birthYear" name="birthYear" type="number" inputmode="numeric" min="1920" max="2010" required /></div>
        <div class="field"><label for="heightCm">Altura (cm)</label><input id="heightCm" name="heightCm" type="number" inputmode="numeric" min="120" max="220" required /></div>
        <div class="field"><label for="weightKg">Peso actual (kg)</label><input id="weightKg" name="weightKg" type="number" inputmode="decimal" min="30" max="300" step="0.1" required /></div>
      </section>
      <section class="card">
        <h2>Wegovy</h2>
        <div class="field"><label for="startDate">Día de la primera inyección</label><input id="startDate" name="startDate" type="date" value="${dayKey()}" required /></div>
        <div class="field"><label for="weekday">Día de la semana de la inyección</label><select id="weekday" name="weekday">${weekdayOptions(new Date().getDay())}</select></div>
        <div class="field"><label for="doseTime">Hora del aviso</label><input id="doseTime" name="doseTime" type="time" value="${DEFAULTS.treatment.doseTime}" required /></div>
      </section>
      <section class="card">
        <h2>Medicación del tiroides</h2>
        <label class="check"><input type="checkbox" name="levoEnabled" checked /> Tomo levotiroxina</label>
        <div class="field"><label for="levoTime">Hora de la levotiroxina (en ayunas)</label><input id="levoTime" name="levoTime" type="time" value="${DEFAULTS.meds.levoTime}" /></div>
        <div class="field"><label for="levoDose">Dosis (opcional, p. ej. 100 µg)</label><input id="levoDose" name="levoDose" type="text" /></div>
        <label class="check"><input type="checkbox" name="calciumEnabled" /> Tomo calcio o calcitriol (por ejemplo, por hipoparatiroidismo)</label>
      </section>
      <section class="card">
        <h2>Descanso</h2>
        <div class="field"><label for="bedtime">Hora habitual de acostarte</label><input id="bedtime" name="bedtime" type="time" value="${DEFAULTS.water.bedtime}" /><span class="hint">Los avisos de agua paran 2 h antes.</span></div>
      </section>
      <section class="card">
        <h2>Ejercicio</h2>
        ${SCREENING_QUESTIONS.map((question) => html`<label class="check"><input type="checkbox" name="${question.id}" /> ${question.text}</label>`)}
        <label class="check"><input type="checkbox" name="physioCleared" /> Mi fisioterapeuta o traumatólogo me ha autorizado a hacer ejercicio con mi tendón de Aquiles</label>
      </section>
      <section class="card">
        <label class="check"><input type="checkbox" name="disclaimerAccepted" required /> He leído el aviso: Wegoby no sustituye a mi médico.</label>
        <button type="submit" class="btn btn-primary btn-block">Empezar</button>
      </section>
    </form>`;
}

export function bind(root, ctx) {
  root.querySelector('#onboarding').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    const screening = Object.fromEntries(SCREENING_QUESTIONS.map((question) => [question.id, values[question.id]]));
    await setSetting('profile', { birthYear: values.birthYear, heightCm: values.heightCm, startWeightKg: values.weightKg });
    await setSetting('treatment', { startDate: values.startDate, weekday: Number(values.weekday), doseTime: values.doseTime });
    await setSetting('meds', {
      levoEnabled: values.levoEnabled,
      levoTime: values.levoTime || DEFAULTS.meds.levoTime,
      levoDose: values.levoDose,
      calciumEnabled: values.calciumEnabled,
    });
    await setSetting('water', { bedtime: values.bedtime || DEFAULTS.water.bedtime });
    await setSetting('exercise', { screening, physioCleared: values.physioCleared });
    await addRecord('weights', { date: dayKey(), kg: values.weightKg, waistCm: null });
    await setSetting('onboarding', { done: true, disclaimerAccepted: true });
    toast('Listo. Puedes cambiar todo en Ajustes.');
    ctx.navigate('hoy');
  });
}
