# JJ Riggs Equipment website

Zero-build static HTML/CSS/vanilla-JS site for a TYM + Bad Boy dealership (Colville, WA), deployed on Cloudflare Pages (no build command, output dir `/`, `functions/` auto-detected).

**Read `WEB-DESIGNER.md` before making any change** — it is the complete handoff handbook: design system, audience rules, data-layer sync rules, known debt, and the future roadmap.

Non-negotiables:
- Audience is 60+ and phone-first: body text ≥16px, contrast ≥4.5:1, don't hide content behind tabs/carousels, keep 509-738-2985 prominent.
- Never invent specs, prices, or photos; never assign one model's photo to another.
- Category/product pages render client-side from `js/*.data.js` + `implements-data.js`; features/galleries are keyed on exact `"Brand|Model"` strings — any model rename/removal must update those keys and be verified with a repo-wide grep plus a browser click-through (serve over http, not file://).
- No frameworks, no build step, no CMS.
- Nothing ships to the live domain without Andrew (the client) reviewing a test deploy. (This governs code/design changes. Inventory data + photos published through the passcode-gated /admin tools go straight to main by design — there the editor IS the reviewer, and the publish endpoint's path allowlist keeps those publishes from touching code.)

Skills in `.claude/skills/`: `jjriggs-web-designer` (design/UI work), `jjriggs-inventory-scout` (inventory data, gap audits, crawling).
