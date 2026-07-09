// Cloudflare Pages Function — GET /api/fetch-image?url=<manufacturer image url>
// Companion to fetch-page.js for the /admin/new/ product builder: streams the
// image bytes same-origin so the browser can canvas-resize and commit them to
// the repo (site rule: never hotlink manufacturer assets). STRICTLY the same
// host allowlist as fetch-page.js — this is not a general image proxy.

const ALLOWED_HOSTS = [
  "tym.world",
  "badboymowers.com",
  "badboycountry.com",
  "cidattachments.com",
  "ironcraftusa.com",
  "brabereq.com",
  "jjriggsequipment.com",
  // CID hosts product photos on Brandfolder (URLs already in implements-data.js)
  "brandfolder.com",
  "cdn.brandfolder.io",
];
const MAX_BYTES = 12 * 1024 * 1024;

function hostAllowed(h) {
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith("." + a));
}

export async function onRequestGet({ request }) {
  const target = new URL(request.url).searchParams.get("url") || "";
  let u;
  try {
    u = new URL(target);
  } catch {
    return err("Invalid url", 400);
  }
  if (u.protocol !== "https:" || !hostAllowed(u.hostname)) {
    return err(`Host not allowed: ${u.hostname}`, 403);
  }

  let res;
  try {
    res = await fetch(u.toString(), {
      headers: { "User-Agent": "JJRiggs-InventoryBuilder/1.0 (+https://jjriggsequipment.com)" },
      redirect: "follow",
    });
  } catch (e) {
    return err("Fetch failed: " + String(e), 502);
  }
  if (!res.ok) return err(`Upstream ${res.status}`, 502);

  const type = res.headers.get("content-type") || "";
  if (!/^image\//i.test(type)) return err(`Not an image: ${type}`, 415);

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return err("Image too large", 413);

  return new Response(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function err(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
