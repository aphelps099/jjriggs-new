# Facebook Posting from the Inventory Sheet — Test Harness

July 2026 · companion to `STOCK-BADGES.md` (same feed, one extra column) and
`JJRiggs-Sheet-and-Facebook-Proposal.md` (the client-facing scope).

The sheet's "Website Feed" tab gains one column — **`post_fb`** (TRUE/FALSE
checkbox). Tick it on a row and the automation posts that machine's photo +
write-up to the **JJ Riggs Equipment business Page**. Personal profiles can't
be posted to by any automation (Facebook removed that API in 2018) — the Page
post can be shared to a personal feed in one tap instead.

## The test (works today, no Facebook account needed)

```
node tools/fb-post-test.mjs                # dry run against the test CSV
node tools/fb-post-test.mjs <feed.csv>     # or any CSV / published-sheet URL
```

Dry run = default. It prints every post it *would* make and writes
**`fb-post-preview.html`** — a Facebook-look mockup to review with Andrew
(open it over http or file://; regenerated on every run).

What it does, in order:

1. Reads the feed CSV (`sku,in_stock,on_order,hot_deal,post_fb`) —
   `csv-inventory/facebook-feed-test.csv` is the working example. Duplicate
   SKUs merge exactly like the badge API (counts sum, flags OR).
2. Maps SKUs → site models via the same `functions/_stock-map.js` the badges
   use. Unmapped SKUs are reported, never guessed.
3. Builds each caption **only from fields already in the site data files**
   (title, HP, Cab/Open Station, transmission, loader lift, blurb) plus
   availability wording derived from the same count rules as the badges
   ("only 2 left", "On order — call to reserve"). Blank fields are skipped —
   nothing is ever invented. The template lives at the top of
   `tools/fb-post-test.mjs` (`buildCaption`) — agree the voice with Andrew
   there before go-live.
4. **Holds** (refuses to post) anything flagged with 0 in stock and 0 on
   order, anything not on the site, and anything without a real photo.

Image and product links point at `SITE_BASE`
(default `https://jjriggsequipment.com`; override with the env var for a
preview deploy — Facebook must be able to fetch the photo URL publicly).

## Going live (once, ~1 hour, needs the Page admin)

1. Create a Meta developer app (Business type) at developers.facebook.com.
2. With Andrew's Page-admin login, grant the app the Page and generate a
   **long-lived Page access token** (`pages_manage_posts` +
   `pages_read_engagement`).
3. Add the `post_fb` column to the published "Website Feed" tab.
4. Run: `FB_PAGE_ID=… FB_PAGE_TOKEN=… node tools/fb-post-test.mjs --live [feed-url]`

Live mode posts via the Graph API (`/{page-id}/photos`), records every post
in `csv-inventory/fb-posted-log.json`, and **never posts the same model
twice** unless `--force` — so untick/retick in the sheet doesn't spam the
Page. First live run should use a test Page, not the real one.

## Production shape (after the test is approved)

The same logic moves to a scheduled runner — a GitHub Action cron or a
Cloudflare Worker with the posted-log in KV — checking the published feed a
few times a day. Andrew's whole workflow stays: tick the box in the sheet,
the post appears. Everything else (guardrails, caption template, de-dupe)
ships unchanged from this harness.
