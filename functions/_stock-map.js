// Shared stock-feed logic — used by /api/stock (Cloudflare Pages Function)
// and by tools/stock-dev-server.mjs + tools/build-feed-from-price-list.mjs
// (Node). Keep this file dependency-free ESM.
//
// The "Website Feed" tab in Andrew's price sheet publishes rows of:
//   sku, in_stock, on_order, hot_deal
// SKUs are Andrew's dealer model codes (BB1022HIL, 494HC, T474H...). This
// map translates them to the site's canonical "Brand|Model" keys used by
// js/*-models.data.js. Anything unmapped is reported, never guessed.

export const SKU_MAP = {
  // --- TYM ---
  "T224": "TYM|T224",
  "T2025P": "TYM|T2025P",
  "T3025H": "TYM|T3025H",
  "T3025CH": "TYM|T3025CH",
  "3035H": "TYM|T3035H",
  "3035HC": "TYM|T3035CH",
  "T474H": "TYM|T474H",
  "T474HC": "TYM|T474CH",
  "494H": "TYM|T494H",
  "494HC": "TYM|T494CH",
  "T574H": "TYM|T574H",
  "574HC": "TYM|T574CH",
  "T4058P": "TYM|T4058P",
  "4058PCU": "TYM|T4058PC",
  // --- Bad Boy ---
  "BB1022HIL": "Bad Boy|1022H",
  "BB1025HIL": "Bad Boy|1025H",
  "BB3026HIL": "Bad Boy|3026H",
  "BB4025HIL": "Bad Boy|4025H",
  "BB4035HIL": "Bad Boy|4035H",
  "BB4035CHIL": "Bad Boy|4035CH",
  "BB5045HIL": "Bad Boy|5045H",
  "BB5045CHIL": "Bad Boy|5045CH",
  "BB5055HIL": "Bad Boy|5055H",
  "BB5055CHIL": "Bad Boy|5055CH",
};

// Normalize a raw sheet SKU cell: trim, uppercase, drop "(CAB)"-style
// annotations and stray whitespace. "4058PCU (cab)" -> "4058PCU".
export function normalizeSku(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toCount(v) {
  const s = String(v == null ? "" : v).trim().toUpperCase();
  if (!s || s === "NO" || s === "N" || s === "-") return 0;
  const n = parseInt(s.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toBool(v) {
  const s = String(v == null ? "" : v).trim().toUpperCase();
  return s === "TRUE" || s === "YES" || s === "Y" || s === "1" || s === "X" || s === "✓";
}

// Minimal CSV parser (handles quoted fields + embedded commas/newlines).
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

// Parse the published "Website Feed" CSV into the payload the site consumes.
// Expected header (case-insensitive, order-free): sku, in_stock, on_order, hot_deal
// Duplicate SKUs (e.g. two price configs of the same model) are merged:
// counts sum, hot_deal ORs.
export function buildStockPayload(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return { ok: false, reason: "empty_feed" };

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const col = (name) => header.indexOf(name);
  const iSku = col("sku"), iS = col("in_stock") !== -1 ? col("in_stock") : col("instock");
  const iO = col("on_order") !== -1 ? col("on_order") : col("onorder");
  const iD = col("hot_deal") !== -1 ? col("hot_deal") : col("hotdeal");
  if (iSku === -1 || iS === -1) return { ok: false, reason: "bad_header", header };

  const stock = {};
  const unmatched = [];
  for (let r = 1; r < rows.length; r++) {
    const sku = normalizeSku(rows[r][iSku]);
    if (!sku) continue;
    const key = SKU_MAP[sku];
    if (!key) { unmatched.push(sku); continue; }
    const cur = stock[key] || { in_stock: 0, on_order: 0, hot_deal: false };
    cur.in_stock += toCount(rows[r][iS]);
    cur.on_order += iO === -1 ? 0 : toCount(rows[r][iO]);
    cur.hot_deal = cur.hot_deal || (iD === -1 ? false : toBool(rows[r][iD]));
    stock[key] = cur;
  }

  return { ok: true, updated: new Date().toISOString(), stock, unmatched };
}
