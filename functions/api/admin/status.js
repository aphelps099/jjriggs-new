// GET /api/admin/status — which server-side admin keys are configured.
// Lets the /admin tools decide between server mode (no keys in the browser)
// and the legacy paste-a-key fallback. Keep this path behind Cloudflare
// Access along with the rest of /api/admin/* — see ADMIN-ACCESS-SETUP.md.

import { hasValidSession } from "../../_auth.js";

export async function onRequestGet({ request, env }) {
  const signedIn = await hasValidSession(request, env.ADMIN_PASSCODE);
  return new Response(
    JSON.stringify({
      auth: !!env.ADMIN_PASSCODE,
      signedIn,
      // server keys only count as usable when the passcode gate is in place
      // and the caller is signed in — mirrors the guards on the endpoints
      extract: !!env.ANTHROPIC_API_KEY && !!env.ADMIN_PASSCODE && signedIn,
      publish: !!env.GH_PUBLISH_TOKEN && !!env.ADMIN_PASSCODE && signedIn,
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
