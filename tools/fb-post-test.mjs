#!/usr/bin/env node
// Test harness for the sheet → Facebook Page posting pipeline
// (FACEBOOK-POSTING.md). Reads the same "Website Feed" CSV the badge system
// uses, plus one extra column: post_fb (TRUE/FALSE checkbox in the sheet).
//
// For every flagged row it builds the exact Graph API payload — caption
// composed ONLY from fields already in the site data files (nothing invented,
// blank fields skipped) plus availability wording derived from the same
// count rules as the badges — then:
//
//   DRY RUN (default)  prints each payload and writes fb-post-preview.html,
//                      a Facebook-look mockup to review with Andrew.
//                      Nothing touches Facebook.
//   --live             POSTs each payload to the Page via the Graph API.
//                      Requires env FB_PAGE_ID + FB_PAGE_TOKEN. Keys already
//                      posted (csv-inventory/fb-posted-log.json) are skipped
//                      unless --force.
//
// Guardrails: unmapped SKUs are reported, never guessed; a flagged model
// with 0 in stock and 0 on order is HELD, not posted — we don't advertise
// what isn't available.
//
// Usage:
//   node tools/fb-post-test.mjs                       # test CSV, dry run
//   node tools/fb-post-test.mjs <feed.csv | https://…published csv url>
//   FB_PAGE_ID=… FB_PAGE_TOKEN=… node tools/fb-post-test.mjs --live
//   SITE_BASE=https://preview.example.com node tools/fb-post-test.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, normalizeSku, SKU_MAP } from "../functions/_stock-map.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const FORCE = args.includes("--force");
const feedArg = args.find((a) => !a.startsWith("--")) || join(root, "csv-inventory/facebook-feed-test.csv");
const SITE_BASE = (process.env.SITE_BASE || "https://jjriggsequipment.com").replace(/\/$/, "");
const GRAPH_VERSION = "v23.0";
const LOG_PATH = join(root, "csv-inventory/fb-posted-log.json");
const PREVIEW_PATH = join(root, "fb-post-preview.html");

// ---- caption template (edit here; agreed with Andrew before go-live) ------
function buildCaption(m, avail) {
  const lines = [];
  const title = `${m.brand} ${m.model}`;
  lines.push(m.hot_deal ? `HOT DEAL 🔥 ${title}` : title);

  const specs = [
    m.hp ? `${m.hp} HP` : "",
    m.cab != null ? (m.cab ? "Cab" : "Open Station") : "",
    m.transmission || "",
    m.loader_lift_lbs ? `loader lifts ${Number(m.loader_lift_lbs).toLocaleString("en-US")} lb` : "",
  ].filter(Boolean);
  if (specs.length) lines.push(specs.join(" · "));

  const blurb = firstSentences(m.blurb, 180);
  if (blurb) lines.push("", blurb);

  lines.push("", avail);
  lines.push("Call Andrew: 509-738-2985");
  lines.push("JJ Riggs Equipment · 685 Elm Tree Dr, Colville, WA");
  lines.push("", productUrl(m));
  return lines.join("\n");
}

// Availability wording — same thresholds as the site badges (STOCK-BADGES.md).
function availability(inStock, onOrder) {
  if (inStock >= 5) return "On the lot now in Colville.";
  if (inStock >= 2) return `On the lot now in Colville — only ${inStock} left.`;
  if (inStock === 1) return "On the lot now in Colville — only 1 left.";
  if (onOrder > 0) return "On order — call to reserve yours.";
  return null; // nothing to sell: caller holds the post
}

function productUrl(m) {
  return `${SITE_BASE}/product.html?type=tractor&b=${encodeURIComponent(m.brand)}&m=${encodeURIComponent(m.model)}`;
}

function firstSentences(text, cap) {
  const s = String(text || "").trim();
  if (!s) return "";
  const parts = s.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const p of parts) {
    if (out && (out + " " + p).length > cap) break;
    out = out ? out + " " + p : p;
  }
  return out;
}

// ---- load the feed ---------------------------------------------------------
async function readFeed(src) {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src, { redirect: "follow" });
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    const text = await res.text();
    if (/^\s*</.test(text)) throw new Error("feed returned HTML (tab not published?)");
    return text;
  }
  return readFileSync(src, "utf8");
}

function toCount(v) {
  const s = String(v == null ? "" : v).trim().toUpperCase();
  if (!s || s === "NO" || s === "N" || s === "-") return 0;
  const n = parseInt(s.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
const toBool = (v) => ["TRUE", "YES", "Y", "1", "X", "✓"].includes(String(v == null ? "" : v).trim().toUpperCase());

// ---- load the site data files (same technique as export-to-sheet.mjs) -----
function loadData(file) {
  const w = {};
  new Function("window", readFileSync(join(root, file), "utf8"))(w);
  return w;
}

async function main() {
  const rows = parseCsv(await readFeed(feedArg));
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const col = (n) => header.indexOf(n);
  const iSku = col("sku"), iS = col("in_stock"), iO = col("on_order"), iD = col("hot_deal"), iP = col("post_fb");
  if (iSku === -1 || iS === -1 || iP === -1) {
    console.error(`Feed needs sku, in_stock and post_fb columns — got: ${header.join(", ")}`);
    process.exit(1);
  }

  // Merge duplicate SKU rows exactly like buildStockPayload: counts sum, flags OR.
  const byKey = {};
  const unmatched = [];
  for (const r of rows.slice(1)) {
    const sku = normalizeSku(r[iSku]);
    if (!sku) continue;
    const key = SKU_MAP[sku];
    if (!key) { unmatched.push(sku); continue; }
    const cur = byKey[key] || { in_stock: 0, on_order: 0, hot_deal: false, post_fb: false };
    cur.in_stock += toCount(r[iS]);
    cur.on_order += iO === -1 ? 0 : toCount(r[iO]);
    cur.hot_deal = cur.hot_deal || (iD !== -1 && toBool(r[iD]));
    cur.post_fb = cur.post_fb || toBool(r[iP]);
    byKey[key] = cur;
  }

  const models = {};
  for (const m of loadData("js/tym-models.data.js").TYM_MODELS || []) models[`TYM|${m.model}`] = { ...m, brand: "TYM" };
  for (const m of loadData("js/badboy-models.data.js").BADBOY_MODELS || []) models[`Bad Boy|${m.model}`] = { ...m, brand: "Bad Boy" };

  const posts = [];
  const held = [];
  for (const [key, f] of Object.entries(byKey)) {
    if (!f.post_fb) continue;
    const m = models[key];
    if (!m) { held.push({ key, why: "flagged in the sheet but not on the site — never guessed" }); continue; }
    const avail = availability(f.in_stock, f.on_order);
    if (!avail) { held.push({ key, why: "flagged but 0 in stock and 0 on order — not advertising it" }); continue; }
    if (!m.image) { held.push({ key, why: "no product photo on the site — not posting without an image" }); continue; }
    const imageUrl = /^https?:\/\//i.test(m.image) ? m.image : `${SITE_BASE}/${m.image.replace(/^\//, "")}`;
    posts.push({
      key,
      caption: buildCaption({ ...m, hot_deal: f.hot_deal }, avail),
      image_url: imageUrl,
      image_local: /^https?:\/\//i.test(m.image) ? null : m.image,
    });
  }

  // ---- report ---------------------------------------------------------------
  console.log(`Feed: ${feedArg}`);
  console.log(`Site base for images/links: ${SITE_BASE}\n`);
  for (const p of posts) {
    console.log(`── WOULD POST: ${p.key} ${"─".repeat(Math.max(1, 48 - p.key.length))}`);
    console.log(p.caption.split("\n").map((l) => "  │ " + l).join("\n"));
    console.log(`  └ photo: ${p.image_url}\n`);
  }
  if (held.length) {
    console.log(`== HELD, NOT POSTED (${held.length}) ==`);
    held.forEach((h) => console.log(`  ${h.key}: ${h.why}`));
    console.log();
  }
  if (unmatched.length) console.log(`== UNMAPPED SKUS (reported, never guessed) ==\n  ${[...new Set(unmatched)].join(", ")}\n`);

  writePreview(posts, held);
  console.log(`Preview written: fb-post-preview.html (open over http or file://)`);

  if (!LIVE) {
    console.log(`\nDRY RUN — nothing was sent to Facebook. Re-run with --live (+ FB_PAGE_ID, FB_PAGE_TOKEN env) to post.`);
    return;
  }

  // ---- live mode ------------------------------------------------------------
  const PAGE = process.env.FB_PAGE_ID, TOKEN = process.env.FB_PAGE_TOKEN;
  if (!PAGE || !TOKEN) { console.error("--live requires FB_PAGE_ID and FB_PAGE_TOKEN env vars."); process.exit(1); }
  const log = existsSync(LOG_PATH) ? JSON.parse(readFileSync(LOG_PATH, "utf8")) : {};
  for (const p of posts) {
    if (log[p.key] && !FORCE) { console.log(`skip ${p.key} — already posted ${log[p.key].date} (use --force to repost)`); continue; }
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PAGE}/photos`, {
      method: "POST",
      body: new URLSearchParams({ url: p.image_url, caption: p.caption, access_token: TOKEN }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { console.error(`FAILED ${p.key}: ${data.error?.message || res.status}`); continue; }
    log[p.key] = { date: new Date().toISOString(), post_id: data.post_id || data.id };
    console.log(`POSTED ${p.key} → ${log[p.key].post_id}`);
  }
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + "\n");
  console.log(`Posted log updated: csv-inventory/fb-posted-log.json`);
}

// ---- preview page (Facebook-look mockup for Andrew) ------------------------
function writePreview(posts, held) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const card = (p) => `
    <article class="post">
      <header>
        <div class="avatar">JJ</div>
        <div><strong>JJ Riggs Equipment</strong><br><span class="meta">Just now · Colville, WA</span></div>
      </header>
      <pre class="caption">${esc(p.caption)}</pre>
      ${p.image_local ? `<img src="${esc(p.image_local)}" alt="${esc(p.key)}">` : `<img src="${esc(p.image_url)}" alt="${esc(p.key)}">`}
      <footer>photo the API will send: <code>${esc(p.image_url)}</code></footer>
    </article>`;
  const heldRow = (h) => `<li><strong>${esc(h.key)}</strong> — ${esc(h.why)}</li>`;
  writeFileSync(PREVIEW_PATH, `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Facebook post preview — dry run</title>
<style>
  body{margin:0;padding:2rem 1rem;background:#f0f2f5;font:16px/1.45 Helvetica,Arial,sans-serif;color:#050505}
  .banner{max-width:540px;margin:0 auto 1.5rem;background:#fff3cd;border:1px solid #ffe69c;border-radius:8px;padding:.8rem 1rem;font-size:.95rem}
  .post{max-width:540px;margin:0 auto 1.6rem;background:#fff;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.2);overflow:hidden}
  .post header{display:flex;gap:.7rem;align-items:center;padding:.9rem 1rem .4rem}
  .avatar{width:40px;height:40px;border-radius:50%;background:#cf1f2a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
  .meta{color:#65676b;font-size:.85rem}
  .caption{margin:0;padding:.5rem 1rem .9rem;font:inherit;white-space:pre-wrap;word-wrap:break-word}
  .post img{display:block;width:100%;height:auto;background:#e4e6eb}
  .post footer{padding:.6rem 1rem;color:#65676b;font-size:.8rem;border-top:1px solid #e4e6eb}
  .held{max-width:540px;margin:0 auto;background:#fff;border-radius:8px;padding:1rem 1.2rem;box-shadow:0 1px 2px rgba(0,0,0,.2)}
  .held h2{font-size:1rem;margin:0 0 .5rem}
  .held li{margin:.3rem 0;color:#65676b}
</style>
<div class="banner"><strong>Dry run — nothing was posted.</strong> Generated by <code>tools/fb-post-test.mjs</code>. These are exactly the posts the automation would publish to the JJ Riggs Equipment Facebook page.</div>
${posts.map(card).join("\n")}
${held.length ? `<div class="held"><h2>Held — would NOT be posted</h2><ul>${held.map(heldRow).join("")}</ul></div>` : ""}
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
