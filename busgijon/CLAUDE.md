# CLAUDE.md
El fichero CLAUDE.md lo mantendrás siempre al mínimo funcional. Optimiza su contenido siempre pensando el gastar el mínimo de tokens.
No seas verboso.

## Idioma
Toda comunicación y texto generado debe estar en **español de España**, incluidos comentarios, explicaciones y conversación con el modelo.



## Proyecto
**Bus Gijón** — PWA de llegadas de autobús en tiempo real para EMTUSA (Gijón). API REST con OAuth2 en `emtusasiri.pub.gijon.es`.

## Módulos (`webapp/src/`)
| Archivo | Responsabilidad |
|---------|----------------|
| `main.js` | Punto de entrada, estado global (`state`), orquestación |
| `api.js` | Cliente EMTUSA — OAuth2, refresco de token, endpoints |
| `map.js` | Mapa Leaflet — marcadores, temas, navegación |
| `geo.js` | Geolocalización y filtrado de paradas por distancia |
| `ui.js` | Renderizado DOM — lista de llegadas, modo transbordo |
| `style.css` | Estilos (tema oscuro/claro vía CSS variables) |

## Arquitectura
- Estado único en `main.js`, sin librería externa. Preferencias en `localStorage`.
- API: producción → directo; dev → `/api/` proxiado por Vite (`vite.config.js`).
- Endpoints clave: `paradas/todasParadas`, `paradas/parada/:id`, `lineas/lineas`, `autobuses/coordenadas`.
- Flujo: `init()` autentica y carga paradas → `loadAllArrivals()` en lotes de 3 (máx. 25) → refresco cada 30 s.

## Reglas del agente (`.agent/rules/`)
- Si un comando devuelve salida vacía → redirigir a `.agent/logs/cmd_output.txt` y leer el log; no asumir éxito.
- Python: usar `venv`, type hints, `ruff`/`black`, `pytest`.
- Tras cambios significativos: añadir entrada en `LEARNING_LOG.md` (secciones: Objetivo, Razonamiento, Conceptos Clave).

## Usuario objetivo
- **Presbicia**: el usuario tiene dificultad para leer letras pequeñas. Hay slider de tamaño de fuente (16–22px). Nunca reducir tamaños por debajo de los definidos; priorizar legibilidad. La distancia a la parada y metadatos secundarios deben ser visibles sin esfuerzo.
- **Uso exterior**: la app se usa a plena luz del sol. El modo claro debe tener contraste alto (no grises similares). El modo oscuro también debe ser legible bajo luz intensa.

## Tarjeta de llegada (`.arrival-row`)
CSS Grid 4 columnas × 3 filas:
```
col:  1(badge)   2(cuerpo)       3(vacío)  4(tiempo/fav)
row1: —          DESTINO (span)  —         ♥ fav-btn
row2: [L12]      220  (166 m)    —         08
row3: [   ]      Nombre parada   —         —
```
- Badge línea (col1, rows 2-3): cuadrado (`aspect-ratio:1`), color de línea
- Badge parada `220` (meta-row, sin `#`): mismo color que la línea; distancia entre paréntesis
- Tiempo: siempre 2 dígitos (`padStart(2,"0")`); bus en parada → solo `⬤` sin texto; NO hay `.arrival-label`
- Fav: corazón SVG, `color: var(--accent)` siempre; `.active svg path { fill: currentColor }`
- Header: sort buttons (`sort-time`, `sort-dist`) en `header-right` como `btn-icon sort-toggle`; NO hay `.sort-bar`
- Búsqueda: sin icono lupa, `padding-top: 10px`
- Tema oscuro/claro: clase `html.light-theme` en CSS; `setMapTheme()` la activa en `map.js`

## Asistente IA
- FAB circular fijo abajo-derecha; solo visible en vistas `list` y `map`
- Overlay chat 72vh deslizante desde abajo; quick actions grid 3 cols
- Proveedores: Anthropic, OpenAI, Deepseek, Gemini (config en Settings)

## Notas
- `samples/base/` → assets de APK Android (Capacitor). Solo referencia, no editar.
