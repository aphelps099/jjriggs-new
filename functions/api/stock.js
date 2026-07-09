// GET /api/stock — live stock feed for the badge system (js/stock-badges.js).
//
// Fetches the published-to-web CSV of the "Website Feed" tab in Andrew's
// Google Sheet (env STOCK_FEED_URL), maps dealer SKUs to site Brand|Model
// keys, and returns JSON. Design rules:
//   - The live site NEVER breaks because of Google: a last-good copy is kept
//     in the edge cache for 7 days and served (source:"stale") on any
//     fetch/parse failure.
//   - Fresh responses are cached 120s so a page-load storm hits Google once.
//   - Only whitelisted fields leave this endpoint (in_stock / on_order /
//     hot_deal). Cost columns live in other tabs that are never published.
//   - No STOCK_FEED_URL configured -> { ok:false } and the client quietly
//     renders no badges. Nothing to see, nothing broken.

import { buildStockPayload } from "../_stock-map.js";

const FRESH_KEY = "https://jj-stock.internal/fresh";
const LASTGOOD_KEY = "https://jj-stock.internal/last-good";
const FRESH_TTL = 120; // seconds
const LASTGOOD_TTL = 7 * 24 * 3600; // seconds
const FETCH_TIMEOUT_MS = 8000;

export async function onRequestGet({ env, waitUntil }) {
  const feedUrl = (env && env.STOCK_FEED_URL) || "";
  if (!feedUrl) return json({ ok: false, reason: "not_configured" }, 200, 300);

  const cache = caches.default;

  // 1) Serve the fresh cache if it hasn't expired.
  const fresh = await cache.match(FRESH_KEY);
  if (fresh) return withSource(fresh, "cache");

  // 2) Fetch the published sheet CSV.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(feedUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "JJRiggs-StockBadges/1.0 (+https://jjriggsequipment.com)" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) throw new Error("feed HTTP " + res.status);
    const csv = await res.text();
    // Published sheets return HTML when the tab isn't actually published —
    // treat that as a failure, not a feed.
    if (/^\s*</.test(csv)) throw new Error("feed returned HTML (tab not published?)");

    const payload = buildStockPayload(csv);
    if (!payload.ok) throw new Error("feed parse: " + payload.reason);
    payload.source = "live";

    const body = JSON.stringify(payload);
    waitUntil(cache.put(FRESH_KEY, cacheable(body, FRESH_TTL)));
    waitUntil(cache.put(LASTGOOD_KEY, cacheable(body, LASTGOOD_TTL)));
    return json(payload, 200, 60);
  } catch (e) {
    // 3) Anything went wrong -> serve the last-good copy if we have one.
    const stale = await cache.match(LASTGOOD_KEY);
    if (stale) return withSource(stale, "stale");
    return json({ ok: false, reason: "feed_unavailable", detail: String(e && e.message || e) }, 502, 0);
  }
}

function cacheable(body, ttl) {
  return new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=" + ttl },
  });
}

async function withSource(res, source) {
  try {
    const data = await res.clone().json();
    data.source = source;
    return json(data, 200, 60);
  } catch {
    return res;
  }
}

function json(obj, status, maxAge) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": maxAge ? "public, max-age=" + maxAge : "no-store",
    },
  });
}
