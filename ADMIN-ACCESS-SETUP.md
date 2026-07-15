# Admin setup — one dashboard screen, done

The admin tools (`/admin/`, `/admin/photos/`, `/admin/new/`) are protected by
a **single admin passcode**, enforced server-side at the edge by the site
itself (`functions/_middleware.js`). Andrew's whole experience: open the URL,
type the passcode once, stay signed in on that device for 30 days. No
accounts, no tokens, no Settings dialog.

All the code is in the repo. Your entire setup is **adding 3 environment
variables in one Cloudflare screen.**

## The one screen

**Cloudflare dashboard → Workers & Pages → jjriggs-new → Settings →
Environment variables.** Add all three to **Production** (and to **Preview**
so builder-branch previews work too), each as **Secret / encrypted**:

| Variable | Value |
|---|---|
| `ADMIN_PASSCODE` | A passphrase you make up and share with Andrew. Long beats clever: 3–4 words like `elm-tree-loader-5045` is great. Changing it later signs everyone out instantly. |
| `ANTHROPIC_API_KEY` | The key you already have (copy-out instructions below). |
| `GH_PUBLISH_TOKEN` | The GitHub token you already have (below). ⚠ It expires **2026-08-07** — when it does, mint a new fine-grained token (repo `aphelps099/jjriggs-new` only, Contents read/write) and paste it over this value. |

Then **redeploy** (Deployments → three-dot menu on the latest → Retry
deployment) so the functions pick up the vars.

### Optional: social publishing (Facebook / Instagram share buttons)

The ad review pages (`/review/{token}`) grow one-tap **post to Facebook /
Instagram** buttons once Meta is connected. Easiest path: paste the values
into **/admin → Social publishing** (stored server-side in the private R2
config, never in a browser, never publicly served). Alternatively set env
vars, which override the admin-saved values:

| Variable | Value |
|---|---|
| `META_PAGE_ID` | The JJ Riggs Facebook business Page ID (Page → About → Page transparency). |
| `META_PAGE_TOKEN` | A long-lived Page access token from a Business-type Meta developer app, scopes `pages_manage_posts` (+ `instagram_content_publish` for IG). App can stay in dev mode — only app-role users post. |
| `META_IG_USER_ID` | Optional — the Instagram Business/Creator account (linked to the Page) user ID, for the Instagram button. |

Reminders: automations can only post to a business **Page** (Meta removed
personal-profile posting in 2018), and the Instagram account must be a
professional account linked to that Page. `FACEBOOK-POSTING.md` walks the
token generation in detail.

### Copying the keys you already have

They're saved in your browser on whichever site you used the admin tools with
keys (localStorage). On that page, open DevTools (F12) → **Console** and run:

    localStorage.getItem('jj_claudekey')   // → ANTHROPIC_API_KEY value
    localStorage.getItem('jj_ghtoken')     // → GH_PUBLISH_TOKEN value

Copy each (without the quotes) into the matching variable.

### Test (2 minutes)

1. Private window → `jjriggsequipment.com/admin/` → you should get the dark
   **JJ Riggs Admin** sign-in screen. Wrong passcode → error; right → tools.
2. In the Product editor, make a small change and Publish — the log should say
   *"publishing through the site — no keys on this device needed."*
3. Send Andrew the URL + passcode. That's his entire onboarding.

### Afterwards (2 minutes)

Clear the old browser keys so the fallback path retires: on the page from the
copy-out step, run `localStorage.removeItem('jj_claudekey')` and
`localStorage.removeItem('jj_ghtoken')`.

## How the security actually works

- The middleware gates `/admin/*` and `/api/admin/*` only — the public site,
  contact form (`/api/lead`), and manufacturer proxies are untouched.
- Sessions are signed (HMAC) 30-day cookies; there's no session store to leak.
  Failed logins wait 1.2s each, and the passcode never appears in any URL.
- The two key-holding endpoints double-check the session themselves and
  refuse to run at all unless `ADMIN_PASSCODE` is set — so there is no
  ordering mistake that exposes a key.
- Publishing is **live-first, WordPress-style**: the default button commits
  straight to main and the site rebuilds in about a minute (the tools watch
  and report "✓ LIVE"). A preview-branch mode stays under Advanced for
  anything worth checking first.
- Even signed in — and in either mode — publishing is structurally limited:
  only the inventory data files and `img/uploads/` photos are writable (live
  mode cannot touch the site's code), deletions are allowed only under
  `img/uploads/`, and preview mode accepts `builder/*` branch names only.
  Every publish is a git commit, so history is the undo. Claude calls are
  capped and model-allowlisted, so worst case is pennies.
- Before the env vars exist, the middleware does nothing and the tools fall
  back to the old paste-a-key dialog — deploying this breaks nothing.

**Want to upgrade later?** Cloudflare Access (per-person email-PIN logins,
free ≤50 users) can be layered on top of the same paths — `admin/*` and
`api/admin/*` on both domains — with zero code changes. Worth it if more
people than you and Andrew ever need access. The passcode gate is plenty for
two people.
