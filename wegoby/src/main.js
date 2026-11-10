import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { getSetting, onChange } from './db/index.js';
import { applyDisplay } from './ui/dom.js';
import { startRouter } from './router.js';
import { startPushSync } from './push/client.js';

const banner = document.getElementById('update-banner');
const updateButton = document.getElementById('update-button');

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    banner.hidden = false;
  },
});

updateButton.addEventListener('click', () => updateServiceWorker(true));

onChange(async (store) => {
  if (store === 'settings' || store === '*') applyDisplay(await getSetting('display'));
});

applyDisplay(await getSetting('display'));
startPushSync();
await startRouter();
