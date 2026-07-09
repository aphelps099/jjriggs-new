#!/usr/bin/env node
// Local test harness for the stock-badge system. Serves the site statically
// and implements GET /api/stock with the SAME parsing/mapping code the
// Cloudflare function uses (functions/_stock-map.js).
//
//   node tools/stock-dev-server.mjs                 -> feed = csv-inventory/website-feed-test.csv
//   STOCK_FEED_URL=<published-sheet-csv-url> \
//   node tools/stock-dev-server.mjs                 -> feed = the real Google Sheet (end-to-end test)
//
// Port: 8788 (or PORT env).

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { buildStockPayload } from "../functions/_stock-map.js";

const ROOT = new URL("..", import.meta.url).pathname;
const PORT = Number(process.env.PORT || 8788);
const FEED_URL = process.env.STOCK_FEED_URL || "";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".woff": "font/woff", ".woff2": "font/woff2", ".csv": "text/csv", ".webp": "image/webp" };

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/stock") {
    try {
      let csv;
      if (FEED_URL) {
        const r = await fetch(FEED_URL, { redirect: "follow" });
        if (!r.ok) throw new Error("feed HTTP " + r.status);
        csv = await r.text();
        if (/^\s*</.test(csv)) throw new Error("feed returned HTML (tab not published?)");
      } else {
        csv = readFileSync(join(ROOT, "csv-inventory/website-feed-test.csv"), "utf8");
      }
      const payload = buildStockPayload(csv);
      payload.source = FEED_URL ? "live-sheet" : "local-test-csv";
      res.writeHead(payload.ok ? 200 : 502, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, reason: String(e.message || e) }));
    }
    return;
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, "");
  if (p === "" || p === "/") p = "index.html";
  const file = join(ROOT, p);
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end("not found: " + p); return;
  }
  res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`stock dev server -> http://localhost:${PORT}  (feed: ${FEED_URL || "local test csv"})`));
