import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { getSetting, setSetting, recordsForDay } from './db/index.js';
import { dayKey } from './domain/dates.js';
import { waterTotal } from './domain/water.js';
import { pendingNotifications, FALLBACK } from './push/notifications.js';
import { addWater, logMed } from './services/records.js';
import { pushApi } from './push/api.js';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function loadReminderSettings() {
  const [treatment, meds, water, labs] = await Promise.all(['treatment', 'meds', 'water', 'labs'].map((key) => getSetting(key)));
  return { treatment, meds, water, labs };
}

async function showDueNotifications() {
  const now = new Date();
  const day = dayKey(now);
  try {
    const [settings, waterRecords, shownLog] = await Promise.all([loadReminderSettings(), recordsForDay('water', day), getSetting('pushLog')]);
    const list = pendingNotifications({ settings, waterRecords, shownLog, now });
    if (!list.length) {
      await self.registration.showNotification(FALLBACK.title, { body: FALLBACK.body, tag: 'fallback', data: { url: FALLBACK.url }, icon: '/pwa-192x192.png', badge: '/pwa-64x64.png' });
      return;
    }
    for (const item of list) {
      await self.registration.showNotification(item.title, {
        body: item.body,
        tag: item.kind,
        renotify: true,
        actions: item.actions,
        data: { url: item.url, kind: item.kind },
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
      });
    }
    const keys = [...(shownLog?.day === day ? shownLog.keys : []), ...list.map((item) => item.key)];
    await setSetting('pushLog', { day, keys });
  } catch {
    await self.registration.showNotification(FALLBACK.title, { body: FALLBACK.body, tag: 'fallback', data: { url: FALLBACK.url } });
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(showDueNotifications());
});

async function reportWaterGoal() {
  const [push, water, records] = await Promise.all([getSetting('push'), getSetting('water'), recordsForDay('water', dayKey())]);
  const day = dayKey();
  if (!push.enabled || !push.token || push.waterGoalReportedDay === day || waterTotal(records) < water.goalMl) return;
  await pushApi('POST', '/api/water-goal', { token: push.token, body: { day } });
  await setSetting('push', { waterGoalReportedDay: day });
}

async function focusOrOpen(url) {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    if ('focus' in client) {
      await client.navigate(url).catch(() => {});
      return client.focus();
    }
  }
  return self.clients.openWindow(url);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const url = event.notification.data?.url ?? '/#/hoy';
  if (action === 'water-250') {
    event.waitUntil(addWater(250).then(() => reportWaterGoal().catch(() => {})));
    return;
  }
  if (action?.startsWith('med-')) {
    event.waitUntil(logMed(action.slice(4)));
    return;
  }
  event.waitUntil(focusOrOpen(url));
});
