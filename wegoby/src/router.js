import { html } from './ui/html.js';
import { icon } from './ui/icons.js';
import { getSetting } from './db/index.js';

const ROUTES = {
  hoy: () => import('./views/today.js'),
  bienvenida: () => import('./views/onboarding.js'),
  dosis: () => import('./views/dose.js'),
  medicacion: () => import('./views/meds.js'),
  agua: () => import('./views/water.js'),
  proteina: () => import('./views/protein.js'),
  sintomas: () => import('./views/symptoms.js'),
  ejercicio: () => import('./views/exercise.js'),
  peso: () => import('./views/weight.js'),
  analiticas: () => import('./views/labs.js'),
  tension: () => import('./views/bp.js'),
  informe: () => import('./views/report.js'),
  guia: () => import('./views/guide.js'),
  ajustes: () => import('./views/settings.js'),
  mas: () => import('./views/more.js'),
};

const NAV = [
  ['hoy', 'home', 'Hoy'],
  ['dosis', 'syringe', 'Dosis'],
  ['agua', 'droplet', 'Agua'],
  ['ejercicio', 'dumbbell', 'Ejercicio'],
  ['mas', 'menu', 'Más'],
];

const MORE_ROUTES = new Set(['medicacion', 'proteina', 'sintomas', 'peso', 'analiticas', 'tension', 'informe', 'guia', 'ajustes']);

export function parseHash(hash = location.hash) {
  const [name = '', ...params] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  return { name: ROUTES[name] ? name : 'hoy', params };
}

export function navigate(path) {
  location.hash = `#/${path}`;
}

function renderNav(active) {
  const current = MORE_ROUTES.has(active) ? 'mas' : active;
  document.getElementById('bottom-nav').innerHTML = String(
    html`${NAV.map(
      ([route, iconName, label]) =>
        html`<a href="#/${route}" ${route === current ? html`aria-current="page"` : ''}>${icon(iconName)}<span>${label}</span></a>`,
    )}`,
  );
}

let renderToken = 0;

export async function renderRoute() {
  const token = ++renderToken;
  let { name, params } = parseHash();
  const onboarding = await getSetting('onboarding');
  if (!onboarding.done && name !== 'bienvenida') {
    navigate('bienvenida');
    return;
  }
  const view = await ROUTES[name]();
  const ctx = { params, refresh: () => token === renderToken && renderRoute(), navigate };
  const markup = await view.render(ctx);
  if (token !== renderToken) return;
  const root = document.getElementById('app');
  const header = document.getElementById('app-title');
  header.textContent = typeof view.title === 'function' ? view.title(ctx) : view.title;
  document.title = `${header.textContent} · Wegoby`;
  document.getElementById('back-button').hidden = !MORE_ROUTES.has(name) && !(name === 'ejercicio' && params.length);
  const container = document.createElement('div');
  container.innerHTML = String(markup);
  root.replaceChildren(container);
  renderNav(name);
  view.bind?.(container, ctx);
  root.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

export function startRouter() {
  window.addEventListener('hashchange', renderRoute);
  document.getElementById('back-button').addEventListener('click', () => history.back());
  return renderRoute();
}
