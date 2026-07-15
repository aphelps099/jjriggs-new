# JJ Riggs Equipment — The Web Designer's Handbook

_A handoff from the original designer/developer. If you read one document in this repo, read this one — it explains not just what the site is, but **how to think** before you touch it._

July 2026 · written for the incoming developer/designer

---

## Part 0 — Who you're building for (read this before anything else)

Every design decision on this site comes from four facts about the business:

1. **The client is Andrew Alluis of JJ Riggs Equipment, Colville, WA** — a family-owned TYM + Bad Boy dealership in rural northeast Washington. 685 Elm Tree Dr, Colville, WA 99114 · 509-738-2985 · sales@jjriggsequipment.com · Mon–Fri 8–5.
2. **The customer is often 60+, rural, and buys by phone.** They do not fill out forms. They do not discover content hidden behind tabs. They call Andrew. The phone number is the single most important conversion element on every page.
3. **This is a trust site, not an e-commerce site.** Nothing is bought online. The job of every page is: show the machine clearly, prove this is a real local dealership, and make calling or visiting the easiest action on screen.
4. **Andrew's inventory changes on the lot, not in a database.** He has no organized system for updating what's in stock, what it looks like, or its specs. That gap is *our* biggest operational problem, and most of the "future strategy" section exists to close it.

### The thinking checklist — run this before you design anything

Before any new page, section, or component, answer these in order:

- **Can a 65-year-old read it at arm's length?** Body text ≥16px, contrast ≥4.5:1. If a spec label is 0.8rem light-gray, it's wrong (we have some of these — see Known Debt).
- **Is anything important hidden?** Tabs, collapsed accordions, and carousels all hide content. Older users don't hunt. Default answer: stack it, show it. (This is why the v2 category direction moves from carousel to flat grid.)
- **Is the phone number one glance away?** Big, tap-to-call on mobile. "Call Andrew: 509-738-2985" outperforms any form.
- **Is the data real?** Never invent a spec, a price, or a photo. A blank cell beats a plausible guess. If a model has no photo, show the branded "Photo coming to the lot" placeholder — never another model's photo (we've been burned; see the open-station/cab photo mix-ups in `CHANGE-SUMMARY-2026-07-01.md`).
- **Does it work with the design system as-is?** If you're inventing a new color, a new font size, or a new button style, stop — you almost certainly don't need to.
- **Will it stay fast?** The site is static HTML with zero build step, on purpose. Page weight and no framework are features. Don't add React to a tractor dealership.

If a request from Andrew conflicts with the checklist (e.g., "put everything in a slideshow"), the checklist wins the argument — but you have the conversation with him, kindly, with the reasoning above.

---

## Part 1 — The design system

### 1.1 Architecture in one paragraph

Static HTML, no build step, deployed on **Cloudflare Pages** straight from the repo root (`DEPLOY.md` has the settings). The **only shared stylesheet is `header.css`**; every page carries its own inline `<style>` block that re-declares the tokens and everything else. The header/nav/topbar is **injected by `header.js`** into `<div id="jjHeader">` on each page. Category and product pages are **client-rendered** from plain-JS data files (`window.*` globals in `js/`). One serverless function, `functions/api/lead.js`, emails form leads via Resend.

### 1.2 Design tokens

Declared in `:root` **at the top of every page** (yes, copy-pasted per page — see Known Debt). Canonical values:

```css
--ink:  #14171a;   /* page background / near-black */
--ink-2:#1b2025;   /* slightly lighter panel */
--ink-3:#0f1215;   /* darkest — topbar, mega-menu */
--bone: #f3f1ea;   /* warm off-white (light sections) */
--white:#fbfbf9;   /* text-white */
--steel:#8b939c;   /* muted gray — dots, meta */
--steel-2:#c3c8ce; /* light gray body-on-dark */
--red:  #cf1f2a;   /* THE brand red — CTAs, accents */
--red-deep:#a5151f;/* red hover/pressed */
--line: rgba(255,255,255,.12);  /* hairline on dark */
--line-2:rgba(255,255,255,.06);
--maxw: 1280px;    /* content max width */
--gut:  clamp(1.4rem,5vw,4rem); /* responsive page gutter */
--green:#1d7a3c;   /* finance/success green — product pages only */
```

`header.css` defines **no tokens of its own** — it depends on the page's `:root`. A page missing these tokens renders a broken header. Copy the full set into any new page, always.

### 1.3 Color philosophy — one system, two brands

There is deliberately **no per-brand accent color**. TYM and Bad Boy share the same red, type, and components. Brand identity comes only from **logo artwork** (`img/bb_logo_horizontal_orange.svg` carries Bad Boy's orange inside the SVG; TYM uses its own logo). The red `#cf1f2a` is *JJ Riggs's* color, not a manufacturer's. Keep it that way: if you introduce "Bad Boy orange" as a CSS token, the site starts looking like two manufacturers' brochures stapled together instead of one dealership.

Where the red goes: `.btn-red`, the hero H1 underline bar (`.hero h1::after`), the mega-menu's skewed divider, topbar icons, focus outlines, `.cut-tab--red`.

### 1.4 Typography

- **Headings:** `"Tactic Sans Bld"` (local woff2/woff in `fonts/`, `@font-face` per page, `font-display:swap`). Always `font-weight:400`, `text-transform:uppercase`, tight `line-height:~1`. Fallback chain: Michroma → Bebas Neue → Questrial.
- **Body:** `"Questrial"` via Google Fonts, then Helvetica/system stack.
- **Fluid scale:** `.h1: clamp(2.4rem,5.4vw,4.6rem)` · `.h2: clamp(1.8rem,3.6vw,2.9rem)` · `.lead: clamp(1rem,1.5vw,1.16rem)` · `.eyebrow: .72rem / .2em tracking / uppercase`.
- The vendor kit lives in `MyWebfontsKit/`; the working copies are in `fonts/`. `TT_Hoves_Pro_DemiBold.ttf` is present but **not wired up** — ignore it or delete it.

### 1.5 Signature motifs (what makes it look like JJ Riggs)

- **`.cut-tab`** — the angle-cut label (`clip-path` with a 16px corner cut), Tactic Sans caps. Red variant `.cut-tab--red`. This is the site's most recognizable shape — use it for section kickers.
- **Skewed red dividers** — `skewX(-13deg)` red bars (mega-menu cards).
- **`.eyebrow` + red `.dot`** — small-caps kicker above headings.
- **Ghost watermark type** — the giant outlined "JJRIGGS" behind the CTA band.
- **Buttons:** `.btn` base (inline-flex, `1rem 1.7rem`, 1.5px border, Questrial 700) with `.btn-red` (solid), `.btn-ghost` (white outline, for dark/photo backgrounds), `.btn-dark` (ink outline for light backgrounds). `.arw` arrow nudges 4px on hover. On a **red** background, red buttons vanish — use white solid + white ghost (see the services hero note in `SERVICES-PAGE-NOTES.md`).

### 1.6 The header (shared, JS-injected)

Every page includes `header.css` + `header.js` and mounts `<div id="jjHeader" data-variant="..." data-active="...">`. Every page also includes `/js/site-settings.data.js` **before** `header.js` — it carries the admin-selectable header theme, and loading it first means the header paints in the right theme with no flash. New pages must include all three.

- `data-variant="overlay"` — transparent header over a hero (homepage, services). `"solid"` (default) — dark sticky bar (everything else).
- **Header theme** (`window.JJ_SITE_SETTINGS.headerTheme` in `js/site-settings.data.js`): `"dark"` = the looks above; `"white"` = white bar, black text, red hover accents, from the top *and* while scrolled/sticky (like the old jjriggsequipment.com header) — it overrides both variants, uses `img/jj-riggs-logo-dark.png` (red/black logo), and turns the dropdown icons grey-at-rest/red-on-hover via a CSS `invert()` on the white art. Toggled from the **Site appearance** card on `/admin` (publishes live through the allowlisted `js/*.data.js` pipeline — the editor is the reviewer, same as inventory). The dark topbar stays dark in both themes.
- `data-active="equipment|service|financing"` — sets the `.current` nav highlight.
- Topbar: phone / address / hours + socials. Sticky nav shrinks on scroll past 70px (`.scrolled`).
- "Equipment" opens a full-width **mega-menu** (Tractors / Mowers / Implements cards with white→red icon hover swaps); "Sheds" is a small dropdown linking out to colvillesheds.com.
- Mobile: `.burger` appears below **940px**; menu becomes a flat click-driven list. The mega-panel position is recomputed by `placeMega()` in `header.js`.

If the header looks wrong on a new page: you forgot the tokens, or you forgot the mount div.

### 1.7 Breakpoints

Desktop-down `max-width` queries; **fluid `clamp()` does most of the scaling** and media queries only handle structural reflow:

| px | What happens |
|---|---|
| 1180 | header brand tag hides |
| 1080 | mega-menu drops intro column |
| 940 | **main switch**: burger menu, nav hides |
| 920 / 680 | topbar sheds cells |
| 760 | hero reviews go single column |
| 380 | smallest tier: shrink quote button/logo |

### 1.8 Page inventory

| Page | Role |
|---|---|
| `index.html` | Homepage. Hero with service-slide variant, **hardcoded featured carousel** (known debt), sections, CTA band. |
| `tractors.html` / `mowers.html` | Live category pages: brand toggle (`.brand-pick`), HP tabs, carousel/grid `.stage`, all rendered from data files. |
| `implements.html` / `implement-category.html` | Implements catalog from `implements-data.js` (82 items, 6 job groups). |
| `product-template.html` / `product.html` / `mower.html` | Universal product detail page + adapters. Gallery, sticky price/call rail, spec list, features accordion, related grid. |
| `services.html`, `financing.html`, `schedule-visit.html` | Static pages. Schedule-visit has the 3-tab forms (quote/service → `/api/lead`; visit → Google Calendar embed). |
| `*-v2-preview.html` | **The future direction** — see Part 3. |
| `index-redesign.html` | Just a redirect stub to `index.html`; keep for old links. |
| `builder.html` | "Customize This Tractor" configurator, linked from product pages. |

### 1.9 The data layer (this is where mistakes happen)

All catalog content is plain-JS globals loaded via `<script>`:

| File | Global | Keyed by |
|---|---|---|
| `js/tym-models.data.js` | `TYM_MODELS` | — |
| `js/badboy-models.data.js` | `BADBOY_MODELS` | — |
| `js/mower-models.data.js` | `MOWER_MODELS` | — |
| `implements-data.js` (root) | `JJ_IMPLEMENTS`, `JJ_CATEGORIES`, `JJ_GROUP_ORDER` | — |
| `js/tractor-features.data.js` | `TRACTOR_FEATURES` | `"Brand|Model"` |
| `js/mower-features.data.js` | `MOWER_FEATURES` | model |
| `js/badboy-tractor-images.data.js` | `TRACTOR_GALLERY` | `"Brand|Model"` |

**The iron rule: model names are foreign keys.** Feature copy and galleries are keyed on the exact `"Brand|Model"` string. Rename or remove a model in a main data file without updating the keyed files and the product page **silently** loses its features/gallery — no error, no 404, just a quietly worse page. This exact bug class cost us a full reconciliation pass in June 2026.

**After any model rename/removal, always:**
1. Update the matching keys in `tractor-features.data.js` / `badboy-tractor-images.data.js` / mower equivalents.
2. `grep` the whole repo for the old model string — nav links, `index.html`'s hardcoded carousel, anchors.
3. Load the category page in a browser; click through to the product page; confirm title, Open Station/Cab label, photo, features, gallery.
4. Node-syntax-check the data files (`node --check`).

**"Open Station", never "Open"** — that's Andrew's language and the customer's.

### 1.10 Images

- `img/tym-tractors/` — `tym-<model>.png` (fetched by `tools/fetch-tym-images.sh`).
- `img/bb-tractor-images/<series>/` — `<model>_<slot>_<n>.<ext>` where slot ∈ `model_photo`, `header`, `feature`, `powertrain`, `implements`. (The root-level `bb-tractor-images/` is a duplicate original — the site uses the copy under `img/`.)
- `img/bad-boy-mowers/` — `bad-boy-<model>.jpg`.
- `img/bad-boy-implements/` — implement PNGs.
- Nav icons come in triples: `X-icon.png` / `X-icon-white.png` / `X-icon-red.png` (hover swap). **Note: `attachements-icon*` is misspelled but load-bearing** — `header.js` references the misspelled name. Don't "fix" the filename without fixing the JS.
- Many data-file image URLs still **hotlink the old WordPress site** (`jjriggsequipment.com/wp-content/uploads/...`). This is migration-in-progress: the long-term rule is *all product images live in this repo (or the chosen photo host), never hotlinked from a site we might rebuild*.

### 1.11 Deployment & the one serverless function

Cloudflare Pages, no build command, output dir `/`. `functions/api/lead.js` handles `POST /api/lead`: validates, honeypot on the hidden `company` field, then sends two emails via **Resend** (dealer notification + customer confirmation). Env vars: `RESEND_API_KEY` (required), `LEAD_TO`, `LEAD_FROM`, `LEAD_REPLY_TO`, `SEND_CONFIRMATIONS`. Full setup incl. DNS/domain verification is in `DEPLOY.md`. `js/analytics.js` fires the GA4 funnel events Andrew watches — keep event names stable.

**Nothing goes to the live domain without Andrew seeing it.** The working rhythm has always been: build on a test deploy, walk Andrew through it, then promote.

---

## Part 2 — Known debt & open items (inherit these honestly)

Technical debt, in priority order:

1. **Tokens are copy-pasted into ~11 pages.** Changing the red means editing every page. The right fix is extracting a shared `site.css` (tokens + buttons + footer + type scale) the same way `header.css` was extracted. Do it as its own commit, one page at a time, with screenshots before/after.
2. **`--lined` has drifted**: `.32` opacity on category pages vs `.14` on product pages. Pick one (I'd take `.14` — the v2 previews use it) when you do the consolidation.
3. **`product-page-v2-preview.html` is missing `--steel-2`, `--line`, `--line-2`** — header renders wrong there until fixed.
4. **`index.html`'s featured carousel is hardcoded** — it has already once pointed at removed models. It should render from a `featured` flag in the data (planned as `js/featured.data.js` in the pipeline plan).
5. **Duplicate image trees** (`bb-tractor-images/` vs `img/bb-tractor-images/`) and stale `csv-inventory/*.csv` mirrors — both scheduled for deletion once the sheet pipeline lands.
6. **Product page legibility (P1)** — small light-gray spec text, tabs hiding half the content, H1 overlaid on photos. The full prioritized list is §5 of `INVENTORY-PIPELINE-PLAN.md`. These are unambiguous fixes; ship them.

Decisions held for Andrew (do not resolve unilaterally — ask him):

- **T5068 / T5074**: on his stock list, but no specs or photos exist anywhere. They stay off the site until real data arrives.
- **T5075, T224, T115, T130**: on the site but not on his June 29 stock list. Keep or pull?
- **Photo fixes needing real assets**: 4035H (needs genuine open-station photo), 5045CH (needs genuine cab photo), 5055H (needs genuine open-station photo), T2025P (no photo at all). Wrong-but-present beats fake — never point one model at another model's photo as a "fix".
- **Tractor price policy**: mowers show prices; tractors say "Call for price". Schema supports both; Andrew decides.

---

## Part 3 — Strategy: where this site is going

The direction was agreed with Andrew before handoff. Work it in this order — each phase makes the next one cheaper.

### Phase 1 — The Google Sheet inventory pipeline (the foundation; partly scoped, not built)

**The problem:** Andrew has no organized way to update inventory. Every stock change today is a developer edit across 3–4 keyed files. That's the silent-breakage trap, and it makes *us* the bottleneck for "the T474H sold."

**The plan is fully specified in `INVENTORY-PIPELINE-PLAN.md`** (workbook schema, validation rules, sync script design, rollout phases) with the client-facing version in `JJRiggs-Live-Inventory-Proposal.md`. The one-paragraph version: one Google Sheet is the source of truth; `tools/sync-inventory.mjs` fetches it, **validates loudly** (duplicate keys, orphaned feature rows, missing images, broken URLs), regenerates all `js/*.data.js` files byte-stable, and prints a reviewable diff. The site stays static; Google being down never touches the live site. A `status` dropdown (Active/Hidden/Discontinued) means nothing is ever deleted. The sheet is **bootstrapped from the current data files** so day one it matches the site exactly.

Key discipline: **v1 never auto-deploys.** Sync → review the diff → commit → deploy. Earn trust in the pipeline before you automate the last step.

### Phase 2 — Product page legibility & conversion pass

The P1/P2 list in `INVENTORY-PIPELINE-PLAN.md` §5: ≥16px body everywhere, un-hide the tabbed content (stack Specifications and Features with big headings), features open by default, real text H1 instead of photo overlay, persistent tap-to-call, local-trust strip. No A/B testing needed — these are unambiguous for this audience.

### Phase 3 — The v2 category grid

`tractors-v2-preview.html`, `mowers-v2-preview.html`, and `product-page-v2-preview.html` are the direction: **drop the carousel machinery, move to a flat, filter-first card grid** — brand segmented control (`.brandbar`/`.seg`), "shop by the work" grid, `.pill` filters including Open Station vs Cab (`data-station`), visible `.station-tag` on every card. It's simpler, more scannable, and more honest about what's in stock. Finish it *after* Phase 1 so the grid renders from synced data on day one.

### Phase 4 — The data crawler / "inventory scout" (explored, not committed)

This closes the other half of Andrew's problem: even with a sheet, someone has to *find* the missing photos and specs. Today that's manual scouting. The goal is a crawler that maps **what we need** against **what exists**, per product type:

- **Field map (what a complete record looks like):**
  - *Tractor:* model, hp, series, station (Open Station/Cab), engine, drive, transmission, loader_lift_lbs, fuel, blurb, ≥1 genuine photo of the exact configuration, manufacturer URL.
  - *Mower:* model, category, type, engine, hp, deck sizes, fuel, drive, transmission, price, blurb, photo, URL.
  - *Implement:* brand, group, category, duty, attach/hitch, width, weight, hp range, fit note, sku, photo, page.
- **Sources, in trust order:** (1) the old live site `jjriggsequipment.com` — its product pages have a stable layout: H1 title, intro sentence, headline specs, "Additional information" table, gallery, features section; (2) manufacturer sites — `tym.world`, `badboymowers.com`, IronCraft/Braber/CID for implements; (3) nothing else. Dealer photos aren't ours; one we found was literally AI-generated.
- **Output:** not a website — a **gap report + prefilled sheet rows**: per model, which fields are missing, which images are missing or shared-with-another-model, with candidate values and their source URLs for human review. `perplexity-product-data-prompt.md` is the working prototype of exactly this extraction (three CSV tables: Products / Specifications / Features, verbatim-only rules) — a Node/puppeteer crawler is its natural successor (puppeteer is already in `node_modules`).
- **Rules the crawler must inherit:** verbatim extraction only; blank beats guessed; every value carries its source URL; images verified to be the *exact configuration* (the open-station/cab photo mix-ups came from exactly this failure).

### The eventual destination — inventory-based online catalog

Andrew wants the site to eventually reflect *live lot inventory* (what's physically in stock, maybe per-unit). We explored it; the logistics aren't solved, which is why it's last:

- **Unsolved:** who updates stock status the day a unit sells (process, not tech); whether QuickBooks quantity sync is worth it; per-unit serialized inventory vs model-level "in stock" flags; the photo workflow for lot photos of actual units.
- **What's already decided:** the sheet remains the interface either way — an inventory catalog is the same pipeline with a quantity/status column taken seriously, not a new architecture. Don't jump to a database/CMS; solve Andrew's *process* first, then automate it.
- Online booking/calendar has its own open concerns from Andrew — treat it as a separate conversation.

### What NOT to do (hard-won)

- **No framework, no build step, no CMS.** The zero-build static site is why it's fast, cheap, and unbreakable. Everything Andrew needs is solvable with the sheet pipeline.
- **Don't auto-publish anything Andrew hasn't seen.**
- **Don't invent data. Ever.** Not specs, not prices, not photos, not "probably the same engine as the T474".
- **Don't break the keyed-data sync rule** (§1.9). It's the site's one real fragility.
- **Don't redesign the brand.** The red/ink/bone system, Tactic Sans, and the cut-tab motif *are* JJ Riggs online now. Evolve components, keep the identity.

---

## Part 4 — Your first week

1. Read this doc, then `INVENTORY-PIPELINE-PLAN.md`, then `CHANGE-SUMMARY-2026-07-01.md` (it shows you the working style: defaults flagged, holds surfaced, verification listed).
2. Serve the site locally (`python3 -m http.server` from the repo root — remember pages fetch data files, so open via http, not file://) and click every page at 375px and 1280px.
3. Trace one model end-to-end: find the T474H in `js/tym-models.data.js`, its feature copy in `tractor-features.data.js`, its card on `tractors.html`, its product page. Now you understand the whole site.
4. Ship something small from the P1 legibility list. Andrew notices improvements his customers can feel.
5. Call Andrew and introduce yourself. He's practical, he knows his customers, and he answers his phone — which, if you've been paying attention, is the whole design philosophy of this site.

— your predecessor
