# JJ Riggs Equipment Website — Owner's Guide

July 2026 · Aaron Phelps / Look Serious Creative
The one document that explains the whole system: what the website is, how to run it day-to-day, how to sell it to other dealers, and where it's going next. Deep-dive docs are linked throughout — this is the map.

---

## Index

1. [The website at a glance](#1-the-website-at-a-glance)
2. [Day-to-day updates (the common tasks)](#2-day-to-day-updates)
3. [The admin tools](#3-the-admin-tools)
4. [Live stock badges from the Google Sheet](#4-live-stock-badges)
5. [Previewing and deploying](#5-previewing-and-deploying)
6. [Design rules you must not break](#6-design-rules)
7. [The data layer and its one fragility](#7-the-data-layer)
8. [Command-line tools reference](#8-tools-reference)
9. [Facebook posting from the inventory sheet](#9-facebook-posting)
10. [The video / ads studio](#10-the-video--ads-studio)
11. [Packaging this for other dealers — the Dealer Kit](#11-the-dealer-kit)
12. [Future development roadmap](#12-future-development-roadmap)
13. [Document map](#13-document-map)

---

## 1. The website at a glance

**What it is:** a zero-build static website — plain HTML, CSS, and vanilla JavaScript, no framework, no CMS, no build step — deployed on **Cloudflare Pages** straight from the GitHub repo (`aphelps099/jjriggs-new`). Push to `main` and the site rebuilds in about a minute. Hosting is effectively free.

**Who it's for:** JJ Riggs Equipment (Andrew Alluis), a TYM + Bad Boy dealership in Colville, WA. The customer is often 60+, rural, and buys by phone — every page exists to show machines clearly and make calling **509-738-2985** the easiest action on screen.

**How pages work:**
- The header/topbar/nav is injected on every page by `header.js` + `header.css` — edit once, changes everywhere.
- The footer is copy-pasted per page (known debt — see §12).
- Category pages (`tractors.html`, `mowers.html`, `implements.html`) and product pages render in the browser from plain-JS data files (`js/*.data.js`, `implements-data.js`). Change the data file, the pages change.
- A handful of serverless functions under `functions/` handle the contact form, the live stock feed, and the admin tools. That's the entire backend.

**The three moving parts beyond the site itself:**
| Part | What it does | Where |
|---|---|---|
| Admin tools | Passcode-gated browser tools that let a non-technical person edit inventory and photos | `/admin/` on the live site |
| Live stock feed | Andrew's Google Sheet drives on-the-lot badges with ~2-minute latency, zero deploys | Sheet → `/api/stock` → badges |
| Ads studio | In-browser motion-graphics tool that exports real MP4 video ads from inventory data | `/studio/` on the live site |

---

## 2. Day-to-day updates

The common tasks, from most to least frequent:

### Change what's in stock / add a deal badge
Edit the Google Sheet — nothing else. Change the In Stock / On Order numbers, or tick the `hot_deal` box on the Website Feed tab. The site picks it up within a few minutes. Full details in §4.

### Add a brand-new product
Open `/admin/new/` on the live site. Pick the type (TYM tractor / Bad Boy tractor / mower / implement), paste the manufacturer page URL, click **Fetch the facts** — the AI extracts specs verbatim from the page (blank when the page doesn't say; it never guesses). Review every field, pick photos from the candidates it found, publish. It also gives you a TSV row to paste into the master sheet so the sheet stays the source of truth.

### Edit or reorder product photos
Open `/admin/photos/`. Add, remove, reorder, or star photos on any product (uploads are auto-resized in the browser). This is also where you **remove a product from the site** (archived, never deleted — one click restores it). The live site's little edit-pencil icons deep-link straight into this tool.

### Bulk inventory changes from a spreadsheet
Open `/admin/` (the Inventory Builder). Import CSVs or fetch a published Google Sheet URL, review the validation diff against what's live, optionally AI-enrich missing fields, publish.

### Change page copy, layout, or design
That's a code change: edit the HTML, preview locally (§5), push to a branch, deploy a test build, **walk Andrew through it, then promote**. Nothing ships to the live domain without Andrew seeing it — that's the house rule. (Inventory data and photos through the admin tools are the deliberate exception: there, the editor *is* the reviewer.)

---

## 3. The admin tools

Three tools, one passcode. Full setup in **`ADMIN-ACCESS-SETUP.md`**.

- **Access:** `jjriggsequipment.com/admin/` → enter the shared passcode once → signed in on that device for 30 days. Changing the `ADMIN_PASSCODE` environment variable in Cloudflare signs everyone out instantly.
- **The tools:** `/admin/` Inventory Builder (sheet/CSV → site), `/admin/new/` New Product wizard (AI extract), `/admin/photos/` Product Editor (photos, remove/restore).
- **How publishing works:** every publish is a **git commit to the repo** made by the server. History is the undo button.
- **Why it's safe:** the publish endpoint has a hard path allowlist — it can only ever write the inventory data files (`js/*.data.js`, `implements-data.js`) and photos under `img/uploads/`. It **cannot touch the site's code**, even with a valid login. The AI extraction endpoint only reads from allowlisted manufacturer sites (TYM, Bad Boy, IronCraft, Braber, CID) and is prompt-bound to never invent a spec.
- **Requirements (Cloudflare env vars):** `ADMIN_PASSCODE`, `ANTHROPIC_API_KEY`, `GH_PUBLISH_TOKEN` (fine-grained GitHub token, Contents read/write on this repo only — note its expiry date and renew).

---

## 4. Live stock badges

Full spec in **`STOCK-BADGES.md`**. The short version:

**Flow:** Andrew's price sheet has a "Website Feed" tab (only that tab is ever published to the web — costs and margins never leave the other tabs) → the site's `/api/stock` function fetches it → `js/stock-badges.js` paints badges on tractor cards, the homepage carousel, and product pages.

**Badge rules (priority order, max two chips):** Hot Deal (red, from the checkbox) → On the Lot (5+ in stock) → Only N left (1–4) → On Order (0 stock, 1+ on order) → no badge.

**Built to never break the site:** responses are edge-cached 120 seconds; if Google is down or the sheet is unpublished, the last good copy serves for up to 7 days; if there's no copy at all, pages simply render without badges. No errors, no spinners, ever.

**Andrew's entire workflow** (the cheat sheet, printable from `STOCK-BADGES.md`): change the In Stock number in the sheet he already uses; tick/untick `hot_deal` for the red tag. Sold the last one? Set it to 0 — badge disappears.

**Current limits (fixed by the Phase A rebuild, §12):** covers tractors only (24 dealer SKUs mapped in `functions/_stock-map.js`); can badge a product but **cannot hide it**; no "Sale" tag yet.

---

## 5. Previewing and deploying

- **Local preview:** `python3 -m http.server` from the repo root, then open `http://localhost:8000`. Always over http — pages fetch data files, so `file://` won't render category/product pages. Check every change at phone width (~375px) and desktop (~1280px).
- **Local stock-feed testing:** `node tools/stock-dev-server.mjs` serves the site *plus* a working `/api/stock` on port 8788, using the same parsing code the real function runs.
- **Deploys:** Cloudflare Pages builds from the repo automatically — no build command, output directory `/`. Branch pushes get preview URLs (`*.pages.dev`); `main` is the live site.
- **The review rule:** design/code changes go to a test deploy for Andrew's review before promoting to the live domain. No exceptions.

---

## 6. Design rules

The complete handbook is **`WEB-DESIGNER.md`** — read it before any design work. The five rules that must survive any change:

1. **60+, phone-first.** Body text ≥16px, contrast ≥4.5:1, the phone number one glance away, nothing important hidden behind tabs or carousels.
2. **Never invent data.** No guessed specs, prices, or photos. A blank beats a plausible fake. Never show one model's photo on another (open-station vs cab mix-ups are a real past bug).
3. **One design system, two brands.** The red (`#cf1f2a`) is JJ Riggs's, not a manufacturer's. No "Bad Boy orange" tokens. Tactic Sans headings, Questrial body, the angle-cut `.cut-tab` motif.
4. **No frameworks, no build step, no CMS.** The zero-build site is why it's fast, cheap, and unbreakable.
5. **Design tokens are copy-pasted into every page's `<style>` block** — a page missing them renders a broken header. Copy the full `:root` set into any new page.

---

## 7. The data layer

**The iron rule: model names are foreign keys.** Feature copy (`js/tractor-features.data.js`) and photo galleries (`js/badboy-tractor-images.data.js`) are keyed on exact `"Brand|Model"` strings. Rename or remove a model without updating those keys and the product page *silently* loses its features and gallery — no error, just a quietly worse page.

**After any model rename/removal, always:**
1. Update the matching keys in the feature/gallery files.
2. `grep` the whole repo for the old model string (nav links, the homepage carousel, anchors).
3. `node --check` every touched data file.
4. Load the category page over http and click through to the product page — verify title, Open Station/Cab label, photo, features, gallery.

Say **"Open Station," never "Open"** — that's Andrew's and the customers' language.

---

## 8. Tools reference

All run as `node tools/<name>.mjs` from the repo root (no npm install needed):

| Tool | What it does |
|---|---|
| `export-to-sheet.mjs` | Site data → per-tab CSVs, for bootstrapping the master Google Sheet so nobody retypes anything |
| `build-feed-from-price-list.mjs <csv>` | Andrew's price-list CSV → Website Feed CSV + a reconciliation report of anything that didn't match |
| `stock-dev-server.mjs` | Local site + working `/api/stock` for badge testing |
| `fb-post-test.mjs` | Dry-run of the sheet→Facebook pipeline; writes `fb-post-preview.html` (§9) |
| `import-implement-workbook.mjs` | Implement research workbook CSV → merged into `implements-data.js`, deterministic diff printed |
| `generate-implement-pages.mjs` | Regenerates the 21 static implement category pages (edit the generator, never the pages) |
| `generate-town-pages.mjs` | Regenerates the Colville/Kettle Falls/Chewelah local-SEO pages |
| `generate-sitemap.mjs` / `validate-implement-pages.mjs` | Support tooling |

---

## 9. Facebook posting

Full runbook in **`FACEBOOK-POSTING.md`**. Status: **working test harness, not yet live** (needs the one-time Meta app + Page token setup, ~1 hour with the page admin).

- **How it works:** the Website Feed tab gains a `post_fb` checkbox. Tick it on a row and the pipeline builds a Facebook post for that machine — photo, title, real specs from the site data, availability wording ("only 2 left"), phone number, product link. Nothing is ever invented; blank fields are skipped.
- **Guardrails:** it refuses to post anything with zero stock and zero on order, anything not on the site, or anything without a real photo. A posted-log guarantees the same model never posts twice by accident.
- **Test it today:** `node tools/fb-post-test.mjs` — prints every would-be post and writes `fb-post-preview.html`, a Facebook-look mockup to review with Andrew before anything goes live.
- **The platform reality:** automation can only post to the **business Page** (`facebook.com/JJRIGGSEQUIPMENT`) — Meta removed personal-profile posting in 2018. That's the better setup anyway: Page posts build an asset the business owns, and Andrew can share them to his personal feed in one tap.
- **Capturing the lot-photo stream:** the backlog comes from Facebook's own "Download your information" export (run it for both the Page and Andrew's personal profile — legit, no scraping). Going forward: the Page can be harvested automatically via the API; the personal-account habit is fixed at the source with phone auto-backup to a shared album. Put the model number in post captions ("T474H on the lot today") and photos can auto-file into per-model folders.
- **Paid ads are a separate system.** Organic posting (above) costs nothing and is automated; paid Meta campaigns and geofencing are a deliberate, human-approved media buy. Strategy + operating manual: **`FACEBOOK-GEOFENCING-PLAYBOOK.md`**; the mechanics behind it (auctions, pixels, attribution, geofencing data): **`ADS-FUNDAMENTALS.md`**.

---

## 10. The video / ads studio

Live at **`/studio/`** (source in `studio-src/`, a Next.js app that builds to a static export — the only part of the repo with a build step, and it's pre-built).

- **What it is:** a full motion-graphics editor in the browser — scene templates (title, spec sheet, price counter, end card…), brand-drawn animations in the JJ Riggs style, captions, music with auto-duck, voiceover.
- **The killer feature:** it exports **real MP4 video (H.264 + AAC) entirely in the browser** — no video backend, no rendering service, no per-render cost. (Chrome/Edge required for MP4; other browsers fall back to WebM.)
- **Inventory-driven:** the built-in Inventory Builder wizard takes a model name, pulls its title/specs/photo from the site's inventory data, and seeds a complete 7-scene unit ad — brand sting → title → spec sheet → walk-around clip → price → fine print → end card. Type a model, upload a lot video, export.
- **Rebuilding after source changes:** `cd studio-src && npm run deploy` (builds and copies into `studio/`).

---

## 11. The Dealer Kit

*How to package this for other tractor dealerships.* Full plan with effort estimates in **`LIVE-INVENTORY-AND-DEALER-KIT-PLAN.md`** (Part 2); client-facing pricing patterns in `JJRiggs-Sheet-and-Facebook-Proposal.md`.

### What you're actually selling
A dealer website that (1) the dealer **owns** (their repo, their domain, near-zero hosting), (2) updates itself from a Google Sheet the dealer already understands, (3) maintains itself through the passcode admin tools, and (4) turns the same inventory sheet into Facebook posts and real video ads. The incumbents (Dealer Spike / LeadVenture-type platforms) charge $300–800/month for slower sites the dealer never owns. That's the pitch.

### What already carries over unchanged (~70–80% of the product)
The architecture, the data-driven category/product/implement pages, the admin suite with AI extraction, the live stock feed, the motion studio, and the operating playbooks (`WEB-DESIGNER.md`, the Claude skills, the change-summary culture — these become the franchise manual).

### What blocks a 24-hour setup today (the remaining 20–30%)
1. **Brand hardcoding** — tokens copy-pasted into ~11 pages; name/phone/GA4/towns inline everywhere. Fix: extract `site.css` + one `site-config.js` (identity, colors, logo, brands, analytics).
2. **Dealer-specifics in functions** — repo name, manufacturer allowlist, SKU map, email addresses. Fix: environment variables / config module.
3. **Font licensing** — Tactic Sans is a licensed webfont and **cannot ship to other clients**. Each kit needs a per-client license or a default open pairing. This is a legal blocker, not polish.
4. **Photo rights** — manufacturer imagery is only defensible for *authorized dealers* of that brand. Intake must confirm dealer status per brand. New brands (Kubota, Mahindra…) need allowlist entries and a verification pass.
5. **No bootstrap tooling yet** — nothing chains intake → themed repo → crawled/extracted catalog → populated sheet. All the pieces exist; the chain doesn't.

### The build (≈3–4 focused weeks, after Phase A ships)
De-hardcode (3–5 days) → template repo + `init-dealer` bootstrap CLI (~1 week) → ops playbook & cheat sheets (2–3 days) → studio generalization (3–4 days).

### The 24-hour promise (realistically 24 working hours over 2–3 calendar days)
Hours 0–2 intake call (logo, colors, hours, brands, inventory list, domain) → 2–8 bootstrap (themed repo, crawler+extract fills the sheet, human reviews the gap report) → 8–14 content pass → 14–18 deploy with live badges + admin handover → day 2–3 dealer review call, fixes, DNS cutover. Same discipline as JJ Riggs: nothing goes live until the dealer has seen it.

### Pricing (working numbers)
| Offer | Price |
|---|---|
| Dealer Site Kit (site + sheet + admin + training) | **$4,500** setup ($3.5k floor / $6k with catalog build) |
| Care plan (hosting, monitoring, small edits) | **$199/mo** ($149–249 band) — ~95% margin |
| Ads studio bundled add-on | **+$49–99/mo** |
| Ads-as-a-service (4–6 videos/mo from their sheet) | **$400–600/mo** |
| Verified Catalog Build alone (any platform — wedge product) | **$750** to ~75 SKUs, then $15/SKU |
| Live-inventory retrofit on their existing site (wedge) | **$1,200** + $79/mo |

One repo + one Cloudflare project + one sheet per dealer. Don't build multi-tenant until ~20 dealers. First pilots: other TYM/Bad Boy dealers outside Andrew's territory (same extract templates — near-zero marginal engineering), with Andrew's blessing to use the site as the reference.

---

## 12. Future development roadmap

In build order — each phase makes the next cheaper. Andrew-facing scope/pricing for the first two: `JJRiggs-Sheet-and-Facebook-Proposal.md` ($1,500 + $700 + $300 add-on).

### Phase A — Live inventory rebuild (~3–5 days) · the current priority
Spec: `LIVE-INVENTORY-AND-DEALER-KIT-PLAN.md` Part 1. One canonical Google Sheet, one row per product with everything needed to present it (title, model, brand, specs, description, image URL), plus three control columns:
- **Status dropdown** — On the Lot / Low Stock / On Order / **Out of Stock** / Discontinued. Out of Stock **hides the product from the site** within minutes (grids, carousel, related rails); direct links get a friendly "Sold — call Andrew" page instead of a 404. One click brings it back.
- **Tag dropdown** — Hot Deal / Sale / Just In / Clearance (the promo chip).
- **Qty** — drives "Only 2 left" automatically, so urgency never goes stale.

Plus: feed keyed by `brand|model` instead of dealer SKUs (removes the biggest dealer-specific hardcoding), badge coverage extended to mowers and implements, and the homepage featured carousel finally driven by a `featured` flag in the sheet instead of hardcoded HTML.

### Phase B — Facebook auto-posting in production (~2–3 days)
Promote the §9 test harness to a scheduled job (GitHub Action cron or Cloudflare Worker): checks the published feed a few times daily, posts flagged rows to the Page, keeps the posted-log in KV. Add the Page photo harvester that files lot photos into per-model folders. One-time Meta app + Page token setup with Andrew. Optional $300 add-on: the photo archive.

### Phase C — Video tool (studio) generalization (~3–4 days)
Point the studio's inventory wizard at the live data (not the static CSV snapshot); read brand theme from the future `site-config`; add 9:16 (Reels/Stories) and 1:1 (feed) format presets; let the sheet's Tag column pre-select an ad template — pick a model, the Hot Deal chip, price, and specs are pre-filled, export MP4. This is the Dealer Kit's differentiator and the ads-service profit engine.

### Ongoing debt (do opportunistically)
Extract shared `site.css` (tokens are copy-pasted ~11×; also step 1 of the Dealer Kit) · product-page legibility P1 list (`INVENTORY-PIPELINE-PLAN.md` §5) · v2 flat category grids (`*-v2-preview.html`) · the inventory-scout crawler for missing specs/photos · delete stale mirrors (`csv-inventory/*` snapshots, duplicate `bb-tractor-images/` tree, `JJ-RIGGS-ADS-BUILDER/`).

### Decisions parked with Andrew
T5068/T5074 (no data exists — stay off), T5075/T224/T115/T130 keep-or-pull, tractor price display policy, real photos for 4035H / 5045CH / 5055H / T2025P.

---

## 13. Document map

| Document | What's in it |
|---|---|
| **`USER-GUIDE.md`** | This file — start here |
| `WEB-DESIGNER.md` | The complete design/development handbook: system, rules, debt, strategy |
| `CLAUDE.md` | Non-negotiables for AI-assisted work in this repo |
| `LIVE-INVENTORY-AND-DEALER-KIT-PLAN.md` | Phase A spec + full Dealer Kit productization plan |
| `INVENTORY-PIPELINE-PLAN.md` | Original sheet-pipeline spec (workbook schema, validation, product-page P1 list) |
| `STOCK-BADGES.md` | Live badge system: setup, rules, Andrew's cheat sheet |
| `FACEBOOK-POSTING.md` | FB pipeline test harness + go-live runbook |
| `FACEBOOK-GEOFENCING-PLAYBOOK.md` | Paid Meta ads + geofencing strategy, campaign setup, tracking work, 90-day plan |
| `ADS-FUNDAMENTALS.md` | How paid ads actually work: auction, learning phase, attribution, geofencing data — read before running campaigns |
| `ADMIN-ACCESS-SETUP.md` | Admin passcode + env var setup, security model |
| `DEPLOY.md` | Cloudflare Pages settings, domain, contact-form email setup |
| `JJRiggs-Live-Inventory-Proposal.md` / `JJRiggs-Sheet-and-Facebook-Proposal.md` | Client-facing proposals (pricing patterns for future dealers) |
| `CHANGE-SUMMARY-2026-07-01.md` | The reporting style for data reconciliations: every edit, every default, every hold |
| `.claude/skills/` | `jjriggs-web-designer` + `jjriggs-inventory-scout` — the AI operating playbooks |
