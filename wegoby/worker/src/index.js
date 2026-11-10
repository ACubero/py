import { dueReminders, localParts, REMINDER_TEXT } from '../../src/domain/reminders.js';
import { base64UrlEncode, sendEmptyPush } from './vapid.js';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_ENTRIES = 64;
const DEVICE_PREFIX = 'device:';
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^[\w-]+\.notify\.windows\.com$/, /^web\.push\.apple\.com$/];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function respond(env, status, body) {
  const headers = { ...corsHeaders(env), 'Cache-Control': 'no-store' };
  if (body === undefined) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

async function readJson(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function validateSubscription(subscription) {
  if (!subscription || typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 1024) throw new HttpError(400, 'Invalid subscription');
  let url;
  try {
    url = new URL(subscription.endpoint);
  } catch {
    throw new HttpError(400, 'Invalid subscription');
  }
  if (url.protocol !== 'https:' || !PUSH_HOSTS.some((pattern) => pattern.test(url.hostname))) throw new HttpError(400, 'Unsupported push service');
  const keys = subscription.keys ?? {};
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') throw new HttpError(400, 'Invalid subscription');
  return { endpoint: subscription.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) throw new HttpError(400, 'Invalid entries');
  return entries.map((entry) => {
    if (!entry || !(entry.kind in REMINDER_TEXT) || !TIME.test(entry.time)) throw new HttpError(400, 'Invalid entry');
    const clean = { kind: entry.kind, time: entry.time };
    if (entry.weekday !== undefined) {
      if (!Number.isInteger(entry.weekday) || entry.weekday < 0 || entry.weekday > 6) throw new HttpError(400, 'Invalid entry');
      clean.weekday = entry.weekday;
    }
    if (entry.date !== undefined) {
      if (!DAY.test(entry.date)) throw new HttpError(400, 'Invalid entry');
      clean.date = entry.date;
    }
    return clean;
  });
}

function validateTimeZone(timeZone) {
  try {
    if (typeof timeZone !== 'string') throw new Error();
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return timeZone;
  } catch {
    throw new HttpError(400, 'Invalid time zone');
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function deviceKey(request) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') ?? '');
  if (!match) throw new HttpError(401, 'Unauthorized');
  return DEVICE_PREFIX + (await sha256Hex(match[1]));
}

async function loadDevice(env, request) {
  const key = await deviceKey(request);
  const device = await env.DEVICES.get(key, 'json');
  if (!device) throw new HttpError(401, 'Unauthorized');
  return { key, device };
}

async function handle(request, env) {
  const { pathname } = new URL(request.url);
  const route = `${request.method} ${pathname}`;

  if (route === 'POST /api/subscribe') {
    const body = await readJson(request);
    const device = {
      subscription: validateSubscription(body.subscription),
      entries: validateEntries(body.entries),
      timeZone: validateTimeZone(body.timeZone),
      waterGoalMetDay: null,
      createdAt: new Date().toISOString(),
    };
    const token = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    await env.DEVICES.put(DEVICE_PREFIX + (await sha256Hex(token)), JSON.stringify(device));
    return respond(env, 201, { token });
  }

  if (route === 'PUT /api/device') {
    const { key, device } = await loadDevice(env, request);
    const body = await readJson(request);
    if (body.subscription !== undefined) device.subscription = validateSubscription(body.subscription);
    if (body.entries !== undefined) device.entries = validateEntries(body.entries);
    if (body.timeZone !== undefined) device.timeZone = validateTimeZone(body.timeZone);
    await env.DEVICES.put(key, JSON.stringify(device));
    return respond(env, 204);
  }

  if (route === 'POST /api/water-goal') {
    const { key, device } = await loadDevice(env, request);
    const body = await readJson(request);
    if (body.day !== null && !DAY.test(body.day ?? '')) throw new HttpError(400, 'Invalid day');
    device.waterGoalMetDay = body.day;
    await env.DEVICES.put(key, JSON.stringify(device));
    return respond(env, 204);
  }

  if (route === 'POST /api/test') {
    const { device } = await loadDevice(env, request);
    const response = await sendEmptyPush(device.subscription, env, { ttl: 300 });
    return respond(env, response.ok ? 204 : 502);
  }

  if (route === 'DELETE /api/device') {
    const { key } = await loadDevice(env, request);
    await env.DEVICES.delete(key);
    return respond(env, 204);
  }

  throw new HttpError(404, 'Not found');
}

async function runReminders(env, scheduledTime) {
  const now = new Date(scheduledTime);
  let cursor;
  do {
    const page = await env.DEVICES.list({ prefix: DEVICE_PREFIX, cursor });
    for (const { name } of page.keys) {
      const device = await env.DEVICES.get(name, 'json');
      if (!device) continue;
      const due = dueReminders(device.entries, localParts(now, device.timeZone), { waterGoalMetDay: device.waterGoalMetDay });
      if (!due.length) continue;
      const response = await sendEmptyPush(device.subscription, env, { ttl: 1800 });
      if (response.status === 404 || response.status === 410) await env.DEVICES.delete(name);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export default {
  async fetch(request, env) {
    if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return respond(env, 204);
    try {
      return await handle(request, env);
    } catch (error) {
      if (error instanceof HttpError) return respond(env, error.status, { error: error.message });
      return respond(env, 500, { error: 'Internal error' });
    }
  },

  async scheduled(event, env, ctx) {
    const work = runReminders(env, event.scheduledTime);
    ctx.waitUntil(work);
    await work;
  },
};
