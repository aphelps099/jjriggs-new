// POST /api/admin/publish — commit an admin-tool publish job to GitHub using
// the server-held GH_PUBLISH_TOKEN, so admin users never paste tokens into
// the browser. Hard guards regardless of who reaches this endpoint:
//   - branch MUST match builder/* (never main — a human still merges the PR)
//   - writable paths are allowlisted (data files + img/uploads photos only)
//   - deletions allowed only under img/uploads/
//   - same-origin only (belt) + Cloudflare Access on /api/admin/* (suspenders)
//
// Job shape: { branch, message, files:{path:text}, photos:{path:base64jpeg},
//              deletions:[path] }   →   { log:[...] }

const OWNER = "aphelps099";
const REPO = "jjriggs-new";
const BASE_BRANCH = "main";
const BRANCH_RE = /^builder\/[a-zA-Z0-9._-]{1,80}$/;
const FILE_RE = /^(js\/[a-zA-Z0-9._-]+\.data\.js|implements-data\.js)$/;
const PHOTO_RE = /^img\/uploads\/[a-zA-Z0-9._-]+\.(jpe?g|png)$/i;
const MAX_ITEMS = 40;

export async function onRequestPost({ request, env }) {
  if (!env.GH_PUBLISH_TOKEN) return err("Server publish token not configured", 501);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);

  let job;
  try {
    job = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  const files = job.files || {};
  const photos = job.photos || {};
  const deletions = job.deletions || [];
  const message = String(job.message || "Update via admin tools").slice(0, 200);

  if (!BRANCH_RE.test(job.branch || "")) return err("Branch must look like builder/…", 400);
  for (const p of Object.keys(files)) if (!FILE_RE.test(p)) return err("File path not allowed: " + p, 400);
  for (const p of Object.keys(photos)) if (!PHOTO_RE.test(p)) return err("Photo path not allowed: " + p, 400);
  for (const p of deletions) if (!PHOTO_RE.test(p)) return err("Only img/uploads photos can be deleted: " + p, 400);
  if (Object.keys(files).length + Object.keys(photos).length + deletions.length > MAX_ITEMS)
    return err("Too many items in one publish", 400);
  if (!Object.keys(files).length && !Object.keys(photos).length && !deletions.length)
    return err("Nothing to publish", 400);

  const log = [];
  const gh = async (path, opts = {}) => {
    const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + path, {
      ...opts,
      headers: {
        Authorization: "Bearer " + env.GH_PUBLISH_TOKEN,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "JJRiggs-AdminPublish/1.0",
        ...(opts.headers || {}),
      },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(path + " → " + r.status + " " + (j.message || ""));
    return j;
  };

  try {
    log.push(`base: ${BASE_BRANCH} → branch: ${job.branch}`);
    const ref = await gh("/git/ref/heads/" + BASE_BRANCH);
    try {
      await gh("/git/refs", { method: "POST", body: JSON.stringify({ ref: "refs/heads/" + job.branch, sha: ref.object.sha }) });
      log.push("branch created");
    } catch {
      log.push("branch exists — updating it");
    }
    const put = async (path, contentB64, label) => {
      let sha;
      try { sha = (await gh("/contents/" + path + "?ref=" + job.branch)).sha; } catch {}
      await gh("/contents/" + path, {
        method: "PUT",
        body: JSON.stringify({ message: message + " — " + path, branch: job.branch, content: contentB64, ...(sha ? { sha } : {}) }),
      });
      log.push(label + " " + path);
    };
    for (const [path, b64] of Object.entries(photos)) await put(path, b64, "uploaded");
    for (const [path, text] of Object.entries(files)) await put(path, btoa(unescape(encodeURIComponent(text))), "committed");
    for (const path of deletions) {
      try {
        const cur = await gh("/contents/" + path + "?ref=" + job.branch);
        await gh("/contents/" + path, {
          method: "DELETE",
          body: JSON.stringify({ message: message + " — remove unused " + path, branch: job.branch, sha: cur.sha }),
        });
        log.push("deleted " + path);
      } catch (e) {
        log.push("skip delete " + path + " (" + e.message + ")");
      }
    }
  } catch (e) {
    log.push("ERROR: " + e.message);
    return new Response(JSON.stringify({ error: e.message, log }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, log }), {
    headers: { "Content-Type": "application/json" },
  });
}

function err(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
