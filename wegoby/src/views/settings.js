import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { readForm, toast, downloadFile } from '../ui/dom.js';
import { setSetting, clearAll } from '../db/index.js';
import { exportBackup, importBackup } from '../db/backup.js';
import { dayKey } from '../domain/dates.js';
import { loadSettings } from './common.js';
import { DISCLAIMER } from './onboarding.js';
import { pushPanel, bindPushPanel } from './push-panel.js';

export const title = 'Ajustes';

const FONT_SCALES = [
  [1, 'Normal'],
  [1.125, 'Grande'],
  [1.25, 'Muy grande'],
  [1.375, 'Enorme'],
];

export async function render() {
  const { display, profile } = await loadSettings('display', 'profile');
  return html`
    <section class="card">
      <h2>Pantalla</h2>
      <form id="display-form">
        <fieldset class="field"><legend>Tamaño de letra</legend>
          <div class="segmented">${FONT_SCALES.map(([value, label]) => html`<label><input type="radio" name="fontScale" value="${value}" ${value === display.fontScale ? 'checked' : ''} /><span>${label}</span></label>`)}</div>
        </fieldset>
        <fieldset class="field"><legend>Tema</legend>
          <div class="segmented">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([value, label]) => html`<label><input type="radio" name="theme" value="${value}" ${value === display.theme ? 'checked' : ''} /><span>${label}</span></label>`)}</div>
        </fieldset>
      </form>
    </section>
    <section class="card">
      <h2>Mis datos</h2>
      <form id="profile-form">
        <div class="field"><label for="a-year">Año de nacimiento</label><input id="a-year" name="birthYear" type="number" value="${profile.birthYear ?? ''}" /></div>
        <div class="field"><label for="a-height">Altura (cm)</label><input id="a-height" name="heightCm" type="number" value="${profile.heightCm ?? ''}" /></div>
        <div class="field"><label for="a-weight">Peso al empezar (kg)</label><input id="a-weight" name="startWeightKg" type="number" step="0.1" value="${profile.startWeightKg ?? ''}" /></div>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    </section>
    ${await pushPanel()}
    <section class="card">
      <h2>Copia de seguridad</h2>
      <p class="small muted">Tus datos solo están en este móvil. Guarda una copia de vez en cuando (por ejemplo en Drive o por correo) para no perderlos si cambias de móvil o borras el navegador.</p>
      <div class="row">
        <button type="button" class="btn" id="backup-export">${icon('download')} Exportar</button>
        <label class="btn">${icon('upload')} Importar<input type="file" id="backup-import" accept="application/json,.json" class="sr-only" /></label>
      </div>
    </section>
    <section class="card">
      <h2>Borrar todo</h2>
      <button type="button" class="btn btn-danger" id="wipe">${icon('trash')} Borrar todos los datos</button>
    </section>
    <section class="card">
      <h2>Aviso</h2>
      <p class="small">${DISCLAIMER}</p>
    </section>`;
}

export function bind(root, ctx) {
  root.querySelector('#display-form').addEventListener('change', async (event) => {
    const values = readForm(event.currentTarget);
    await setSetting('display', { fontScale: Number(values.fontScale), theme: values.theme });
  });
  root.querySelector('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await setSetting('profile', readForm(event.currentTarget));
    toast('Datos guardados.');
  });
  root.querySelector('#backup-export').addEventListener('click', async () => {
    const backup = await exportBackup();
    downloadFile(`wegoby-${dayKey()}.json`, JSON.stringify(backup, null, 2));
  });
  root.querySelector('#backup-import').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!confirm('Esto sustituirá todos los datos actuales por los de la copia. ¿Continuar?')) return;
      await importBackup(backup);
      toast('Copia restaurada.');
      ctx.navigate('hoy');
    } catch (error) {
      toast(error instanceof SyntaxError ? 'El archivo no es válido.' : error.message);
    }
  });
  root.querySelector('#wipe').addEventListener('click', async () => {
    if (!confirm('Se borrarán todos tus registros y ajustes de este móvil. ¿Seguro?')) return;
    if (!confirm('No se puede deshacer. ¿Borrar definitivamente?')) return;
    await clearAll();
    ctx.navigate('bienvenida');
  });
  bindPushPanel(root, ctx);
}
