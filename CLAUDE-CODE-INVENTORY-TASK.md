# Task for Claude Code — TYM & Bad Boy Tractor Listing Corrections

**Repo:** this directory (`jjriggs-new`). **Status:** test build, not on the live domain — nothing here goes public until Aaron promotes it.
**Source of truth:** Andrew Alluis's June 29, 2026 stock lists, reconciled in the brief below. Where the requested edits conflict with the stock list, the defaults below win — but every default must be flagged in your final summary, not silently applied and forgotten.

Data lives in `js/tym-models.data.js` and `js/badboy-models.data.js` (rendered by `tractors.html`). Two secondary files key off the exact model name and must be kept in sync with any rename or removal:
- `js/tractor-features.data.js` — feature copy, keyed `"Brand|Model"`
- `js/badboy-tractor-images.data.js` — extra gallery photos, keyed `"Brand|Model"`

If you rename or remove a model in the main data file and don't update these keys too, that model's detail page will silently lose its features/gallery or show stale content.

## 1. TYM — `js/tym-models.data.js`

**Remove these objects entirely** (confirmed not on Andrew's stock list):
`T254`, `T2400`, `T2610`, `T25`, `T3620`, `T4820`, `T4820C`, `T4820CH`, `T5520`, `T5520CH`

**Remove these two as well — default action, flag in your summary (Q1):** `T3035`, `T3035C`. Neither is on the stock list. A retitle was requested for T3035 but it conflicts with the stock list; default is to remove both open-station and cab variants. Confirm with Andrew before this ships live.

**Rename + reconfigure** (edit `model` and `cab` in place):
| Current `model` | New `model` | `cab` |
|---|---|---|
| T3025 | T3025H | `false` |
| T3025C | T3025CH | `true` (unchanged) |
| T474 | T474H | `false` |
| T474C | T474CH | `true` (unchanged) |
| T494 | T494H | `false` (unchanged) |
| T494C | T494CH | `true` (unchanged) |
| T574 | T574H | `false` |
| T574C | T574CH | `true` (unchanged) |

For every row above, update the matching key in `js/tractor-features.data.js` (e.g. `"TYM|T3025"` → `"TYM|T3025H"`).

**Add:** `T2025P` (replaces T25). **Do not invent specs, engine details, or a product image.** Source real T2025P data (HP, engine, drive, transmission, loader lift, image URL, product page URL, blurb) from TYM/JJ Riggs before adding the object — follow the exact shape of the other TYM entries.

**Hold — do not add:** `T5068`, `T5074`. No config or images exist anywhere in this repo for either. Flag for Andrew.

**Flag, don't touch:** `T5075` already exists fully built (cab, 74 HP, image, feature copy) even though it's not on Andrew's stock list. Don't remove it pre-emptively — surface it to Andrew as a keep/pull decision.

**Flag, don't touch:** `T224`, `T115`, `T130` exist on the site but appear on neither the stock list nor any remove instruction. Leave as-is; call this out in your summary as needing a decision.

## 2. Bad Boy — `js/badboy-models.data.js`

**Remove these four shuttle-shift models — default action, flag in your summary (Q4):**
`5045S`, `5045CS`, `5055S`, `5055CS`

Delete their corresponding keys from `js/badboy-tractor-images.data.js` too (`"Bad Boy|5045S"`, `"Bad Boy|5045CS"`, `"Bad Boy|5055S"`, `"Bad Boy|5055CS"`).

**Rename only** (append "H", no config change — all already `cab:false`):
| Current `model` | New `model` |
|---|---|
| 1022 | 1022H |
| 1025 | 1025H |
| 3026 | 3026H |
| 4025 | 4025H |

Update the matching keys in `js/badboy-tractor-images.data.js` (`"Bad Boy|1022"` → `"Bad Boy|1022H"`, etc.).

**Picture fixes — need real, distinct photo assets (don't just reuse an existing file path differently — the underlying images are actually wrong, not just mislinked):**
| Model | Problem | Fix needed |
|---|---|---|
| 4035H | Shares its image file with 4035CH (cab photo) | Source a genuine open-station photo |
| 5045CH | Uses the same image file as the open-station 5045 models | Source a genuine cab photo |
| 5055H | Uses the same image file as the cab-labeled 5055 models | Source a genuine open-station photo |

If no real replacement photo is available yet, leave the current (wrong) image in place and flag it — don't fake a fix by pointing to another equally-wrong file.

## 3. Guardrails

- Do not touch the "Schedule a Visit" calendar wiring or the Quote/Schedule Service forms — explicitly out of scope this round.
- Do not invent model specs or product photos anywhere in this task (T2025P, T5068, T5074).
- `csv-inventory/tractors-inventory.csv` and `csv-inventory/mowers-inventory.csv` are stale, disconnected mirrors of old data — not rendered anywhere on the site. Ignore them for this task; they'll get rebuilt once a spreadsheet-driven inventory pipeline is designed (separate, later project).

## 4. Verification before you call this done

- After edits, `grep` the repo for every old model string you renamed or removed (e.g. `T3025` without the H, `5045S`) to catch any other hardcoded reference you might have missed (nav links, anchors, other pages).
- Load `tractors.html` and click through both brands, all HP tabs, and the grid view — confirm every card shows the right title, Open Station/Cab label, and a picture that isn't shared with a different model.
- Confirm removed models no longer appear anywhere, including the carousel and grid view.

## 5. Deliverable

A change summary listing every edit made, every default applied (T3035/T3035C removal, Bad Boy S-model removal), and every item held for Andrew (T5068, T5074, T5075, T224/T115/T130, the two picture fixes needing real assets). Do not promote anything to the live domain — this is Aaron's call after Andrew reviews.
