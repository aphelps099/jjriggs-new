// POST /api/admin/review — create a review link for a cloud render.
//
// Body: { name, mediaKey } (mediaKey = an object key in the media bucket,
// e.g. "renders/2026-07-14-flash-ad.mp4"). Creates reviews/{token}.json
// and returns { url: "/review/{token}" } — a no-login page where Andrew
// watches the ad and taps Approve or Request changes.
//
// Review records are the embryonic Ad Queue: one record per rendered
// version, immutable media, status + a short list of notes. When the
// KV-backed queue (plan Phase C) lands, these records migrate into it.

import { hasValidSession } from "../../_auth.js";

function token() {
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  if (!env.MEDIA) return err("Media storage not configured (add the MEDIA R2 binding)", 501);
  if (!env.ADMIN_PASSCODE) return err("Set ADMIN_PASSCODE before using review links", 501);
  if (!(await hasValidSession(request, env.ADMIN_PASSCODE))) return err("Signed out — open /admin, enter the passcode, then try again.", 401);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  const name = String(body.name || "").slice(0, 120).trim();
  const mediaKey = String(body.mediaKey || "");
  if (!name) return err("name is required", 400);
  if (!/^(renders|uploads)\/[a-zA-Z0-9._/-]{1,200}$/.test(mediaKey)) return err("mediaKey must point into renders/ or uploads/", 400);
  if (!(await env.MEDIA.head(mediaKey))) return err("That media key doesn't exist yet — upload first", 404);

  const t = token();
  const record = {
    v: 1,
    token: t,
    name,
    mediaKey,
    mediaUrl: `/media/${mediaKey}`,
    status: "pending", // pending | approved | changes-requested
    notes: [],
    created: new Date().toISOString(),
    decided: null,
  };
  await env.MEDIA.put(`reviews/${t}.json`, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json" },
  });
  return new Response(JSON.stringify({ token: t, url: `/review/${t}` }), {
    headers: { "Content-Type": "application/json" },
  });
}

function err(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
