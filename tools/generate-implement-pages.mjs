#!/usr/bin/env node
// Generates one static category page per implement category:
//   implements/<slug>/index.html   (e.g. /implements/front-grapples/)
// from implements-data.js — REAL products only. Missing photos render the
// "Photo coming to the lot" placeholder; prices render "Call for price".
// Rows are grouped into styles: a leading size token (4', 60") is stripped
// from the name; rows sharing the remaining style name become one card
// with a sizes table. Rerun after any implements data change:
//   node tools/generate-implement-pages.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const w = {};
new Function("window", readFileSync(join(root, "implements-data.js"), "utf8"))(w);
// grouping / size-splitting / image-picking come from the shared browser lib so
// the static page, the validator, and the runtime hydrator can never disagree
new Function("window", readFileSync(join(root, "js/implements-lib.js"), "utf8"))(w);
const ITEMS = w.JJ_IMPLEMENTS || [];
const CATS = w.JJ_CATEGORIES || [];
const LIB = w.JJ_IMPL;

const slug = LIB.slug;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Build a product-specific quote link. The clicked context rides along as
// sanitized query params so contact.html can preselect Implements and draft the
// first sentence. Grouped cards (>1 size) pass only the style name — never a
// specific size — so we don't imply an exact fit the customer didn't pick; a
// single-size card can safely pass its exact name + sku. Params are omitted when
// empty so malformed/blank values never reach the quote page.
const quoteHref = ({ category, item, brand, sku }) => {
  const q = new URLSearchParams();
  q.set("type", "implements");
  if (category) q.set("category", category);
  if (item) q.set("item", item);
  if (brand) q.set("brand", brand);
  if (sku) q.set("sku", sku);
  return `../../contact.html?${q.toString()}`;
};

// group items: category -> ordered style groups with size-sorted rows
const groups = LIB.groupImplements(ITEMS);
const byCat = new Map();
for (const g of groups) {
  if (!byCat.has(g.category)) byCat.set(g.category, new Map());
  byCat.get(g.category).set(g.style, g.rows);
}

const catMeta = Object.fromEntries(CATS.map((c) => [c.category, c]));
const allCats = [...byCat.keys()];
const GROUP_ORDER = w.JJ_GROUP_ORDER || [];

// Category navigator body: every category as a real crawlable anchor, grouped by
// job (Cutting & mowing, Dirt work…). The current category renders as a marked,
// non-clickable span so it's clearly "you're here" and keyboard focus skips it.
const navGroups = (current) => {
  const byGroup = new Map();
  for (const c of allCats) {
    const g = (catMeta[c] && catMeta[c].group) || "Other";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(c);
  }
  const order = [
    ...GROUP_ORDER.filter((g) => byGroup.has(g)),
    ...[...byGroup.keys()].filter((g) => !GROUP_ORDER.includes(g)),
  ];
  return order.map((g) => {
    const items = byGroup.get(g).map((c) => c === current
      ? `              <li><span class="cur" aria-current="page">${esc(c)}</span></li>`
      : `              <li><a href="../${slug(c)}/">${esc(c)}</a></li>`).join("\n");
    return `          <div class="cat-grp">
            <div class="gh">${esc(g)}</div>
            <ul>
${items}
            </ul>
          </div>`;
  }).join("\n");
};

const fmtW = (it) => (it.widthIn != null ? `${it.widthIn}"` : it.width != null ? `${it.width}'` : /["']$/.test(it._size || "") ? it._size : "—");
const fmtHp = (it) => (it.hpMin || it.hpMax ? `${it.hpMin || "?"}–${it.hpMax || "?"} HP` : "—");

const styleCard = (cat, style, rows) => {
  const f = rows[0];
  // deterministic group image (shared with the runtime + validator): local
  // photo wins; a hotlink-only group carries data-img so js/implements-cards.js
  // renders it at runtime (same as the tractor/mower pages), while the static
  // HTML keeps repo-local images only for the SEO / no-JS baseline.
  const pick = LIB.pickCardImage(rows);
  const img = pick.isLocal ? pick.img : null;
  const badges = [f.brand, f.duty, f.attach, f.hitch].filter(Boolean).map((b) => `<span class="badge">${esc(b)}</span>`).join("");
  // fitNotes are customer-facing; drop internal cruft like "Same page as ERG60"
  const notes = [...new Set(rows.map((r) => r.fitNote).filter(Boolean))]
    .filter((t) => !/same page as|verify/i.test(t));
  const dataImg = pick.img ? ` data-img="${esc(pick.img)}"` : "";
  // one-size cards carry the exact product (name + sku); multi-size cards carry
  // only the style so the quote never implies a size the customer didn't choose
  const single = rows.length === 1;
  const href = quoteHref({
    category: cat,
    item: single ? f.name : style,
    brand: f.brand,
    sku: single ? f.sku : "",
  });
  // "View full image" opens the shared lightbox; only offered when a photo
  // exists (local or a hotlink the runtime hydrates). Sits bottom-left so it
  // never overlaps the admin pencil (top-right) or the Get a Quote button.
  const zoomLabel = `${f.brand ? f.brand + " " : ""}${style}`.trim();
  const zoom = pick.img
    ? `<button type="button" class="sc-zoom" aria-label="View full image of ${esc(zoomLabel)}"><span class="szi" aria-hidden="true">⤢</span> Full image</button>`
    : "";
  return `      <article class="style-card" data-cat="${esc(cat)}" data-style="${esc(style)}">
        <div class="sc-media"${dataImg}>${img ? `<img src="../../${esc(img)}" alt="${esc(zoomLabel)}" loading="lazy" />` : `<div class="ph"><span>Photo coming<br>to the lot</span></div>`}${zoom}</div>
        <div class="sc-body">
          <h2>${esc(style)}</h2>
          <div class="badges">${badges}</div>
          <table class="sizes">
            <thead><tr><th>Size</th><th>Width</th><th>Weight</th><th>Fits</th><th>Price</th></tr></thead>
            <tbody>
${rows.map((r) => `              <tr><td>${esc(r._size)}</td><td>${esc(fmtW(r))}</td><td>${r.weight ? esc(r.weight) + " lbs" : "—"}</td><td>${esc(fmtHp(r))}</td><td><a href="tel:+15097382985" class="callprice">Call for price</a></td></tr>`).join("\n")}
            </tbody>
          </table>
          ${notes.length ? `<p class="fitnote">${esc(notes.join(" "))}</p>` : ""}
          <a class="btn btn-quote" href="${esc(href)}">Get a Quote</a>
        </div>
      </article>`;
};

const page = (cat, styles) => {
  const meta = catMeta[cat] || {};
  const s = slug(cat);
  const count = [...styles.values()].reduce((n, r) => n + r.length, 0);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(cat)} — Tractor Implements | JJ Riggs Equipment, Colville WA</title>
<meta name="description" content="${esc(meta.blurb || `${cat} for compact and utility tractors, sold and serviced at JJ Riggs Equipment in Colville, WA.`)}" />
<link rel="canonical" href="https://jjriggsequipment.com/implements/${s}/" />
<link rel="icon" href="https://jjriggsequipment.com/wp-content/uploads/2024/09/cropped-favicon2-270x270.png" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Questrial&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Michroma&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="../../header.css" />

<style>
@font-face{font-family:"Tactic Sans Bld";src:url("../../fonts/tactic-sans-bld.woff2") format("woff2"),url("../../fonts/tactic-sans-bld.woff") format("woff");font-weight:400 800;font-style:normal;font-display:swap}
:root{--ink:#14171a;--ink-2:#1b2025;--ink-3:#0f1215;--bone:#f3f1ea;--white:#fbfbf9;--steel:#8b939c;--steel-2:#c3c8ce;--red:#cf1f2a;--red-deep:#a5151f;--line:rgba(255,255,255,.12);--line-2:rgba(255,255,255,.06);--lined:rgba(20,23,26,.32);--maxw:1280px;--gut:clamp(1.4rem,5vw,4rem)}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:84px}
body{font-family:"Questrial","Helvetica Neue",Helvetica,Arial,system-ui,-apple-system,sans-serif;background:var(--ink);color:var(--white);line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}img{display:block;max-width:100%;height:auto}
:focus-visible{outline:2px solid var(--red);outline-offset:3px}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 var(--gut)}
h1,h2,h3{font-family:"Tactic Sans Bld","Bebas Neue","Questrial","Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:.012em;line-height:.92}
.lead{color:var(--steel-2);font-weight:400;font-size:clamp(1rem,1.5vw,1.14rem);line-height:1.55}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.6rem;font-weight:600;font-size:.82rem;letter-spacing:.04em;padding:.85rem 1.5rem;border:1.5px solid transparent;cursor:pointer;transition:background .18s,border-color .18s,color .18s}
.btn-red{background:var(--red);color:#fff}.btn-red:hover{background:var(--red-deep)}
.btn-ghost{border-color:rgba(255,255,255,.7);color:#fff;text-transform:uppercase;letter-spacing:.07em}.btn-ghost:hover{background:#fff;color:var(--red);border-color:#fff}
/* quieter per-card action: dark-neutral, not a wall of red. Red stays a hover
   accent so hierarchy is clear without shouting. */
.btn-quote{background:var(--ink);color:#fff;border-color:var(--ink)}
.btn-quote:hover,.btn-quote:focus-visible{background:var(--red);border-color:var(--red)}
.cut-tab{display:inline-block;background:var(--red);color:#fff;font-family:"Tactic Sans Bld","Bebas Neue",sans-serif;font-size:clamp(.78rem,1vw,.9rem);letter-spacing:.08em;text-transform:uppercase;line-height:1;padding:.46rem 1.3rem .46rem .95rem;clip-path:polygon(0 0,100% 0,calc(100% - 13px) 100%,0 100%)}

.cat-head{background:var(--ink);color:#fff;padding:clamp(1.8rem,3.4vw,2.6rem) 0 clamp(1.5rem,2.8vw,2.1rem)}
/* two-column hero: title/description/count on the left, the compact category
   navigator trigger pinned upper-right. Wraps to a stacked layout on narrow
   screens where the trigger drops to full width beneath the copy. */
.cat-head .wrap{display:flex;align-items:flex-start;justify-content:space-between;gap:clamp(1rem,3vw,2.4rem);flex-wrap:wrap}
.ch-main{flex:1 1 460px;min-width:0}
.cat-head h1{font-family:"Michroma","Tactic Sans Bld",sans-serif;text-transform:none;font-size:clamp(1.7rem,3.6vw,2.8rem);line-height:1.08;letter-spacing:-.01em;margin:.5rem 0 .55rem}
.cat-head .lead{max-width:62ch;margin:0 0 1rem}
.crumb{font-size:.85rem;color:var(--steel)}.crumb a{color:var(--steel-2)}.crumb a:hover{color:#fff}

/* category navigator: a compact trigger in the hero opens a floating panel
   anchored beneath it. The panel overlays the page (never grows the hero or
   pushes cards down) and its z-index sits below the sticky site header (80) so
   it tucks under the header when the page scrolls. Real crawlable anchors live
   inside the panel regardless of open state, grouped by job. */
.ch-nav{position:relative;flex:0 0 auto;align-self:flex-start;margin-top:.2rem}
.catnav-trigger{display:inline-flex;align-items:center;justify-content:space-between;gap:.7rem;width:clamp(220px,24vw,280px);min-height:44px;padding:.5rem .95rem;background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:6px;font-family:inherit;font-size:.95rem;font-weight:600;letter-spacing:.005em;cursor:pointer;transition:background .18s,border-color .18s}
.catnav-trigger:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.55)}
.catnav-trigger:focus-visible{outline:2px solid var(--red);outline-offset:2px}
.catnav-trigger .cn-chev{flex:none;width:.5rem;height:.5rem;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .2s;margin-top:-.18rem}
.catnav-trigger[aria-expanded="true"] .cn-chev{transform:rotate(-135deg);margin-top:.1rem}
.catnav-panel{position:absolute;top:calc(100% + .55rem);right:0;z-index:70;width:min(600px,calc(100vw - 2*var(--gut)));max-height:min(70vh,600px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#fbfaf6;color:var(--ink);border:1px solid #ddd8cb;border-radius:8px;box-shadow:0 24px 64px -22px rgba(0,0,0,.55)}
.catnav-panel[hidden]{display:none}
.catnav-panel-inner{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:0 1.7rem;padding:.4rem 1.1rem 1rem}
.cat-grp{margin:0;padding-top:.75rem;break-inside:avoid}
.cat-grp .gh{font-size:.72rem;letter-spacing:.11em;text-transform:uppercase;color:#9a948a;margin-bottom:.05rem}
.cat-grp ul{list-style:none}
.cat-grp li{margin:0;border-bottom:1px solid #efece3}
.cat-grp li:last-child{border-bottom:0}
.cat-grp a,.cat-grp .cur{display:flex;align-items:center;min-height:44px;padding:.35rem .1rem;font-size:.95rem;line-height:1.3;color:var(--ink)}
.cat-grp a:hover,.cat-grp a:focus-visible{color:var(--red);text-decoration:underline;text-underline-offset:3px}
.cat-grp .cur{color:#a29c8f;cursor:default;font-weight:600}
.cat-grp .cur::after{content:"· you're here";font-size:.76rem;font-weight:400;letter-spacing:.01em;margin-left:.4rem;color:#b3ad9f}
/* tablet + mobile: the hero stacks, so the trigger drops full-width beneath the
   copy and the panel spans the full available width in a single column. Breakpoint
   sits above 768px so tablets never get the desktop right-anchored panel (which
   would overflow off-screen once the hero has wrapped). */
@media(max-width:860px){
  .ch-nav{flex:1 1 100%;width:100%;margin-top:.9rem}
  .catnav-trigger{width:100%}
  .catnav-panel{width:100%;left:0;right:auto;max-height:70vh}
  .catnav-panel-inner{grid-template-columns:1fr}
}

.cat-list{background:var(--bone);color:var(--ink);padding:clamp(2rem,4.4vw,3.2rem) 0}
.style-card{display:grid;grid-template-columns:280px 1fr;gap:clamp(1.2rem,2.6vw,2rem);align-items:start;background:#fff;border:1px solid #d9d5c8;border-left:3px solid var(--red);padding:clamp(1.2rem,2.6vw,1.8rem);margin-bottom:1.2rem}
/* stable responsive image stage: a fixed 4/3 frame with object-fit:contain so a
   tall auger, a wide blade, or a compact fork all show whole — never cropped or
   oversized. Card heights stay consistent because the stage size is fixed. */
.sc-media{position:relative;aspect-ratio:4/3;background:#f6f4ee;border:1px solid #e6e2d6;border-radius:2px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.sc-media img{width:100%;height:100%;object-fit:contain;padding:.5rem;border:0}
.ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bone);text-align:center;color:#9a948a;font-family:"Tactic Sans Bld","Bebas Neue",sans-serif;letter-spacing:.06em;text-transform:uppercase;font-size:.95rem;line-height:1.4}
.sc-pencil{position:absolute;top:.5rem;right:.5rem;z-index:5;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#14171a;color:#fff;border-radius:50%;font-size:1.05rem;line-height:1;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.35);opacity:.9}
.sc-pencil:hover,.sc-pencil:focus-visible{background:var(--red);opacity:1}
/* "View full image" trigger — bottom-left, clear of the top-right pencil */
.sc-zoom{position:absolute;bottom:.5rem;left:.5rem;z-index:4;display:inline-flex;align-items:center;gap:.35rem;min-height:44px;padding:.4rem .8rem;background:rgba(20,23,26,.82);color:#fff;border:0;border-radius:3px;font-family:inherit;font-size:.82rem;letter-spacing:.02em;cursor:pointer}
.sc-zoom .szi{font-size:1.05rem;line-height:1}
.sc-zoom:hover,.sc-zoom:focus-visible{background:var(--red)}
.sc-body h2{font-family:"Michroma","Tactic Sans Bld",sans-serif;text-transform:none;letter-spacing:0;font-size:clamp(1.15rem,2vw,1.5rem);color:var(--ink);margin-bottom:.55rem}
.badges{display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:.9rem}
.badge{border:1px solid rgba(20,23,26,.25);color:#4a5057;font-size:.78rem;letter-spacing:.05em;text-transform:uppercase;padding:.3rem .6rem}
table.sizes{width:100%;border-collapse:collapse;font-size:1rem;margin-bottom:.9rem}
.sizes th{font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;color:#6a7077;text-align:left;padding:.45rem .6rem;border-bottom:2px solid var(--ink)}
.sizes td{padding:.55rem .6rem;border-bottom:1px solid #e4e0d4;color:#2c3237}
.sizes tr:last-child td{border-bottom:0}
.callprice{color:var(--red);font-weight:600}.callprice:hover{color:var(--red-deep)}
.fitnote{color:#5a6066;font-size:.92rem;line-height:1.55;margin-bottom:1rem}
@media(max-width:760px){.style-card{grid-template-columns:1fr}.sc-media{max-width:340px;margin-inline:auto}.sizes{font-size:.92rem}.sizes th,.sizes td{padding:.4rem .35rem}}

/* quieter closing CTA: a dark-neutral band, not a bright-red wall. Red returns
   only as the single primary action, so it reads calm and practical. */
.ctaband{background:var(--ink-2);color:#fff;border-top:1px solid var(--line);text-align:center}
.ctaband .wrap{padding:clamp(1.8rem,3.4vw,2.6rem) 0}
.ctaband h2{font-size:clamp(1.4rem,2.6vw,2rem);color:#fff;line-height:1;letter-spacing:-.01em}
.ctaband .cs-sub{color:var(--steel-2);font-size:clamp(.98rem,1.5vw,1.08rem);max-width:52ch;margin:.7rem auto 0}
.ctaband .cs-actions{display:flex;gap:.9rem;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:1.2rem}
.ctaband .cs-or{color:var(--steel-2);font-size:.98rem}
.ctaband .cs-call{color:#fff;font-weight:600;letter-spacing:.02em}.ctaband .cs-call:hover{color:var(--red)}
/* on the dark band a dark-fill button vanishes; give it a clear light border in
   rest state, then shift to a restrained red (border + fill) on hover/focus.
   Scoped to .ctaband so the on-white card button keeps its dark-neutral look. */
.ctaband .btn-quote{min-height:44px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.9)}
.ctaband .btn-quote:hover,.ctaband .btn-quote:focus-visible{background:var(--red);border-color:var(--red);color:#fff}
.ctaband .btn-quote:focus-visible{outline:2px solid #fff;outline-offset:2px}

/* full-image lightbox (native <dialog>): image is contained within the viewport,
   never cropped; caption names the product; close button + backdrop + Escape. */
.lightbox{position:fixed;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;margin:0;padding:0;border:0;background:transparent}
.lightbox::backdrop{background:rgba(10,12,14,.9)}
.lightbox .lb-fig{margin:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.9rem;padding:clamp(1rem,4vw,3rem)}
.lightbox .lb-img{max-width:100%;max-height:80vh;width:auto;height:auto;object-fit:contain;background:#fff;border-radius:2px}
.lightbox .lb-cap{color:var(--bone);font-size:1rem;text-align:center;max-width:60ch;line-height:1.5}
.lightbox .lb-close{position:fixed;top:.8rem;right:.8rem;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(20,23,26,.72);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:50%;font-size:1.7rem;line-height:1;cursor:pointer}
.lightbox .lb-close:hover,.lightbox .lb-close:focus-visible{background:var(--red);border-color:var(--red)}
.site-foot{background:var(--ink-3);color:#aeb3ba;padding:48px 0 30px;font-size:14px;border-top:1px solid var(--line)}
.foot-min{display:flex;justify-content:space-between;gap:2.5rem;flex-wrap:wrap}
.fm-brand .nm{font-family:"Michroma","Tactic Sans Bld",sans-serif;font-size:18px;color:#fff;margin-bottom:14px}
.fm-brand p{color:#aeb3ba;line-height:1.7}.fm-brand a:hover{color:#fff}
.fm-shop .t{font-family:"Michroma","Tactic Sans Bld",sans-serif;font-size:14px;color:#fff;margin-bottom:14px}
.fm-shop ul{list-style:none}.fm-shop li{margin-bottom:.6rem}
.fm-shop a{color:#aeb3ba}.fm-shop a:hover{color:#fff}
.foot-cr{margin-top:34px;padding-top:18px;border-top:1px solid #2a2f36;font-size:12.5px;color:#777c83}
@media(max-width:560px){.foot-min{flex-direction:column;gap:1.8rem}}
</style>
</head>

<body>
<div id="jjHeader" data-variant="solid" data-active="equipment"></div>

<main id="main">

  <section class="cat-head">
    <div class="wrap">
      <div class="ch-main">
        <span class="cut-tab">Implements · ${esc(meta.group || "Attachments")}</span>
        <h1>${esc(cat)}</h1>
        <p class="lead">${esc(meta.blurb || "")}</p>
        <p class="crumb"><a href="../../implements.html">← All implements</a> &nbsp;·&nbsp; ${count} size${count === 1 ? "" : "s"} across ${styles.size} style${styles.size === 1 ? "" : "s"}</p>
      </div>
      <div class="ch-nav">
        <button type="button" class="catnav-trigger" id="catNavBtn" aria-expanded="false" aria-controls="catNavPanel" aria-haspopup="true">
          <span>Browse categories</span>
          <span class="cn-chev" aria-hidden="true"></span>
        </button>
        <div class="catnav-panel" id="catNavPanel" role="group" aria-label="Browse implement categories" hidden>
          <div class="catnav-panel-inner">
${navGroups(cat)}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="cat-list">
    <div class="wrap">
${[...styles.entries()].map(([st, rows]) => styleCard(cat, st, rows)).join("\n")}
    </div>
  </section>

  <section class="ctaband">
    <div class="wrap">
      <h2>Not sure what fits your tractor?</h2>
      <p class="cs-sub">Tell us your model and the job — we'll match the implement, the size, and the hitch.</p>
      <div class="cs-actions">
        <a class="btn btn-quote" href="../../contact.html?type=implements&amp;category=${encodeURIComponent(cat)}">Get a Quote</a>
        <span class="cs-or">or call <a class="cs-call" href="tel:+15097382985">509-738-2985</a></span>
      </div>
    </div>
  </section>

</main>

<!-- Shared image lightbox. Wired by js/implements-cards.js: a card's "View full
     image" button fills and opens this native <dialog>, which gives us Escape,
     focus trap, and focus-return for free. -->
<dialog id="imgLightbox" class="lightbox" aria-label="Product image">
  <figure class="lb-fig">
    <button type="button" class="lb-close" aria-label="Close image">&times;</button>
    <img class="lb-img" alt="" />
    <figcaption class="lb-cap"></figcaption>
  </figure>
</dialog>

<footer class="site-foot">
  <div class="wrap">
    <div class="foot-min">
      <div class="fm-brand">
        <div class="nm">JJ Riggs Equipment</div>
        <p>685 Elm Tree Dr.<br>Colville, WA 99114<br>
        <a href="mailto:sales@jjriggsequipment.com">sales@jjriggsequipment.com</a><br>
        <a href="tel:+15097382985">509-738-2985</a><br>
        Hours: Mon–Fri, 8 AM – 5 PM</p>
      </div>
      <nav class="fm-shop" aria-label="Shop">
        <div class="t">Shop</div>
        <ul>
          <li><a href="../../tractors.html">Tractors</a></li>
          <li><a href="../../implements.html">Implements</a></li>
          <li><a href="../../mowers.html">Mowers</a></li>
          <li><a href="../../services.html">Services</a></li>
        </ul>
      </nav>
    </div>
    <div class="foot-cr">© 2026 JJ Riggs Equipment</div>
  </div>
</footer>

<script src="../../header.js"></script>
<script src="../../js/analytics.js"></script>
<script src="../../implements-data.js"></script>
<script src="../../js/implements-lib.js"></script>
<script src="../../js/implements-cards.js"></script>
</body>
</html>
`;
};

let n = 0;
for (const [cat, styles] of byCat) {
  const dir = join(root, "implements", slug(cat));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(cat, styles));
  n++;
}
console.log(`${n} category pages written under implements/`);
