export const PUSH_API_URL = (import.meta.env.VITE_PUSH_API_URL ?? '').replace(/\/$/, '');
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

export function pushConfigured() {
  return Boolean(PUSH_API_URL && VAPID_PUBLIC_KEY);
}

export async function pushApi(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${PUSH_API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) throw Object.assign(new Error(`Push API ${response.status}`), { status: response.status });
  return response.status === 204 ? null : response.json();
}
