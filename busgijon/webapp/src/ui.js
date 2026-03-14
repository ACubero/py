/**
 * ui.js — Renderizado de la lista unificada de próximos buses
 */

// Elimina caracteres fuera del rango latino (corrupción en BD de EMTUSA)
function fixText(str) {
  if (!str) return str;
  return str.replace(/[^\x20-\x7E\u00A0-\u024F]/g, "").trim();
}

// Colores fallback por línea
const LINE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#64748b",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
];

export function getLineColor(lineId) {
  const num = parseInt(lineId) || 0;
  return LINE_COLORS[num % LINE_COLORS.length];
}

/**
 * Devuelve '#111' o '#fff' según la luminancia del color de fondo
 */
function getTextColor(hexColor) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? "#111" : "#fff";
}

/**
 * Renderizar la lista unificada de llegadas
 */
export function renderArrivals(arrivals, onRowClick, opts = {}) {
  const { favorites = new Set(), onToggleFav } = opts;
  const container = document.getElementById("arrivals-container");

  if (!arrivals || arrivals.length === 0) {
    container.innerHTML = `
      <div class="status-msg">
        <div class="status-msg-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <p>No hay autobuses previstos en las paradas cercanas</p>
      </div>`;
    return;
  }

  container.innerHTML = arrivals
    .map((a, i) => {
      const color = a.lineColor || getLineColor(a.lineId);
      const textColor = getTextColor(color);
      let timeClass = "t-later";
      let timeText = "--";
      let label = "";

      if (a.busAtStop) {
        timeClass = "t-now";
        timeText = `<svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>`;
        label = "";
      } else if (a.minutes !== null && a.minutes !== undefined) {
        timeText = String(a.minutes).padStart(2, "0");
        if (a.minutes <= 2) timeClass = "t-now";
        else if (a.minutes <= 8) timeClass = "t-soon";
      }

      // Distancia
      let distText = "";
      if (a.userDistance !== undefined) {
        distText = a.userDistance >= 1000
          ? `${(a.userDistance / 1000).toFixed(1)} km`
          : `${Math.round(a.userDistance)} m`;
      }

      const isFav = favorites.has(a.stopId.toString());

      return `
        <div class="arrival-row" data-idx="${i}">
          <div class="arrival-badge" style="background:${color};color:${textColor}">L${a.lineId}</div>
          <div class="arrival-direction">${fixText(a.direction)}</div>
          <button class="fav-btn${isFav ? " active" : ""}" data-stop-id="${a.stopId}" aria-label="${isFav ? "Quitar de favoritos" : "Añadir a favoritos"}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
          <div class="arrival-time-box">
            <div class="arrival-min ${timeClass}">${timeText}</div>
          </div>
          <div class="arrival-meta-row">
            <span class="arrival-stop-badge" style="background:${color};color:${textColor}">${a.stopId}</span>
            ${distText ? `<span class="arrival-dist">(${distText})</span>` : ""}
          </div>
          <div class="arrival-stop-name">${fixText(a.stopName)}</div>
        </div>`;
    })
    .join("");

  if (onRowClick) {
    container.querySelectorAll(".arrival-row").forEach((row) => {
      row.addEventListener("click", () => {
        const idx = parseInt(row.dataset.idx);
        if (arrivals[idx]) onRowClick(arrivals[idx]);
      });
    });
  }

  if (onToggleFav) {
    container.querySelectorAll(".fav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        onToggleFav(btn.dataset.stopId);
      });
    });
  }
}

/**
 * Mostrar loading con barra de progreso
 */
export function showLoading(loaded, total) {
  const container = document.getElementById("arrivals-container");
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  container.innerHTML = `
    <div class="loading-progress">
      Consultando paradas cercanas... (${loaded}/${total})
      <div class="loading-progress-bar">
        <div class="loading-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

/**
 * Actualizar badge de refresco
 */
export function updateRefreshBadge(seconds, paused = false) {
  const el = document.getElementById("refresh-timer");
  if (!el) return;
  if (paused) {
    el.textContent = "II";
    el.classList.add("paused");
  } else {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    el.textContent = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${seconds}s`;
    el.classList.remove("paused");
  }
}

/**
 * Mostrar/ocultar filter chip (filtro por parada desde mapa)
 */
export function showFilterChip(stopName, stopId, onClear) {
  const container = document.getElementById("filter-chip-container");
  container.innerHTML = `
    <div class="filter-chip">
      <span class="filter-chip-text"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Filtrando: <strong>${stopName}</strong> #${stopId}</span>
      <button class="filter-chip-close" aria-label="Quitar filtro"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>`;
  container
    .querySelector(".filter-chip-close")
    .addEventListener("click", onClear);
}

export function clearFilterChip() {
  const container = document.getElementById("filter-chip-container");
  if (container) container.innerHTML = "";
}

// ============================================
// Transbordo / Transfer
// ============================================

export function renderTransferResults(results, containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return; // Puede no existir si el modal no esta abierto

  container.innerHTML = "";
  if (results && results.length > 0) {
    container.classList.remove("hidden");

    results.forEach((stop) => {
      const div = document.createElement("div");
      div.className = "search-result-item";
      div.innerHTML = `<strong>#${stop.idparada}</strong> ${stop.descripcion}`;
      div.addEventListener("click", () => {
        onSelect(stop);
        container.classList.add("hidden");
        container.innerHTML = ""; // Limpiar
      });
      container.appendChild(div);
    });
  } else {
    container.classList.add("hidden");
  }
}

// Helper para hora actual + minutos
function formatTime(minutes) {
  if (minutes === null || minutes === undefined) return "--:--";
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Helper para convertir HH:MM input a minutos desde ahora
function getMinutesFromNow(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);

  // Si la hora es menor a la actual, asumimos mañana? No, usuario probablemente se equivocó o quiere ver pasado.
  // Pero para filtrado real-time, tiempos pasados son negativos.

  const diffMs = target - now;
  return Math.floor(diffMs / 60000); // minutos
}

export function renderTransferDashboard(arrivals1, arrivals2, config, onExit) {
  const container = document.getElementById("arrivals-container");
  if (!container) return;

  const travelTime = config.travelTime || 20;
  const walkTime = config.walkTime || 0;
  const minDepMinutes = getMinutesFromNow(config.departureTime);

  const renderSection = (list, lineFilter, title, isOrigin) => {
    let content = "";

    // Filtros
    let filtered = list || [];
    if (lineFilter) {
      filtered = filtered.filter(
        (a) => a.lineId.toString() === lineFilter.toString(),
      );
    }

    // Filtrado por hora de salida (Solo para Origen)
    if (isOrigin && minDepMinutes !== null) {
      // Filter buses arriving AFTER minDepMinutes
      // a.minutes is "minutes from now".
      filtered = filtered.filter((a) => a.minutes >= minDepMinutes);
    }

    if (!list || list.length === 0) {
      content = `<div class="status-msg small">Sin datos (API)</div>`;
    } else if (filtered.length === 0) {
      if (isOrigin && minDepMinutes !== null) {
        content = `<div class="status-msg small">No hay buses después de ${config.departureTime} (aún)</div>`;
      } else {
        content = `<div class="status-msg small">Sin buses de L${lineFilter}</div>`;
      }
    } else {
      content = filtered
        .map((a) => {
          const color = a.lineColor || "#3b82f6";
          const textColor = "#fff";

          const min = a.minutes ?? 0;
          const departTime = formatTime(min);
          const arrivePickupTime = formatTime(min + travelTime + walkTime);

          let timeBadge = `<div class="arrival-min ${min <= 5 ? "t-soon" : "t-later"}">${min} min</div>`;
          if (min === 0)
            timeBadge = `<div class="arrival-min t-soon">Ahora</div>`;

          let extraInfo = "";
          if (isOrigin) {
            extraInfo = `
              <div class="connection-info" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; padding-top:4px; border-top:1px dashed var(--border);">
                <div>Salida: <strong>${departTime}</strong></div>
                <div style="color: var(--accent-light)">
                   Llegada 2ª parada: <strong>${arrivePickupTime}</strong>
                   <span style="font-size:0.75em; opacity:0.8">(+${travelTime + walkTime}min)</span>
                </div>
              </div>
            `;
          } else {
            extraInfo = `
              <div class="connection-info" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                Paso prev.: <strong>${departTime}</strong>
              </div>
            `;
          }

          return `
          <div class="arrival-row compact" style="display:flex; flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="arrival-badges">
                <div class="arrival-badge" style="background:${color};color:${textColor}">L${a.lineId}</div>
                <span style="font-size:0.9rem; margin-left:8px;">${a.direction}</span>
              </div>
              <div class="arrival-time-box" style="text-align:right;">
                ${timeBadge}
              </div>
            </div>
            ${extraInfo}
          </div>`;
        })
        .join("");
    }

    return `
      <div class="transfer-section">
        <h4 class="transfer-section-title">${title}</h4>
        <div class="transfer-list">${content}</div>
      </div>
    `;
  };

  const html = `
    <div class="transfer-dash">
      <div class="transfer-dash-header">
        <div class="transfer-route-summ">
          <div class="route-step">1. ${config.stop1.descripcion || "Origen"}</div>
          <div class="route-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 5v14M19 12l-7 7-7-7"/></svg> <span style="font-size:0.7em">${travelTime}m (Bus) + ${walkTime}m (Pie)</span></div>
          <div class="route-step">2. ${config.stop2.descripcion || "Destino"}</div>
        </div>
        <button id="btn-exit-transfer" class="btn-xs btn-outline">Salir</button>
      </div>
      
      ${renderSection(arrivals1, config.line1, `ORIGEN: ${config.stop1.descripcion || config.stop1.idparada}`, true)}
      ${renderSection(arrivals2, config.line2, `DESTINO: ${config.stop2.descripcion || config.stop2.idparada}`, false)}
    </div>
  `;

  container.innerHTML = html;
  document
    .getElementById("btn-exit-transfer")
    .addEventListener("click", onExit);
}
