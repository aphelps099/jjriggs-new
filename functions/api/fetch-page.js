// Cloudflare Pages Function — GET /api/fetch-page?url=<manufacturer url>
// CORS-side fetch proxy for the /admin tools. STRICTLY allowlisted to the
// manufacturers JJ Riggs actually carries — this is not a general proxy.
// Returns { url, title, text, images[] }. The fetching/reduction logic is
// shared with api/admin/extract.js via ../_lib-page.js.

import { fetchPage } from "../_lib-page.js";

export async function onRequestGet({ request }) {
  const target = new URL(request.url).searchParams.get("url") || "";
  try {
    return json(await fetchPage(target));
  } catch (e) {
    return json({ error: e.message }, e.status || 502);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // same-origin admin page is the only intended consumer; CORS open is
      // harmless here since the function itself enforces the host allowlist.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
