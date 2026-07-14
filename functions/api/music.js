// GET /api/music — public list of the ad-music library (music/ prefix in
// the jjriggs-media R2 bucket). Read-only and limited to that one prefix,
// so the pickers in /studio/ and /studio/ads/ can offer one-tap tracks
// without a sign-in. Add tracks with the gated /api/admin/media upload
// (kind=music) — commercially licensed files only; keep receipts.

export async function onRequestGet({ env }) {
  if (!env.MEDIA) {
    return new Response(JSON.stringify({ ok: false, tracks: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  const list = await env.MEDIA.list({ prefix: "music/", limit: 100 });
  const tracks = list.objects
    .filter((o) => /\.(mp3|m4a|wav|ogg)$/i.test(o.key))
    .map((o) => ({
      name: o.key.split("/").pop().replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
      url: `/media/${o.key}`,
      size: o.size,
    }));
  return new Response(JSON.stringify({ ok: true, tracks }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
