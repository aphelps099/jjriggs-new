/* ═══════════════════════════════════════════════════════
   Website image library — reads the same js/*.data.js
   files the live site renders from (models + galleries,
   including admin uploads) and lists every product photo
   grouped by model. Shared by the studio and the Flash
   Ads builder. Site-specific by design — the brand-free
   engine lives in lib/motion/, not here.
   ═══════════════════════════════════════════════════════ */

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
// The site root above the studio — where /js/*.data.js and /img/ live
export const SITE_BASE = ASSET_BASE.replace(/\/studio\/?$/, '');

export interface LibraryModel {
  label: string;
  group: string;
  urls: string[];
}

interface SiteModelRow { model?: string; image?: string; img?: string }

declare global {
  interface Window {
    TYM_MODELS?: SiteModelRow[];
    BADBOY_MODELS?: SiteModelRow[];
    MOWER_MODELS?: SiteModelRow[];
    TRACTOR_GALLERY?: Record<string, string[]>;
  }
}

function loadSiteScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // a missing file just shrinks the library
    document.head.appendChild(s);
  });
}

/** Read the site's data files and build {model → image urls}, grouped. */
export async function harvestLibrary(): Promise<LibraryModel[]> {
  await Promise.all([
    loadSiteScript(`${SITE_BASE}/js/tym-models.data.js`),
    loadSiteScript(`${SITE_BASE}/js/badboy-models.data.js`),
    loadSiteScript(`${SITE_BASE}/js/mower-models.data.js`),
    loadSiteScript(`${SITE_BASE}/js/badboy-tractor-images.data.js`),
  ]);
  // Admin uploads override hand-maintained galleries — load order matters.
  await loadSiteScript(`${SITE_BASE}/js/uploads-gallery.data.js`);

  const byLabel = new Map<string, LibraryModel>();
  const add = (label: string, group: string, url?: string | string[]) => {
    const urls = (Array.isArray(url) ? url : [url]).filter((u): u is string => !!u && !!u.trim());
    if (!urls.length) return;
    const entry = byLabel.get(label) ?? { label, group, urls: [] };
    for (const u of urls) if (!entry.urls.includes(u)) entry.urls.push(u);
    byLabel.set(label, entry);
  };

  for (const m of window.TYM_MODELS ?? []) {
    if (m.model) add(`TYM ${m.model}`, 'TYM tractors', m.image ?? m.img);
  }
  for (const m of window.BADBOY_MODELS ?? []) {
    if (m.model) add(`Bad Boy ${m.model}`, 'Bad Boy tractors', m.image ?? m.img);
  }
  for (const m of window.MOWER_MODELS ?? []) {
    if (m.model) add(`Bad Boy ${m.model}`, 'Bad Boy mowers', m.image ?? m.img);
  }
  for (const [key, urls] of Object.entries(window.TRACTOR_GALLERY ?? {})) {
    const [brand, model] = key.split('|');
    if (!model) continue;
    add(`${brand} ${model}`, brand === 'TYM' ? 'TYM tractors' : 'Bad Boy tractors', urls);
  }

  return Array.from(byLabel.values()).sort(
    (a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label),
  );
}

/** A URL the browser can draw AND export from (same-origin or proxied blob). */
export function fetchableUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) {
    try {
      if (new URL(raw).host === window.location.host) return raw;
    } catch { /* fall through to the proxy */ }
    // Old data rows still hotlink jjriggsequipment.com / manufacturer hosts —
    // the site's own allowlisted proxy keeps the canvas untainted.
    return `${SITE_BASE}/api/fetch-image?url=${encodeURIComponent(raw)}`;
  }
  return `${SITE_BASE}/${raw.replace(/^\/+/, '')}`;
}

/** Fetch a library photo as a named File (blob-backed, canvas-safe). */
export async function fetchLibraryPhoto(rawUrl: string, label: string): Promise<File> {
  const res = await fetch(fetchableUrl(rawUrl));
  if (!res.ok) throw new Error(`Photo failed to load (${res.status})`);
  const blob = await res.blob();
  const ext = (rawUrl.match(/\.(jpe?g|png|webp)(\?|$)/i)?.[1] ?? 'jpg').toLowerCase();
  const base = rawUrl.split('/').pop()?.replace(/\.[a-z]+(\?.*)?$/i, '') ?? label;
  return new File([blob], `${base}.${ext}`, { type: blob.type || 'image/jpeg' });
}
