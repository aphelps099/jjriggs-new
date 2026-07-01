# JJ Riggs — Google Sheet Inventory Pipeline & Product Page Plan (Internal)

July 1, 2026 · Aaron Phelps / Look Serious Creative

Architecture decision (confirmed): **Sheet is the source of truth; a sync script regenerates the site's data files on demand.** The site stays fully static and fast; nothing on the live site depends on Google being up. One workbook covers everything: tractors, mowers, implements, feature copy, photo galleries.

---

## 1. Current state (audited July 1)

The site is static HTML; every category and product page renders client-side from `window.*` globals in plain JS data files:

| Data file | Global | Records | Fields |
|---|---|---|---|
| `js/tym-models.data.js` | `TYM_MODELS` | 15 | model, hp, series, cab, url, image, blurb, engine, drive, transmission, loader_lift_lbs, fuel |
| `js/badboy-models.data.js` | `BADBOY_MODELS` | 10 | + series_name, use_tags |
| `js/mower-models.data.js` | `MOWER_MODELS` | 15 | model, cat, type, engine, hp, decks, fuel, drive, price, image, url, blurb, transmission |
| `implements-data.js` (root) | `JJ_IMPLEMENTS` + `JJ_CATEGORIES` + `JJ_GROUP_ORDER` | 82 | id, brand, group, category, duty, name, attach, width/widthIn, weight, hitch, c1–c3, hpMin/hpMax/hpRaw, fitNote, slug, sku, img, page |
| `js/tractor-features.data.js` | `TRACTOR_FEATURES` | keyed `"Brand\|Model"` | heading, intro, items[title, body, image] |
| `js/mower-features.data.js` | `MOWER_FEATURES` | keyed by model | same shape |
| `js/tractor-specs.data.js` / `js/mower-specs.data.js` | `TRACTOR_SPECS` / `MOWER_SPECS` | 1 each (nearly unused) | quick[], groups[] |
| `js/badboy-tractor-images.data.js` | `TRACTOR_GALLERY` | keyed `"Bad Boy\|Model"` | image path arrays |

Consumers: `tractors.html`, `mowers.html`, `mower.html`, `implements.html`, `implement-category.html`, `product-template.html` (universal detail page with per-type adapters), plus hardcoded featured cards in `index.html` (carousel).

Known pain points this pipeline solves:
- Renames/removals require synchronized edits across 3–4 files keyed on exact model strings — a silent-breakage trap (we just fixed exactly this class of bug by hand in the June 29 stock-list reconciliation).
- `index.html` featured carousel is hardcoded and can reference removed models.
- `csv-inventory/*.csv` are stale, disconnected mirrors — to be replaced by this project and then deleted.
- Andrew's real workflow is "what's in stock changed" — today that means a developer edit; it should be a dropdown in a sheet.

## 2. The workbook design

One Google Sheet workbook: **"JJ Riggs Inventory Master"**. Tabs:

**① Tractors** — one row per model, TYM and Bad Boy together.
`brand | model | display_name | status | sort | hp | series | series_name | station (Open Station / Cab) | transmission | drive | loader_lift_lbs | engine | fuel | price | blurb | image_url | manufacturer_url | use_tags | featured (homepage carousel) | notes`

**② Mowers** — `brand | model | status | sort | category | type | engine | hp | decks | fuel | drive | transmission | price | blurb | image_url | manufacturer_url | featured | notes`

**③ Implements** — the existing 82-row master CSV (`csv-inventory/JJ-Riggs-Inventory-Master - Inventory.csv`) is already sheet-shaped; import it as the starting point and add `status`, `sort`, `featured`.

**④ Feature Copy** — long format, one row per feature bullet:
`product_type | brand | model | seq | heading | intro | item_title | item_body | item_image_url`
(heading/intro only on seq 1; the sync script assembles the keyed objects.)

**⑤ Galleries** — one row per photo: `product_type | brand | model | seq | image_url | caption`

**⑥ Categories** (implements) — category, group, blurb, image (feeds `JJ_CATEGORIES`/`JJ_GROUP_ORDER`).

**⑦ Lists** (hidden) — validation sources: brands, series, statuses, transmissions, station values.

### Sheet hygiene (what makes it "sophisticated" without being fragile)
- **`status` dropdown controls visibility: `Active / Hidden / Discontinued`.** Nobody ever deletes a row — pulling a model from the site is one dropdown change, and history is preserved. (This is exactly the T5075 / T224 / T115 / T130 "keep or pull?" workflow.)
- Data validation on every enum column; protected header row and protected formula columns; Andrew's team can only edit whitelisted ranges.
- Conditional formatting: red fill on missing image_url, blurb, or hp — problems visible at a glance.
- A frozen `key` helper column (`=brand&"|"&model`) with duplicate-detection highlighting.
- Renames happen in ONE cell; the sync script propagates to features/galleries via the key, and reports any orphaned feature/gallery rows instead of silently dropping them.

## 3. Sync pipeline

`tools/sync-inventory.mjs` (Node, no dependencies beyond `csv-parse`):

1. **Fetch** each tab as CSV via the sheet's export URL (`.../export?format=csv&gid=N`; sheet shared "anyone with link can view", or Sheets API + key if we prefer it private).
2. **Validate — fail loudly, never publish silently:**
   - required fields per tab; enum values; numeric fields numeric
   - duplicate `brand|model` keys
   - every Feature/Gallery row's key matches an Active or Hidden product (catches the rename-desync bug permanently)
   - image URLs respond 200 (HEAD request), warn on 404
3. **Generate** all data files (`tym-models`, `badboy-models`, `mower-models`, `implements-data`, features, galleries, categories) byte-stable and sorted by `sort`.
4. **Diff report**: prints added/removed/changed models vs. the previous files so every sync is reviewable before pushing.
5. **Featured carousel**: generate `js/featured.data.js` from rows flagged `featured`, and refactor `index.html` to render the carousel from it — kills the last hardcoded model references.

Run modes: `npm run sync` locally (review diff → commit → deploy). Optional later: scheduled GitHub Action that syncs nightly and opens a PR. Explicitly NOT auto-deploying to live without review in v1.

**Bootstrap step (important):** the initial sheet is *generated from the current data files* by a one-time `tools/export-to-sheet.mjs` producing per-tab CSVs to import. The sheet starts 100% faithful to the site — no retyping, no transcription errors. Round-trip test (export → import → sync → diff = empty) proves the pipeline before Andrew ever touches it.

## 4. Rollout phases (maps to the 3–4 week / $1,500–2,000 estimate)

| Phase | Work | Time |
|---|---|---|
| 1. Schema + bootstrap | Build workbook, import generated CSVs, validation/protection rules | ~3–4 days |
| 2. Sync script | Fetch, validate, generate, diff report; round-trip test | ~1 week |
| 3. Refactor consumers | featured carousel from data; kill stale csv-inventory; implements-data unification under js/ | ~2–3 days |
| 4. Andrew onboarding | 30-min walkthrough + a one-page "how to update inventory" cheat sheet (screenshots, 60+ friendly); he does a supervised edit → sync → verify | ~2 days incl. docs |
| 5. Hardening | Photo workflow (below), price display policy, handoff | remainder |

**Photo workflow decision needed:** the sheet stores URLs, but photos must live somewhere. Options: (a) keep uploading to the existing WordPress media library at jjriggsequipment.com and paste URLs — zero new infrastructure, recommended; (b) a Drive folder + script that publishes to `img/`. Start with (a).

**Out of scope / later:** QuickBooks integration (revisit only if Andrew wants quantity-level sync); per-unit serialized inventory; online booking (Andrew has flagged calendar concerns — separate conversation).

## 5. Product page audit (product-template.html) — findings & plan

Reviewed the universal detail page and its three adapters. It's structurally solid (normalized product object, graceful fallbacks). Issues, prioritized for the 60+ NE-Washington audience:

**P1 — legibility & hierarchy**
1. Small type throughout the info-dense areas: quick-spec labels, spec-sheet rows, and the "photo coming soon" placeholder run ~.8rem with light-gray `#9aa0a6` text — fails comfortable reading for older eyes. Target: ≥16px body everywhere, ≥4.5:1 contrast.
2. **Tabs hide half the content.** Specifications and Features are behind tabs; older users often don't recognize tabs and never see the second panel. Recommendation: stack sections vertically with big bold section headings ("Specifications", "Features") and remove the tab switch, or keep tabs on desktop and auto-stack on mobile.
3. Features accordion ships collapsed (only first open). Same discoverability problem. Recommendation: all items open with images inline, or larger +/- affordances with a visible "expand" hint.
4. The H1 model name is overlaid on the photo (`ov-idover`) — on light images it's low contrast, and the page has no plain-text title block. Put "TYM T474H — 48 HP Compact Tractor, Open Station" as a real heading above/next to the gallery.

**P2 — trust & conversion (this audience calls; they don't fill forms)**
5. The phone number appears only inside the price panel. Make it a persistent, large tap-to-call element (sticky on mobile). "Call Andrew: 509-738-2985" outperforms any form for this demographic.
6. Add a location/trust strip: address, hours, "Family owned in Colville" — reassurance that this is the local dealership, not a national site.
7. "Best local deal · ask Andrew" is good voice — keep it, but pair with the phone number, not just the Quote button.
8. Print button is a keeper for this audience; make sure print CSS renders specs cleanly.

**P3 — consistency & polish**
9. The three product types have unequal richness: implements get no blurb and no features; mowers get a single photo. The Sheet's Feature Copy and Galleries tabs fix the data side; the template already handles it.
10. Cab/Open Station labeling should render "Open Station" (Andrew's language), never "Open" (quick-spec box currently prints `Station: Open`).
11. Quick-spec box caps at 5 items — sensible; make loader lift and station always present for tractors (they're the two things buyers compare).
12. Empty-image state ("Photo coming soon") will be visible for T2025P — style it as a branded placeholder card rather than gray small-caps text.

Deliverable for this track: after plan approval, implement P1 items on `product-template.html` first (one CSS/markup pass), then P2; A/B nothing — just ship the legibility fixes, they're unambiguous.

## 6. Risks / open questions

- Sheet shared-link privacy: export-URL approach means the sheet is technically readable by anyone with the link. Fine for inventory data; use Sheets API if Andrew objects.
- Two people editing the sheet simultaneously is fine (Google handles it), but establish who owns it on the JJ Riggs side — recommend Andrew only, at least initially.
- Price policy: mowers have a price field, tractors show "Call for price". Confirm with Andrew whether tractor prices should ever display; the schema supports both.
- Andrew's June 29 note lists T5068/T5074 as stocked — still no specs/photos anywhere. They enter via the sheet as `Hidden` rows until real data exists.
