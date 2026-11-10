import { getSetting, setSetting, onChange } from '../db/index.js';
import { buildReminderSchedule } from '../domain/reminders.js';
import { onWaterChange } from '../services/records.js';
import { base64UrlDecode } from '../../worker/src/vapid.js';
import { pushApi, pushConfigured, VAPID_PUBLIC_KEY } from './api.js';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (!pushConfigured()) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  const push = await getSetting('push');
  return push.enabled && Notification.permission === 'granted' ? 'enabled' : 'disabled';
}

async function reminderPayload() {
  const [treatment, meds, water, labs] = await Promise.all(['treatment', 'meds', 'water', 'labs'].map((key) => getSetting(key)));
  return {
    entries: buildReminderSchedule({ treatment, meds, water, labs }),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

async function currentSubscription(create) {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing || !create) return existing;
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlDecode(VAPID_PUBLIC_KEY) });
}

export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.');
  const subscription = (await currentSubscription(true)).toJSON();
  const payload = await reminderPayload();
  const { token } = await pushApi('POST', '/api/subscribe', { body: { subscription, ...payload } });
  lastSynced = JSON.stringify(payload);
  await setSetting('push', { enabled: true, token, waterGoalReportedDay: null });
}

export async function disablePush() {
  const push = await getSetting('push');
  if (push.token) await pushApi('DELETE', '/api/device', { token: push.token }).catch(() => {});
  const subscription = await currentSubscription(false);
  await subscription?.unsubscribe();
  await setSetting('push', { enabled: false, token: null, waterGoalReportedDay: null });
}

export async function sendTestPush() {
  const push = await getSetting('push');
  await pushApi('POST', '/api/test', { token: push.token });
}

let lastSynced = null;
let syncTimer;

export async function syncSchedule() {
  const push = await getSetting('push');
  if (!push.enabled || !push.token || !pushConfigured()) return;
  const payload = await reminderPayload();
  const serialized = JSON.stringify(payload);
  if (serialized === lastSynced) return;
  const subscription = (await currentSubscription(false))?.toJSON();
  try {
    await pushApi('PUT', '/api/device', { token: push.token, body: { ...payload, ...(subscription ? { subscription } : {}) } });
    lastSynced = serialized;
  } catch (error) {
    if (error.status === 401) await setSetting('push', { enabled: false, token: null });
  }
}

async function reportWaterGoal({ total, goal, day }) {
  const push = await getSetting('push');
  if (!push.enabled || !push.token) return;
  const met = total >= goal;
  if (met && push.waterGoalReportedDay !== day) {
    await pushApi('POST', '/api/water-goal', { token: push.token, body: { day } });
    await setSetting('push', { waterGoalReportedDay: day });
  } else if (!met && push.waterGoalReportedDay === day) {
    await pushApi('POST', '/api/water-goal', { token: push.token, body: { day: null } });
    await setSetting('push', { waterGoalReportedDay: null });
  }
}

export function startPushSync() {
  if (!pushSupported() || !pushConfigured()) return;
  onWaterChange(reportWaterGoal);
  onChange((store) => {
    if (store !== 'settings' && store !== '*') return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncSchedule().catch(() => {}), 1000);
  });
  syncSchedule().catch(() => {});
}
