import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, on } from '../ui/dom.js';
import { allRecords, addRecord, putRecord, deleteRecord, recordsForDay, setSetting } from '../db/index.js';
import { dayKey, localIso, startOfWeek, formatDay } from '../domain/dates.js';
import { ROUTINES, ZONES, MATERIALS, getExercise } from '../data/exercises.js';
import { visibleExercises, progressionFor, weeksSinceFirstStrength, weeklySummary, RPE_HINT } from '../domain/exercise.js';
import { evaluatePain } from '../domain/achilles.js';
import { loadSettings, alertBox, progressBar, deleteButton, sourceNote } from './common.js';

export function title(ctx) {
  return ctx?.params?.[0] ? (getExercise(ctx.params[0])?.name ?? 'Ejercicio') : 'Ejercicio';
}

const ACHILLES_TAG = {
  safe: '',
  caution: 'Precaución Aquiles',
  avoid: 'Solo con permiso del fisio',
};

const ACHILLES_NOTE = {
  caution: 'Carga algo el tendón de Aquiles: hazlo solo si el dolor cumple la regla de control y tu fisio está de acuerdo.',
  avoid: 'Ejercicio de pie con movimiento continuo: solo si tu fisio lo ha autorizado.',
};

function videoFacade(video) {
  return html`<figure style="margin:0 0 1rem">
    <div class="video"><button type="button" data-video="${video.id}" aria-label="Reproducir: ${video.title}"><span>${icon('play')} ${video.title}</span></button></div>
    <figcaption class="small muted">Vídeo de ${video.channel}${video.durationMin ? ` · ${video.durationMin} min` : ''} · comprobado el ${video.verifiedAt}. Se abre en el modo de privacidad mejorada de YouTube.</figcaption>
  </figure>`;
}

export async function exerciseWeekCard() {
  const [{ exercise }, workouts] = await Promise.all([loadSettings('exercise'), allRecords('workouts')]);
  const summary = weeklySummary(workouts, dayKey(startOfWeek(new Date())));
  return html`<a class="card" href="#/ejercicio" style="display:block;color:inherit;text-decoration:none">
    <div class="card-title">${icon('dumbbell')}<h2>Ejercicio esta semana</h2></div>
    ${exercise.physioCleared
      ? html`<p>Fuerza: <strong>${summary.strengthDays}</strong> de ${exercise.weeklyStrengthDays} días · Aeróbico: <strong>${summary.aerobicMin}</strong> de ${exercise.weeklyAerobicMin} min</p>
        ${progressBar(summary.aerobicMin, exercise.weeklyAerobicMin, 'Minutos aeróbicos de la semana')}`
      : html`<p class="muted">Pendiente de la autorización de tu fisioterapeuta.</p>`}
  </a>`;
}

function renderDetail(exercise) {
  const tag = ACHILLES_TAG[exercise.achilles];
  return html`
    <section class="card">
      <p class="row"><span class="tag">${ZONES[exercise.zone]}</span>${exercise.materials.map((material) => html`<span class="tag">${MATERIALS[material]}</span>`)}${tag ? html`<span class="tag">${tag}</span>` : ''}</p>
      ${exercise.dose ? html`<p><strong>${exercise.dose.sets}</strong> · ${exercise.dose.reps}</p>` : ''}
      ${ACHILLES_NOTE[exercise.achilles] ? alertBox({ level: 'warning', message: ACHILLES_NOTE[exercise.achilles] }) : ''}
    </section>
    ${exercise.videos.length ? html`<section class="card">${exercise.videos.map(videoFacade)}</section>` : ''}
    <section class="card">
      <h2>Cómo hacerlo</h2>
      <ul>${exercise.cues.map((cue) => html`<li>${cue}</li>`)}</ul>
      <h3>Errores frecuentes</h3>
      <ul>${exercise.mistakes.map((mistake) => html`<li>${mistake}</li>`)}</ul>
      <p><strong>Más fácil:</strong> ${exercise.easier}</p>
      <p><strong>Más difícil:</strong> ${exercise.harder}</p>
      <p class="small muted">Para si notas dolor agudo, mareo o falta de aire. Los vídeos son de canales de terceros; si un ejercicio del vídeo incluye saltos o ponerse de puntillas, sáltatelo.</p>
    </section>`;
}

function gateCard(exercise) {
  const screening = exercise.screening ?? {};
  return html`
    ${screening.heartDisease || screening.symptomsOnEffort
      ? alertBox({ level: 'danger', message: 'Indicaste una enfermedad cardíaca, renal o diabetes, o síntomas con el esfuerzo: consulta con tu médico antes de empezar a hacer ejercicio (criterio ACSM).' })
      : ''}
    <section class="card">
      <div class="card-title">${icon('info')}<h2>Antes de empezar</h2></div>
      <p>Por tu problema del tendón de Aquiles, el ejercicio debe pautarlo tu fisioterapeuta o traumatólogo. Cuando te dé el visto bueno, actívalo aquí.</p>
      <button type="button" class="btn btn-primary" id="physio-clear">Mi fisio me ha autorizado</button>
    </section>`;
}

function catalogTable(list) {
  return html`<div class="row" style="margin-bottom:.75rem">
      <label class="sr-only" for="filter-zone">Zona</label>
      <select id="filter-zone" data-filter="zone" style="flex:1"><option value="">Todas las zonas</option>${Object.entries(ZONES).map(([value, label]) => html`<option value="${value}">${label}</option>`)}</select>
      <label class="sr-only" for="filter-material">Material</label>
      <select id="filter-material" data-filter="material" style="flex:1"><option value="">Todo el material</option>${Object.entries(MATERIALS).map(([value, label]) => html`<option value="${value}">${label}</option>`)}</select>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Ejercicio</th><th>Zona</th><th>Material</th></tr></thead>
      <tbody>${list.map(
        (exercise) => html`<tr data-zone="${exercise.zone}" data-materials="${exercise.materials.join(' ')}">
          <td><a href="#/ejercicio/${exercise.id}">${exercise.name}</a>${ACHILLES_TAG[exercise.achilles] ? html`<br /><span class="tag">${ACHILLES_TAG[exercise.achilles]}</span>` : ''}${exercise.videos.length ? html` <span class="small muted">· vídeo</span>` : ''}</td>
          <td>${ZONES[exercise.zone]}</td>
          <td>${exercise.materials.map((material) => MATERIALS[material]).join(', ')}</td>
        </tr>`,
      )}</tbody>
    </table></div>`;
}

export async function render(ctx) {
  const id = ctx.params[0];
  const { exercise } = await loadSettings('exercise');
  if (id) {
    const item = getExercise(id);
    if (!item || (item.achilles === 'avoid' && !exercise.zumbaAllowed)) return html`<p>Ejercicio no disponible.</p>`;
    return renderDetail(item);
  }
  if (!exercise.physioCleared) return html`${gateCard(exercise)}<section class="card"><h2>Ejercicios incluidos</h2>${catalogTable(visibleExercises(exercise))}</section>`;

  const [workouts, painLogs, physio, todayPain] = await Promise.all([
    allRecords('workouts'),
    allRecords('pain'),
    allRecords('physioExercises'),
    recordsForDay('pain', dayKey()),
  ]);
  const summary = weeklySummary(workouts, dayKey(startOfWeek(new Date())));
  const phase = progressionFor(weeksSinceFirstStrength(workouts));
  const painAlerts = evaluatePain(painLogs, exercise.painThreshold);
  const list = visibleExercises(exercise);
  const aerobic = list.filter((item) => item.kind === 'aerobic');
  const recent = [...workouts].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  const morningLogged = todayPain[0]?.morning !== null && todayPain[0]?.morning !== undefined;

  return html`
    ${painAlerts.map(alertBox)}
    ${morningLogged
      ? ''
      : html`<section class="card">
          <h2>Tendón de Aquiles esta mañana</h2>
          <form id="morning-pain" class="row">
            <label for="morning-value">Dolor o rigidez al levantarte (0–10)</label>
            <input id="morning-value" name="morning" type="number" min="0" max="10" required style="max-width:6rem" />
            <button type="submit" class="btn btn-primary">Guardar</button>
          </form>
        </section>`}
    <section class="card">
      <h2>Esta semana</h2>
      <p>Fuerza: <strong>${summary.strengthDays}</strong> de ${exercise.weeklyStrengthDays} días</p>
      ${progressBar(summary.strengthDays, exercise.weeklyStrengthDays, 'Días de fuerza')}
      <p style="margin-top:.75rem">Aeróbico: <strong>${summary.aerobicMin}</strong> de ${exercise.weeklyAerobicMin} min</p>
      ${progressBar(summary.aerobicMin, exercise.weeklyAerobicMin, 'Minutos aeróbicos')}
      ${sourceNote('OMS 2020: 150–300 min/semana de actividad aeróbica moderada y fuerza al menos 2 días por semana.')}
    </section>
    <section class="card">
      <h2>Rutinas de fuerza</h2>
      <p><strong>${phase.label}</strong>: ${phase.sets} series × ${phase.reps} repeticiones, descanso ${phase.rest}.${phase.note ? ` ${phase.note}` : ''}</p>
      <p class="small muted">Alterna A y B, con un día de descanso entre sesiones de fuerza. Calienta 5 min (movilidad de brazos y cadera, sentada) y termina estirando suave.</p>
      ${Object.entries(ROUTINES).map(
        ([key, routine]) => html`<h3>${routine.name}</h3><ul class="list">${routine.items.map((itemId) => {
          const item = getExercise(itemId);
          return html`<li><a href="#/ejercicio/${item.id}">${item.name}</a><span class="small muted">${item.dose ? `${item.dose.sets} × ${item.dose.reps}` : `${phase.sets} × ${phase.reps}`}</span></li>`;
        })}</ul><button type="button" class="btn" data-routine="${key}" style="margin:.5rem 0 1rem">Apuntar ${routine.name}</button>`,
      )}
    </section>
    <section class="card">
      <h2>Apuntar sesión</h2>
      <form id="workout-form">
        <div class="field"><label for="wk-type">Tipo</label>
          <select id="wk-type" name="type"><option value="strength">Fuerza</option><option value="aerobic">Aeróbico o baile</option><option value="physio">Ejercicios del fisio</option></select></div>
        <div class="field"><label for="wk-activity">Actividad</label>
          <select id="wk-activity" name="activity"><option value="routine-A">Rutina A</option><option value="routine-B">Rutina B</option>${aerobic.map((item) => html`<option value="${item.id}">${item.name}</option>`)}<option value="physio">Pauta del fisio</option></select></div>
        <div class="field"><label for="wk-minutes">Minutos</label><input id="wk-minutes" name="minutes" type="number" min="1" max="300" required /></div>
        <div class="field"><label for="wk-rpe">Esfuerzo (0–10)</label><input id="wk-rpe" name="rpe" type="number" min="0" max="10" /><span class="hint">${RPE_HINT}</span></div>
        <div class="field"><label for="wk-pain">Dolor del tendón durante el ejercicio (0–10)</label><input id="wk-pain" name="during" type="number" min="0" max="10" /></div>
        <div class="field"><label for="wk-notes">Molestias o notas</label><input id="wk-notes" name="notes" type="text" /></div>
        <button type="submit" class="btn btn-primary">Guardar sesión</button>
      </form>
      <p class="small muted" style="margin-top:.75rem">Con Wegovy: evita el ejercicio intenso justo después de comer o los días de náuseas fuertes, y bebe agua antes, durante y después.</p>
    </section>
    <section class="card">
      <h2>Pautado por mi fisio</h2>
      ${physio.length
        ? html`<ul class="list">${physio.map(
            (item) => html`<li><span><strong>${item.name}</strong><br /><span class="small">${[item.sets && `${item.sets} series`, item.reps && `${item.reps} reps`, item.load].filter(Boolean).join(' · ')}</span>${item.notes ? html`<br /><span class="small muted">${item.notes}</span>` : ''}${item.videoUrl ? html`<br /><a href="${item.videoUrl}" target="_blank" rel="noopener noreferrer">Ver vídeo</a>` : ''}</span>${deleteButton('physioExercises', item.id)}</li>`,
          )}</ul>`
        : html`<p class="muted">Añade aquí los ejercicios que te paute tu fisio (por ejemplo, los del tendón).</p>`}
      <form id="physio-form" style="margin-top:.75rem">
        <div class="field"><label for="ph-name">Ejercicio</label><input id="ph-name" name="name" type="text" required maxlength="120" /></div>
        <div class="row">
          <div class="field" style="flex:1"><label for="ph-sets">Series</label><input id="ph-sets" name="sets" type="text" maxlength="20" /></div>
          <div class="field" style="flex:1"><label for="ph-reps">Repeticiones</label><input id="ph-reps" name="reps" type="text" maxlength="20" /></div>
        </div>
        <div class="field"><label for="ph-load">Carga</label><input id="ph-load" name="load" type="text" maxlength="40" placeholder="p. ej. goma verde, 2 kg" /></div>
        <div class="field"><label for="ph-video">Enlace a vídeo (opcional)</label><input id="ph-video" name="videoUrl" type="url" pattern="https://.*" /></div>
        <div class="field"><label for="ph-notes">Notas</label><input id="ph-notes" name="notes" type="text" maxlength="200" /></div>
        <button type="submit" class="btn">${icon('plus')} Añadir</button>
      </form>
    </section>
    <section class="card">
      <h2>Últimas sesiones</h2>
      ${recent.length
        ? html`<ul class="list">${recent.map((workout) => html`<li><span>${formatDay(workout.day)} · ${workout.label} · ${workout.minutes} min${workout.rpe !== null ? ` · esfuerzo ${workout.rpe}` : ''}</span>${deleteButton('workouts', workout.id)}</li>`)}</ul>`
        : html`<p class="muted">Aún no hay sesiones.</p>`}
    </section>
    <section class="card">
      <h2>Todos los ejercicios</h2>
      ${catalogTable(list)}
    </section>
    <section class="card">
      <h2>Ajustes</h2>
      <form id="exercise-settings">
        <div class="field"><label for="ex-threshold">Dolor máximo aceptable del tendón (0–10)</label><input id="ex-threshold" name="painThreshold" type="number" min="0" max="10" value="${exercise.painThreshold}" /><span class="hint">5 es la cifra citada habitualmente del modelo de Silbernagel (2007); las fuentes secundarias no coinciden en si se admite llegar a 5, así que usa la que te indique tu fisio.</span></div>
        <div class="field"><label for="ex-aerobic">Objetivo aeróbico semanal (min)</label><input id="ex-aerobic" name="weeklyAerobicMin" type="number" min="0" max="600" step="10" value="${exercise.weeklyAerobicMin}" /></div>
        <div class="field"><label for="ex-strength">Días de fuerza por semana</label><input id="ex-strength" name="weeklyStrengthDays" type="number" min="0" max="7" value="${exercise.weeklyStrengthDays}" /></div>
        <label class="check"><input type="checkbox" name="zumbaAllowed" ${exercise.zumbaAllowed ? 'checked' : ''} /> Mi fisio me permite baile de pie de bajo impacto</label>
        <label class="check"><input type="checkbox" name="physioCleared" ${exercise.physioCleared ? 'checked' : ''} /> Tengo autorización de mi fisio</label>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    </section>`;
}

async function savePain(patch) {
  const [existing] = await recordsForDay('pain', dayKey());
  if (existing) await putRecord('pain', { ...existing, ...patch, during: patch.during ?? existing.during, morning: patch.morning ?? existing.morning });
  else await addRecord('pain', { day: dayKey(), during: patch.during ?? null, morning: patch.morning ?? null });
}

const ACTIVITY_LABELS = { 'routine-A': 'Rutina A', 'routine-B': 'Rutina B', physio: 'Pauta del fisio' };

export function bind(root, ctx) {
  on(root, 'click', '[data-video]', (event, button) => {
    if (!navigator.onLine) {
      toast('Sin conexión: sigue la ficha escrita.');
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(button.dataset.video)}?autoplay=1&rel=0`;
    iframe.title = button.getAttribute('aria-label');
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    button.replaceWith(iframe);
  });
  root.querySelector('#physio-clear')?.addEventListener('click', async () => {
    await setSetting('exercise', { physioCleared: true });
    ctx.refresh();
  });
  root.querySelectorAll('[data-filter]').forEach((select) =>
    select.addEventListener('change', () => {
      const zone = root.querySelector('[data-filter="zone"]').value;
      const material = root.querySelector('[data-filter="material"]').value;
      root.querySelectorAll('tbody tr').forEach((row) => {
        row.hidden = (zone && row.dataset.zone !== zone) || (material && !row.dataset.materials.split(' ').includes(material));
      });
    }),
  );
  root.querySelector('#morning-pain')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await savePain({ morning: readForm(event.currentTarget).morning });
    toast('Guardado.');
    ctx.refresh();
  });
  on(root, 'click', '[data-routine]', (event, button) => {
    const form = root.querySelector('#workout-form');
    form.type.value = 'strength';
    form.activity.value = `routine-${button.dataset.routine}`;
    form.minutes.focus();
    form.scrollIntoView({ behavior: 'smooth' });
  });
  root.querySelector('#workout-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    const label = ACTIVITY_LABELS[values.activity] ?? getExercise(values.activity)?.name ?? values.activity;
    await addRecord('workouts', { at: localIso(), day: dayKey(), type: values.type, activity: values.activity, label, minutes: values.minutes, rpe: values.rpe, notes: values.notes });
    if (values.during !== null) await savePain({ during: values.during });
    toast('Sesión guardada.');
    ctx.refresh();
  });
  root.querySelector('#physio-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    if (values.videoUrl && !/^https:\/\//.test(values.videoUrl)) {
      toast('El enlace debe empezar por https://');
      return;
    }
    await addRecord('physioExercises', values);
    toast('Ejercicio añadido.');
    ctx.refresh();
  });
  on(root, 'click', '[data-delete]', async (event, button) => {
    if (!confirm('¿Borrar?')) return;
    await deleteRecord(button.dataset.delete, Number(button.dataset.id));
    ctx.refresh();
  });
  root.querySelector('#exercise-settings')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await setSetting('exercise', readForm(event.currentTarget));
    toast('Ajustes guardados.');
    ctx.refresh();
  });
}


