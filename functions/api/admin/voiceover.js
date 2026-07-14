// /api/admin/voiceover — ElevenLabs narration for the studio.
//
//   GET  → { voices: [{id, name}], default_voice_id }   (account voice list)
//   POST { text, voice_id? } → audio/mpeg bytes          (text-to-speech)
//   POST multipart { audio, voice_id? } → audio/mpeg     (speech-to-speech:
//        re-voice an existing recording — same words and pacing, the
//        target voice applied)
//
// The ElevenLabs key stays server-side (env ELEVENLABS_API_KEY), same as
// the Anthropic key on extract/storyboard. ELEVENLABS_VOICE_ID optionally
// pins the default voice (Andrew's clone) so the client never hardcodes it.
// Guards: ADMIN_PASSCODE + session + same-origin, text length cap.

import { hasValidSession } from "../../_auth.js";

const EL_BASE = "https://api.elevenlabs.io/v1";
const MAX_TEXT = 2500; // ~3.5 minutes of speech — far beyond any ad VO
const MODEL_ID = "eleven_multilingual_v2";

async function guard(request, env) {
  if (!env.ELEVENLABS_API_KEY) return err("Server voice key not configured (set ELEVENLABS_API_KEY)", 501);
  if (!env.ADMIN_PASSCODE) return err("Set ADMIN_PASSCODE before adding server keys", 501);
  if (!(await hasValidSession(request, env.ADMIN_PASSCODE))) return err("Signed out — open /admin, enter the passcode, then try again.", 401);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);
  return null;
}

export async function onRequestGet({ request, env }) {
  const blocked = await guard(request, env);
  if (blocked) return blocked;

  const res = await fetch(`${EL_BASE}/voices`, {
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return err("ElevenLabs: " + (data?.detail?.message || data?.detail || res.status), 502);

  return new Response(
    JSON.stringify({
      voices: (data.voices || []).map((v) => ({ id: v.voice_id, name: v.name })),
      default_voice_id: env.ELEVENLABS_VOICE_ID || null,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

const MAX_STS_BYTES = 25 * 1024 * 1024;
const STS_MODEL_ID = "eleven_multilingual_sts_v2";

export async function onRequestPost({ request, env }) {
  const blocked = await guard(request, env);
  if (blocked) return blocked;

  // Speech-to-speech: multipart audio in, the target voice out
  if ((request.headers.get("content-type") || "").includes("multipart/form-data")) {
    return revoice(request, env);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  const text = String(body.text || "").trim();
  if (!text) return err("text is required", 400);
  if (text.length > MAX_TEXT) return err(`Script too long (${text.length} chars — max ${MAX_TEXT})`, 400);
  const voiceId = String(body.voice_id || env.ELEVENLABS_VOICE_ID || "");
  if (!/^[A-Za-z0-9]{8,40}$/.test(voiceId)) {
    return err("No voice selected and no ELEVENLABS_VOICE_ID default is configured", 400);
  }

  // One retry on transient upstream trouble, same shape as the AI endpoints
  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${EL_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    break;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return err("ElevenLabs: " + (data?.detail?.message || data?.detail || res.status), 502);
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}

async function revoice(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return err("Unreadable form data", 400);
  }
  const audio = form.get("audio");
  if (!audio || typeof audio === "string") return err("audio file is required", 400);
  if (audio.size > MAX_STS_BYTES) return err("Recording too large (max 25MB)", 413);
  const voiceId = String(form.get("voice_id") || env.ELEVENLABS_VOICE_ID || "");
  if (!/^[A-Za-z0-9]{8,40}$/.test(voiceId)) {
    return err("No voice selected and no ELEVENLABS_VOICE_ID default is configured", 400);
  }

  const upstream = new FormData();
  upstream.set("audio", audio, audio.name || "clip.wav");
  upstream.set("model_id", STS_MODEL_ID);

  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${EL_BASE}/speech-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
      body: upstream,
    });
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    break;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return err("ElevenLabs: " + (data?.detail?.message || data?.detail || res.status), 502);
  }
  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}

function err(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
