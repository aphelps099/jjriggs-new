// Shared plumbing for the /admin tools. Server-first: publishing and AI
// extraction go through /api/admin/* using keys stored in Cloudflare env
// vars (see ADMIN-ACCESS-SETUP.md) — nobody pastes keys into a browser.
// If the server keys aren't configured yet, falls back to the legacy
// localStorage keys from the ⚙ Settings dialog.
'use strict';
window.JJ = (function () {
  const OWNER = 'aphelps099', REPO = 'jjriggs-new', BASE_BRANCH = 'main';
  // mark this browser as an admin so product pages show the ✎ edit pencil
  try { localStorage.setItem('jj_admin', '1'); } catch (e) {}

  let statusP = null;
  function status() {
    if (!statusP) statusP = fetch('/api/admin/status')
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    return statusP.then(s => ({ extract: !!s.extract, publish: !!s.publish }));
  }

  // an error field can be a plain string (our endpoints) or an object like
  // Anthropic's {type,message} — unwrap to a readable string, never [object Object]
  function errMsg(j, status) {
    const e = j && j.error;
    if (!e) return 'request failed (' + status + ')';
    if (typeof e === 'string') return e;
    return e.message || e.type || JSON.stringify(e);
  }

  async function extract(payload) {
    const st = await status();
    if (st.extract) {
      const r = await fetch('/api/admin/extract', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Anthropic: ' + errMsg(j, r.status));
      return j;
    }
    const key = localStorage.getItem('jj_claudekey');
    if (!key) throw new Error('NEEDS_KEY');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify(payload),
    });
    return r.json();
  }

  async function gh(path, opts = {}) {
    const t = localStorage.getItem('jj_ghtoken');
    const r = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + path, {
      ...opts,
      headers: { 'Authorization': 'Bearer ' + t, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(path + ' → ' + r.status + ' ' + (j.message || ''));
    return j;
  }

  // job: {branch, message, files:{path:text}, photos:{path:b64}, deletions:[path]}
  async function publish(job, say) {
    say = say || function () {};
    const st = await status();
    if (st.publish) {
      say('publishing through the site — no keys on this device needed');
      const r = await fetch('/api/admin/publish', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(job),
      });
      const j = await r.json().catch(() => ({}));
      (j.log || []).forEach(say);
      if (!r.ok) throw new Error(errMsg(j, r.status));
      return j;
    }
    if (!localStorage.getItem('jj_ghtoken')) throw new Error('NEEDS_TOKEN');
    say('base: ' + BASE_BRANCH + ' → branch: ' + job.branch);
    const ref = await gh('/git/ref/heads/' + BASE_BRANCH);
    try {
      await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + job.branch, sha: ref.object.sha }) });
      say('branch created');
    } catch (e) { say('branch exists — updating it'); }
    const put = async (path, contentB64, label) => {
      let sha; try { sha = (await gh('/contents/' + path + '?ref=' + job.branch)).sha; } catch (e) {}
      await gh('/contents/' + path, { method: 'PUT', body: JSON.stringify({ message: job.message + ' — ' + path, branch: job.branch, content: contentB64, ...(sha ? { sha } : {}) }) });
      say(label + ' ' + path);
    };
    for (const [path, b64] of Object.entries(job.photos || {})) await put(path, b64, 'uploaded');
    for (const [path, text] of Object.entries(job.files || {})) await put(path, btoa(unescape(encodeURIComponent(text))), 'committed');
    for (const path of (job.deletions || [])) {
      try {
        const cur = await gh('/contents/' + path + '?ref=' + job.branch);
        await gh('/contents/' + path, { method: 'DELETE', body: JSON.stringify({ message: job.message + ' — remove unused ' + path, branch: job.branch, sha: cur.sha }) });
        say('deleted ' + path);
      } catch (e) { say('skip delete ' + path + ' (' + e.message + ')'); }
    }
    return { ok: true };
  }

  // Pull the first complete JSON object out of a model reply. A greedy
  // /\{[\s\S]*\}/ swallows any trailing brace in prose and breaks; this scans
  // for the first balanced object (string-aware). Pass prefill='{' when the
  // request prefilled the assistant turn with an opening brace.
  function parseJSON(text, prefill) {
    const s = (prefill || '') + String(text == null ? '' : text);
    const start = s.indexOf('{');
    if (start < 0) throw new Error('no JSON object in the model reply');
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') { if (--depth === 0) return JSON.parse(s.slice(start, i + 1)); }
    }
    throw new Error('the model reply was cut off before the JSON closed');
  }

  const NEED_MSG = {
    NEEDS_KEY: 'Fact-fetch isn\'t set up on this device. Best fix (one-time, by Aaron): the server setup in ADMIN-ACCESS-SETUP.md — then nobody ever pastes keys. Fallback: paste an Anthropic API key in ⚙ Settings.',
    NEEDS_TOKEN: 'Publishing isn\'t set up on this device. Best fix (one-time, by Aaron): the server setup in ADMIN-ACCESS-SETUP.md — then nobody ever pastes keys. Fallback: paste a GitHub token in ⚙ Settings.',
  };
  const explain = e => NEED_MSG[e.message] || e.message;

  return { OWNER, REPO, BASE_BRANCH, status, extract, publish, explain, parseJSON };
})();
