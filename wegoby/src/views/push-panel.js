import { html } from '../ui/html.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/dom.js';
import { pushState, enablePush, disablePush, sendTestPush } from '../push/client.js';

const MESSAGES = {
  unsupported: 'Este navegador no admite notificaciones push. En Android usa Chrome e instala la app («Añadir a pantalla de inicio»).',
  unconfigured: 'Los avisos push aún no están configurados en el servidor de esta instalación.',
  denied: 'Has bloqueado las notificaciones. Actívalas en Ajustes de Android → Aplicaciones → Chrome (o Wegoby) → Notificaciones.',
  disabled: 'Activa los avisos para recibir recordatorios de agua, Wegovy, levotiroxina y analíticas aunque la app esté cerrada.',
  enabled: 'Avisos activados. Si llegan con retraso, desactiva la optimización de batería para Chrome en Android.',
};

export async function pushPanel() {
  const state = await pushState();
  return html`<section class="card" id="push-panel" data-state="${state}">
    <div class="card-title">${icon('bell')}<h2>Avisos</h2></div>
    <p>${MESSAGES[state]}</p>
    ${state === 'disabled' ? html`<button type="button" class="btn btn-primary" data-push="enable">Activar avisos</button>` : ''}
    ${state === 'enabled'
      ? html`<div class="row"><button type="button" class="btn" data-push="test">Probar</button><button type="button" class="btn btn-danger" data-push="disable">Desactivar</button></div>`
      : ''}
    <p class="small muted" style="margin-top:.75rem">Privacidad: el servidor de avisos solo guarda la suscripción, las horas y el tipo de cada aviso (agua, Wegovy, levotiroxina, calcio, hierro, analítica), tu zona horaria y si hoy ya cumpliste el objetivo de agua (sí/no). Tus datos de salud nunca salen del móvil; el aviso llega vacío y el texto se genera en el propio móvil.</p>
  </section>`;
}

export function bindPushPanel(root, ctx) {
  root.querySelectorAll('[data-push]').forEach((button) => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        if (button.dataset.push === 'enable') await enablePush();
        if (button.dataset.push === 'disable') await disablePush();
        if (button.dataset.push === 'test') await sendTestPush();
        toast(button.dataset.push === 'test' ? 'Aviso de prueba enviado.' : 'Hecho.');
        ctx.refresh();
      } catch (error) {
        toast(error.message.startsWith('Push API') ? 'No se pudo conectar con el servidor de avisos.' : error.message);
        button.disabled = false;
      }
    });
  });
}
