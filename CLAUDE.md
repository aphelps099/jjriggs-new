# JJ Riggs Equipment website

Zero-build static HTML/CSS/vanilla-JS site for a TYM + Bad Boy dealership (Colville, WA), deployed on **Cloudflare Pages** (no build command, output dir `/`, `functions/` auto-detected, `_redirects` honored). Production branch: `main` — every merge auto-deploys; every branch gets a preview URL.

**Read before changing anything:**
- `WEB-DESIGNER.md` — design system, audience rules, data-layer sync rules, known debt.
- `INVENTORY-HANDOFF.md` — current state of the whole inventory system (workbook, /admin/ builder, generators, catalog truths, the scoped-not-built Facebook "On the Lot" plan).
- `DEPLOY.md` — Cloudflare/Resend/Turnstile env vars and email routing.

## Non-negotiables

- Audience is 60+ and phone-first: body text ≥16px, contrast ≥4.5:1, don't hide content behind tabs/carousels, keep 509-738-2985 prominent and tap-to-call.
- **Never invent specs, prices, or photos; never assign one model's photo to another** (open-station vs cab mix-ups are a real past bug). Blank/"Call for price"/"Photo coming to the lot" beats a plausible fake. Every scouted value carries a source URL.
- No frameworks, no build step, no CMS. Generated pages are committed artifacts, not build output.
- Nothing ships to the live domain without Andrew (the client) reviewing a test deploy.
- Say "Open Station", never "Open".

## Architecture (data → generators → pages)

- Catalog pages render client-side from `window.*` globals: `js/tym-models.data.js`, `js/badboy-models.data.js`, `js/mower-models.data.js`, `implements-data.js`. Feature copy and galleries are keyed on exact `"Brand|Model"` strings — any model rename/removal must update those keys, be grepped repo-wide (including `index.html`'s hardcoded carousel), and be click-verified in a browser (serve over http, not file://; `python3 -m http.server` or `npx wrangler pages dev .`).
- **Generated static pages** (committed, regenerated after any data change):
  - `tools/generate-implement-pages.mjs` → `implements/<slug>/index.html` × 16 category pages
  - `tools/generate-sitemap.mjs` → `sitemap.xml`
  - `tools/generate-town-pages.mjs` → the 3 town landing pages
  - `tools/export-to-sheet.mjs` → workbook CSVs (bootstrap + round-trip test)
  - `.github/workflows/regenerate.yml` reruns the first two automatically when data files change on any branch.
- `functions/api/lead.js` — contact-form mailer (Resend; routes quote→sales@, visit/service→service@; Turnstile-gated; honeypot field is `hp_trap` — never name a honeypot `company`, Chrome autofill fills it and silently eats real leads).
- `functions/api/fetch-page.js` — manufacturer-domain-allowlisted fetch proxy for the builder's AI extraction. Do not widen the allowlist casually.
- `/admin/` — internal inventory builder (import CSV → validate/diff → AI-enrich → photos → publish to a `builder/*` branch via GitHub API). Robots-blocked; keys live in the operator's localStorage only.
- **URL discipline:** old WordPress URLs are load-bearing SEO. `_redirects` maps every legacy URL; ported pages (town pages, the 4 guides) serve at their **original URLs** — never rename them. New nested pages must use root-absolute asset/nav URLs (header.js already does; that bug bit once).
- SEO plumbing: `robots.txt` blocks repo internals that Pages would otherwise serve (`node_modules/`, `tools/`, `/admin/`, previews). Canonicals are extensionless, no trailing slash (except `implements/<slug>/`).

## After any data change (checklist)

1. Sync `"Brand|Model"` keys across feature/gallery files; grep for old model strings repo-wide.
2. `node --check` every touched data file.
3. Rerun the generators above (or let the Action do it) — category pages and sitemap must not drift from data.
4. Serve over http and click category page → product page for affected models (title, Open Station/Cab label, photo, features).
5. Report every default applied and every decision held for Andrew (change-summary style: `CHANGE-SUMMARY-2026-07-01.md`).

## Skills

`.claude/skills/jjriggs-web-designer` (any design/UI work) · `.claude/skills/jjriggs-inventory-scout` (inventory data, gap audits, crawling — its cardinal rules govern all product data).
