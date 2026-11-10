import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../worker/src/index.js';
import { generateVapidKeys, createVapidJwt, base64UrlDecode } from '../worker/src/vapid.js';

const ORIGIN = 'https://wegoby.example';

class MemoryKv {
  constructor() {
    this.map = new Map();
  }
  async get(key, type) {
    const value = this.map.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value) {
    this.map.set(key, value);
  }
  async delete(key) {
    this.map.delete(key);
  }
  async list({ prefix = '', cursor } = {}) {
    const keys = [...this.map.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name }));
    return { keys, list_complete: true, cursor };
  }
}

const SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BPx', auth: 'x' },
};

const ENTRIES = [
  { kind: 'water', time: '09:00' },
  { kind: 'dose', weekday: 1, time: '10:00' },
];

let env;

function request(method, path, { body, token, origin = ORIGIN, raw } = {}) {
  const headers = { Origin: origin, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return worker.fetch(new Request(`https://api.example${path}`, { method, headers, body: raw ?? (body ? JSON.stringify(body) : undefined) }), env);
}

async function subscribe(overrides = {}) {
  const response = await request('POST', '/api/subscribe', {
    body: { subscription: SUBSCRIPTION, entries: ENTRIES, timeZone: 'Europe/Madrid', ...overrides },
  });
  return { response, data: response.ok ? await response.json() : null };
}

beforeEach(async () => {
  const keys = await generateVapidKeys();
  env = {
    DEVICES: new MemoryKv(),
    ALLOWED_ORIGIN: ORIGIN,
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: ORIGIN,
  };
});

describe('VAPID (RFC 8292)', () => {
  it('signs an ES256 JWT verifiable with the public key', async () => {
    const jwt = await createVapidJwt({
      audience: 'https://fcm.googleapis.com',
      subject: ORIGIN,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      now: 1_700_000_000,
    });
    const [header, payload, signature] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(header)))).toEqual({ typ: 'JWT', alg: 'ES256' });
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: 1_700_000_000 + 12 * 3600,
      sub: ORIGIN,
    });
    const key = await crypto.subtle.importKey('raw', base64UrlDecode(env.VAPID_PUBLIC_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64UrlDecode(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(valid).toBe(true);
  });
});

describe('API', () => {
  it('subscribes and stores the device under a hash of the token', async () => {
    const { response, data } = await subscribe();
    expect(response.status).toBe(201);
    expect(data.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    const keys = [...env.DEVICES.map.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain(data.token);
    const stored = JSON.parse(env.DEVICES.map.get(keys[0]));
    expect(stored).toMatchObject({ subscription: SUBSCRIPTION, entries: ENTRIES, timeZone: 'Europe/Madrid', waterGoalMetDay: null });
  });

  it('rejects other origins', async () => {
    const response = await request('POST', '/api/subscribe', { body: {}, origin: 'https://evil.example' });
    expect(response.status).toBe(403);
    expect(env.DEVICES.map.size).toBe(0);
  });

  it('answers CORS preflight for the allowed origin only', async () => {
    const ok = await request('OPTIONS', '/api/device');
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
    expect((await request('OPTIONS', '/api/device', { origin: 'https://evil.example' })).status).toBe(403);
  });

  it.each([
    ['non push-service endpoint', { subscription: { ...SUBSCRIPTION, endpoint: 'https://internal.example/x' } }],
    ['http endpoint', { subscription: { ...SUBSCRIPTION, endpoint: 'http://fcm.googleapis.com/fcm/send/x' } }],
    ['unknown reminder kind', { entries: [{ kind: 'pizza', time: '09:00' }] }],
    ['bad time', { entries: [{ kind: 'water', time: '25:00' }] }],
    ['bad weekday', { entries: [{ kind: 'dose', weekday: 9, time: '10:00' }] }],
    ['too many entries', { entries: Array.from({ length: 65 }, () => ({ kind: 'water', time: '09:00' })) }],
    ['invalid time zone', { timeZone: 'Mars/Olympus' }],
  ])('rejects %s', async (label, overrides) => {
    const { response } = await subscribe(overrides);
    expect(response.status).toBe(400);
    expect(env.DEVICES.map.size).toBe(0);
  });

  it('rejects oversized and malformed bodies', async () => {
    expect((await request('POST', '/api/subscribe', { raw: 'x'.repeat(20_000) })).status).toBe(413);
    expect((await request('POST', '/api/subscribe', { raw: '{nope' })).status).toBe(400);
  });

  it('updates, records the water goal and deletes only with a valid token', async () => {
    const { data } = await subscribe();
    expect((await request('PUT', '/api/device', { body: { entries: [] } })).status).toBe(401);
    expect((await request('PUT', '/api/device', { body: { entries: [] }, token: 'wrong' })).status).toBe(401);
    expect((await request('PUT', '/api/device', { body: { entries: [{ kind: 'levo', time: '07:00' }] }, token: data.token })).status).toBe(204);
    expect((await request('POST', '/api/water-goal', { body: { day: '2026-11-10' }, token: data.token })).status).toBe(204);
    const stored = JSON.parse([...env.DEVICES.map.values()][0]);
    expect(stored.entries).toEqual([{ kind: 'levo', time: '07:00' }]);
    expect(stored.waterGoalMetDay).toBe('2026-11-10');
    expect((await request('POST', '/api/water-goal', { body: { day: 'yesterday' }, token: data.token })).status).toBe(400);
    expect((await request('DELETE', '/api/device', { token: data.token })).status).toBe(204);
    expect(env.DEVICES.map.size).toBe(0);
  });

  it('returns 404 for unknown routes', async () => {
    expect((await request('GET', '/api/nothing')).status).toBe(404);
  });
});

describe('scheduled reminders', () => {
  const runAt = (iso) => worker.scheduled({ scheduledTime: Date.parse(iso) }, env, { waitUntil: () => {} });

  it('sends an empty VAPID push only to devices with a due reminder', async () => {
    await subscribe();
    await subscribe({ subscription: { ...SUBSCRIPTION, endpoint: 'https://fcm.googleapis.com/fcm/send/other' }, entries: [{ kind: 'levo', time: '07:00' }] });
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await runAt('2026-11-16T09:00:00Z');
    vi.unstubAllGlobals();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SUBSCRIPTION.endpoint);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
    expect(init.headers.TTL).toBeDefined();
    expect(init.body ?? null).toBeNull();
  });

  it('skips water when the goal was met that day', async () => {
    const { data } = await subscribe({ entries: [{ kind: 'water', time: '09:00' }] });
    await request('POST', '/api/water-goal', { body: { day: '2026-11-17' }, token: data.token });
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await runAt('2026-11-17T08:00:00Z');
    vi.unstubAllGlobals();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('removes devices whose subscription expired (404/410)', async () => {
    await subscribe({ entries: [{ kind: 'water', time: '09:00' }] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 410 })));
    await runAt('2026-11-17T08:00:00Z');
    vi.unstubAllGlobals();
    expect(env.DEVICES.map.size).toBe(0);
  });

  it('keeps devices on transient push errors', async () => {
    await subscribe({ entries: [{ kind: 'water', time: '09:00' }] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    await runAt('2026-11-17T08:00:00Z');
    vi.unstubAllGlobals();
    expect(env.DEVICES.map.size).toBe(1);
  });
});
