// Runtime layer for the static implement category pages. The pages are
// generated (tools/generate-implement-pages.mjs) so their HTML is a baseline:
// local photos are baked in for SEO / no-JS. This script is the bridge that
// keeps them live — mirroring how tractors.html / mowers.html render straight
// from the data files:
//   1. Photos published through /admin/photos/ land in implements-data.js.
//      The publish endpoint can only touch data files, never these generated
//      pages, so on every load we re-read the data and fill/refresh each
//      card's photo from the current best available image (this also renders
//      hotlinked catalog images the static baseline intentionally leaves out).
//   2. Adds the admin ✎ edit pencil to each card when this browser is an admin
//      (same localStorage convention as product.html), deep-linking the exact
//      product into /admin/photos/.
// Cards are matched to data by the data-cat/data-style attributes the generator
// stamps on each .style-card, using the shared js/implements-lib.js grouping so
// the DOM and the data can never key differently.
(function () {
  "use strict";
  var LIB = window.JJ_IMPL, ITEMS = window.JJ_IMPLEMENTS;
  if (!LIB || !Array.isArray(ITEMS)) return;

  function run() {
    var groups = LIB.groupImplements(ITEMS);
    var byKey = {};
    groups.forEach(function (g) { byKey[g.category + "||" + g.style] = g; });

    var isAdmin = false;
    try { isAdmin = !!(localStorage.getItem("jj_admin") || localStorage.getItem("jj_ghtoken")); } catch (e) {}

    var cards = document.querySelectorAll(".style-card[data-cat][data-style]");
    for (var c = 0; c < cards.length; c++) {
      var card = cards[c];
      var g = byKey[card.getAttribute("data-cat") + "||" + card.getAttribute("data-style")];
      if (!g) continue;
      var media = card.querySelector(".sc-media");
      if (!media) continue;
      var pick = LIB.pickCardImage(g.rows);
      hydrateImage(media, pick, g);
      if (isAdmin) addPencil(media, pick, g);
    }
  }

  // these pages live at /implements/<slug>/, so repo-relative paths need ../../
  // to match the static <img> the generator bakes in (hotlinks/data URLs as-is)
  function toSrc(img) { return /^(https?:|data:|\/)/.test(img) ? img : "../../" + img; }

  function hydrateImage(media, pick, g) {
    if (!pick.img) return; // no photo anywhere — leave the "coming to the lot" placeholder
    var alt = ((pick.row && pick.row.brand ? pick.row.brand + " " : "") + g.style).trim();
    var src = toSrc(pick.img);
    var img = media.querySelector("img");
    if (img) {
      if (img.getAttribute("src") !== src) img.setAttribute("src", src);
      if (!img.getAttribute("alt")) img.setAttribute("alt", alt);
    } else {
      var ph = media.querySelector(".ph");
      if (ph) ph.remove();
      img = document.createElement("img");
      img.src = src;
      img.alt = alt;
      img.loading = "lazy";
      media.insertBefore(img, media.firstChild);
    }
  }

  function addPencil(media, pick, g) {
    if (media.querySelector(".sc-pencil")) return;
    // deep-link the exact item whose photo the card shows, so editing it in
    // /admin/photos/ changes what this card renders (falls back to the lead row)
    var item = (pick.row) || g.rows[0];
    if (!item) return;
    var pen = document.createElement("a");
    pen.className = "sc-pencil";
    pen.href = "/admin/photos/?open=" + encodeURIComponent("implements|" + item.category + "|" + item.name);
    pen.title = "Edit this product's photo (admin)";
    pen.setAttribute("aria-label", "Edit photo for " + g.style + " (admin)");
    pen.textContent = "✎";
    if (getComputedStyle(media).position === "static") media.style.position = "relative";
    media.appendChild(pen);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

// Full-image lightbox. Independent of the data layer above so it wires even if
// the catalog globals are missing. A card's "View full image" button fills the
// shared <dialog> with that card's CURRENT image (post-hydration, so hotlinked
// and admin-published photos zoom too) and opens it. Native <dialog> gives us
// Escape-to-close, focus trapping, and focus-return to the trigger for free.
(function () {
  "use strict";
  var dlg = document.getElementById("imgLightbox");
  if (!dlg) return;
  var supported = typeof dlg.showModal === "function";

  function wire() {
    var zooms = document.querySelectorAll(".sc-zoom");
    if (!supported) {
      // no native dialog: don't offer an action we can't fulfill
      for (var i = 0; i < zooms.length; i++) zooms[i].style.display = "none";
      return;
    }
    var img = dlg.querySelector(".lb-img");
    var cap = dlg.querySelector(".lb-cap");
    var close = dlg.querySelector(".lb-close");

    document.addEventListener("click", function (e) {
      var t = e.target;
      var btn = t.closest ? t.closest(".sc-zoom") : null;
      if (btn) {
        var media = btn.closest(".sc-media");
        var pic = media && media.querySelector("img");
        var src = pic && (pic.currentSrc || pic.src);
        if (!src) return; // still a placeholder — nothing to show
        img.src = src;
        var label = (pic.getAttribute("alt") || "Product image").trim();
        img.alt = label;
        cap.textContent = label;
        dlg.showModal();
        return;
      }
      // click on the backdrop / padding area (not the image, caption, or close)
      if (t === dlg || (t.classList && t.classList.contains("lb-fig"))) dlg.close();
    });

    if (close) close.addEventListener("click", function () { dlg.close(); });
    // drop the src on close so reopening never flashes the previous photo
    dlg.addEventListener("close", function () { img.removeAttribute("src"); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();

// Category navigator popover. The hero renders a compact "Browse categories"
// button plus a floating panel of real, crawlable category anchors (grouped by
// job). This wires the button as a proper disclosure: toggles aria-expanded,
// opens/closes the panel, and closes on Escape (returning focus to the button),
// on outside click, and once a category link is chosen. The anchors live in the
// HTML regardless of JS, so crawlers and no-JS still reach every category.
(function () {
  "use strict";
  var btn = document.getElementById("catNavBtn");
  var panel = document.getElementById("catNavPanel");
  if (!btn || !panel) return;

  function isOpen() { return btn.getAttribute("aria-expanded") === "true"; }
  function setOpen(open) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    panel.hidden = !open;
  }
  function close(returnFocus) {
    if (!isOpen()) return;
    setOpen(false);
    if (returnFocus) btn.focus();
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!isOpen());
  });
  // outside click closes (clicks inside the button/panel are ignored)
  document.addEventListener("click", function (e) {
    if (!isOpen()) return;
    if (btn.contains(e.target) || panel.contains(e.target)) return;
    close(false);
  });
  // Escape closes and returns focus to the trigger
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && isOpen()) close(true);
  });
  // choosing a category navigates away; collapse first so a bfcache restore
  // (Back button) doesn't reopen to a stale panel
  panel.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a")) setOpen(false);
  });
})();
