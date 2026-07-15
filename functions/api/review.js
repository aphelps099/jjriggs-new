// /api/review — the no-login review API behind /review/{token} pages.
//
//   GET  ?t={token}                     → the review record (+ socialReady)
//   POST { t, action, note?, by? }      → action: "approve" | "changes" | "note"
//   POST { t, action:"publish", platform:"facebook"|"instagram", caption? }
//        → posts the APPROVED video to the connected business account and
//          records the live post under record.social[platform].
//
// The token IS the credential (Google-Docs "anyone with the link" model —
// 120 bits of randomness, unguessable). Approve/notes are deliberately
// low-stakes. Publish is held to more: the record must already be approved,
// the platform must be connected (see /api/admin/social), publishing is
// idempotent per platform, and the only thing it can ever post is this
// record's own video — so the link-holder (the approver) can share what
// they just approved, and nothing else.

import { getSocialConfig, socialStatus, publishToFacebook, publishToInstagram } from "../_social.js";

const MAX_NOTES = 20;
const MAX_NOTE_LEN = 600;
const MAX_CAPTION_LEN = 1000;
const TOKEN_RE = /^[a-f0-9]{24,40}$/;

async function loadRecord(env, t) {
  if (!TOKEN_RE.test(t)) return null;
  const obj = await env.MEDIA.get(`reviews/${t}.json`);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text());
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.MEDIA) return err("Review links aren't set up yet", 501);
  const t = new URL(request.url).searchParams.get("t") || "";
  const record = await loadRecord(env, t);
  if (!record) return err("Review not found — check the link", 404);
  // which share buttons can actually post right now (booleans only — no config details)
  const socialReady = socialStatus(await getSocialConfig(env));
  return json({ ...record, socialReady });
}

export async function onRequestPost({ request, env }) {
  if (!env.MEDIA) return err("Review links aren't set up yet", 501);
  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  const t = String(body.t || "");
  const action = String(body.action || "");
  const note = String(body.note || "").trim().slice(0, MAX_NOTE_LEN);
  const by = String(body.by || "").trim().slice(0, 60);
  if (!["approve", "changes", "note", "publish"].includes(action)) return err("Unknown action", 400);
  if ((action === "changes" || action === "note") && !note) return err("Write a quick note first", 400);

  const record = await loadRecord(env, t);
  if (!record) return err("Review not found — check the link", 404);

  if (action === "publish") return publish({ request, env, t, record, body });
  if (record.notes.length >= MAX_NOTES) return err("This review has enough notes — call instead 🙂", 429);

  const when = new Date().toISOString();
  if (note) record.notes.push({ note, by: by || "Reviewer", when });
  if (action === "approve") {
    record.status = "approved";
    record.decided = when;
  } else if (action === "changes") {
    record.status = "changes-requested";
    record.decided = when;
  }
  await env.MEDIA.put(`reviews/${t}.json`, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json" },
  });

  // Tell the builder — notes land in the inbox, not in some dashboard
  // nobody checks. Silent no-op when Resend isn't configured.
  notify(env, record, action, note, by).catch(() => {});

  return json({ ok: true, status: record.status, notes: record.notes });
}

// Share an APPROVED ad to the connected business Facebook Page / Instagram.
// Never posts anything but this record's own video; once per platform.
async function publish({ request, env, t, record, body }) {
  const platform = String(body.platform || "");
  if (!["facebook", "instagram"].includes(platform)) return err("platform must be facebook or instagram", 400);
  if (record.status !== "approved") return err("Approve the ad first — sharing unlocks after approval", 409);

  record.social = record.social || {};
  const done = record.social[platform];
  if (done && done.id) return json({ ok: true, alreadyPosted: true, social: record.social });

  const cfg = await getSocialConfig(env);
  const ready = socialStatus(cfg);
  if (!ready[platform]) {
    const name = platform === "facebook" ? "Facebook" : "Instagram";
    return err(name + " isn't connected yet — open /admin → Social publishing to set it up (takes a few minutes, needs the Page admin).", 501);
  }

  const caption = String(body.caption || record.name || "").trim().slice(0, MAX_CAPTION_LEN)
    || "New from JJ Riggs Equipment — Colville, WA · 509-738-2985";
  // Meta fetches the video itself, so hand it the public absolute URL
  const videoUrl = new URL(record.mediaUrl, request.url).toString();

  try {
    let result;
    if (platform === "facebook") {
      result = await publishToFacebook(cfg, videoUrl, caption);
    } else {
      const pendingContainer = done && done.containerId;
      result = await publishToInstagram(cfg, videoUrl, caption, pendingContainer);
      if (result.pending) {
        // Meta is still ingesting the video — remember the container so the
        // next tap resumes instead of re-uploading
        record.social.instagram = { containerId: result.containerId, when: new Date().toISOString() };
        await saveRecord(env, t, record);
        return json({ ok: false, processing: true, error: "Instagram is still processing the video — tap the button again in a minute." });
      }
    }
    record.social[platform] = { id: result.id, url: result.url, caption, when: new Date().toISOString() };
    await saveRecord(env, t, record);
    notify(env, record, "publish-" + platform, "", "").catch(() => {});
    return json({ ok: true, social: record.social });
  } catch (e) {
    return err("Meta said: " + e.message, 502);
  }
}

async function saveRecord(env, t, record) {
  await env.MEDIA.put(`reviews/${t}.json`, JSON.stringify(record), {
    httpMetadata: { contentType: "application/json" },
  });
}

async function notify(env, record, action, note, by) {
  if (!env.RESEND_API_KEY) return;
  const to = env.REVIEW_NOTIFY_TO || "aaronphelps.c@gmail.com";
  const from = env.LEAD_FROM || "JJ Riggs Website <onboarding@resend.dev>";
  const verdict = action === "approve" ? "✅ APPROVED"
    : action === "changes" ? "✏️ CHANGES REQUESTED"
    : action === "publish-facebook" ? "📘 POSTED TO FACEBOOK"
    : action === "publish-instagram" ? "📸 POSTED TO INSTAGRAM"
    : "💬 New note";
  const origin = "https://jjriggsequipment.com";
  await fetch(env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject: `Ad review — ${verdict}: ${record.name}`,
      text:
        `${verdict}${by ? ` (from ${by})` : ""}\n\nAd: ${record.name}\n`
        + (note ? `\nNote:\n${note}\n` : "")
        + `\nReview page: ${origin}/review/${record.token}\nVideo: ${origin}${record.mediaUrl}\n`,
    }),
  });
}

const json = (o) => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const err = (m, s) => new Response(JSON.stringify({ error: m }), { status: s, headers: { "Content-Type": "application/json" } });
