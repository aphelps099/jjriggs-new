#!/usr/bin/env node
// Empties the photo trash: deletes img/uploads/trash/ files whose
// js/photo-trash.data.js entry is older than TRASH_DAYS, and rewrites the
// data file without them. Run by .github/workflows/trash-purge.yml daily;
// safe to run by hand:  node tools/purge-photo-trash.mjs
// The serialized format must stay byte-identical to serializeTrash() in
// admin/photos/index.html so admin publishes and purges never fight.

import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TRASH_DAYS = 30;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "js/photo-trash.data.js");

const w = {};
new Function("window", readFileSync(dataPath, "utf8"))(w);
const list = Array.isArray(w.JJ_PHOTO_TRASH) ? w.JJ_PHOTO_TRASH : [];

const cutoff = new Date(Date.now() - TRASH_DAYS * 24 * 3600 * 1000).toISOString().slice(0, 10);
const keep = [];
const purge = [];
for (const t of list) {
  // entries with no/garbled date are treated as expired rather than kept forever
  if (t && typeof t.deletedAt === "string" && t.deletedAt > cutoff) keep.push(t);
  else purge.push(t);
}

if (!purge.length) {
  console.log("photo trash: nothing older than " + TRASH_DAYS + " days (" + list.length + " entries kept)");
  process.exit(0);
}

for (const t of purge) {
  // only ever delete inside the trash folder, whatever the data says
  if (t && typeof t.trash === "string" && /^img\/uploads\/trash\/[a-zA-Z0-9._-]+\.(jpe?g|png)$/i.test(t.trash)) {
    const p = join(root, t.trash);
    if (existsSync(p)) {
      rmSync(p);
      console.log("deleted " + t.trash + " (trashed " + t.deletedAt + ")");
    } else {
      console.log("already gone: " + t.trash);
    }
  } else {
    console.log("skipping entry with unusable path:", JSON.stringify(t));
  }
}

writeFileSync(
  dataPath,
  "// Photo trash — uploads that came off every page via /admin/photos/.\n"
    + "// Instead of hard-deleting, the editor moves the file to img/uploads/trash/\n"
    + "// and records it here so it can be restored with one click. A scheduled\n"
    + "// GitHub Action (trash-purge.yml) empties entries older than 30 days.\n"
    + "// Entry shape: {trash, orig, kind, name, deletedAt}\n"
    + "window.JJ_PHOTO_TRASH=" + JSON.stringify(keep) + ";\n",
);
console.log("purged " + purge.length + ", kept " + keep.length);
