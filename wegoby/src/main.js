import './style.css';
import { registerSW } from 'virtual:pwa-register';

const banner = document.getElementById('update-banner');
const updateButton = document.getElementById('update-button');

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    banner.hidden = false;
  },
});

updateButton.addEventListener('click', () => updateServiceWorker(true));
