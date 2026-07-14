# Quick Ad Builder — Plan

July 2026 · companion to `FACEBOOK-POSTING.md`, `STOCK-BADGES.md`,
`LIVE-INVENTORY-AND-DEALER-KIT-PLAN.md`, and `studio-src/README.md`.

**The decision in one line:** keep `/studio/` as the advanced editor for the
developer; build a locked-down, Andrew-facing **Quick Ad Builder** at
`/admin/ads/` that assembles a campaign from the site's own data and media
and renders it with the existing motion engine. Studio v2 is a **campaign
assembler, not another video editor** — Andrew picks the equipment and the
promotion; the system already knows the brand, data, media, music, sequence,
formats, contact block, and closing card.

---

## 0. What the audit found (read this before the plan)

The pitch is feasible, and the repo holds more of it than the pitch assumed.
Where reality differs, the plan below follows reality:

| Pitch assumption | What's actually in the repo | Effect on the plan |
|---|---|---|
| "Extract the reusable renderer from the 2,666-line editor" | Already done. The engine is brand-free and UI-free in `studio-src/src/lib/motion/` — `render.ts` (1,494 lines), `types.ts` (528), `export.ts` (388), `audio.ts` (193). Only the editor UI (`RiggsMotionStudio.tsx`, 2,665 lines) is monolithic. | No engine refactor. The work is a new **doc generator + wizard UI** on top of the existing engine. |
| "Studio should read the live sheet feed instead of its own CSV" | The studio does read a stale export (`jjriggs-full-inventory.csv`), but the live sheet feed carries **only stock counts** (`sku,in_stock,on_order,hot_deal` via `/api/stock`). The site's real source of truth is the `js/*.data.js` files. | Unify on the **data files + `/api/stock`**, not the sheet. The sheet stays what it is: a stock/trigger surface. |
| "Inventory only provides one image" | Only true of that CSV. The site has per-model galleries (`js/badboy-tractor-images.data.js`, `js/uploads-gallery.data.js`, keyed `"Brand\|Model"`) and a photo editor (`admin/photos/`). | The real media gap is **video + durable video storage + focal points** — not photos. |
| "Catalog image importing fails on CORS" | A same-origin image proxy already exists: `functions/api/fetch-image.js`. The studio just doesn't use it. | Route image fetches through the proxy; the CORS problem disappears. |
| — (not in the pitch) | `studio-src/next.config.js` bases the app at `/jjriggs-new/studio` (a GitHub Pages project path). On the Cloudflare Pages domain, `/studio/` assets don't resolve. | **Phase 0 fix**: `BASE = '/studio'`, redeploy. |
| "Protected by the existing admin login" | Confirmed: `functions/_middleware.js` gates `/admin/*` and `/api/admin/*` with the passcode + HMAC cookie. | `/admin/ads/` inherits auth for free. |
| — | `functions/api/admin/publish.js` allowlists any `js/*.data.js` path. | The new ad-media manifest publishes through **existing** plumbing — no endpoint changes. |
| "FACEBOOK-POSTING.md is a useful precedent" | Confirmed built: `tools/fb-post-test.mjs` (dry-run default, posted-log dedup, hard holds). Photos only; no video posting; no scheduled runner yet. | Reuse its guardrails and production shape for video publishing. |
| "Bundle three licensed music tracks" | Nothing bundled today — all audio is uploaded per session. | Real task; needs an actual license purchase (open question §9). |
| Cloudflare R2 for media | No R2/KV/D1 anywhere in the repo today. | R2 and KV are new additions — scoped in §3 and §5. |

---

## 1. Two products (the core decision)

**Motion Studio** (`/studio/`) stays as-is: timeline, per-scene controls,
captions, voiceover, experiments. It is the developer's tool.

**Quick Ad Builder** (`/admin/ads/`) is Andrew's tool. Six steps, nothing
else on screen:

1. **Select equipment** — searchable list rendered from the same data files
   the site uses, with stock badges from `/api/stock`.
2. **Select promotion** — one of three locked templates (§4).
3. **Confirm media** — hero + gallery photos pre-checked, videos if any;
   add/replace from phone here.
4. **Preview** — plays the assembled sequence (the engine's preview *is* the
   export, so what he sees is what renders).
5. **Generate** — in-browser MP4 render (4:5 and 9:16 by default).
6. **Download or approve for Facebook** — approval is a separate action (§6).

No timeline. No fonts. No logo uploads. No end-card editing. An **"Open in
Advanced Studio"** button hands the generated project JSON to `/studio/` via
`localStorage` (same origin, same format `saveProject` already writes) for
the rare ad that needs hand-finishing.

**How it's built:** a new route in `studio-src` (it shares the engine, fonts,
and brand chrome), exported by `npm run deploy` and copied to
`admin/ads/index.html`. Next's exported asset URLs are absolute
(`/studio/_next/…`), so the copied page works under `/admin/` unchanged and
the middleware gates it. This keeps the framework exception contained in
`studio-src` exactly as today — zero React touches the main site pages,
honoring the no-framework rule where it matters.

---

## 2. One data source (kill the disconnected CSV)

- Quick Ad Builder loads `js/tym-models.data.js`, `js/badboy-models.data.js`,
  `js/mower-models.data.js`, the feature files, and both gallery files as
  script globals — same origin, always in sync with the site, zero new feeds.
- Availability comes from `/api/stock`. Rule: **out of stock → warn, and
  refuse unless the template explicitly allows it** (a clearance ad may want
  "last one"). Caveat: `functions/_stock-map.js` maps only 24 SKUs — models
  outside the map show "stock unknown", never "out of stock".
- The advanced studio's importer switches from `jjriggs-full-inventory.csv`
  to the same data files; then the CSV is deleted (it's already on the
  stale-mirror deletion list in `LIVE-INVENTORY-AND-DEALER-KIT-PLAN.md`).
- Never invent data: blank fields are skipped in every template, same rule as
  `buildCaption` in the Facebook harness.

---

## 3. Media system (the critical missing piece — but smaller than pitched)

**Photos stay in the repo.** The pattern already works: `img/uploads/` +
gallery data files + the `admin/photos/` editor. Two additions:
- **Role tags** per photo (hero / lot / detail) and an optional **focal
  point** (x,y) for smart cropping across 4:5 / 9:16 / 16:9.
- These live in a new **`js/ad-media.data.js`** manifest keyed
  `"Brand|Model"` — publishable today through the existing allowlist.

**Video goes to R2.** Walk-around and operating clips (and rendered MP4s) are
too big for the repo. New pieces:
- One R2 bucket (e.g. `jjriggs-media`), bound to Pages Functions.
- `POST /api/admin/media` — authed upload (phone-friendly, from the Confirm
  Media step) + list; keys recorded in `js/ad-media.data.js` per model.
- Manufacturer video is downloaded once into R2 (with source URL recorded),
  never hotlinked — same rule as product images.

**Engine change (small, the only one):** assets currently exist only as
per-session uploads (blob URLs; projects "relink by filename"). Add
**load-media-by-URL** so the builder can pull repo photos and R2 clips
directly — this also makes the Open-in-Studio handoff carry its media, fixing
the media-doesn't-persist limitation for generated ads.

**Media-readiness rules (enforced, not suggested):**

| State | Behavior |
|---|---|
| No hero photo | Job status **Needs Media**; can't render |
| Photos only, no video | Photo-motion template (Ken Burns — already in the engine) |
| One video | Video-led sequence |
| Video + several photos | Full media-driven sequence |
| Out of stock | Warn; refuse unless template allows |

**Music:** license three tracks (open question §9), ship them in
`studio-src/public/music/` (a few MB in-repo is fine; move to R2 only if the
library grows). They become the *only* music choices in the Quick builder;
the advanced studio keeps uploads.

---

## 4. Three locked templates and the 22-second sequence

Templates are **doc generator functions** like the existing `buildUnit`
(`RiggsMotionStudio.tsx:1345`) — they emit a `MotionDoc`; the engine needs no
new scene types. `buildUnit` stays for the studio; the Quick builder gets
`buildCampaign(product, offer, media, template)`.

The key structural change from `buildUnit`: **the hook leads, the brand sting
doesn't.** Today scene 1 is "JJ RIGGS EQUIPMENT"; in ads the offer is scene 1.

| # | Scene | Time | Engine template |
|---|---|---|---|
| 1 | Hook — offer over product media, ≤5 words | 0–2.5s | `statement` + media backdrop |
| 2 | Dealer identity — logo, "Family owned in Colville" | 2.5–4s | `statement` (the demoted sting) |
| 3 | Product reveal — model + one descriptor | 4–6.5s | `title` |
| 4 | Equipment motion — walk-around clip | 6.5–9.5s | `video` |
| 5 | Detail — second clip or 2–3 Ken Burns photos | 9.5–12.5s | `video` / `image` |
| 6 | Key facts — max 3 specs or offer points | 12.5–15.5s | `list` |
| 7 | Contact — "Call Andrew", phone, location | 15.5–19s | `statement` |
| 8 | Closing — logo, deadline, fine print | 19–22s | `endcard` (+ `disclaimer` when required) |

**The three templates:** Financing/offer · Just arrived/spotlight ·
Sale/clearance. They differ in hook copy, which scenes are mandatory
(financing always carries the fine-print scene), and stock rules.

### The fourth family: Flash Cards ("Simple" mode)

A pure-typography attention ad — no product media required. The user types
3–6 short sales lines ("0% FINANCING" · "HUGE SUMMER SALE" · "ENDS AUG 31" ·
"CALL ANDREW"); the generator emits one short `statement` scene per line with
**hard cuts and alternating inverse brand schemes** (red-on-white →
white-on-red → red-on-ink → bone-on-ink …), Tactic Sans at full bleed, and
always closes on the logo + phone end card. Everything needed already exists
in the engine: `statement` scenes, the five brand schemes, per-scene
durations, cut transitions, and the text animations — this family is a
generator + a simpler wizard tab, zero engine work.

Its own locked rules, on top of the shared ones:
- **Pace is capped for photosensitivity and Facebook policy**: minimum
  ~600ms per card, no more than 2 scheme changes per second, no strobe
  toggle. (WCAG's three-flashes-per-second line is the hard floor; Meta
  rejects strobing creatives.) "Grabby" comes from the cuts and the type,
  not from a blink rate.
- Cards are text-only or text-over-one-library-photo; ≤5 words per card.
- Color pairs come from a fixed rotation of validated brand combinations —
  never a free color picker.
- Optional images come from the site's own galleries / `img/uploads/`
  (the §3 library) — same never-invent, never-cross-assign rules.
- The 65% real-imagery rule is waived for this family only (it's a
  typographic ad by design); product-photo families keep it.
- Total runtime 6–15s; end card is mandatory and un-deletable.

**Rules locked into the generator, not into a style guide nobody reads:**
- Hook input is capped at 5 words; spec picker allows at most 3.
- ≥65% of runtime on real equipment imagery (generator computes it and
  blocks render below threshold).
- Every scene readable with sound off (all copy is on-screen text).
- Disclaimers only when the promotion requires them; financing fine print
  comes from Andrew/the lender, never generated.
- Default outputs **4:5 and 9:16**; 16:9 is opt-in, never the default.
- Music only from the bundled tracks.

---

## 5. Ad Queue and the job model

The pitch is right that the inventory row must not carry campaign history,
and right to demand real statuses. One correction on *where* state lives:

**Job state goes in KV, not the sheet and not git.** Every commit to `main`
triggers a ~1-minute Pages rebuild — status churn would thrash deploys. The
sheet can't hold state either (the published-CSV feed is read-only; the
checkbox is a trigger, not a record). A small KV namespace bound to Pages
Functions (`/api/admin/ads` CRUD) holds jobs; R2 holds the MP4s; git holds
only the durable media manifest.

**Job record:** `campaign_id` (`{model-slug}-{template}-{YYYYMM}-v{n}`),
status, a **product + offer snapshot** (so a later model rename can't corrupt
a queued ad — the `"Brand|Model"` foreign-key trap from `WEB-DESIGNER.md`
§1.9 applies to ads too), media refs, R2 key of the render, Facebook post id,
timestamps.

**Statuses:** `Draft → Queued → Needs Media → Rendering → Ready for Review →
Approved → Posted`, plus `Failed`. Duplicate-render and duplicate-post guards
key on **`campaign_id` + version, never model** — the same T474H legitimately
gets many ads over time.

**The dashboard** is the `/admin/ads/` landing page, with the pitched
columns: Product, Campaign, Headline, Offer detail, Ends, Format, Status,
Preview, Approve. Protected fields (ids, URLs, timestamps) stay in the job
record, not on screen.

**The sheet "Create Ad" checkbox** arrives in Phase E: a scheduled poller
(GitHub Action cron or Worker — the exact production shape already sketched
in `FACEBOOK-POSTING.md`) reads a published Ads tab, creates `Draft` jobs via
an authed endpoint, and dedupes against KV so untick/retick can't spawn
duplicates. Status is *not* written back to the sheet (that would need Apps
Script); the dashboard is the status surface.

---

## 6. Facebook publishing

- **Approve is its own explicit click** in the dashboard, after watching the
  preview. Rendering never auto-posts; checking a box never auto-posts.
- Publishing uses the **Page Videos API** (`/{page-id}/videos`) with the
  long-lived Page token (`pages_manage_posts`) held as a server secret —
  identical token setup to `FACEBOOK-POSTING.md`; the one-hour session with
  Andrew's Page-admin login covers both.
- Reuse the photo harness's guardrails verbatim: hold anything out of stock
  (unless the template allows), anything without real media, captions built
  only from real data fields; posted-log dedup moves from
  `csv-inventory/fb-posted-log.json` to KV, keyed `campaign_id+version`.
- First live posts go to a **test Page**, reviewed with Andrew.

---

## 7. Rendering: guided MVP first, background render later

**MVP renders in the browser** — the existing WebCodecs exporter
(`lib/motion/export.ts`) already produces deterministic H.264+AAC MP4s in
Chrome/Edge, faster than realtime. Andrew clicks Generate and waits a few
seconds. This ships in week one because it already works.

**Background rendering (Phase F, only after templates are proven)** — the
checkbox-to-MP4-with-nobody-watching version. The exporter needs `window`,
`<video>`, and WebCodecs, so it cannot run in a Pages Function. Options, in
order of preference:

1. **GitHub Action + headless Chrome** driving a minimal `/admin/ads/render`
   page for a queued job (puppeteer is already in `node_modules`; the
   Action's runner has Chrome). Zero new infrastructure; triggered by cron or
   `workflow_dispatch` from the queue endpoint; uploads the MP4 to R2 and
   flips the job status.
2. **Cloudflare Browser Rendering** (Workers) — same approach, stays inside
   Cloudflare; newer product, session limits to verify.
3. Node + FFmpeg re-implementation of the renderer — most control, most
   work, breaks preview-equals-export; only if 1–2 fail.

**Risk to validate first:** H.264/AAC encoder availability in headless
Chrome-for-Testing builds. The exporter already falls back to VP9/AV1-in-MP4;
if H.264 is missing headlessly, the Action transcodes with ffmpeg (Meta wants
H.264+AAC MP4).

---

## 8. Build order

Each phase is shippable and reviewed on a test deploy before the next.

- **Phase 0 — repair the ground (half a day).** `BASE = '/studio'` in
  `next.config.js`, redeploy, verify `/studio/` on a Cloudflare preview.
  Route studio image imports through `/api/fetch-image`.
- **Phase A — guided MVP (2–3 days).** Data unification (§2);
  `buildCampaign` generators for the three templates (§4); `/admin/ads/`
  wizard with photo-motion sequences from existing galleries; bundled music;
  in-browser render; download. *Acceptance: Andrew makes a financing ad for
  the T474H on his phone in under 5 minutes with zero uploads.*
- **Phase A+ — Flash Cards / Simple mode (≈1 day, can even ship first).**
  The §4 typographic flash-ad family: type the lines, pick the color
  rotation and pace (within the safety cap), render. No product data or
  media required, so it has no dependency on §2/§3 — the cheapest way to
  put a working ad generator in front of Andrew.
  **SHIPPED (July 2026)** as `studio-src/src/components/motion/FlashAdBuilder.tsx`,
  served at **`/studio/ads/`** — the route's native export path, kept
  public like the studio itself since it holds no secrets and writes
  nothing. It folds into `/admin/ads/` as the wizard's "Simple" tab when
  Phase A lands and gating starts to matter (media upload, queue, FB).
  Since shipped on top: photo backgrounds from the site's own image
  library (or upload), a music bed mixed into the export
  (`BUNDLED_TRACKS` slot awaits licensed files — `public/music/README.txt`),
  and **Build from a flyer** — `functions/api/admin/storyboard.js` (gated
  like extract.js, same structured-outputs pattern, ANTHROPIC_API_KEY)
  reads an uploaded flyer image and returns a hook-first storyboard as a
  loadable studio project; the Flash Ads page applies its headline cards
  directly or saves the full project for the Advanced editor. Verbatim-
  extraction rules and the forced fine-print/end-card scenes are enforced
  server-side in the assembler, not just in the prompt.
- **Phase B — durable media (1–2 days).** R2 bucket + upload endpoint;
  `js/ad-media.data.js` manifest with roles/focal points; video upload from
  the wizard; readiness rules; URL-loaded media in the engine.
  **PARTIALLY SHIPPED (July 2026):** the R2 backbone is live —
  `functions/media/[[path]].js` (public serving w/ range support),
  `functions/api/admin/media.js` (gated uploads: renders/vo/music/uploads),
  `functions/api/music.js` (public ad-music list). Both editors save
  renders to the cloud with a copyable approval link, generated/re-voiced
  VO takes auto-upload and auto-relink on project load, and the music
  library serves one-tap tracks from the bucket (drop licensed MP3s into
  `music/`). Setup: DEPLOY.md §3b (bucket `jjriggs-media`, binding `MEDIA`).
  Still open from Phase B: the `js/ad-media.data.js` manifest, product
  video uploads, and readiness rules.
- **Phase C — Ad Queue (1–2 days).** KV jobs + statuses + dashboard;
  campaign snapshots; dedup; Open-in-Studio handoff.
- **Phase D — Facebook (1 day + the token hour with Andrew).** Approve →
  Page video post; KV posted-log; test Page first.
- **Phase E — sheet trigger (half a day).** Ads tab + poller creating Draft
  jobs.
- **Phase F — background rendering (2–4 days, later).** Headless render
  worker per §7, after the templates have produced real ads Andrew likes.

Phases 0+A ≈ **one focused week** including a review round with Andrew — the
guided MVP the pitch estimated. The full checkbox-to-MP4-to-approved-post
system (through Phase F) is realistically **2–3 weeks**, matching the pitch.

---

## 9. Open questions (held for Andrew / the developer — don't resolve unilaterally)

1. **Music licensing** — which three tracks, from where (e.g. a perpetual
   commercial license marketplace), budget; keep the license receipts in the
   repo docs.
2. **Facebook access** — the one-hour Page-admin session to create the Meta
   app and long-lived token (already specified in `FACEBOOK-POSTING.md`).
3. **Who shoots the walk-arounds** — phone videos by Andrew on the lot are
   ideal and the upload path supports it; needs his buy-in on a simple
   routine (30-second orbit, horizontal + vertical).
4. **Financing fine print** — exact wording per promotion from Andrew/the
   lender. The current `DEFAULT_DISCLAIMER` in the studio is a placeholder
   until he approves real copy.
5. **Stock-map coverage** — models outside the 24 mapped SKUs can't be
   stock-checked; is "stock unknown, proceed anyway?" acceptable wording?
6. **R2/KV setup** — both are new to this Cloudflare account; trivially
   cheap, but someone with account access flips them on.

---

## Rules carried over from the site (non-negotiable)

- **Never invent** specs, prices, offers, or photos — blank beats guessed;
  every ad field traces to a data file, the stock feed, or Andrew's typed
  offer.
- **Never assign one model's media to another** — the campaign snapshot pins
  model + media together at creation.
- **Nothing posts without an explicit approval action** — the render/post
  split is load-bearing, exactly like the sync-then-review discipline in the
  inventory pipeline plan.
- **Nothing ships to the live domain without Andrew reviewing a test
  deploy** — the Quick Ad Builder itself is a code change and follows the
  normal review rhythm, even though it lives under `/admin/`.
