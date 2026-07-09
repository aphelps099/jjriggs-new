# Live Stock Badges — Google Sheet → Website

July 2026 · Aaron Phelps / Look Serious Creative

Lot-status badges on tractor cards, the carousel, and product pages, fed
live from Andrew's price sheet. Badge rules (in priority order, max two
chips per model):

| Condition | Badge | Color |
|---|---|---|
| `hot_deal = TRUE` | **Hot Deal** | Red `#cf1f2a` |
| 5+ in stock | **On the Lot** | Green `#1d7a3c` |
| 1–4 in stock | **Only N left** | Green |
| 0 in stock, 1+ on order | **On Order** | Steel |
| 0 / 0, or model not in feed | *(no badge)* | — |

The site never looks broken because of stock data: if the sheet is
unreachable, unpublished, or malformed, the API serves the last good copy
(kept 7 days at the edge); if there's no copy at all, pages simply render
without badges. No errors, no spinners.

## Architecture

```
Andrew's Google Sheet ("Website Feed" tab, published to web as CSV)
        │  fetched server-side, 120s edge cache + 7-day last-good fallback
        ▼
functions/api/stock.js  →  GET /api/stock   (only sku/stock/on-order/hot-deal ever leaves)
        ▼
js/stock-badges.js      →  badges on tractors.html, product.html, index.html
        │
functions/_stock-map.js →  dealer SKU → site "Brand|Model" map (shared by all of the above)
```

**Privacy rule:** only the "Website Feed" tab is ever published. Invoice
costs, rebates, margins, serial numbers, and banking details stay in the
other tabs, which are never published and never fetched.

## The "Website Feed" tab

Four columns, one row per dealer SKU (duplicate SKUs are fine — configs
merge, counts sum):

```
sku        | in_stock | on_order | hot_deal
BB1022HIL  | 1        | 0        | FALSE
T474H      | 2        | 0        | TRUE
```

- `in_stock` / `on_order`: numbers ("NO"/blank counts as 0).
- `hot_deal`: TRUE/FALSE checkbox — the only thing Andrew ever toggles by hand.
- `in_stock`/`on_order` should be `=` formulas pointing at the master
  price tab so Andrew keeps editing the sheet he already uses.
- `csv-inventory/website-feed-test.csv` is a working example generated from
  the July 2026 price list by `tools/build-feed-from-price-list.mjs`.

SKUs not in the map (backhoes, loader kits, packages like "T474H TLB-BY75")
are ignored and reported in the API's `unmatched` list — never guessed.
New models need one line added to `functions/_stock-map.js`.

## Setup (one time)

1. In Andrew's sheet, add the **Website Feed** tab (import
   `csv-inventory/website-feed-test.csv`, then convert the two count
   columns to formulas).
2. **File → Share → Publish to web** → select ONLY the Website Feed tab →
   format **CSV** → publish → copy the URL.
3. Cloudflare dashboard → Workers & Pages → jjriggs-new → Settings →
   Environment variables → add `STOCK_FEED_URL` = that URL (Production +
   Preview) → redeploy.

Until `STOCK_FEED_URL` is set, `/api/stock` returns `{ok:false}` and the
site shows no badges — safe to ship dark.

## Testing locally

```
node tools/stock-dev-server.mjs                          # feed = the test CSV
STOCK_FEED_URL=<published-csv-url> node tools/stock-dev-server.mjs   # feed = the real sheet
```

Then open http://localhost:8788/tractors.html — same parsing/mapping code
the Cloudflare function runs.

## Cheat sheet for Andrew (copy into an email / print)

> **Updating what the website shows — 1 minute**
> 1. Open your price sheet like always and change the **In Stock** or
>    **On Order** number for any model.
> 2. Want a red **HOT DEAL** tag on a tractor? Go to the *Website Feed* tab
>    and tick the box in the `hot_deal` column. Untick to remove it.
> 3. That's it. The website picks it up automatically within a few minutes.
>    Nothing to save, publish, or email.
>
> Sold the last one? Set In Stock to 0 — the badge disappears. Set On Order
> to 1 and the site shows "On Order" instead.
