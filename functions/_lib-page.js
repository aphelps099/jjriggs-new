// Shared manufacturer-page fetching for fetch-page.js (browser proxy) and
// api/admin/extract.js (server-side extraction). Underscore-prefixed: not
// routed, import-only. STRICTLY allowlisted — this is not a general fetcher.

export const ALLOWED_HOSTS = [
  "tym.world",
  "badboymowers.com",
  "badboycountry.com",
  "cidattachments.com",
  "ironcraftusa.com",
  "brabereq.com",
  "jjriggsequipment.com", // the old site — legacy product pages
];

export function hostAllowed(h) {
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith("." + a));
}

// Fetch an allowlisted product page and reduce it to { url, title, text,
// images[] }. Throws Error with .status set for clean HTTP mapping.
export async function fetchPage(target) {
  let u;
  try {
    u = new URL(target);
  } catch {
    throw httpError("Invalid url", 400);
  }
  if (u.protocol !== "https:" || !hostAllowed(u.hostname)) {
    throw httpError(`Host not allowed: ${u.hostname}`, 403);
  }

  let res;
  try {
    res = await fetch(u.toString(), {
      headers: { "User-Agent": "JJRiggs-InventoryBuilder/1.0 (+https://jjriggsequipment.com)" },
      redirect: "follow",
    });
  } catch (e) {
    throw httpError("Fetch failed: " + String(e), 502);
  }
  if (!res.ok) throw httpError(`Upstream ${res.status}`, 502);

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

  return { url: u.toString(), title, text, images };
}

function httpError(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}
