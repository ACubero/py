# Wegoby PWA — feature document
Objective: offline-first Android PWA that supports a 50-year-old woman on Wegovy (semaglutide) with dose, medication, hydration, protein, symptom, exercise and lab tracking plus push reminders.
Branch: `feat/wegoby-pwa` · Delivery: `ask-on-risk` (forecast > 400 lines → chained PRs) · Test runner: Vitest (assumption) · UI language: Spanish (assumption)

## Specs

- **S1 — PWA.** User: "mi mujer necesitará una pwa que le ayude, planifica qué debería tener". Installable, offline-first, target Android + Chrome (user: "android"). Local-only health data, JSON backup.
- **S2 — Wegovy dose tracking.** Weekly fixed day; escalation 0.25 → 0.5 → 1 → 1.7 → 2.4 mg every 4 weeks, delay configurable; dose log with injection-site rotation; missed-dose rule: >48 h until next dose → inject, otherwise skip (EU SmPC); pen tracking (open date, doses left).
- **S3 — Exercise table.** User: "incluye también una tabla de ejercicios de fuerza con videos de youtube adecuados usando gomas o pesas, bailes como zumba". Videos must be verified real links, never invented.
- **S4 — Water push.** User: "debe poder mandar alertas push sobre recordatorios de beber agua". Window configurable (default 09:00 → bedtime − 2 h, every 90–120 min), stop when daily goal reached. Push also for Wegovy dose day, levothyroxine, calcium (optional), labs.
- **S5 — Age/weight adaptation.** User: "adaptado todo a una persona de 50 años con sobrepreso". Protein target on adjusted body weight (configurable); calcium 950 mg/d, vit D 15 µg/d reminders (EFSA); low-impact only; large adjustable font, ≥48 px touch targets, WCAG AA contrast; optional blood-pressure log.
- **S6 — Thyroid + Achilles.** User: "android, tiene extirpadas las tiroides y problemas en el tendon de aquiles".
  - Levothyroxine daily reminder: fasting, 30–60 min before breakfast, water only; spacing ≥ 4 h from calcium/iron; optional calcium/calcitriol schedule that never collides.
  - Labs log (TSH, FT4, calcium) + next-lab reminder (date set by endocrinologist).
  - Symptoms add: palpitations, tremor, insomnia, heat intolerance (possible over-replacement); perioral/finger tingling, cramps (possible hypocalcemia) → "contacta con tu médico".
  - Exercise gated by physio-clearance flag; Achilles-safe filter (no jumps, toe pivots, step-ups, running, barefoot); "Pautado por mi fisio" section; pain monitoring 0–10 during + next morning, rule ≤ 5, settled next morning, not worsening week to week (Silbernagel 2007), threshold configurable.
  - Assumption: Zumba (S3) excluded by default because of the Achilles constraint; replaced by aquagym, seated/upper-body dance, stationary bike, walking if tolerated. Physio can re-enable.
- **S7 — Rigorous content.** User: "se muy riguroso con la informacion". Every medical number in the app cites its source (Wegovy SmPC EU/US PI, EFSA DRVs, WHO 2020, levothyroxine SmPC AEMPS, ACLM/ASN/OMA/TOS 2025 advisory, Silbernagel 2007). Evidence level shown when weak.
- **S8 — Privacy.** Health data stays in IndexedDB on device. Push server stores only push subscription, reminder schedule, timezone and a daily "water goal met" boolean.
- **S9 — Not medical advice.** App records, reminds and shows fixed "contacta con tu médico" warnings; all thresholds configurable by the clinician's prescription.

## Before starting (user actions, not code)
- [ ] M1 Tell Wegovy prescriber the reason for the thyroidectomy (medullary thyroid carcinoma / MEN2 → contraindicated in US PI).
- [ ] M2 Ask endocrinologist how often to check TSH during weight loss.
- [ ] M3 Physio/traumatologist clearance and Achilles exercise prescription.
- [ ] M4 Confirm whether she has hypoparathyroidism / takes calcium or calcitriol.

## Tasks
Route: all inline unless a Writer trigger fires (record evidence here).

### Phase 0 — Foundation
- [x] T01 S1 · inline · Scaffold Vite + vanilla JS + `vite-plugin-pwa`; manifest, icons, offline service worker; Vitest setup. RED (missing module) → GREEN 2/2; build emits sw.js + manifest.webmanifest.
- [x] T02 S5 · inline · Design tokens (light/dark), adjustable font scale, ≥48 px targets, AA contrast, inline SVG icon set (no emojis).
- [x] T03 S8 · inline · IndexedDB layer (`idb`): stores settings, doses, meds, water, protein, symptoms, workouts, pain, weights, labs, bp; versioned migrations.
- [x] T04 S8 · inline · Backup export/import JSON with schema validation.
- [x] T05 S5 S6 S9 · inline · Onboarding: profile (age, height, weight, Wegovy start day, levothyroxine time), disclaimer, pre-exercise questionnaire, physio-clearance flag.
- [x] T06 S1 · inline · Navigation shell + "Hoy" dashboard (next dose, water, protein, weekly exercise, quick symptom button).

### Phase 1 — MVP
- [x] T07 S2 · inline · Dose-schedule engine (pure functions): escalation, configurable delays, next dose date. Tests.
- [x] T08 S2 · inline · Dose log UI with site-rotation suggestion (abdomen, thigh, arm).
- [x] T09 S2 · inline · Missed-dose assistant (48 h rule). Tests per branch.
- [x] T10 S2 · inline · Pen tracking: open date, doses remaining, in-use limit configurable.
- [x] T11 S6 · inline · Medication module: levothyroxine schedule, spacing rules (≥ 4 h calcium/iron, coffee/soy/fibre note), optional calcium/calcitriol; collision-free scheduler. Tests.
- [x] T12 S4 S7 · inline · Water tracker: +250/+500 ml, goal 2.0 L configurable, local-midnight reset.
- [x] T13 S5 S7 · inline · Protein tracker: adjusted body weight = IBW + 0.4 × (actual − IBW), formula and g/kg configurable; quick-add foods with protein grams from BEDCA. Tests.
- [x] T14 S6 S9 · inline · Symptoms log (GI, thyroid, hypocalcemia, 0–3) + red-flag rules → fixed warning.
- [ ] T15 S4 S8 · inline · Push backend: Cloudflare Worker + KV + Cron `*/15`; VAPID; endpoints subscribe/unsubscribe/schedule/goal-met; per-device random token; no health data. **Risk: item 2 (credentials/VAPID secrets)** → own commit, independent verifier.
- [ ] T16 S4 · inline · Push client: permission flow, subscription, schedule sync, SW `push` + `notificationclick` (deep link, "+250 ml" action).
- [ ] T17 S1 S4 · inline · Deploy Cloudflare Pages + Worker, secrets, HTTPS. **Risk: item 5 (deploy)**.
- [ ] T18 S1 S4 · inline · Real-device check on Android Chrome: install, offline, push with app closed.

### Phase 2 — Exercise, weight, labs
- [ ] T19 S3 S5 S6 · inline · Exercise catalog JSON (name, zone, material, level, sets×reps, rest, cues, mistakes, easier/harder variant, videoId); Achilles-safe filter; routines A/B; progression weeks 1–2 / 3–6 / later.
- [ ] T20 S3 S7 · inline · Curate and verify YouTube videos: Spanish, qualified physio/trainer, beginner/50+, low impact, heels down or seated/lying, < 15 min; store id, channel, duration, verifiedAt.
- [ ] T21 S3 · inline · Exercise table UI: filters (material, zone), detail with `youtube-nocookie.com` click-to-load facade, offline text fallback.
- [ ] T22 S3 S5 · inline · Workout log (type, minutes, RPE 0–10, discomfort) + weekly summary vs WHO (150–300 min aerobic, strength ≥ 2 d).
- [ ] T23 S6 · inline · "Pautado por mi fisio": user-added exercises with sets, load, optional video URL.
- [ ] T24 S6 · inline · Achilles pain monitoring + rule alert, configurable threshold. Tests.
- [ ] T25 S3 S6 · inline · Low-impact cardio/dance catalog (aquagym, seated dance, stationary bike, walking); Zumba hidden unless physio flag enabled.
- [ ] T26 S5 · inline · Weight & waist: weekly log, chart, % loss, waist reference 88 cm (ATP III).
- [ ] T27 S6 · inline · Labs module: TSH, FT4, calcium; next-lab reminder; TSH vs weight chart.

### Phase 3 — Extras and quality
- [ ] T28 S5 · inline · Optional blood-pressure + pulse log.
- [ ] T29 S6 · inline · Doctor report (print CSS → PDF): doses, weight, TSH, symptoms, Achilles pain, BP.
- [ ] T30 S7 · inline · Guide cards (nutrition, hydration, exercise, levothyroxine), offline, each claim with source.
- [ ] T31 S7 · inline · Content rigor pass: verify every medical number against primary sources; `SOURCES.md`.
- [ ] T32 S5 · inline · Lighthouse PWA/a11y/perf audit and fixes.

## Log
- L1 (2026-11-10) User: "mi mujer necesitará una pwa que le ayude, planifica qué debería tener"
- L2 (2026-11-10) User: "incluye también una tabla de ejercicios de fuerza con videos de youtube adecuados usando gomas o pesas, bailes como zumba, debe poder mandar alertas push sobre recordatorios de beber agua"
- L3 (2026-11-10) User: "adaptado todo a una persona de 50 años con sobrepreso"
- L4 (2026-11-10) User: "android, tiene extirpadas las tiroides y problemas en el tendon de aquiles"
- L5 (2026-11-10) User: "crea un md con todas las tareas necesarias". Plan-only; no source written. Next: T01 on user go-ahead.
- L6 (2026-11-10) User: "si usas python cra un venv". Stack is JS-only; any Python helper script (e.g. T20 video checks, T31 source checks) runs in `wegoby/.venv`, git-ignored.
- L7 (2026-11-10) User: "empieza con T01". Done on branch `feat/wegoby-pwa` (repo root `C:\Proyectos\py`). Versions: vite 7.3.8, vite-plugin-pwa 2.0.0, vitest 5.1.0, @vite-pwa/assets-generator 2.0.0. `npm audit`: 6 low/moderate in build-time-only transitive deps (workbox-build, glob, minimatch, deepmerge); nothing shipped to the browser. SW uses `registerType: 'prompt'` with update banner. Next: T02.
- L8 (2026-11-10) User: "sigue con el resto de tareas". T02–T14 inline (no Writer trigger: sequential dependent units). Evidence: RED per test file (missing modules / doseStatus) → GREEN 58/58 (foundation 13, domain 28, views smoke 17 with happy-dom + fake-indexeddb). Decisions: missed-dose rule implemented as SmPC wording "within 5 days" (≡ >48 h before next weekly dose); water reminder slots 15 min, last slot at bedtime−2 h only if ≥ interval/2 after previous; protein default 1.2 g/kg adjusted (Devine IBW + 0.4 excess), configurable; pen default 4 doses / 42 days, configurable, user told to check leaflet. T20 videos curated in background (32 IDs, oEmbed 200, 2026-11-10).
