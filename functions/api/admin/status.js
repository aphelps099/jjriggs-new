// GET /api/admin/status — which server-side admin keys are configured.
// Lets the /admin tools decide between server mode (no keys in the browser)
// and the legacy paste-a-key fallback. Keep this path behind Cloudflare
// Access along with the rest of /api/admin/* — see ADMIN-ACCESS-SETUP.md.

export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      extract: !!env.ANTHROPIC_API_KEY,
      publish: !!env.GH_PUBLISH_TOKEN,
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
