// Shared Meta (Facebook Page + Instagram) publishing plumbing.
// Underscore-prefixed: not routed, import-only.
//
// Config resolution (first match wins per field):
//   1. Env vars   — META_PAGE_ID, META_PAGE_TOKEN, META_IG_USER_ID
//   2. R2 object  — config/social.json in the MEDIA bucket, written by the
//                   /admin "Social publishing" card (/api/admin/social).
// The R2 path keeps setup paste-in-easy for non-technical admins; env vars
// remain the belt-and-suspenders override once Aaron does the one-time
// server setup. config/ is NOT publicly served (functions/media/[[path]].js
// allowlists public prefixes) — the token never leaves the server.
//
// Personal profiles can't be posted to by any automation (Meta removed that
// API in 2018) — targets are the business Page and the IG professional
// account linked to it.

const GRAPH = "https://graph.facebook.com/v23.0";
const CONFIG_KEY = "config/social.json";

export async function getSocialConfig(env) {
  let stored = {};
  if (env.MEDIA) {
    try {
      const obj = await env.MEDIA.get(CONFIG_KEY);
      if (obj) stored = JSON.parse(await obj.text()) || {};
    } catch {}
  }
  return {
    pageId: String(env.META_PAGE_ID || stored.pageId || "").trim(),
    igUserId: String(env.META_IG_USER_ID || stored.igUserId || "").trim(),
    token: String(env.META_PAGE_TOKEN || stored.token || "").trim(),
    tokenFromEnv: !!env.META_PAGE_TOKEN,
  };
}

export async function saveSocialConfig(env, patch) {
  const cur = await getSocialConfig(env);
  const next = {
    pageId: patch.pageId !== undefined ? String(patch.pageId).trim() : cur.pageId,
    igUserId: patch.igUserId !== undefined ? String(patch.igUserId).trim() : cur.igUserId,
    // blank token in a save means "keep what's stored" so re-saving IDs
    // never wipes a working connection
    token: patch.token ? String(patch.token).trim() : cur.tokenFromEnv ? "" : cur.token,
    updated: new Date().toISOString(),
  };
  await env.MEDIA.put(CONFIG_KEY, JSON.stringify(next), {
    httpMetadata: { contentType: "application/json" },
  });
  return next;
}

// Which platforms are ready to publish?
export function socialStatus(cfg) {
  return {
    facebook: !!(cfg.pageId && cfg.token),
    instagram: !!(cfg.igUserId && cfg.token),
  };
}

async function graph(path, opts = {}) {
  const r = await fetch(GRAPH + path, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const msg = (j.error && (j.error.error_user_msg || j.error.message)) || "Graph API error " + r.status;
    throw new Error(msg);
  }
  return j;
}

const q = (params) => new URLSearchParams(params).toString();

// Verify the connection: resolve the Page name (and IG username when set).
export async function testConnection(cfg) {
  const out = {};
  if (cfg.pageId && cfg.token) {
    const page = await graph(`/${cfg.pageId}?` + q({ fields: "name", access_token: cfg.token }));
    out.pageName = page.name;
  }
  if (cfg.igUserId && cfg.token) {
    const ig = await graph(`/${cfg.igUserId}?` + q({ fields: "username", access_token: cfg.token }));
    out.igUsername = ig.username;
  }
  return out;
}

// Post a video to the Facebook Page feed. videoUrl must be publicly
// fetchable by Meta's servers (our /media/renders/... URLs are).
export async function publishToFacebook(cfg, videoUrl, caption) {
  const res = await graph(`/${cfg.pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: q({ file_url: videoUrl, description: caption, access_token: cfg.token }),
  });
  return { id: res.id, url: `https://www.facebook.com/${res.id}` };
}

// Instagram is two-step: create a media container, wait for Meta to ingest
// the video, then publish. Ingest can outlast one request — callers pass any
// containerId saved from a previous attempt so a retry resumes instead of
// re-uploading. Returns { pending:true, containerId } when still processing.
export async function publishToInstagram(cfg, videoUrl, caption, containerId) {
  if (!containerId) {
    const c = await graph(`/${cfg.igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: q({ media_type: "REELS", video_url: videoUrl, caption, access_token: cfg.token }),
    });
    containerId = c.id;
  }
  for (let i = 0; i < 8; i++) {
    const st = await graph(`/${containerId}?` + q({ fields: "status_code", access_token: cfg.token }));
    if (st.status_code === "FINISHED") {
      const pub = await graph(`/${cfg.igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: q({ creation_id: containerId, access_token: cfg.token }),
      });
      let url = "https://www.instagram.com/";
      try {
        const perma = await graph(`/${pub.id}?` + q({ fields: "permalink", access_token: cfg.token }));
        if (perma.permalink) url = perma.permalink;
      } catch {}
      return { id: pub.id, url };
    }
    if (st.status_code === "ERROR") throw new Error("Instagram couldn't process this video (check it's an MP4 under Reels limits)");
    await new Promise((r) => setTimeout(r, 4000));
  }
  return { pending: true, containerId };
}
