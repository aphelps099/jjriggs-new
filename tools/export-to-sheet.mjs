#!/usr/bin/env node
// Bootstrap the "JJ Riggs Inventory Master" workbook from the live site data
// (INVENTORY-PIPELINE-PLAN.md §3 bootstrap step): emits one CSV per tab,
// 100% faithful to what's on the site today — nobody retypes anything.
//
//   node tools/export-to-sheet.mjs [outDir]     (default ./sheet-export)
//
// Tabs: Tractors, Mowers, Implements (variant schema), Accessories (seeded
// from Andrew's 2026-07-08 email), plus a README tab written by the caller.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || join(root, "sheet-export");
mkdirSync(out, { recursive: true });

function load(file) {
  const w = {};
  new Function("window", readFileSync(join(root, file), "utf8"))(w);
  return w;
}
const csv = (rows) =>
  rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\r\n");

const tym = load("js/tym-models.data.js").TYM_MODELS || [];
const bb = load("js/badboy-models.data.js").BADBOY_MODELS || [];
const mowers = load("js/mower-models.data.js").MOWER_MODELS || [];
const impl = load("implements-data.js");

// ---------- ① Tractors ----------
const tractorHead = ["status","brand","model","display_name","sort","hp","series","series_name","station","transmission","drive","loader_lift_lbs","engine","fuel","price","blurb","image_current","manufacturer_url","featured","notes"];
const tractorRows = [
  ...tym.map((m) => ["Active","TYM",m.model,"",m.sort ?? "",m.hp,m.series,"",m.cab ? "Cab" : "Open Station",m.transmission || "",m.drive || "",m.loader_lift_lbs || "",m.engine || "",m.fuel || "","",m.blurb || "",m.image || "",m.url || "","",""]),
  ...bb.map((m) => ["Active","Bad Boy",m.model,"",m.sort ?? "",m.hp,m.series,m.series_name || "",m.cab ? "Cab" : "Open Station",m.transmission || "",m.drive || "",m.loader_lift_lbs || "",m.engine || "",m.fuel || "","",m.blurb || "",m.image || "",m.url || "","",(m.use_tags || []).join("; ")]),
];
writeFileSync(join(out, "Tractors.csv"), csv([tractorHead, ...tractorRows]));

// ---------- ② Mowers ----------
const mowerHead = ["status","brand","model","sort","category","type","engine","hp","decks","fuel","drive","transmission","price","blurb","image_current","manufacturer_url","featured","notes"];
const mowerRows = mowers.map((m) => ["Active","Bad Boy",m.model,"",m.cat || "",m.type || "",m.engine || "",m.hp || "",Array.isArray(m.decks) ? m.decks.join("; ") : m.decks || "",m.fuel || "",m.drive || "",m.transmission || "",m.price || "",m.blurb || "",m.image || "",m.url || "","",""]);
writeFileSync(join(out, "Mowers.csv"), csv([mowerHead, ...mowerRows]));

// ---------- ③ Implements (variant schema) ----------
// style_name groups size variants: rows sharing a style_name render as one
// product with a sizes table (e.g. Root Grapple 60" + 72" = two rows).
// Site data stores width in FEET (`width`, e.g. rotary cutters) or INCHES
// (`widthIn`, e.g. grapples) — size_label carries the unit explicitly.
const implHead = ["status","group","category","style_name","size_label","brand","attach","hitch","duty","width_ft","width_in","weight_lbs","hp_min","hp_max","price","image_current","new_photo_url","fit_note","sku","notes"];
const implRows = (impl.JJ_IMPLEMENTS || []).map((it) => {
  const size = it.widthIn != null ? `${it.widthIn}"` : it.width != null ? `${it.width}'` : "";
  return ["Active",it.group || "",it.category || "",it.name || "",size,it.brand || "",it.attach || "",it.hitch || "",it.duty || "",it.width ?? "",it.widthIn ?? "",it.weight || "",it.hpMin || "",it.hpMax || "","",it.img || "","",it.fitNote || "",it.sku || "",""];
});
writeFileSync(join(out, "Implements.csv"), csv([implHead, ...implRows]));

// ---------- ④ Accessories (verbatim from Andrew's 2026-07-08 email) ----------
const accHead = ["status","type","name","applies_to","price","description","photo_url","notes"];
const accRows = [
  ["Active","Tractor accessory","Rear Tire Ballast","All tractors","","","","Andrew: 'We hardly ever sell a tractor without ballast in the rear tires. It is an extra charge depending on the tire size.'"],
  ["Active","Tractor accessory","Engine Block Heater","","","","",""],
  ["Active","Tractor accessory","Replaceable Hardened Steel Loader Cutting Edge","","","","",""],
  ["Active","Tractor accessory","Third Function Front Hydraulics","","","","",""],
  ["Active","Tractor accessory","Rear Remote Hydraulics","","","","",""],
  ["Active","Tractor accessory","Bucket Hook(s)","","","","",""],
  ["Active","Backhoe","Backhoe attachment","(list compatible models)","","","","Andrew: 'Backhoe attachments should be listed for each model. We sell quite a few backhoes.'"],
  ["Active","Backhoe option","Backhoe Thumb","Backhoes","","","","Andrew: 'Backhoe Thumbs are an additional option for backhoes.'"],
];
writeFileSync(join(out, "Accessories.csv"), csv([accHead, ...accRows]));

console.log(`exported to ${out}: Tractors(${tractorRows.length}) Mowers(${mowerRows.length}) Implements(${implRows.length}) Accessories(${accRows.length})`);
