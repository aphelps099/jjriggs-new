// Shared implement-card logic — the ONE source of truth for how implement
// rows collapse into style cards and which photo a card shows. Used by:
//   - tools/generate-implement-pages.mjs (build-time, static HTML baseline)
//   - tools/validate-implement-pages.mjs (the guard test)
//   - js/implements-cards.js (runtime hydration + admin pencil)
// so the static page, the validator, and the browser can never disagree.
//
// Loads in the browser as window.JJ_IMPL. The node scripts load it with the
// same `new Function("window", src)` trick used for implements-data.js, so a
// single file drives every consumer.
window.JJ_IMPL = (function () {
  const slug = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // size tokens live at the start (4' Box Blade, 60" Rock Bucket), in trailing
  // parens (Large Front Grapple (70")), bare at the end (Hydraulic Snow Plow
  // 72"), or embedded (1025H 60" Mid-Mount Mower Deck) — extract them all so
  // titles stay clean and same-style rows collapse into one card.
  const SIZE_RES = [
    /^\s*(\d+(?:\.\d+)?\s*')\s+/,          // leading feet
    /^\s*(\d+\s*")\s+/,                     // leading inches
    /\s*\((\d+(?:\.\d+)?\s*["'])\)\s*$/,   // trailing parens
    /\s+(\d+(?:\.\d+)?\s*["'])\s*$/,       // trailing bare
    /\s(\d+(?:\.\d+)?\s*")\s/,             // embedded (mower decks)
  ];
  function splitSize(name) {
    for (const re of SIZE_RES) {
      const m = (name || "").match(re);
      if (m) return { style: name.replace(re, " ").replace(/\s{2,}/g, " ").trim(), size: m[1].replace(/\s+/g, "") };
    }
    return { style: name, size: null };
  }

  // feet normalized to inches; unparseable / "One size" rows sort last so
  // tables read 6", 9", 12" not 12", 6", 9"
  const sizeInches = (s) => {
    const m = String(s || "").match(/(\d+(?:\.\d+)?)\s*(["'])/);
    if (!m) return Infinity;
    return m[2] === "'" ? +m[1] * 12 : +m[1];
  };

  const isLocal = (img) => !!img && !/^https?:/.test(img);

  // Deterministic card image: prefer the first row (in size order) that has a
  // LOCAL repo image; fall back to the first row with ANY image (a hotlink the
  // runtime renders, same as the tractor/mower pages). Never leave a card blank
  // when any row in the group has an available photo. Returns the providing row
  // too, so the admin pencil deep-links to the exact item whose photo shows.
  function pickCardImage(rows) {
    const local = rows.find((r) => isLocal(r.img));
    if (local) return { img: local.img, isLocal: true, row: local };
    const any = rows.find((r) => r.img);
    if (any) return { img: any.img, isLocal: false, row: any };
    return { img: null, isLocal: false, row: rows[0] || null };
  }

  // items -> ordered list of style groups (insertion order preserved), each
  // with size-sorted rows carrying a computed `_size`.
  function groupImplements(items) {
    const byCat = new Map();
    for (const it of items || []) {
      const { style, size: parsed } = splitSize(it.name);
      const size = parsed || (it.widthIn != null ? `${it.widthIn}"` : it.width != null ? `${it.width}'` : "One size");
      if (!byCat.has(it.category)) byCat.set(it.category, new Map());
      const styles = byCat.get(it.category);
      if (!styles.has(style)) styles.set(style, []);
      styles.get(style).push({ ...it, _size: size });
    }
    const groups = [];
    for (const [category, styles] of byCat)
      for (const [style, rows] of styles) {
        rows.sort((a, b) => sizeInches(a._size) - sizeInches(b._size));
        groups.push({ category, style, rows });
      }
    return groups;
  }

  return { slug, SIZE_RES, splitSize, sizeInches, isLocal, pickCardImage, groupImplements };
})();
