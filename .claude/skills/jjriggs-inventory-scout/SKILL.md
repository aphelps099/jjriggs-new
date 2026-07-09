---
name: jjriggs-inventory-scout
description: Workflow for auditing, scouting, and crawling JJ Riggs product/inventory data — finding missing images and specs, reconciling Andrew's stock lists, updating js/*.data.js files, building or running inventory crawlers/sync tooling, or preparing Google Sheet pipeline data. Use for any inventory, product-data, spec, photo-sourcing, or catalog-completeness task in this repo.
---

# JJ Riggs Inventory Scout

The dealership (Andrew Alluis, JJ Riggs Equipment) has no organized inventory-update process — the site's biggest operational problem. This skill covers auditing what data exists, scouting what's missing, and keeping the keyed data files in sync. Strategy background: `INVENTORY-HANDOFF.md` (CURRENT system state — read first), `INVENTORY-PIPELINE-PLAN.md` (Google Sheet pipeline spec), `perplexity-product-data-prompt.md` (extraction prototype), `CHANGE-SUMMARY-2026-07-01.md` (how reconciliations are reported).

## Cardinal rules

1. **Never invent data.** Verbatim extraction only; a blank field beats a guess. No fabricated specs, prices, blurbs, or images. (One dealer "photo" found in the wild was AI-generated — that's why.)
2. **Every scouted value carries its source URL** so a human can verify before it ships.
3. **Photos must match the exact configuration** — an open-station model must never show a cab photo or vice versa (past real bug: 4035H/5045CH/5055H).
4. **Source-of-truth order:** Andrew's stock list (what's actually stocked) → old live site `jjriggsequipment.com` product pages → manufacturer sites (`tym.world`, `badboymowers.com`; IronCraft/Braber/CID for implements). Nothing else — other dealers' photos aren't ours to use.
5. Deliverables are **gap reports + prefilled rows for review**, never silent edits to live data. Flag every default you applied and every decision held for Andrew.

## What a complete record looks like (field maps)

- **Tractor** (`js/tym-models.data.js`, `js/badboy-models.data.js`): model, hp, series (+ series_name for Bad Boy), cab (boolean; render as "Open Station"/"Cab"), engine, drive, transmission, loader_lift_lbs, fuel, blurb, image (local path), url (manufacturer/product page), use_tags (Bad Boy).
- **Mower** (`js/mower-models.data.js`): model, cat, type, engine, hp, decks, fuel, drive, transmission, price, image, url, blurb.
- **Implement** (`implements-data.js`): id, brand, group, category, duty, name, attach, width/widthIn, weight, hitch, hpMin/hpMax, fitNote, slug, sku, img, page.
- **Feature copy** (`js/tractor-features.data.js`, `js/mower-features.data.js`): keyed `"Brand|Model"` → heading, intro, items[{title, body, image}].
- **Galleries** (`js/badboy-tractor-images.data.js`): keyed `"Brand|Model"` → image path arrays.

## Auditing for gaps

Cross-check the model data files against feature/gallery keys and image paths. Report per model: missing fields, missing/blank image, image shared with another model (compare file paths across models), remote-hotlinked image (URL contains `jjriggsequipment.com/wp-content`), orphaned feature/gallery keys (key matches no model), models on Andrew's stock list absent from the site, and site models absent from the stock list. `csv-inventory/*.csv` and `jjriggs-full-inventory.csv` are stale snapshots — useful as historical reference, never authoritative.

## Crawling for missing data

The old-site product pages have a stable layout: H1 title, intro sentence, headline specs, "Additional information" spec table, photo gallery, expandable features section. `perplexity-product-data-prompt.md` defines the proven extraction schema — three tables:
- **Products** (one row/product): brand, type, model, series_or_category, title, short_description, price, hp, engine_make, drive, transmission, lift_capacity, station, deck_sizes, fuel, weight, key_specs_other, product_url, primary_image_url, gallery_image_urls.
- **Specifications** (long): brand, model, spec_group, spec_label, spec_value — verbatim.
- **Features** (long): brand, model, order, feature_title, feature_body, feature_image_url.

For an automated crawler, use puppeteer (already in `node_modules`), put scripts in `tools/`, output CSVs matching those headers plus a `source_url` column, and start with a coverage list (brand, model, URL) before extracting. Category entry points: `/branson-tym-tractors/`, `/bad-boy-mowers/`, `/implements/` on jjriggsequipment.com.

## Image handling

Download assets into the repo (`img/tym-tractors/tym-<model>.png`, `img/bb-tractor-images/<series>/<model>_<slot>_<n>.<ext>`, `img/bad-boy-mowers/bad-boy-<model>.jpg`) — see `tools/fetch-tym-images.sh` for the pattern. Verify each image is the exact model + configuration before assigning it. If no genuine photo exists, leave the field empty (renders the "Photo coming to the lot" placeholder) and flag it.

## After any data change

1. Sync `"Brand|Model"` keys across feature/gallery files; grep for old model strings repo-wide (including `index.html`'s hardcoded carousel).
2. `node --check` all touched data files.
3. Serve over http and click category page → product page for affected models.
4. Write a change summary in the style of `CHANGE-SUMMARY-2026-07-01.md`: every edit, every default applied, every item held for Andrew.
