#!/usr/bin/env node
// One-time bootstrap + reconciliation report.
//
// Reads an export of Andrew's "JJ Master Price List - Tractors" sheet and
// produces csv-inventory/website-feed-test.csv in the exact shape the
// "Website Feed" tab should have (sku,in_stock,on_order,hot_deal).
// Prints a reconciliation report: what mapped, what didn't, and which site
// models have no row in the price sheet. Nothing is guessed silently.
//
// Usage: node tools/build-feed-from-price-list.mjs <path-to-price-list.csv>

import { readFileSync, writeFileSync } from "node:fs";
import { parseCsv, normalizeSku, SKU_MAP, buildStockPayload } from "../functions/_stock-map.js";

const src = process.argv[2];
if (!src) { console.error("usage: node tools/build-feed-from-price-list.mjs <price-list.csv>"); process.exit(1); }

const rows = parseCsv(readFileSync(src, "utf8"));
// Price-list layout: col0=year, col1=Model, col2=In Stock, col3=On Order.
// Section headers/footers have no Model value — skipped automatically.
// Everything below the "BACKHOE ONLY" divider is attachments, not tractors.
let inBackhoes = false;
const feed = [];
for (const r of rows.slice(1)) {
  const joined = r.join(" ");
  if (/BACKHOE ONLY/i.test(joined)) { inBackhoes = true; continue; }
  if (/WIRE TRANSFER|Sheffield|Google Reviews|SELF LEVELING/i.test(joined)) break;
  const model = String(r[1] || "").trim();
  if (!model) continue;
  feed.push({
    sku: normalizeSku(model),
    in_stock: String(r[2] || "").trim(),
    on_order: String(r[3] || "").trim(),
    section: inBackhoes ? "backhoe" : "tractor",
  });
}

const out = ["sku,in_stock,on_order,hot_deal"];
const mapped = [], unmatchedTractors = [], skippedBackhoes = [];
for (const f of feed) {
  if (f.section === "backhoe") { skippedBackhoes.push(f.sku); continue; }
  if (!SKU_MAP[f.sku]) { unmatchedTractors.push(f.sku); continue; }
  out.push([f.sku, f.in_stock || "0", f.on_order || "0", "FALSE"].join(","));
  mapped.push(`${f.sku.padEnd(12)} -> ${SKU_MAP[f.sku]}  (stock: ${f.in_stock || "0"}${f.on_order ? ", on order: " + f.on_order : ""})`);
}

writeFileSync(new URL("../csv-inventory/website-feed-test.csv", import.meta.url), out.join("\n") + "\n");

// Which site models have no price-sheet row at all?
const covered = new Set(out.slice(1).map((l) => SKU_MAP[l.split(",")[0]]));
const siteKeys = Object.values(SKU_MAP);
const dataFiles = ["../js/tym-models.data.js", "../js/badboy-models.data.js"];
const siteModels = [];
for (const df of dataFiles) {
  const txt = readFileSync(new URL(df, import.meta.url), "utf8");
  const brand = df.includes("tym") ? "TYM" : "Bad Boy";
  for (const m of txt.matchAll(/"model":"([^"]+)"/g)) siteModels.push(`${brand}|${m[1]}`);
}

console.log(`\n== MAPPED (${mapped.length}) ==`);
mapped.forEach((m) => console.log("  " + m));
console.log(`\n== PRICE-SHEET ROWS WITH NO SITE MATCH (${unmatchedTractors.length}) — need a decision, not guessed ==`);
unmatchedTractors.forEach((u) => console.log("  " + u));
console.log(`\n== BACKHOES SKIPPED (${skippedBackhoes.length}) — not tractor products on the site ==`);
console.log("  " + skippedBackhoes.join(", "));
console.log(`\n== SITE MODELS WITH NO PRICE-SHEET ROW (will show no badge) ==`);
siteModels.filter((k) => !covered.has(k)).forEach((k) => console.log("  " + k));
console.log(`\nWrote csv-inventory/website-feed-test.csv (${out.length - 1} rows)`);

// Sanity: round-trip through the exact parser the API uses.
const payload = buildStockPayload(out.join("\n"));
console.log(`Round-trip through buildStockPayload: ok=${payload.ok}, models=${Object.keys(payload.stock || {}).length}, unmatched=${(payload.unmatched || []).length}`);
