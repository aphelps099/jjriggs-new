// Cloudflare Pages Function — GET /api/fetch-page?url=<manufacturer url>
// CORS-side fetch proxy for the /admin/ inventory builder's "download
// missing info" step. STRICTLY allowlisted to the manufacturers JJ Riggs
// actually carries — this is not a general proxy.
// Returns { url, title, text, images[] } with scripts/styles stripped so
// the client can hand clean page text to the extraction model.

const ALLOWED_HOSTS = [
  "tym.world",
  "badboymowers.com",
  "badboycountry.com",
  "cidattachments.com",
  "ironcraftusa.com",
  "brabereq.com",
  "jjriggsequipment.com", // the old site — legacy product pages
];

function hostAllowed(h) {
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith("." + a));
}

export async function onRequestGet({ request }) {
  const target = new URL(request.url).searchParams.get("url") || "";
  let u;
  try {
    u = new URL(target);
  } catch {
    return json({ error: "Invalid url" }, 400);
  }
  if (u.protocol !== "https:" || !hostAllowed(u.hostname)) {
    return json({ error: `Host not allowed: ${u.hostname}` }, 403);
  }

  let res;
  try {
    res = await fetch(u.toString(), {
      headers: { "User-Agent": "JJRiggs-InventoryBuilder/1.0 (+https://jjriggsequipment.com)" },
      redirect: "follow",
    });
  } catch (e) {
    return json({ error: "Fetch failed: " + String(e) }, 502);
  }
  if (!res.ok) return json({ error: `Upstream ${res.status}` }, 502);

  const html = await res.text();
  const title = (html.match(/<title[^>]*>([^<]*)/i) || [])[1] || "";

  // collect absolute image URLs before stripping markup
  const images = [];
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*?(?:alt=["']([^"']*)["'])?/gi;
  let m;
  while ((m = imgRe.exec(html)) && images.length < 60) {
    try {
      const abs = new URL(m[1], u).toString();
      if (/\.(png|jpe?g|webp)(\?|$)/i.test(abs)) images.push({ src: abs, alt: m[2] || "" });
    } catch {}
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(h1|h2|h3|h4|li|tr|p|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#8217;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 60000);

  return json({ url: u.toString(), title, text, images });
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
