/**
 * api.js — Servicio de API EMTUSA Gijón
 * Maneja autenticación OAuth2 y llamadas a endpoints
 */

const isProd = import.meta.env.PROD;
const BASE_URL = isProd
  ? "https://emtusasiri.pub.gijon.es/emtusasiri/"
  : "/api/"; // Proxy de Vite en desarrollo
const AUTH_BASIC = import.meta.env.VITE_AUTH_BASIC;
const AUTH_USER = import.meta.env.VITE_AUTH_USER;
const AUTH_PASS = import.meta.env.VITE_AUTH_PASS;

let accessToken = null;
let tokenExpiry = 0;

/**
 * Autenticarse en la API y obtener un access_token
 */
export async function authenticate() {
  const params = new URLSearchParams({
    grant_type: "password",
    username: AUTH_USER,
    password: AUTH_PASS,
  });

  const url = `${BASE_URL}login?${params.toString()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: AUTH_BASIC,
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);

  const data = await res.json();
  accessToken = data.access_token;
  // Token suele durar ~3600s, renovamos un poco antes
  tokenExpiry =
    Date.now() + (data.expires_in ? (data.expires_in - 60) * 1000 : 3500000);
  return accessToken;
}

/**
 * Obtener headers autenticados, renovando token si es necesario
 */
async function getHeaders() {
  if (!accessToken || Date.now() > tokenExpiry) {
    await authenticate();
  }
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
}

/**
 * Petición GET autenticada
 */
async function apiGet(endpoint) {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
  if (!res.ok) throw new Error(`API error ${res.status}: ${endpoint}`);
  return res.json();
}

// ============================================
// Endpoints públicos
// ============================================

/** Obtener todas las paradas */
export async function getAllStops() {
  return apiGet("paradas/todasParadas");
}

/** Obtener detalle de una parada (incluye tiempos de llegada) */
export async function getStopDetail(stopId) {
  return apiGet(`paradas/parada/${stopId}`);
}

/** Obtener líneas que pasan por una parada */
export async function getStopLines(stopId) {
  return apiGet(`paradas/lineasParada/${stopId}`);
}

/** Obtener trayectos de una parada */
export async function getStopRoutes(stopId) {
  return apiGet(`paradas/trayectosParada/${stopId}`);
}

/** Obtener todas las líneas */
let linesCache = null;
export async function getAllLines() {
  if (linesCache) return linesCache;
  const data = await apiGet("lineas/lineas");
  let list = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && data.lineas) {
    if (Array.isArray(data.lineas)) {
      list = data.lineas;
    } else if (typeof data.lineas === "object") {
      // EMTUSA sometimes returns an object where keys are line codes
      list = Object.values(data.lineas);
    }
  }
  linesCache = list;
  return linesCache;
}

/** Obtener detalle de una línea */
export async function getLineDetail(lineId) {
  const data = await apiGet(`lineas/lineas/${lineId}`);
  // Si viene envuelto en un objeto con clave "0", lo extraemos
  return data["0"] || data;
}

/** Obtener paradas de un trayecto */
export async function getRouteStops(lineId, routeId) {
  const data = await apiGet(`trayectos/trayectos/${lineId}/${routeId}`);
  return data["0"] || data;
}

/** Obtener coordenadas de buses en tiempo real */
export async function getBusRealTime() {
  return apiGet("autobuses/coordenadas");
}

/** Obtener posición de bus en una línea/trayecto */
export async function getBusPosition(lineId, routeId) {
  return apiGet(`autobuses/posicion/${lineId}/${routeId}`);
}
