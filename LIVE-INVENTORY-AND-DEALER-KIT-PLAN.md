# Live Inventory Rebuild + "Dealer Kit" Productization Plan

July 10, 2026 · prepared for Aaron Phelps / Look Serious Creative
Companion docs: `INVENTORY-PIPELINE-PLAN.md` (original pipeline spec), `STOCK-BADGES.md` (live badge feed), `ADMIN-ACCESS-SETUP.md` (admin auth), `WEB-DESIGNER.md` (design system + strategy).

---

## Part 0 — Where the repo actually stands (audited July 10, 2026)

More is built than the planning docs admit. Current reality:

| Subsystem | Status |
|---|---|
| Live stock badge pipeline (Sheet "Website Feed" tab → `/api/stock` → badges) | **Working end-to-end.** 120s edge cache + 7-day last-good fallback; ships dark until `STOCK_FEED_URL` is set. |
| Badge coverage | Tractors, carousel, product H1 only (`tractors.html`, `index.html`, `product.html`). **Not wired:** `mowers.html`, `mower.html`, implements pages, v2 previews. |
| Feed schema | `sku, in_stock, on_order, hot_deal` — numbers + one checkbox. **No status labels, no Sale, no hide.** |
| SKU map (`functions/_stock-map.js`) | 24 dealer SKUs (14 TYM + 10 Bad Boy). Mowers/implements unmapped. Dealer-specific by design. |
| Out-of-stock hiding | **Does not exist.** 0/0 or missing-from-feed just means "no badge" — the product stays visible. Hiding today is a manual admin action (Product Editor → archive). |
| Admin suite (`/admin/`, `/admin/new/`, `/admin/photos/`) | **Working, production-grade.** Passcode + HMAC session auth, AI extract (allowlisted manufacturer hosts, structured outputs, never-guess prompt), publish via server-held GitHub token with hard path allowlist (inventory data files + `img/uploads/` only), live-to-main or preview-branch modes. |
| Sheet → data-files sync | **The planned `tools/sync-inventory.mjs` CLI was never built.** Its job is done human-in-the-loop by the admin Inventory Builder (fetch published-CSV URL → validate/diff → publish). No scheduled sync exists. |
| Data → sheet bootstrap | `tools/export-to-sheet.mjs` works (site data → per-tab CSVs). |
| Price-list reconcile | `tools/build-feed-from-price-list.mjs` works (Andrew's price CSV → feed CSV + unmatched report). Local harness: `tools/stock-dev-server.mjs`. |
| Inventory workbooks | **Two competing designs exist.** `JJ-Riggs-Live-Inventory.xlsx` (per-type tabs, one row/product, already has Status/Tag/Qty + full presentation fields incl. description, image URLs, features). `JJ-Riggs-Inventory-Master.xlsx` (implements-focused, includes a written Legend & Status Guide: In Stock / Limited / Low Stock / Backorder / Custom Order / Discontinued + tags Just In / N Left / Popular / Seasonal / Clearance). Neither is wired to the live feed. |
| Motion/ads studio (`/studio/`, source in `studio-src/`) | **Working, real product.** Full scene editor, deterministic canvas renderer, in-browser MP4 (H.264+AAC via WebCodecs) / WebM / PNG export — no video backend. Already has an "Inventory Builder" wizard that reads `jjriggs-full-inventory.csv` and seeds a 7-scene unit ad from a model name. |
| Homepage featured carousel | Still hardcoded (`js/featured.data.js` never built) — known debt. |
| Cleanup | `JJ-RIGGS-ADS-BUILDER/` is a stray image folder (no code), unrelated to `/studio/`. `csv-inventory/*.csv` snapshots stale by design. |

**Bottom line:** the "live inventory" item is genuinely the last structural piece for JJ Riggs, and it's smaller than it looks — the transport (feed + edge cache + badges) and the workbook drafts already exist. What's missing is the *schema* (labels instead of bare counts), the *hide* behavior, and *coverage* (all product types, all pages).

---

## Part 1 — The Live Inventory rebuild (the remaining JJ Riggs item)

### 1.1 One canonical workbook

Merge the two existing workbook designs into a single Google Sheet, **"JJ Riggs Live Inventory"**, bootstrapped from the current data files via `tools/export-to-sheet.mjs` (extended) so day one it matches the site exactly. Tabs:

- **Tractors / Mowers / Implements** — one row per product, the full presentation record (the `Live-Inventory.xlsx` column set): brand, model, display name/title, category fields, specs, price, description, image URL(s), manufacturer URL, feature text — plus the three control columns below.
- **Website Feed** (the only published-to-web tab) — formula-derived from the product tabs, never hand-edited: `key (=brand&"|"&model), status, tag, qty, on_order`. Costs/margins/serials stay in unpublished tabs, same privacy rule as today.
- **Lists** (hidden) — dropdown validation sources.

### 1.2 Control columns (the dropdowns Andrew actually touches)

Two dropdowns + one number, per product row — matching the vocabulary already drafted in the Master's Legend tab, mapped to the requested labels:

| Column | Values | Effect on site |
|---|---|---|
| **Status** (dropdown) | `On the Lot` · `Low Stock` · `On Order` · `Out of Stock` · `Discontinued` | On the Lot → green **On the Lot** chip. Low Stock → green **Only N left** (N from Qty). On Order → steel **On Order**. **Out of Stock / Discontinued → product hidden** from grids, carousel, and related-products; direct product URL shows a "Sold — call us" state. |
| **Tag** (dropdown, optional, max 1) | `—` · `Hot Deal` · `Sale` · `Just In` · `Clearance` | Promo chip layered on top of the status chip (max two chips total, Hot Deal/Sale take priority — same rule as today). `Sale` is a new badge; render it in the existing red system, no new brand colors. |
| **Qty** (number, optional) | 0–n | Drives "Only N left" wording; qty 1–4 with Status=On the Lot auto-downgrades the chip to Only-N-left so Andrew doesn't have to flip the dropdown when a unit sells. |

Design rationale: "2 left" is *derived from a number*, not a dropdown choice — a dropdown that says "2 left" goes stale the day one sells. The dropdowns carry intent (visible/hidden, promo); the number carries urgency.

Sheet hygiene carried over from the original plan: data validation on every enum, protected headers/formula columns, red conditional formatting on missing image/blurb, duplicate-key highlighting, nothing ever deleted (visibility is a dropdown, history preserved).

### 1.3 Code changes (in order)

1. **Feed schema v2** — `functions/_stock-map.js` `buildStockPayload()` accepts the new columns and keys rows by `brand|model` directly (`key` column), with the existing dealer-SKU map kept as a fallback so Andrew's price-list import path (`tools/build-feed-from-price-list.mjs`) still works. `functions/api/stock.js` itself barely changes (it's schema-agnostic transport). Whitelist rule updates: only `key/status/tag/qty/on_order` ever leave the endpoint.
2. **`js/stock-badges.js` v2** — render Status/Tag chips per the table above; add the **hide** behavior: for `Out of Stock`/`Discontinued`, remove the card from category grids, skip the carousel slide, and exclude from related-product rails. Keep the iron fallback: feed missing/stale/unset → badges absent, **nothing hidden** (a Google outage must never empty the site).
3. **Coverage** — wire `stock-badges.js` into `mowers.html`, `mower.html`, `implements.html`, `implement-category.html`, generated implement pages, and the v2 previews. Extend the map/keys for mowers and implements (implements key naturally by SKU — the workbook already has them).
4. **Sold-out product page state** — direct links to a hidden product get a clear, 60+-friendly panel: "This one's sold — call Andrew, more are coming: 509-738-2985" + related units. No 404s for old links or printed flyers. (Durable removal — out of the catalog entirely — remains the admin Product Editor archive path; the feed handles the day-to-day.)
5. **Test + docs** — extend `tools/stock-dev-server.mjs` for schema v2, full click-through (both brands, all HP tabs, mowers, implements, hidden-product direct link), update `STOCK-BADGES.md` and Andrew's one-page cheat sheet ("Sold the last one? Set Status to Out of Stock — it disappears from the site in a couple of minutes. Got it back? Flip it to On the Lot.").

**Effort: roughly 3–5 working days** (1 day workbook + bootstrap, 1–2 days feed/badges/hide/coverage, 1 day sold-out state + testing + docs), plus the 30-minute Andrew walkthrough. Decisions to hold for Andrew: whether hidden products should show the sold-out page or vanish entirely; Sale badge styling (stays inside the red system); tractor price display policy (still open from the original plan).

### 1.4 What this fixes beyond the ask

- Kills the "developer edit for every stock change" bottleneck completely — status, urgency, promos, and visibility all become sheet edits with ~2-minute propagation and zero deploys.
- The `featured` flag can ride the same workbook → finally un-hardcodes the homepage carousel (existing known debt #4).
- The schema v2 feed is exactly the interface the productized version needs (Part 2) — building it for JJ Riggs *is* building it for the product.

---

## Part 2 — How close is this to a sellable 24-hour dealer template?

### Honest answer: ~70–80% of the machinery exists; ~0% of the packaging does.

**What already carries over unchanged** (this is the hard part, and it's done):
- Zero-build static architecture on Cloudflare Pages — free hosting, no build, no CMS, nothing to break. Category/product/implement pages render from plain data files.
- The **admin suite** — passcode auth, AI fact-extraction from manufacturer pages (with the never-guess discipline baked into the prompt), photo editor, allowlisted publish-to-git. This is the moat: a dealer can maintain their own site with zero technical skill, and *onboarding a new dealer's catalog is the same wizard run N times*.
- The **live inventory feed** (post Part 1) — sheet-driven status/visibility with edge caching and fail-safe fallbacks.
- The **motion studio** — a real in-browser MP4 ad builder already seeded from inventory data. No competitor in the small-dealer web space has this.
- The **playbooks** — WEB-DESIGNER.md, the two Claude skills, the change-summary culture. These become the franchise operations manual.

**What blocks a 24-hour setup today:**

1. **Brand/config hardcoding.** Design tokens are copy-pasted into ~11 pages (known debt #1); name/phone/address/hours/GA4/socials are inline everywhere; town SEO pages, services, financing copy are JJ-specific. → Fix: extract `site.css` + a single `site-config.js` (identity, tokens, logo paths, nav, brands, analytics ID). This was already the top item on the debt list — the product just makes it urgent.
2. **Dealer-specifics buried in functions.** Repo name in the publish endpoint, manufacturer host allowlist in `_lib-page.js`, the SKU map, Resend addresses. → Fix: move all of it to env vars / a config module (`GH_REPO`, `ALLOWED_EXTRACT_HOSTS`, `LEAD_*` — half are env vars already).
3. **Font licensing.** Tactic Sans is a licensed MyFonts webfont kit — it cannot ship to other clients. → Per-client font slot in the config (license per dealer, or a default open pairing e.g. Archivo Black + Questrial). This is a real legal blocker, not polish.
4. **No dealer bootstrap tooling.** Turning "here's my inventory list" into a filled sheet + data files + photos is manual today. The pieces exist (extract endpoint, New Product wizard, the inventory-scout crawler pattern, `export-to-sheet.mjs`) but nothing chains them.
5. **New manufacturer brands need verified extract templates.** TYM/Bad Boy/IronCraft/Braber/CID are proven. A Kubota or Mahindra dealer means new allowlist hosts and a verification pass — remember the open-station/cab photo-mix-up bug class; "never invent data" must survive productization (it's a selling point: *accurate* dealer sites).

### The Dealer Kit build plan

| Phase | Work | Effort |
|---|---|---|
| **A. Ship Part 1 on JJ Riggs** | The live inventory rebuild above. JJ Riggs becomes the working demo + reference site. | 3–5 days |
| **B. De-hardcode** | `site.css` + `site-config.js`; env-var the functions; content-slot the static pages (services/financing/about as templates with dealer-copy slots); generalize `generate-town-pages.mjs` (it's already a generator — feed it dealer towns). | 3–5 days |
| **C. Bootstrap CLI + template repo** | GitHub template repo. `tools/init-dealer.mjs`: intake JSON (name, phone, address, hours, towns, brands, colors, logo, domain) → themed repo → batch extract run over the dealer's inventory list (crawler + extract endpoint, human-reviewed gap report — exactly the inventory-scout workflow) → populated sheet + data files. | ~1 week |
| **D. Ops playbook** | Per-dealer checklist: Cloudflare Pages project, 4 env vars, sheet from template, publish Website Feed tab, DNS. Dealer cheat sheets (sheet editing, admin tools). Run-of-show for the 24-hour setup. | 2–3 days |
| **E. Studio generalization** | Studio reads theme from `site-config` (colors/logo/fonts) and inventory from a generated feed endpoint instead of the hardcoded `jjriggs-full-inventory.csv`; add vertical 9:16 + square 1:1 format presets for FB/IG/Reels. Sheet Tag column (`Hot Deal`/`Sale`) becomes an ad-template selector: pick a model → the promo chip, price, and specs are pre-filled → export MP4. | 3–4 days |

**Total to a sellable v1: roughly 3–4 focused weeks** on top of Part 1. Prioritize A → B → C → D; E is the upsell and can trail.

### The 24-hour promise, realistically

"Set up in 24 hours" should mean **24 working hours across 2–3 calendar days** (photo gathering and the dealer review call are human-gated):

- **Hours 0–2 — intake call:** logo, colors, phone/address/hours, brands carried, inventory list (any format — spreadsheet, price list, photos of a whiteboard), domain access.
- **Hours 2–8 — bootstrap:** init script builds the themed repo; crawler + extract fill the sheet from manufacturer pages; human reviews the gap report (the never-invent rule means gaps are flagged, not papered over).
- **Hours 8–14 — content pass:** services/about/financing slots filled, town pages generated, photos placed, placeholder cards for anything missing.
- **Hours 14–18 — deploy:** Cloudflare Pages + env vars, live badges from their sheet, admin passcode handed over, test deploy link out.
- **Day 2–3 — review call → fixes → DNS cutover.** Same discipline as JJ Riggs: nothing goes live until the dealer has seen it.

First 2–3 dealers will take 2× that; the tooling exists to compress it. Cheapest pilot pool: **other TYM and Bad Boy dealers** — same manufacturer sites, same extract templates, near-zero marginal engineering. (Non-compete courtesy: pick dealers outside Andrew's territory, and get his blessing to use jjriggsequipment.com as the reference.)

### Packaging sketch (suggestion — your call)

- **Setup:** $3,500–6,000 per dealer (site + populated inventory sheet + admin + training). JJ Riggs at $1.5–2k was the friends-and-family prototype rate.
- **Care plan:** $99–249/mo — hosting/monitoring, feed watch, small content edits, admin support. Marginal cost per dealer is nearly zero (CF free tier, extract calls are pennies, one repo).
- **Ads studio upsell:** +$99/mo or per-campaign packs — "your inventory sheet makes your Facebook ads."
- Repo-per-dealer, not multi-tenant: preserves the zero-build guarantee, isolates blast radius, and each dealer's git history is their undo. Revisit only past ~20 dealers.

### Risks to keep in view

- **Font + photo rights:** Tactic Sans license (per-client), and manufacturer imagery is only defensible for *authorized dealers* of that brand — the intake must confirm dealer status per brand.
- **Data discipline at scale:** the extract pipeline's "null beats guess" rule and human-review gates are non-negotiable per dealer; a fabricated spec on someone else's site is the fastest way to kill the product's reputation.
- **Support surface:** every dealer gets a sheet, an admin passcode, and opinions. The cheat-sheet + walkthrough model worked for Andrew; keep onboarding that ritualized.
- **Cleanup before templating:** delete `JJ-RIGGS-ADS-BUILDER/` (stray images), stale `csv-inventory/*` mirrors, duplicate `bb-tractor-images/` tree, and resolve the two-workbook split (Part 1 does this) so the template forks from a clean base.

---

## Part 3 — Recommended sequence (one line each)

1. **Build Part 1 now** — it closes Andrew's biggest operational gap *and* forges the exact feed schema the product needs.
2. **Extract `site.css`/`site-config.js` next** — pays down JJ Riggs's #1 debt even if the product never ships.
3. **Template repo + bootstrap CLI + ops playbook** — then recruit one pilot TYM or Bad Boy dealer outside Andrew's territory.
4. **Generalize the studio last** — it's the differentiator in the sales pitch, but the site + sheet is the product.
