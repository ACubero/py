# Wegoby

Offline-first PWA (Spanish UI) to support a Wegovy (semaglutide) treatment: weekly dose schedule and missed-dose assistant, levothyroxine/calcium/iron timing, water and protein tracking, symptom log with red flags, Achilles-safe exercise with verified videos and pain monitoring, weight, labs, blood pressure, a printable doctor report and a sourced guide. It records and reminds; it is not medical advice.

Health data stays in the phone's IndexedDB. Export/import JSON backups from *Ajustes*.

## Develop

```bash
npm install
npm run dev        # app (service worker disabled in dev)
npm test           # Vitest: domain, views (happy-dom), push worker
npm run build      # dist/ with service worker and manifest
npm run preview    # serve dist/ to test offline and install
npm run icons      # regenerate PNG icons from public/favicon.svg
```

## Push reminders

The Cloudflare Worker in `worker/` stores only the push subscription, reminder times/kinds, time zone and a daily "water goal met" flag (token hashed). Every 15 minutes it sends an **empty** VAPID push; the service worker (`src/sw.js`) works out on the phone which reminder is due, so no health data leaves the device.

1. `node scripts/generate-vapid.mjs` → public and private key.
2. `cd worker && npx wrangler kv namespace create DEVICES` → put the id in `worker/wrangler.toml`.
3. Fill `ALLOWED_ORIGIN`, `VAPID_SUBJECT` (app URL) and `VAPID_PUBLIC_KEY` in `worker/wrangler.toml`.
4. `npx wrangler secret put VAPID_PRIVATE_KEY`, then `npx wrangler deploy`.
5. Copy `.env.example` to `.env` with the Worker URL and the public key, `npm run build`, and deploy `dist/` to any HTTPS static host (e.g. Cloudflare Pages).

On Android use Chrome, install the app and allow notifications; disable battery optimisation for Chrome if reminders arrive late.

## Sources

Every medical figure and its verification status: [SOURCES.md](SOURCES.md).
