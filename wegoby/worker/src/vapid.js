const encoder = new TextEncoder();

export function base64UrlEncode(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  view.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicRaw = await crypto.subtle.exportKey('raw', pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: base64UrlEncode(publicRaw), privateKey: privateJwk.d };
}

async function importPrivateKey(publicKey, privateKey) {
  const raw = base64UrlDecode(publicKey);
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('Invalid VAPID public key');
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: base64UrlEncode(raw.slice(1, 33)), y: base64UrlEncode(raw.slice(33, 65)), d: privateKey, ext: false },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

export const VAPID_TTL_SECONDS = 12 * 3600;

export async function createVapidJwt({ audience, subject, publicKey, privateKey, now = Math.floor(Date.now() / 1000) }) {
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({ aud: audience, exp: now + VAPID_TTL_SECONDS, sub: subject })));
  const key = await importPrivateKey(publicKey, privateKey);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64UrlEncode(signature)}`;
}

export async function sendEmptyPush(subscription, env, { ttl = 1800, topic } = {}) {
  const audience = new URL(subscription.endpoint).origin;
  const jwt = await createVapidJwt({ audience, subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
  const headers = { Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`, TTL: String(ttl), Urgency: 'high', 'Content-Length': '0' };
  if (topic) headers.Topic = topic;
  return fetch(subscription.endpoint, { method: 'POST', headers });
}
