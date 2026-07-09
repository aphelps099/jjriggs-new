/* JJ Riggs — live stock badges.
   Fetches /api/stock (Andrew's Google Sheet, proxied + cached by
   functions/api/stock.js) and decorates every tractor product link on the
   page with lot-status badges:
     "Hot Deal"      red    — hot_deal flagged in the sheet
     "Only N left"   green  — 1–4 in stock
     "On the Lot"    green  — 5+ in stock
     "On Order"      steel  — 0 in stock, 1+ on order
   Zero badges when a model has no feed row or the feed is unavailable —
   the site never looks broken because of stock data.

   Drop-in: <script src="js/stock-badges.js" defer></script>. No other page
   edits needed; a MutationObserver re-decorates after client-side re-renders
   (brand switch, HP filters, carousel). */
(function () {
  "use strict";

  /* ---- styles ---- */
  var css = ""
    + ".jj-badges{display:flex;gap:.45rem;flex-wrap:wrap;margin:.4rem 0 .1rem;pointer-events:none}"
    + ".jj-badge{display:inline-block;transform:skewX(-13deg);padding:.3em .7em;"
    +   "font-family:'Tactic Sans Bld','Bebas Neue',sans-serif;font-size:.72rem;letter-spacing:.09em;"
    +   "text-transform:uppercase;line-height:1;color:#fbfbf9;white-space:nowrap}"
    + ".jj-badge>span{display:inline-block;transform:skewX(13deg)}"
    + ".jj-badge--stock{background:#1d7a3c}"
    + ".jj-badge--deal{background:#cf1f2a}"
    + ".jj-badge--order{background:#565e66}"
    + ".tile .jj-badges{margin:.35rem 0 0}"
    + ".caption .jj-badges{justify-content:center;margin:.55rem 0 .15rem}"
    + ".jj-badges--h1{margin:.6rem 0 0}"
    + "@media(max-width:680px){.jj-badge{font-size:.68rem}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* ---- data ---- */
  var qs = new URLSearchParams(location.search);
  var SRC = qs.get("stocksrc") || "/api/stock"; // override for local demos
  var STOCK = null;

  function badgesFor(brand, model) {
    if (!STOCK) return [];
    var e = STOCK[brand + "|" + model];
    if (!e) return [];
    var out = [];
    if (e.hot_deal) out.push(["Hot Deal", "deal"]);
    if (e.in_stock >= 5) out.push(["On the Lot", "stock"]);
    else if (e.in_stock === 1) out.push(["Only 1 left", "stock"]);
    else if (e.in_stock > 1) out.push(["Only " + e.in_stock + " left", "stock"]);
    else if (e.on_order > 0) out.push(["On Order", "order"]);
    return out.slice(0, 2); /* never more than two chips */
  }

  function strip(badges, extraClass) {
    var d = document.createElement("div");
    d.className = "jj-badges" + (extraClass ? " " + extraClass : "");
    badges.forEach(function (b) {
      var s = document.createElement("span");
      s.className = "jj-badge jj-badge--" + b[1];
      s.innerHTML = "<span>" + b[0] + "</span>";
      d.appendChild(s);
    });
    return d;
  }

  /* ---- decoration ---- */
  function productParams(href) {
    try {
      var u = new URL(href, location.href);
      if (!/product(-template)?\.html$/.test(u.pathname)) return null;
      var b = u.searchParams.get("b"), m = u.searchParams.get("m");
      if (u.searchParams.get("type") !== "tractor" || !b || !m) return null;
      return { brand: b, model: m };
    } catch (e) { return null; }
  }

  function decorate() {
    if (!STOCK) return;

    /* 1) any card/tile that links to a tractor product page */
    document.querySelectorAll('a[href*="product"]').forEach(function (a) {
      var p = productParams(a.getAttribute("href") || "");
      if (!p) return;
      var badges = badgesFor(p.brand, p.model);
      /* tile grid on tractors.html: put chips inside the text block */
      var target = a.classList.contains("tile") ? a.querySelector(".tb .ts") : null;
      /* carousel caption: chips under the H2, inside the caption block */
      if (!target) {
        var cap = a.closest(".caption");
        if (cap) target = cap.querySelector("h2");
      }
      if (!target) return; /* unknown context — stay out of the way */
      var host = target.parentNode;
      var old = host.querySelector(":scope > .jj-badges");
      if (old) old.remove();
      if (badges.length) target.insertAdjacentElement("afterend", strip(badges));
    });

    /* 2) product detail page: chips under the H1 */
    var pp = productParams(location.href);
    if (pp) {
      var h1 = document.querySelector("#page h1");
      if (h1) {
        var oldH = h1.parentNode.querySelector(":scope > .jj-badges--h1");
        if (oldH) oldH.remove();
        var bb = badgesFor(pp.brand, pp.model);
        if (bb.length) h1.insertAdjacentElement("afterend", strip(bb, "jj-badges--h1"));
      }
    }
  }

  var pending = null;
  function scheduleDecorate() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; decorate(); }, 60);
  }

  fetch(SRC, { credentials: "omit" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data || !data.ok || !data.stock) return; /* silently no badges */
      STOCK = data.stock;
      decorate();
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var t = muts[i].target;
          if (t.closest && t.closest(".jj-badges")) continue; /* our own writes */
          scheduleDecorate();
          return;
        }
      }).observe(document.body, { childList: true, subtree: true });
    })
    .catch(function () { /* feed down + no cache: page simply has no badges */ });
})();
