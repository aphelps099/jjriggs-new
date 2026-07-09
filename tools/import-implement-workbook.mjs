#!/usr/bin/env node
// Imports the dealer implement workbook CSV into implements-data.js by MERGING
// (never replacing) against the existing catalog, keyed on SKU. Then prints an
// added / enriched / skipped diff report so every run is reviewable.
//
//   node tools/import-implement-workbook.mjs
//
// Rules (see /home/user/workspace/jjriggs-implements-brief.md):
//   - Only rows with Publish = "Yes" are imported; "Review" rows are reported and skipped.
//   - Existing rows matched by SKU are ENRICHED in place (specs updated from the
//     manufacturer-verified workbook) while id / img / slug / name are preserved.
//   - Bad Boy rows carry no SKU in the current data; they are matched by
//     category + width and only have the workbook SKU attached.
//   - Unmatched Braber / Ironcraft / CID rows are APPENDED with new ids
//     BR-### / IC-### / CID-### (continuing the existing CID sequence).
//   - Stock counts (In Stock / On Order) are intentionally NOT imported — stock
//     is live-only via the Google Sheet -> /api/stock badge system.
// Deterministic: re-running produces byte-identical output.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = join(root, "csv-inventory", "implement-workbook-2026-07-09.csv");
const DATA_PATH = join(root, "implements-data.js");

// ---------------------------------------------------------------- CSV parsing
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* ignore */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function loadCSV(path) {
  const rows = parseCSV(readFileSync(path, "utf8")).filter((r) => r.some((c) => c.trim() !== ""));
  const header = rows.shift().map((h) => h.trim());
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// ------------------------------------------------------------- existing data
const w = {};
new Function("window", readFileSync(DATA_PATH, "utf8"))(w);
const GROUP_ORDER = w.JJ_GROUP_ORDER;
const CATEGORIES = w.JJ_CATEGORIES.map((c) => ({ ...c }));
const IMPLEMENTS = w.JJ_IMPLEMENTS.map((r) => ({ ...r }));

// -------------------------------------------------------------- mapping tables
// workbook Category -> { category (site), duty? }
const CAT_MAP = {
  "Ballast Boxes": { category: "Ballast Boxes" },
  "Box Blades": { category: "Box Blades" },
  "Heavy-Duty Box Blades": { category: "Box Blades", duty: "Heavy-Duty" },
  "Disc Harrows": { category: "Disc Harrow" },
  "Flex-Wing Cutters": { category: "Flex Wing Cutter" },
  "Grapple Rakes": { category: "Front Grapples" },
  "Hay Spears": { category: "Forks & Hitches" },
  "Heavy-Duty Rear Blades": { category: "Grader Blades", duty: "Heavy-Duty" },
  "Land Planes": { category: "Land Graders" },
  "Landscape Rakes": { category: "Landscape Rakes" },
  "Loader Buckets": { category: "Loader Buckets" },
  "Offset Rear Blades": { category: "Grader Blades" },
  "Pallet Forks": { category: "Forks & Hitches" },
  "Post Hole Diggers": { category: "Post Hole Diggers" },
  "Quick Hitches": { category: "Forks & Hitches" },
  "Rear Blades": { category: "Grader Blades" },
  "Rock Buckets": { category: "Rock Buckets" },
  "Rock Grapples": { category: "Front Grapples" },
  "Root Grapples": { category: "Front Grapples" },
  "Rotary Cutters": { category: "Rotary Cutters" },
  "Snow Blowers": { category: "Snow Blowers" },
  "Snow Plows": { category: "Snow Plows" },
  "Snow Pushers": { category: "Snow Pusher" },
  "Subsoilers & Middle Busters": { category: "Subsoilers & Middle Busters" },
  "Tillers": { category: "Rotary Tillers" },
  "Trailer Movers": { category: "Forks & Hitches" },
};

// site category -> group. Existing categories inherit their current group; the
// five NEW categories get the groups assigned in the brief.
const GROUP_OF = {};
for (const c of CATEGORIES) GROUP_OF[c.category] = c.group;
Object.assign(GROUP_OF, {
  "Ballast Boxes": "Material handling",
  "Loader Buckets": "Material handling",
  "Post Hole Diggers": "Dirt work & grading",
  "Snow Blowers": "Snow",
  "Subsoilers & Middle Busters": "Tillage",
});

// New-category metadata (blurb in the plain, farmer-friendly house voice; img
// prefers a workbook Primary Image URL for the category, else a close existing
// category image).
const NEW_CATEGORY_META = {
  "Ballast Boxes": {
    blurb: "Add rear weight for safe lifting and steady traction. Fill with sand, gravel, or concrete.",
    imgFallback: "Forks & Hitches",
  },
  "Loader Buckets": {
    blurb: "Move dirt, gravel, feed, and debris with your front loader.",
    imgFallback: "Rock Buckets",
  },
  "Post Hole Diggers": {
    blurb: "Dig clean, straight holes for posts and footings. Auger sizes to match the job.",
    imgFallback: "Land Graders",
  },
  "Snow Blowers": {
    blurb: "Throw snow clear of driveways and lots. Two-stage 3-point blowers for compact and utility tractors.",
    imgFallback: "Snow Plows",
  },
  "Subsoilers & Middle Busters": {
    blurb: "Break hardpan and open planting furrows. Simple, tough 3-point tillage tools.",
    imgFallback: "Rotary Tillers",
  },
};

// ------------------------------------------------------------- field helpers
const num = (v) => {
  if (v == null) return null;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Mount / Hitch -> { attach, hitch, c1, c2, c3, mountNote }
function mapMount(raw) {
  const s = (raw || "").trim();
  const l = s.toLowerCase();
  const out = { attach: "", hitch: "", c1: false, c2: false, c3: false, mountNote: "" };
  if (!s) return out;
  if (/replacement part/.test(l)) { out.attach = "Replacement part"; return out; }
  if (/bucket clamp|clamp-on bucket|clamp on bucket/.test(l)) { out.attach = "Bucket-Mount"; return out; }
  if (/skid steer|quick attach|loader/.test(l)) {
    out.attach = "Front Loader QA";
    if (/john deere/.test(l)) out.mountNote = "John Deere loader mount";
    return out;
  }
  if (/pull-type|pull type/.test(l)) { out.attach = "Pull-Behind"; return out; }
  if (/3-point|3 point|3pt/.test(l)) {
    out.attach = "3-Point Hitch";
    const c1 = /cat\s*1/.test(l);
    const c2 = /cat\s*2/.test(l) || /1\s*(?:\/|or|-|–|to)\s*2/.test(l);
    out.c1 = c1 || (c2 && /cat\s*1/.test(l));
    out.c2 = c2;
    out.hitch = out.c1 && out.c2 ? "Cat 1/Cat 2" : out.c2 ? "Cat 2" : out.c1 ? "Cat 1" : "";
    return out;
  }
  // Unrecognized (e.g. auger output shaft, accessory) — leave attach blank so
  // the category page does not render a confusing badge.
  return out;
}

// Normalize the leading size token to the site's `N'` / `N"` convention so the
// page generator can strip it and group size variants into one style card.
function normName(name) {
  let s = (name || "").trim();
  s = s.replace(/^(\d+)\s*[–-]\s*(\d+)\s*in\.?(\s|$)/i, '$1–$2"$3'); // range in inches
  s = s.replace(/^(\d+(?:\.\d+)?)\s*ft\.?(\s|$)/i, "$1'$2");         // leading feet
  s = s.replace(/^(\d+(?:\.\d+)?)\s*in\.?(\s|$)/i, '$1"$2');          // leading inches
  return s.replace(/\s{2,}/g, " ").trim();
}

function inferDuty(row, mappedDuty) {
  if (mappedDuty) return mappedDuty;
  const hay = `${row["Product Family"]} ${row["Product Name"]}`;
  if (/heavy-duty/i.test(hay)) return "Heavy-Duty";
  if (/standard-duty/i.test(hay)) return "Standard-Duty";
  return "";
}

function hpFields(row) {
  const hpMin = num(row["HP Min"]);
  const hpMax = num(row["HP Max"]);
  let hpRaw = "";
  if (hpMin != null && hpMax != null) hpRaw = `${hpMin}-${hpMax}`;
  else if (hpMin != null) hpRaw = `${hpMin} min`;
  else if (hpMax != null) hpRaw = `${hpMax} max`;
  return { hpMin, hpMax, hpRaw };
}

function widthFields(row) {
  const widthIn = num(row["Working Width (in.)"]);
  // ft only when it divides cleanly into half-feet and is a real implement width
  const width = widthIn != null && widthIn >= 24 && widthIn % 6 === 0 ? widthIn / 12 : null;
  return { width, widthIn };
}

// Build the customer-facing fitNote from the mount note and PTO RPM.
function buildFitNote(mountNote, row) {
  const parts = [];
  if (mountNote) parts.push(mountNote);
  const pto = num(row["PTO RPM"]);
  if (pto != null) parts.push(`${pto} RPM PTO`);
  return parts.join(" · ");
}

// ------------------------------------------------------------- the merge
const report = { added: [], enriched: [], badBoyAttached: [], badBoyUnmatched: [], skipped: [] };

const wb = loadCSV(CSV_PATH);
const bySku = new Map();
for (const r of IMPLEMENTS) if (r.sku) bySku.set(r.sku, r);

// next id counters
let nextCid = Math.max(0, ...IMPLEMENTS.filter((r) => /^CID-\d+$/.test(r.id)).map((r) => +r.id.slice(4)));
let nextBr = 0, nextIc = 0;
const idNum = (n) => String(n).padStart(3, "0");

function commonFields(row, siteCat, duty) {
  const mount = mapMount(row["Mount / Hitch"]);
  const { hpMin, hpMax, hpRaw } = hpFields(row);
  const { width, widthIn } = widthFields(row);
  return {
    duty,
    sub: row["Category"],
    familyId: row["Family ID"] || "",
    attach: mount.attach,
    width,
    widthIn,
    weight: num(row["Weight (lb.)"]),
    hitch: mount.hitch,
    c1: mount.c1, c2: mount.c2, c3: mount.c3,
    hpMin, hpMax, hpRaw,
    fitNote: buildFitNote(mount.mountNote, row),
    blurb: row["Short Description"] || "",
    page: row["Image Source Page"] || row["Manual / Catalog URL"] || "",
    _group: GROUP_OF[siteCat],
  };
}

for (const row of wb) {
  const sku = (row["Model/SKU"] || "").trim();
  const brand = (row["Brand"] || "").trim();
  const wbCat = (row["Category"] || "").trim();
  const map = CAT_MAP[wbCat];
  if (!map) throw new Error(`Unmapped workbook category: "${wbCat}" (SKU ${sku})`);
  const siteCat = map.category;
  const duty = inferDuty(row, map.duty);

  if ((row["Publish"] || "").trim().toLowerCase() !== "yes") {
    report.skipped.push({ sku, brand, wbCat, name: row["Product Name"], status: row["Research Status"] });
    continue;
  }

  const existing = bySku.get(sku);
  if (existing) {
    if (existing.brand === "Bad Boy") {
      // already carries the SKU from a previous run — nothing to change
      continue;
    }
    // ENRICH in place: refresh manufacturer specs; keep id / img / slug / name.
    const c = commonFields(row, siteCat, duty);
    existing.category = siteCat;
    existing.group = c._group;
    if (duty) existing.duty = duty;
    existing.attach = c.attach;
    existing.width = c.width;
    existing.widthIn = c.widthIn;
    existing.weight = c.weight;
    existing.hitch = c.hitch;
    existing.c1 = c.c1; existing.c2 = c.c2; existing.c3 = c.c3;
    existing.hpMin = c.hpMin; existing.hpMax = c.hpMax; existing.hpRaw = c.hpRaw;
    existing.fitNote = c.fitNote;
    existing.sub = c.sub;
    existing.familyId = c.familyId;
    existing.blurb = c.blurb;
    if (!existing.page && c.page) existing.page = c.page;
    report.enriched.push({ id: existing.id, sku, name: existing.name });
    continue;
  }

  if (brand === "Bad Boy") {
    // Match by category + width to an existing Bad Boy row; attach SKU only.
    const { width, widthIn } = widthFields(row);
    const targetW = width ?? (widthIn != null ? widthIn / 12 : null);
    const match = IMPLEMENTS.find(
      (r) => r.brand === "Bad Boy" && r.category === siteCat && !r.sku && targetW != null && r.width === targetW
    );
    if (match) {
      match.sku = sku;
      bySku.set(sku, match);
      report.badBoyAttached.push({ id: match.id, sku, name: match.name });
    } else {
      report.badBoyUnmatched.push({ sku, name: row["Product Name"], wbCat });
    }
    continue;
  }

  // APPEND a new row (Braber / Ironcraft / unmatched CID)
  let id;
  if (brand === "Braber") id = `BR-${idNum(++nextBr)}`;
  else if (brand === "Ironcraft") id = `IC-${idNum(++nextIc)}`;
  else id = `CID-${idNum(++nextCid)}`;

  const c = commonFields(row, siteCat, duty);
  const rec = {
    id, brand, group: c._group, category: siteCat, duty,
    name: normName(row["Product Name"]),
    sub: c.sub, familyId: c.familyId, sku,
    attach: c.attach, width: c.width, widthIn: c.widthIn, weight: c.weight,
    hitch: c.hitch, c1: c.c1, c2: c.c2, c3: c.c3,
    hpMin: c.hpMin, hpMax: c.hpMax, hpRaw: c.hpRaw,
    fitNote: c.fitNote, blurb: c.blurb,
    img: (row["Primary Image URL"] || "").trim(),
    page: c.page,
    slug: row["Product Slug"] || "",
  };
  IMPLEMENTS.push(rec);
  bySku.set(sku, rec);
  report.added.push({ id, brand, sku, category: siteCat, name: rec.name });
}

// --------------------------------------------------------- categories + counts
const presentCats = new Set(IMPLEMENTS.map((r) => r.category));
const knownCats = new Set(CATEGORIES.map((c) => c.category));
const newCats = [];
for (const cat of presentCats) {
  if (knownCats.has(cat)) continue;
  const meta = NEW_CATEGORY_META[cat];
  if (!meta) throw new Error(`New category "${cat}" has no metadata entry`);
  const rowImg = IMPLEMENTS.find((r) => r.category === cat && r.img && /^https?:/.test(r.img));
  const fallback = CATEGORIES.find((c) => c.category === meta.imgFallback);
  CATEGORIES.push({
    category: cat,
    group: GROUP_OF[cat],
    img: rowImg ? rowImg.img : (fallback ? fallback.img : ""),
    blurb: meta.blurb,
    count: 0,
  });
  newCats.push(cat);
}

// recompute ALL counts from the merged data
const counts = {};
for (const r of IMPLEMENTS) counts[r.category] = (counts[r.category] || 0) + 1;
for (const c of CATEGORIES) c.count = counts[c.category] || 0;

// ----------------------------------------------------------------- validation
const skuSeen = new Map();
for (const r of IMPLEMENTS) {
  if (!r.sku) continue;
  if (skuSeen.has(r.sku)) throw new Error(`Duplicate SKU "${r.sku}" on ${skuSeen.get(r.sku)} and ${r.id}`);
  skuSeen.set(r.sku, r.id);
}
const slugSeen = new Map();
for (const r of IMPLEMENTS) {
  if (!r.slug) throw new Error(`Row ${r.id} (${r.sku || "no sku"}) has no slug`);
  if (slugSeen.has(r.slug)) throw new Error(`Duplicate slug "${r.slug}" on ${slugSeen.get(r.slug)} and ${r.id}`);
  slugSeen.set(r.slug, r.id);
}
const idSeen = new Set();
for (const r of IMPLEMENTS) {
  if (idSeen.has(r.id)) throw new Error(`Duplicate id "${r.id}"`);
  idSeen.add(r.id);
}

// --------------------------------------------------------------- serialization
// One object per line, canonical key order, absent keys omitted. Deterministic.
const KEY_ORDER = [
  "id", "brand", "group", "category", "duty", "name", "sub", "familyId", "sku",
  "attach", "width", "widthIn", "weight", "hitch", "c1", "c2", "c3",
  "hpMin", "hpMax", "hpRaw", "fitNote", "blurb", "img", "page", "slug",
];
function ordered(obj) {
  const o = {};
  for (const k of KEY_ORDER) if (k in obj) o[k] = obj[k];
  for (const k of Object.keys(obj)) if (!(k in o) && !k.startsWith("_")) o[k] = obj[k];
  return o;
}

const CAT_KEY_ORDER = ["category", "group", "img", "blurb", "count"];
function orderedCat(c) {
  const o = {};
  for (const k of CAT_KEY_ORDER) if (k in c) o[k] = c[k];
  return o;
}

const out =
  `window.JJ_GROUP_ORDER=${JSON.stringify(GROUP_ORDER)};\n` +
  `window.JJ_CATEGORIES=[\n` +
  CATEGORIES.map((c) => JSON.stringify(orderedCat(c))).join(",\n") +
  `\n];\n` +
  `window.JJ_IMPLEMENTS=[\n` +
  IMPLEMENTS.map((r) => JSON.stringify(ordered(r))).join(",\n") +
  `\n];\n`;

writeFileSync(DATA_PATH, out);

// ---------------------------------------------------------------------- report
const L = (s = "") => console.log(s);
L("=".repeat(72));
L("IMPLEMENT WORKBOOK IMPORT — DIFF REPORT");
L("=".repeat(72));
L(`Source CSV : csv-inventory/implement-workbook-2026-07-09.csv (${wb.length} rows)`);
L(`Output     : implements-data.js`);
L("");
L(`ADDED (new rows)        : ${report.added.length}`);
L(`ENRICHED (CID in place) : ${report.enriched.length}`);
L(`BAD BOY SKU attached    : ${report.badBoyAttached.length}`);
L(`BAD BOY unmatched       : ${report.badBoyUnmatched.length}`);
L(`SKIPPED (Review rows)   : ${report.skipped.length}`);
L(`Total implements now    : ${IMPLEMENTS.length}`);
L(`Total categories now    : ${CATEGORIES.length}`);
L("");

const byBrand = report.added.reduce((m, r) => ((m[r.brand] = (m[r.brand] || 0) + 1), m), {});
L(`NEW ROWS BY BRAND: ${Object.entries(byBrand).map(([b, n]) => `${b} ${n}`).join(", ")}`);
L("");
L(`NEW CATEGORIES (${newCats.length}): ${newCats.join(", ")}`);
L("");

L("-".repeat(72));
L("ENRICHED (existing rows refreshed from workbook, id/img/slug kept):");
for (const e of report.enriched) L(`  ${e.id}  ${e.sku.padEnd(14)} ${e.name}`);
L("");
L("BAD BOY — SKU attached by category+width match:");
for (const e of report.badBoyAttached) L(`  ${e.id}  ${e.sku.padEnd(14)} ${e.name}`);
if (report.badBoyUnmatched.length) {
  L("");
  L("BAD BOY — UNMATCHED (no SKU attached, needs manual review):");
  for (const e of report.badBoyUnmatched) L(`  ${e.sku.padEnd(14)} ${e.wbCat}  ${e.name}`);
}
L("");
L("SKIPPED (Publish = Review):");
for (const s of report.skipped) L(`  ${(s.sku || "").padEnd(18)} ${s.brand} / ${s.wbCat} — ${s.name}  [${s.status}]`);
L("");
L("ADDED rows:");
for (const a of report.added) L(`  ${a.id}  ${a.sku.padEnd(18)} ${a.category.padEnd(28)} ${a.name}`);
L("=".repeat(72));

L("");
L("CATEGORY COUNTS:");
for (const c of CATEGORIES) L(`  ${c.category.padEnd(30)} ${String(c.count).padStart(3)}  (${c.group})`);
