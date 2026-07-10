#!/usr/bin/env node
// Guard for the generated implement category pages. Fails (exit 1) if:
//   1. A generated style card is blank while any row in its style group has an
//      available image (the bug this whole change fixes — a lead row without a
//      photo must never blank a card when a sibling size row has one).
//   2. Any local (repo-relative) image referenced by implements-data.js is
//      missing from disk.
//   3. A category page is missing, or its cards don't match the current data
//      (i.e. someone edited data without rerunning generate-implement-pages).
// Run after editing implements-data.js or the generator:
//   node tools/validate-implement-pages.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const w = {};
new Function("window", readFileSync(join(root, "implements-data.js"), "utf8"))(w);
new Function("window", readFileSync(join(root, "js/implements-lib.js"), "utf8"))(w);
const ITEMS = w.JJ_IMPLEMENTS || [];
const LIB = w.JJ_IMPL;
const errors = [];

// 1 + 3: per style card, cross-check the generated page against the data.
const groups = LIB.groupImplements(ITEMS);
const byCat = new Map();
for (const g of groups) {
  if (!byCat.has(g.category)) byCat.set(g.category, []);
  byCat.get(g.category).push(g);
}

for (const [cat, gs] of byCat) {
  const file = join(root, "implements", LIB.slug(cat), "index.html");
  if (!existsSync(file)) { errors.push(`MISSING PAGE: implements/${LIB.slug(cat)}/index.html for "${cat}" — run generate-implement-pages.mjs`); continue; }
  const html = readFileSync(file, "utf8");
  for (const g of gs) {
    const pick = LIB.pickCardImage(g.rows);
    const hasImage = g.rows.some((r) => r.img);
    // find this card's <article> block by its data attributes
    const marker = `data-cat="${esc(cat)}" data-style="${esc(g.style)}"`;
    const start = html.indexOf(marker);
    if (start < 0) { errors.push(`CARD NOT IN PAGE: "${cat}" / "${g.style}" — regenerate ${LIB.slug(cat)}`); continue; }
    const block = html.slice(start, html.indexOf("</article>", start));
    const hasImgTag = /<img\b/.test(block.slice(0, block.indexOf("</div>") + 6)) || /class="sc-media"[^>]*\bdata-img=/.test(block);
    if (hasImage && !hasImgTag)
      errors.push(`BLANK CARD WITH AVAILABLE IMAGE: "${cat}" / "${g.style}" — a row has an image but the card renders no photo (pick=${pick.img || "none"})`);
  }
  // count guard: page card count must equal data style count for this category
  const pageCards = (html.match(/class="style-card"/g) || []).length;
  if (pageCards !== gs.length)
    errors.push(`CARD COUNT MISMATCH: "${cat}" page has ${pageCards} cards, data has ${gs.length} styles — regenerate`);
}

// 2: every local image path referenced by the data must exist on disk.
for (const it of ITEMS) {
  if (it.img && LIB.isLocal(it.img) && !existsSync(join(root, it.img)))
    errors.push(`MISSING LOCAL IMAGE: "${it.name}" (${it.category}) -> ${it.img}`);
}

function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

if (errors.length) {
  console.error(`✗ implement page validation FAILED (${errors.length}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
const totalRows = ITEMS.length;
const rowsWithImg = ITEMS.filter((i) => i.img).length;
const cards = groups.length;
const cardsWithImg = groups.filter((g) => g.rows.some((r) => r.img)).length;
console.log(`✓ implement pages valid — ${totalRows} rows (${rowsWithImg} with images), ${cards} style cards (${cardsWithImg} with images), ${byCat.size} categories.`);
