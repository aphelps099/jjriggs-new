# Change Summary — TYM & Bad Boy Listing Corrections (July 1, 2026)

Source of truth: Andrew Alluis's June 29, 2026 stock lists. Test build only — nothing promoted to the live domain.

## TYM (`js/tym-models.data.js` + `js/tractor-features.data.js`)

**Removed (confirmed off stock list):** T254, T2400, T2610, T25, T3620, T4820, T4820C, T4820CH, T5520, T5520CH — model objects and feature-copy entries deleted.

**Removed — DEFAULT APPLIED, confirm with Andrew (Q1):** T3035 and T3035C. The requested T3035 retitle conflicted with the stock list; default was to remove both variants. **Do not ship live until Andrew confirms.**

**Renamed + reconfigured** (model + feature keys + in-copy mentions updated):

| Old | New | cab |
|---|---|---|
| T3025 | T3025H | true → **false** |
| T3025C | T3025CH | true (unchanged) |
| T474 | T474H | true → **false** |
| T474C | T474CH | true (unchanged) |
| T494 | T494H | false (unchanged) |
| T494C | T494CH | true (unchanged) |
| T574 | T574H | true → **false** |
| T574C | T574CH | true (unchanged) |

**Added: T2025P** (replaces T25). All specs sourced from TYM's official product page and dealer spec sheets — 24.7 HP Yanmar 3TNV80F (naturally aspirated), 4WD, 2-range HST, 1,380 lb loader lift, 1,550 lb hitch lift. Feature copy adapted from TYM's official page. Product URL points to tym.world (JJ Riggs has no T2025P page yet).
- **⚠ No product image.** No official TYM or JJ Riggs image URL could be sourced (TYM's site doesn't expose a direct image URL; dealer photos aren't ours to hotlink — one dealer's "photo" was literally AI-generated). `image` is empty, so the card shows a blank picture slot. **Action: upload a real T2025P product photo to jjriggsequipment.com and set the URL.**

## Bad Boy (`js/badboy-models.data.js` + `js/badboy-tractor-images.data.js`)

**Removed shuttle-shift models — DEFAULT APPLIED, confirm with Andrew (Q4):** 5045S, 5045CS, 5055S, 5055CS. Gallery keys deleted too.

**Renamed (append H, no config change):** 1022→1022H, 1025→1025H, 3026→3026H, 4025→4025H. Gallery keys updated to match.

## Other edits found by verification grep

- `index.html` featured carousel: hardcoded **5055CS** card → now 5055CH; hardcoded **1025** card → now 1025H.

## Held for Andrew — not touched

1. **T5068, T5074** — on stock list but no config/images exist in the repo. Not added (would require inventing specs). Need real data before adding.
2. **T5075** — fully built on the site but NOT on Andrew's stock list. Left in place. Keep or pull?
3. **T224, T115, T130** — on the site, on neither the stock list nor any remove instruction. Left as-is. Need a decision.
4. **Picture fix: 4035H** — still shares its image with 4035CH (cab photo). No genuine open-station photo exists in the repo (`img/bb-tractor-images/4035/` has only one model photo). Needs a real asset.
5. **Picture fix: 5045CH** — still uses the open-station photo (`5045s_model_photo_1.jpg`). Needs a genuine cab photo.
6. **Picture fix: 5055H** — still uses the cab-labeled photo (`5055cs_model_photo_1.jpg`). Needs a genuine open-station photo.
7. **T2025P product image** — see above.
8. Minor: `schedule-visit.html` service form placeholder still says "e.g. TYM T474" — form is out of scope this round; trivial text fix whenever the forms are next touched.

## Out of scope, untouched per guardrails

Schedule-a-Visit calendar wiring, Quote/Schedule Service forms, `csv-inventory/*.csv` (stale mirrors, not rendered).

## Verification performed

- Repo-wide grep: zero remaining references to any removed or pre-rename model string in html/js (excluding ignored csv-inventory), other than the flagged form placeholder.
- All four data files parse cleanly (node syntax check).
- Cross-check: no orphaned feature/gallery keys; every Bad Boy model has a gallery; every TYM model except T2025P has feature copy; cab flags match the reconciled table.
- Card-rendering fields (`model, hp, series, cab, image`) present on every model.
