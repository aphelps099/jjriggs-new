// /api/admin/social — the "Social publishing" card's backend.
//
//   GET                          → { facebook, instagram, pageId, igUserId,
//                                    tokenSet, tokenFromEnv }  (never the token)
//   POST { pageId?, igUserId?, token? }        → save (blank token = keep)
//   POST { action:"test" }                     → live Graph API check:
//                                    { pageName?, igUsername? }
//
// Guards: ADMIN_PASSCODE + session + same-origin — same belt-and-suspenders
// as publish/media. Config lives in R2 (config/social.json, not publicly
// served); META_* env vars override it once the one-time server setup is done.

import { hasValidSession } from "../../_auth.js";
import { getSocialConfig, saveSocialConfig, socialStatus, testConnection } from "../../_social.js";

async function guard(request, env) {
  if (!env.MEDIA) return err("Media storage not configured (add the MEDIA R2 binding)", 501);
  if (!env.ADMIN_PASSCODE) return err("Set ADMIN_PASSCODE before connecting social accounts", 501);
  if (!(await hasValidSession(request, env.ADMIN_PASSCODE))) return err("Signed out — reload the admin page and enter the passcode.", 401);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);
  return null;
}

function publicView(cfg) {
  const s = socialStatus(cfg);
  return {
    facebook: s.facebook,
    instagram: s.instagram,
    pageId: cfg.pageId,
    igUserId: cfg.igUserId,
    tokenSet: !!cfg.token,
    tokenFromEnv: cfg.tokenFromEnv,
  };
}

export async function onRequestGet({ request, env }) {
  const blocked = await guard(request, env);
  if (blocked) return blocked;
  return json(publicView(await getSocialConfig(env)));
}

export async function onRequestPost({ request, env }) {
  const blocked = await guard(request, env);
  if (blocked) return blocked;
  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }

  if (body.action === "test") {
    const cfg = await getSocialConfig(env);
    if (!cfg.token) return err("No access token saved yet — paste one and Save first", 400);
    if (!cfg.pageId && !cfg.igUserId) return err("Add the Facebook Page ID (and optionally the Instagram account ID) first", 400);
    try {
      const out = await testConnection(cfg);
      return json({ ok: true, ...out });
    } catch (e) {
      return err("Meta said: " + e.message, 502);
    }
  }

  // save — IDs are plain digits on Meta's side; token charset is loose but bounded
  const pageId = body.pageId === undefined ? undefined : String(body.pageId).trim();
  const igUserId = body.igUserId === undefined ? undefined : String(body.igUserId).trim();
  const token = body.token === undefined ? undefined : String(body.token).trim();
  if (pageId && !/^\d{5,20}$/.test(pageId)) return err("The Page ID should be all digits (find it on the Page's About → Page transparency)", 400);
  if (igUserId && !/^\d{5,20}$/.test(igUserId)) return err("The Instagram account ID should be all digits", 400);
  if (token && !/^[A-Za-z0-9._-]{20,512}$/.test(token)) return err("That doesn't look like a Meta access token", 400);
  const cfg = await saveSocialConfig(env, { pageId, igUserId, token });
  return json({ ok: true, ...publicView({ ...cfg, tokenFromEnv: !!env.META_PAGE_TOKEN, token: env.META_PAGE_TOKEN || cfg.token }) });
}

const json = (o) => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } });
const err = (m, s) => new Response(JSON.stringify({ error: m }), { status: s, headers: { "Content-Type": "application/json" } });
