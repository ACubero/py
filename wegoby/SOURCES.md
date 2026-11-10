# Sources for medical figures

Checked on 2026-11-10 (task T31). Verdict: **confirmed** against the primary source, **secondary** = only secondary sources were reachable, **weak** = convention or low-quality evidence; the app says so in the UI.

| Figure in the app | Where | Verdict | Source |
|---|---|---|---|
| Escalation 0.25 → 0.5 → 1 → 1.7 → 2.4 mg, 4 weeks each | `domain/defaults.js` | confirmed | Wegovy EPAR product information, SmPC 4.2 — https://www.ema.europa.eu/en/documents/product-information/wegovy-epar-product-information_en.pdf |
| Optional 7.2 mg maintenance after ≥ 4 weeks on 2.4 mg, adults BMI ≥ 30 | `domain/dose.js` `withMaintenance72` | confirmed | Wegovy SmPC 4.2 (same URL) |
| Missed dose: ≤ 5 days → inject, otherwise skip | `domain/dose.js` `missedDoseAdvice` | confirmed | Wegovy SmPC 4.2 |
| Change injection day if ≥ 3 days (> 72 h) between doses | `views/dose.js` hint | confirmed | Wegovy SmPC 4.2 |
| Pen: 4 doses, 6 weeks after first use below 30 °C or fridge | `domain/defaults.js` `pen` | confirmed (FlexTouch) | Wegovy SmPC 2, 6.3, 6.4 |
| Pancreatitis, cholelithiasis, dehydration → renal impairment, delayed gastric emptying | `domain/symptoms.js`, guide | confirmed | Wegovy SmPC 4.4, 4.5, 4.8 and PIL |
| Stop ≥ 2 months before planned pregnancy; aspiration risk under anaesthesia | guide | confirmed | Wegovy SmPC 4.4, 4.6 |
| MTC / MEN 2 contraindication | guide | secondary (label snippets) | WEGOVY US prescribing information (FDA) — https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/215256s026lbl.pdf |
| Total water 2.0 L/day for women (food included) | water view, guide | confirmed | EFSA DRV summary report 2017 — https://www.efsa.europa.eu/sites/default/files/2017_09_DRVs_summary_report.pdf |
| Fibre 25 g/day; calcium PRI 950 mg/day (≥ 25 y); vitamin D AI 15 µg/day | guide | confirmed | EFSA DRV summary report 2017 |
| 150–300 min/week moderate aerobic; strength ≥ 2 days/week | `domain/defaults.js` `exercise` | confirmed | Bull FC et al., WHO 2020 guidelines, Br J Sports Med 2020;54:1451 — https://www.who.int/publications/i/item/9789240015128 |
| Levothyroxine fasting, ≥ 30 min before breakfast | meds view, reminders | confirmed | Ficha técnica Eutirox (AEMPS/CIMA) — https://cima.aemps.es/cima/dochtml/ft/64012/FichaTecnica_64012.html |
| Levothyroxine vs calcium/iron spacing | `domain/meds.js` (`spacingMin`, default 4 h) | **Spanish SmPC says ≥ 2 h**; 4 h kept as conservative default, configurable | Ficha técnica Eutirox 4.5 |
| Achilles pain monitoring: ≤ 5/10 during, settled next morning, not worse week to week | `domain/achilles.js` | secondary; threshold wording conflicts across summaries → configurable, hedged in UI | Silbernagel KG et al., Am J Sports Med 2007;35(6):897-906 (paywalled) |
| Waist > 88 cm women | `domain/weight.js` | secondary | NCEP ATP III executive summary — https://www.nhlbi.nih.gov/files/docs/guidelines/atp3xsum.pdf |
| Home BP ≥ 135/85; severe ≥ 180/110 (office grade 3) | `domain/bp.js` | secondary (paywalled) | 2023 ESH guidelines, J Hypertens 2023;41:1874-2071 |
| Protein 1.2–1.6 g/kg/day during weight loss (or 80–120 g/day) | protein view, guide | confirmed; evidence limited, body-weight basis unclear per the advisory | Mozaffarian D et al., Am J Clin Nutr 2025;122:344-367 |
| Devine ideal body weight (women 45.5 kg + 2.3 kg/inch over 5 ft) | `domain/protein.js` | secondary | Devine BJ, Drug Intell Clin Pharm 1974;8:650-655 |
| Adjusted weight factor 0.4 | `domain/protein.js` | **weak**: pharmacokinetic convention, no primary source for protein targets | — |
| Medical clearance before exercise if inactive with CV/metabolic/renal disease or symptoms | onboarding, exercise gate | confirmed (abstract) / secondary (algorithm figure) | Riebe D et al., Med Sci Sports Exerc 2015;47(11):2473-9 |
| Protein per serving in quick-add list | `domain/protein.js` `QUICK_FOODS` | **approximate**; UI tells the user to prefer the label | — |

Videos: `src/data/exercises.js`; each YouTube ID was checked through the oEmbed endpoint on 2026-11-10 (title and channel stored). Suitability was judged from title, channel and length, not by watching; the physio should review them.
