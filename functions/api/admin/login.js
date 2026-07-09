// POST /api/admin/login {passcode} — checks against the ADMIN_PASSCODE env
// var and sets the 30-day signed session cookie. A small delay on failure
// blunts guessing; the passcode should still be a real passphrase.

import { checkPasscode, makeSessionCookie } from "../../_auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSCODE) return json({ error: "ADMIN_PASSCODE not configured" }, 501);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!(await checkPasscode(body.passcode, env.ADMIN_PASSCODE))) {
    await new Promise((r) => setTimeout(r, 1200));
    return json({ error: "Wrong passcode" }, 401);
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": await makeSessionCookie(env.ADMIN_PASSCODE),
      "Cache-Control": "no-store",
    },
  });
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
