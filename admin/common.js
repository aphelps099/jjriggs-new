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

  // Product fact-fetch: {url, name, fields:[...], want_images, model}
  //   → {fields:{...}, suggested_images:[{i,why}...], images:[{src,alt}...], source:{url,title}}
  // Server mode does everything in one POST (page fetch + Claude, structured
  // outputs). The browser-key fallback mirrors the same technique client-side:
  // structured outputs (API-validated JSON), scan for the text block (never
  // content[0] — adaptive thinking can put a thinking block first), check
  // stop_reason. No text parsing anywhere.
  async function extractProduct(payload) {
    const st = await status();
    if (st.extract) {
      const r = await fetch('/api/admin/extract', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const e = new Error(errMsg(j, r.status));
        if (j && j.detail) e.detail = j.detail;
        throw e;
      }
      return j;
    }
    const key = localStorage.getItem('jj_claudekey');
    if (!key) throw new Error('NEEDS_KEY');
    // fallback: page via the proxy, Claude straight from the browser
    const page = await (await fetch('/api/fetch-page?url=' + encodeURIComponent(payload.url))).json();
    if (page.error) throw new Error('Manufacturer page: ' + page.error);
    const wantImages = !!payload.want_images;
    const props = {};
    const NUM = { hp: 1, loader_lift_lbs: 1, price: 1, width: 1, widthIn: 1, weight: 1, hpMin: 1, hpMax: 1 };
    for (const f of payload.fields) {
      props[f] = {
        description: (f === 'blurb'
          ? '1-2 short sentences rewritten from the page\'s own copy in the JJ Riggs voice: sharp, plain-spoken, no hype, no exclamation points; say "Open Station", never "Open"; prefer a middot (·) over an em-dash'
          : 'The ' + f + ' as the page states it' + (NUM[f] ? ', as a plain number' : ''))
          + '. null when the page does not state it — NEVER guess or infer.',
        anyOf: [{ type: NUM[f] ? 'number' : 'string' }, { type: 'null' }],
      };
    }
    const schema = {
      type: 'object',
      properties: {
        fields: { type: 'object', properties: props, required: payload.fields, additionalProperties: false },
        suggested_images: {
          description: wantImages
            ? 'Up to 6 indexes from the numbered image candidates most likely to show EXACTLY this model and configuration (match model numbers and cab/open-station in alt text and filenames); when unsure leave it out — a human picks. Best first.'
            : 'Return an empty array.',
          type: 'array',
          items: { type: 'object', properties: { i: { type: 'integer' }, why: { type: 'string' } }, required: ['i', 'why'], additionalProperties: false },
        },
      },
      required: ['fields', 'suggested_images'],
      additionalProperties: false,
    };
    const imgList = wantImages
      ? (page.images || []).slice(0, 50).map((im, i) => i + ': ' + im.src + (im.alt ? ' | alt: ' + im.alt : '')).join('\n') || '(none)'
      : '(not requested)';
    const prompt = 'Fill the product template for the dealer site of JJ Riggs Equipment (Colville, WA) from the manufacturer\'s own page for "' + payload.name + '".\n'
      + 'Use ONLY what this page states: verbatim values, numbers as plain numbers. A field the page doesn\'t state is null — never guess, infer, or fill from general knowledge.\n\n'
      + 'PAGE TITLE: ' + page.title + '\nIMAGE CANDIDATES:\n' + imgList + '\nPAGE TEXT:\n' + (page.text || '').slice(0, 20000);
    let data, maxTokens = 4000;
    for (let attempt = 0; ; attempt++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: payload.model || 'claude-sonnet-5',
          max_tokens: maxTokens,
          output_config: { format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Anthropic: ' + errMsg(data, r.status));
      if (data.stop_reason === 'max_tokens' && attempt === 0) { maxTokens = 9000; continue; }
      break;
    }
    if (data.stop_reason === 'refusal') throw new Error('Claude declined this request (safety filters).');
    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) throw new Error('No text in Claude\'s reply (blocks: ' + (data.content || []).map(b => b.type).join(', ') + ')');
    const out = JSON.parse(textBlock.text); // API-validated against the schema
    return {
      fields: out.fields || {},
      suggested_images: out.suggested_images || [],
      images: wantImages ? (page.images || []) : [],
      source: { url: page.url, title: page.title },
    };
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

  // job: {target:'live'|'preview', branch?, message, files:{path:text},
  //       photos:{path:b64}, deletions:[path]}
  // 'live' commits straight to main (site deploys in ~1 min); 'preview'
  // uses a builder/* branch + PR for changes worth checking first.
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
    const live = job.target === 'live';
    const branch = live ? BASE_BRANCH : job.branch;
    if (live) { say('publishing straight to the live site (' + BASE_BRANCH + ')'); }
    else {
      say('base: ' + BASE_BRANCH + ' → branch: ' + branch);
      const ref = await gh('/git/ref/heads/' + BASE_BRANCH);
      try {
        await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: ref.object.sha }) });
        say('branch created');
      } catch (e) { say('branch exists — updating it'); }
    }
    const put = async (path, contentB64, label) => {
      let sha; try { sha = (await gh('/contents/' + path + '?ref=' + branch)).sha; } catch (e) {}
      await gh('/contents/' + path, { method: 'PUT', body: JSON.stringify({ message: job.message + ' — ' + path, branch, content: contentB64, ...(sha ? { sha } : {}) }) });
      say(label + ' ' + path);
    };
    for (const [path, b64] of Object.entries(job.photos || {})) await put(path, b64, 'uploaded');
    for (const [path, text] of Object.entries(job.files || {})) await put(path, btoa(unescape(encodeURIComponent(text))), 'committed');
    for (const path of (job.deletions || [])) {
      try {
        const cur = await gh('/contents/' + path + '?ref=' + branch);
        await gh('/contents/' + path, { method: 'DELETE', body: JSON.stringify({ message: job.message + ' — remove unused ' + path, branch, sha: cur.sha }) });
        say('deleted ' + path);
      } catch (e) { say('skip delete ' + path + ' (' + e.message + ')'); }
    }
    return { ok: true, live };
  }

  // After a live publish, poll a published file until the deploy serves it,
  // so the user sees "✓ live" instead of guessing. filePath = a repo path
  // from job.files; expected = its exact committed text.
  async function waitLive(filePath, expected, say, tries) {
    say = say || function () {};
    tries = tries || 30; // × 8s ≈ 4 minutes
    say('waiting for the site to rebuild (usually under a minute)…');
    for (let i = 0; i < tries; i++) {
      await new Promise((r) => setTimeout(r, 8000));
      try {
        const txt = await (await fetch('/' + filePath + '?v=' + Date.now(), { cache: 'no-store' })).text();
        if (txt === expected) { say('✓ LIVE — your update is on the site now.'); return true; }
      } catch (e) {}
      if (i === 7) say('still building — hanging on…');
    }
    say('taking longer than usual — it will appear shortly; no need to re-publish.');
    return false;
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

  return { OWNER, REPO, BASE_BRANCH, status, extractProduct, publish, waitLive, explain, parseJSON };
})();
