---
name: jjriggs-web-designer
description: Design-system rules and workflow for building or editing any page, section, component, or style on the JJ Riggs Equipment website (jjriggs-new). Use whenever designing, redesigning, restyling, or adding HTML/CSS/JS UI to this repo — heroes, category pages, product pages, headers, buttons, cards, or any visual change.
---

# JJ Riggs Web Designer

You are working on the JJ Riggs Equipment site: a zero-build static HTML/CSS/vanilla-JS site for a family-owned TYM + Bad Boy dealership in Colville, WA, deployed on Cloudflare Pages. The full handbook is `WEB-DESIGNER.md` at the repo root — read it for anything not covered here.

## Think first (in this order)

1. **Audience is 60+, rural, phone-first.** Body text ≥16px, contrast ≥4.5:1, phone number (509-738-2985) prominent and tap-to-call. They call; they don't fill forms.
2. **Hide nothing.** No content behind tabs, collapsed accordions, or carousels by default. Stack and show. The v2 direction (`*-v2-preview.html`) replaces carousels with flat filterable grids — follow it.
3. **Never invent data.** No guessed specs, prices, or photos. Blank/"Call for price"/branded "Photo coming to the lot" placeholder beats a plausible fake. Never reuse another model's photo (open-station vs cab mix-ups are a real past bug).
4. **No frameworks, no build step, no CMS.** Plain HTML/CSS/JS only. Puppeteer in node_modules is for tooling, not the site.
5. Say **"Open Station"**, never "Open" — Andrew's and the customers' language.

## Design system essentials

- **Tokens** (copy the full `:root` block from `index.html` into any new page — `header.css` depends on them and defines none itself): `--ink:#14171a --ink-2:#1b2025 --ink-3:#0f1215 --bone:#f3f1ea --white:#fbfbf9 --steel:#8b939c --steel-2:#c3c8ce --red:#cf1f2a --red-deep:#a5151f --line/--line-2 --maxw:1280px --gut:clamp(1.4rem,5vw,4rem)` (+ `--green:#1d7a3c` on product pages).
- **One visual system, two brands.** No per-brand accent colors — TYM and Bad Boy differ only by logo artwork. `--red` is JJ Riggs's color; never add a "Bad Boy orange" token.
- **Type:** headings `"Tactic Sans Bld"` (local fonts/, weight 400, uppercase, line-height ~1); body `"Questrial"` (Google Fonts). Fluid `clamp()` scale: `.h1 clamp(2.4rem,5.4vw,4.6rem)`, `.h2 clamp(1.8rem,3.6vw,2.9rem)`, `.lead`, `.eyebrow`.
- **Motifs:** `.cut-tab` angle-cut label (signature shape), skewed red dividers (`skewX(-13deg)`), `.eyebrow` + red `.dot`, ghost watermark type. Buttons: `.btn` + `.btn-red`/`.btn-ghost`/`.btn-dark`. On red backgrounds use white solid + white ghost (red buttons vanish).
- **Header:** injected by `header.js` into `<div id="jjHeader" data-variant="overlay|solid" data-active="equipment|service|financing">`; include `header.css` + `header.js` on every page. Broken header = missing tokens or missing mount div.
- **Breakpoints** (desktop-down; `clamp()` does most scaling): 1180 brand-tag, 1080 mega-menu, **940 burger/nav switch**, 920/680 topbar, 760 single-column, 380 smallest.

## Data-layer iron rule

Catalog pages render from `window.*` globals (`js/*.data.js`, `implements-data.js`). Feature copy and galleries are keyed on exact `"Brand|Model"` strings. **After any model rename/removal:**
1. Update keys in `js/tractor-features.data.js`, `js/badboy-tractor-images.data.js`, mower equivalents.
2. Grep the repo for the old model string (including `index.html`'s hardcoded featured carousel).
3. `node --check` every touched data file.
4. Load the category page over http (`python3 -m http.server`; file:// won't render data pages) and click through to the product page — verify title, Open Station/Cab label, photo, features.

## Gotchas

- Tokens are duplicated per page (known debt) — a color change means editing ~11 files; keep values identical everywhere.
- `img/attachements-icon*` is misspelled but load-bearing in `header.js` — don't rename one side only.
- Site images live under `img/` (root `bb-tractor-images/` is a duplicate original). Don't hotlink new images from jjriggsequipment.com/wp-content — copy assets into the repo.
- `csv-inventory/*.csv` are stale mirrors — never treat them as source of truth.
- Nothing ships to the live domain without Andrew reviewing a test deploy first.
- Decisions reserved for Andrew (ask, don't resolve): T5068/T5074 additions, T5075/T224/T115/T130 keep-or-pull, tractor price display, the 4035H/5045CH/5055H photo fixes.
