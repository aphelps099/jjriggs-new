---
name: dealer-kit-builder
description: Guided, phased workflow for cloning the JJ Riggs site into a new dealership's website — intake form, repo clone + rebrand via the manifest, catalog build, themed deploy, dealer review. Use when setting up a new dealer customer ("build a site for X dealership", "new dealer kit", "clone this site for ___", "run dealer intake").
---

# Dealer Kit Builder

You are building a new equipment-dealer website by cloning and rebranding the JJ Riggs site. The output must feel like the JJ Riggs site does for its dealer: fast, phone-first, honest data, sheet-driven inventory — but carrying the new dealer's identity, never JJ Riggs's and never a fabricated one.

**The workflow is six phases with human gates.** Never skip a gate. Everything is driven by one file: `dealer.config.json` (schema: `dealer.config.template.json` in this directory), produced by the guided intake form at `admin/dealer-intake.html`.

## Prime directives (override everything else)

1. **Never invent data.** No guessed specs, prices, hours, review quotes, awards, or photos. A blank beats a plausible fake. Reviews come verbatim from the dealer's real Google Business Profile; financing offers come verbatim from intake.
2. **Tactic Sans never ships to a new dealer.** It's licensed to JJ Riggs only. Delete `MyWebfontsKit/` and `fonts/tactic-sans*` from every clone; apply the config's font plan (open default: Archivo Black headings + Questrial body, or a font the dealer has licensed).
3. **Manufacturer imagery only for confirmed authorized brands.** `lines.authorized_confirmed` must be true and list the brands. A brand not on the confirmed list gets no manufacturer photos, no extract runs, no logo.
4. **Nothing goes live without the dealer reviewing a test deploy.** DNS cutover is the last step, after explicit approval.
5. **No JJ Riggs residue.** The final clone must contain zero occurrences of: `JJ Riggs`, `jjriggs`, `509-738-2985`, `685 Elm Tree`, `Colville` (unless the new dealer is genuinely nearby), `Alluis`, `JJRIGGSEQUIPMENT`, Andrew's reviews, JJ Riggs lot photos (`jjriggs_lot_images/`, `img/uploads/`), or the TYM Gold Dealer award assets. Verify with the residue grep in Phase 6.

## Phase 0 — Preflight

Confirm before starting, ask the builder if unknown:
- Signed agreement + deposit per the pricing in `LIVE-INVENTORY-AND-DEALER-KIT-PLAN.md` §Part 2.
- GitHub org/account for the new private repo; Cloudflare account; access to the dealer's domain DNS.
- Dealer has confirmed authorized-dealer status per brand (photo rights — get it in writing in intake).

## Phase 1 — Intake (the guided form)

**Preferred path:** open `admin/dealer-intake.html` (screen-share on the intake call or send to the dealer), fill it section by section, click **Download dealer.config.json**. Place the file at the repo root of the working clone.

**Conversational fallback:** if the form isn't available, ask the same questions yourself — one section at a time, in this order, confirming each section back before moving on. The sections and fields are exactly the template schema:

1. **Business basics** — dealership name (+ display name if different), tagline (optional), phone (the number they actually answer), lead email, street address, hours, towns/area served (3–6 towns for local-SEO pages), current website URL if any.
2. **Online presence** — Google Business Profile link, Facebook page URL, Instagram, YouTube/other. Explain why GBP matters: their real rating, review count, and quotes power the reviews sections.
3. **Brand** — logo files (light-on-dark version needed; favicon), accent color (hex; default the template red until they choose), theme (the dark/industrial JJ Riggs look is the default), font plan (`open-default` unless they own a license).
4. **Lines carried** — tractor brands, mower brands, implement brands, other lines (sheds etc.), **written confirmation of authorized-dealer status per brand**, and their inventory list in any format (spreadsheet, price list, photo of the whiteboard).
5. **Services & financing** — do they service/repair, specialties (diesel, welding, mobile service…), awards/certifications (verbatim, with proof), current financing offers (rate, term, lender, disclaimer — verbatim or "Call for financing").
6. **Infrastructure** — domain name, registrar/DNS access, who owns the Google account for the inventory sheet, who admins the Facebook page.

**After intake, auto-gather (agent work, no dealer time):**
- Fetch the GBP page: record rating, review count, and copy 6–10 real review quotes verbatim with reviewer first names. Hold for the dealer to approve which ones appear.
- Verify social URLs resolve; note follower counts (useful in the pitch, not on the site).
- If they have a current site, crawl it for product lists, service copy, and photos they own — a content-mining report, not an auto-import.

**Gate:** read the completed config back to the builder/dealer. Do not proceed with missing phone, address, hours, at least one brand, or unconfirmed brand authorization.

## Phase 2 — Clone & scrub

1. Clone this repo into a fresh directory. **Start new git history** (`rm -rf .git && git init`) — the new dealer must not carry JJ Riggs's history. Create the private repo `<org>/<dealer-slug>-site`, push one initial commit *after* the scrub.
2. **Delete (JJ Riggs–specific):** `js/*.data.js` product entries (empty the arrays, keep file shape), `implements-data.js` entries (keep exports), `img/tym-tractors/ img/bb-tractor-images/ img/bad-boy-mowers/ img/bad-boy-implements/ bb-tractor-images/ jjriggs_lot_images/ img/uploads/ JJ-RIGGS-ADS-BUILDER/`, `MyWebfontsKit/ fonts/tactic-sans*`, JJ Riggs docs (`CHANGE-SUMMARY* CLAUDE-CODE-INVENTORY-TASK.md JJRiggs-*.md JJ-Riggs-*.xlsx csv-inventory/ jjriggs-full-inventory.csv sheet-export/`), award assets (`img/tym-gold-dealer.jpg`), review markup content, `fb-post-preview.html`, town pages (regenerate later), `sitemap.xml` (regenerate).
3. **Keep:** all page templates, `header.js/header.css`, `functions/`, `tools/`, `admin/`, `studio/` (park for Phase C), `js/` renderers and empty data files, the skills, `WEB-DESIGNER.md` + `USER-GUIDE.md` (adapt names later).
4. **Apply the rebrand manifest** — every identity location, replaced from config:

| What | Where it lives | Config key |
|---|---|---|
| Dealer name | `<title>`/meta/OG on every page, `header.js` logo alt + aria, footer `.nm` (all pages), JSON-LD `name`, copy throughout | `business.name` |
| Phone | topbar `tb-promo` (header.js), every `tel:+1…` href + visible number (grep `509-738-2985`), JSON-LD, form copy | `business.phone` |
| Address + hours | topbar, footers, visit sections, JSON-LD `address`/`openingHoursSpecification`, map embeds | `business.address`, `business.hours` |
| Email | footers, `functions/api/lead.js` env defaults, mailto links | `business.email` |
| Socials | footer links (all pages), JSON-LD `sameAs` | `presence.*` |
| Domain | canonicals, `og:url`, `robots.txt`, `_redirects`, `generate-sitemap.mjs`, `SITE_BASE` uses, `functions/_lib-page.js` UA string | `infra.domain` |
| Logo | `img/jj-riggs-logo-white.png` refs in header.js + pages, favicon link tags | `brand.logo_*` |
| Accent color | `--red`/`--red-deep` in every page's `:root` block + `header.css` usage (keep variable names) | `brand.accent_color` |
| Fonts | every `@font-face` block + font stacks (`"Tactic Sans Bld"` → chosen heading font; keep fallback chain) | `brand.font_plan` |
| Brands / mega-menu | `header.js` mega-menu cards, brand bar logos on `index.html`, extract allowlist in `functions/_lib-page.js`, `functions/_stock-map.js` (empty the SKU map) | `lines.*` |
| Towns | `tools/generate-town-pages.mjs` TOWNS array → regenerate | `business.towns_served` |
| Reviews | homepage + services review sections: real GBP rating/count/quotes only | Phase 1 auto-gather |
| Analytics | `js/analytics.js` GA4 id → new property or stub | infra setup |
| Publish endpoint | `functions/api/admin/publish.js` repo constant → env var for the new repo | `infra.github_repo` |

5. **Gate:** run the residue grep (Phase 6 list) — must be zero hits before the first commit.

## Phase 3 — Theme

- Insert logo (header, footer, favicon). If only a dark-on-light logo exists, make a white/knockout version or ask for one — never stretch or recolor badly.
- Apply accent color, then **verify contrast**: accent on ink and white-on-accent must both be ≥4.5:1 (compute it; if it fails, darken the accent and tell the builder).
- Hero/section photography: dealer's own lot photos or confirmed-brand manufacturer imagery only. Missing hero = use the dark texture backgrounds already in the repo, never a stand-in machine photo.
- Screenshot homepage + one category page at 375px and 1280px; eyeball against the JJ Riggs reference for broken tokens.

## Phase 4 — Content & catalog

- **Catalog:** for each confirmed brand, run the extraction workflow (`.claude/skills/jjriggs-inventory-scout` rules apply verbatim — source URLs on every value, blank beats guessed). Known-good templates: TYM, Bad Boy, IronCraft, Braber, CID. New manufacturers need an allowlist entry + a hand-verified sample of 3 products before bulk extraction. Populate `js/*.data.js`, then bootstrap the dealer's Google Sheet with `tools/export-to-sheet.mjs`. Produce a **gap report** (missing photos/specs) for the review call.
- **Reviews:** insert the approved GBP quotes, real rating, real count.
- **Town pages:** regenerate from the intake towns.
- **Services/financing pages:** rewrite copy slots from intake answers. Financing shows only what intake stated, with its disclaimer, or "Call for financing." Mark every drafted paragraph for dealer review.
- **Schema:** update JSON-LD on every page (name, address, geo, hours, brands, sameAs).

## Phase 5 — Deploy

- Cloudflare Pages project from the new repo (no build command, output `/`). Set env vars: `ADMIN_PASSCODE` (new passphrase), `ANTHROPIC_API_KEY`, `GH_PUBLISH_TOKEN` (fine-grained, new repo only), `LEAD_*`/`RESEND_API_KEY`, `STOCK_FEED_URL` (once their Website Feed tab is published).
- Wire the inventory sheet: dealer's Google account owns it; publish only the feed tab; confirm badges render on the preview.
- Smoke-test the admin tools against the new repo (publish one photo, revert it).

## Phase 6 — Review & handoff

- **Residue grep (hard gate):** `grep -riE "jj ?riggs|jjriggs|509-738-2985|685 Elm|Alluis|tym-gold-dealer|JJRIGGSEQUIPMENT" --include="*.html" --include="*.js" --include="*.json" --include="*.md" .` → zero hits (excluding this skill's own docs if kept).
- **Click-through checklist** at 375px and 1280px: every nav item, category → product page per brand, tap-to-call works, forms submit, badges live, no placeholder text, no broken images, footer socials point at the new dealer.
- **Dealer review call** on the `*.pages.dev` preview. Fix list → re-review if substantive.
- **Cutover:** DNS only after approval. Then handoff pack: admin URL + passcode, sheet cheat sheet (adapt `STOCK-BADGES.md`'s), care-plan start date.

## Effort calibration

First run: expect ~2× the 24-working-hour target; the target is hours 0–18 build + day 2–3 review/cutover (run-of-show in `USER-GUIDE.md` §11). Log what was slow — that's the backlog for `tools/init-dealer.mjs` automation.
