// POST /api/admin/extract — relay a Messages API call to Anthropic using the
// server-held ANTHROPIC_API_KEY, so admin users never paste keys into the
// browser. The prompt is built client-side; this is a thin, capped relay:
//   - model must be on the allowlist
//   - max_tokens capped
//   - same-origin only (belt) + Cloudflare Access on /api/admin/* (suspenders)

import { hasValidSession } from "../../_auth.js";

const MODELS = ["claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-opus-4-8"];
const MAX_TOKENS = 4000;

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return err("Server extract key not configured", 501);
  // the key never runs without the passcode gate: require ADMIN_PASSCODE to be
  // set AND a signed-in session, independent of the middleware (defense in depth)
  if (!env.ADMIN_PASSCODE) return err("Set ADMIN_PASSCODE before adding server keys", 501);
  if (!(await hasValidSession(request, env.ADMIN_PASSCODE))) return err("Signed out — reload the admin page and enter the passcode.", 401);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  if (!MODELS.includes(body.model)) return err(`Model not allowed: ${body.model}`, 400);
  if (!Array.isArray(body.messages) || !body.messages.length) return err("messages required", 400);

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model,
      max_tokens: Math.min(+body.max_tokens || 1600, MAX_TOKENS),
      messages: body.messages,
    }),
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
