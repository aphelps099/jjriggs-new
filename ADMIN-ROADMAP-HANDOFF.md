# Admin tools — next-features handoff

July 9, 2026 · Aaron Phelps / Look Serious Creative + Claude
Two approved-but-unbuilt features, in priority order: **(1) archive/remove products**, **(2) brochure-PDF + paste-text extraction sources**. Both are moderate builds — smaller than the photo editor was.

Read first: `CLAUDE.md` (non-negotiables), `WEB-DESIGNER.md` (design system), `ADMIN-ACCESS-SETUP.md` (how auth + server keys work). The admin stack this builds on, all live on main:

| Piece | File | What it does |
|---|---|---|
| Photo editor | `admin/photos/index.html` | Browse every product, upload/remove/reorder photos, live-first publish |
| Product wizard | `admin/new/index.html` | Add a product: URL → AI fact-fetch → photo pick → publish + sheet row |
| Inventory builder | `admin/index.html` | Sheet-CSV import → validate/diff → publish |
| Shared client plumbing | `admin/common.js` | `JJ.status/extractProduct/publish/waitLive/explain`; server-first with browser-key fallback |
| Extraction endpoint | `functions/api/admin/extract.js` | One POST: fetches manufacturer page server-side, calls Anthropic with **structured outputs** (`output_config.format` json_schema), returns validated `{fields, suggested_images, images, source}` |
| Publish endpoint | `functions/api/admin/publish.js` | Commits via GitHub API. `target:'live'` → straight to main; guards: path allowlist (`js/*.data.js`, `implements-data.js`, `img/uploads/*`), `builder/*` for previews |
| Page-fetch lib | `functions/_lib-page.js` | Shared manufacturer allowlist + HTML→{title,text,images} reduction |
| Auth | `functions/_middleware.js`, `_auth.js`, `api/admin/login.js` | Passcode gate on `/admin/*` + `/api/admin/*`, HMAC session cookies |

Iron rules that bind both features: never invent specs/prices/photos; photos must match the exact model + configuration; the Google Sheet is the source of truth — anything the admin tools change must be mirrorable to the sheet or the next import will undo it; no frameworks, no build step.

---

## Feature 1 — Archive / remove products (build this first)

**Why first:** the lifecycle is half-built — you can create products but not retire them. Bites the first time a unit sells.

### UX
- Lives in the **photo editor** (`admin/photos/index.html`) — it is already the browse-every-product surface. Do NOT create a fourth tool.
- Product pane gets a "Remove from site…" action → confirm dialog (plain language: "comes off the site in about a minute; you can restore it anytime from Removed products") → live-first publish via the existing `JJ.publish` flow.
- Sidebar gets a collapsed **"Removed products"** section listing archived items with one-click **Restore** (also a publish).
- 60+ UX: no type-the-name ceremony; a simple confirm is enough BECAUSE restore is one click and git history is the permanent undo.

### Data design — archive, never delete
- New data file `js/archived-products.data.js` (name matters: must match publish.js's `FILE_RE` `js/[a-zA-Z0-9._-]+\.data\.js` — it does). Shape:
  `window.JJ_ARCHIVED = { tym:[...], badboy:[...], mowers:[...], implements:[...] };`
  Each entry is the verbatim item object moved out of its live array, plus `{archivedAt:"YYYY-MM-DD"}`.
- Removal publish = two files in one job: the kind's data file (item removed; for implements also recompute `JJ_CATEGORIES` counts — copy the existing `genFiles` logic) + the archive file (item appended). Restore is the mirror image.
- Tractor extras on removal: also drop the model's key from the uploads-gallery override map if present (`js/uploads-gallery.data.js`) — same merge-read the tools already do. Do NOT touch `js/badboy-tractor-images.data.js` or `js/tractor-features.data.js` (hand-maintained); orphaned `"Brand|Model"` keys there are inert lookups and harmless. This is the sanctioned exception to CLAUDE.md's rename/grep rule — document it in the commit message.

### Sharp edges (all known)
1. **The sheet resurrects.** A removed product whose sheet row is still `Active` comes back on the next builder import. After a successful removal, show the same green "sheet step" box the wizard uses: "flip this row's status to **Hidden** in the <tab> tab." (Safety net: the builder's diff screen would show it as an ADD before publishing.)
2. **Homepage featured check.** `index.html` hardcodes a featured carousel with model names. Before removing, client-side `fetch('/index.html')` and search for the model string; if found, warn "this model is featured on the homepage — tell Aaron before removing" (warn, don't block).
3. **No server changes needed.** The publish path allowlist already covers both files; the passcode gate covers the UI. Verify `js/archived-products.data.js` passes `FILE_RE` in a test rather than assuming.

### Tests (extend the existing suites in the session scratchpad pattern — puppeteer at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, python http.server `--directory` repo root, mock `api.github.com` / `/api/admin/*`)
- Remove → publish job contains both files; item absent from live array, present in archive with date; implements counts recomputed.
- Restore → mirror image; round-trip identity (remove+restore = no diff).
- Featured-model warning fires for a model present in index.html, not for others.
- Gallery override key dropped on tractor removal.
- Sheet-reminder box renders after removal.

---

## Feature 2 — Brochure PDF + paste text as extraction sources

**Why:** manufacturer brochures are spec-authoritative (PTO, hydraulic flow, hitch capacity, dimensions) while web pages are marketing-first. Paste-text is the zero-dependency fallback for JS-rendered or fetch-blocked pages.

### UX (wizard step 1)
Three source inputs, combinable — not a mode switch:
- **Manufacturer URL** (current field) — still the only source of photo candidates.
- **Brochure PDF** — drop zone, one file, a few MB typical.
- **Paste text** — textarea under a `<details>` ("page won't load? paste its text").
The killer combo is brochure + URL together: facts from the PDF, photo grid from the page. Require at least one source; if only a PDF is given, skip the photo-pick step gracefully (placeholder image flow already exists).

### API mechanics (verified against the claude-api skill — do not re-derive from memory)
- PDFs go to Anthropic as a **document content block**: `{type:"document", source:{type:"base64", media_type:"application/pdf", data:"<b64 no newlines>"}}` placed in the user message content array **before** the text block. No beta header needed. Limits: 32MB request, page caps apply — reject brochures over ~20 pages with a friendly message (product brochures are 4–10 pages).
- Structured outputs (`output_config.format`) works with document input — same schema, same guarantees as the current build. Do NOT enable citations (incompatible with output_config, returns 400).
- Cost: PDF pages tokenize as text+image, a few cents more per extraction. Irrelevant.

### Server changes (`functions/api/admin/extract.js`)
- Accept optional `pdf` (base64 string, cap ~8MB post-encode → 413 above) and optional `pasted_text` (cap ~40k chars) alongside the existing `url`.
- Content assembly: document block (if pdf) → text prompt. Prompt gains a source preamble: "Sources: [brochure PDF] [page text] — the brochure is authoritative for specs; the page text may add context."
- **Multi-model brochures**: brochures often cover several models (T5058/T5068 share one) with multi-config columns ("M: Dry Single Plate / PS: Wet Multi Plate"). The prompt must hammer the target: "Extract ONLY the column/values for exactly '<name>'. If the brochure lists multiple models or configurations and the value for this exact model is ambiguous, return null for that field." The existing human-review step (step 2 checkboxes) is the real catch — keep its copy honest about this.
- `url` becomes optional when pdf/pasted_text present; `images` in the response is `[]` unless a URL was fetched.
- Fallback path in `admin/common.js` mirrors the same shapes (browser can send the document block directly with the localStorage key).

### Tests
- Extend `test-extract.mjs`: pdf-only request (mock Anthropic; assert document block ordered before text, no citations field), pdf+url (assert images returned from page, prompt says brochure-authoritative), pasted-text-only, oversize pdf → 413, all-sources-missing → 400.
- Wizard browser test: drop a fixture PDF (puppeteer `waitForFileChooser`), assert extraction request carries `pdf`, and photo step is skipped/populated appropriately.

---

## Definition of done (both features)
- All suites green (auth, extract, editor, wizard, servermode, errflow live in the session scratchpad — recreate from this doc's test lists if lost; the patterns are: Node unit tests importing the functions directly with mocked `globalThis.fetch`, plus puppeteer with request interception).
- `node --check` on every touched JS; serve over http (never file://) for browser checks.
- Live-first publish still ends with "✓ LIVE" via `JJ.waitLive`.
- Commit to a `claude/*` branch, PR to main, and note in the PR which sheet-sync reminders the UI now shows — the sheet staying truthful is the pipeline's spine.
