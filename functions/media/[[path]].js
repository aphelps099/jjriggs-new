// GET /media/* — public read of the jjriggs-media R2 bucket.
//
// Serves ad media: rendered MP4s (share-for-approval links), voiceover
// takes (project relink), the music library, and uploaded clips/photos.
// Nothing sensitive lands in this bucket by design — the gated upload
// endpoint (/api/admin/media) controls what gets in.
//
// Needs the R2 binding: Pages → Settings → Bindings → R2 bucket,
// variable name MEDIA → bucket jjriggs-media.

export async function onRequestGet({ request, params, env }) {
  if (!env.MEDIA) {
    return new Response("Media storage not configured (add the MEDIA R2 binding)", { status: 501 });
  }
  const key = (params.path || []).join("/");
  if (!key) return new Response("Not found", { status: 404 });

  // Basic range support so <video> can seek cloud renders
  const range = parseRange(request.headers.get("Range"));
  const obj = range
    ? await env.MEDIA.get(key, { range })
    : await env.MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.get("content-type")) headers.set("content-type", guessType(key));
  headers.set("etag", obj.httpEtag);
  headers.set("accept-ranges", "bytes");
  // Keys are content-addressed enough (unique per upload) to cache hard
  headers.set("cache-control", "public, max-age=31536000, immutable");

  if (range && obj.range) {
    const start = obj.range.offset;
    const end = start + obj.range.length - 1;
    headers.set("content-range", `bytes ${start}-${end}/${obj.size}`);
    headers.set("content-length", String(obj.range.length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(obj.body, { headers });
}

function parseRange(header) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!m || (!m[1] && !m[2])) return null;
  if (m[1] && m[2]) {
    const offset = parseInt(m[1], 10);
    return { offset, length: parseInt(m[2], 10) - offset + 1 };
  }
  if (m[1]) return { offset: parseInt(m[1], 10) };
  return { suffix: parseInt(m[2], 10) };
}

function guessType(key) {
  const ext = key.split(".").pop()?.toLowerCase();
  return {
    mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", m4a: "audio/mp4",
    wav: "audio/wav", ogg: "audio/ogg", png: "image/png", jpg: "image/jpeg",
    jpeg: "image/jpeg", webp: "image/webp", json: "application/json",
  }[ext] ?? "application/octet-stream";
}
