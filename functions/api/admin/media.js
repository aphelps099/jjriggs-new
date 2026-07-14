// /api/admin/media — gated writes to the jjriggs-media R2 bucket.
//
//   POST ?kind=renders|vo|music|uploads&name=<filename>   body = raw bytes
//     → { key, url } — url is the public /media/... path.
//     renders/ keys get a timestamp prefix (history preserved);
//     vo/, music/ and uploads/ keep the exact name (re-upload replaces,
//     which is what project relink and the music library want).
//   GET  ?prefix=music/  → { items: [{ key, name, url, size }] }
//
// Guards: ADMIN_PASSCODE + session + same-origin (same as publish/extract).
// Needs the MEDIA R2 binding — see functions/media/[[path]].js.

import { hasValidSession } from "../../_auth.js";

const KINDS = ["renders", "vo", "music", "uploads"];
const MAX_BYTES = 200 * 1024 * 1024; // renders can be big; R2 streams fine

function sanitizeName(raw) {
  const name = String(raw || "").split("/").pop().trim();
  const cleaned = name.replace(/[^a-zA-Z0-9._ -]+/g, "").replace(/\s+/g, "-");
  return /^[a-zA-Z0-9._-]{1,120}$/.test(cleaned) && !cleaned.startsWith(".") ? cleaned : null;
}

async function guard(request, env) {
  if (!env.MEDIA) return err("Media storage not configured (add the MEDIA R2 binding)", 501);
  if (!env.ADMIN_PASSCODE) return err("Set ADMIN_PASSCODE before using media storage", 501);
  if (!(await hasValidSession(request, env.ADMIN_PASSCODE))) return err("Signed out — open /admin, enter the passcode, then try again.", 401);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);
  return null;
}

export async function onRequestPost({ request, env }) {
  const blocked = await guard(request, env);
  if (blocked) return blocked;

  const q = new URL(request.url).searchParams;
  const kind = q.get("kind");
  if (!KINDS.includes(kind)) return err("kind must be one of: " + KINDS.join(", "), 400);
  const name = sanitizeName(q.get("name"));
  if (!name) return err("name missing or has unusable characters", 400);

  const len = parseInt(request.headers.get("content-length") || "0", 10);
  if (len > MAX_BYTES) return err("File too large", 413);

  const key = kind === "renders"
    ? `renders/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}-${name}`
    : `${kind}/${name}`;

  await env.MEDIA.put(key, request.body, {
    httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" },
  });

  return json({ key, url: `/media/${key}` });
}

export async function onRequestGet({ request, env }) {
  const blocked = await guard(request, env);
  if (blocked) return blocked;

  const q = new URL(request.url).searchParams;
  const prefix = String(q.get("prefix") || "");
  if (!KINDS.some((k) => prefix === `${k}/` || prefix === k)) {
    return err("prefix must name a kind (e.g. renders/)", 400);
  }
  const list = await env.MEDIA.list({ prefix: prefix.endsWith("/") ? prefix : `${prefix}/`, limit: 500 });
  return json({
    items: list.objects.map((o) => ({
      key: o.key,
      name: o.key.split("/").pop(),
      url: `/media/${o.key}`,
      size: o.size,
      uploaded: o.uploaded,
    })),
  });
}

const json = (o) => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } });
const err = (m, s) => new Response(JSON.stringify({ error: m }), { status: s, headers: { "Content-Type": "application/json" } });
