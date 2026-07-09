# Locking down /admin/ with Cloudflare Access

Goal: only Aaron and Andrew can open the admin tools (`/admin/`, `/admin/photos/`,
`/admin/new/`). Login is a one-time PIN emailed to an allowed address — no
passwords to create, remember, brute-force, or store. Free for up to 50 users.
Zero code changes; everything happens in the Cloudflare dashboard (~15 min).

Why this beats a password: there is no login form for bots to hammer, no shared
secret to leak, and revoking a person is deleting an email from a list. The
GitHub token (the credential that can actually change the site) stays in each
person's own browser localStorage as before — Access protects the *door*, the
token remains the *pen*.

## One-time setup

1. **Cloudflare dashboard → Zero Trust** (left sidebar). First visit asks you to
   pick a team name (e.g. `jjriggs`) and a plan — choose the **Free** plan.

2. **Settings → Authentication → Login methods**: confirm **One-time PIN** is
   enabled (it is by default). Don't add anything else — email PIN is the
   "UX for dummies" option: type your email, get a 6-digit code, you're in.

3. **Access → Applications → Add an application → Self-hosted**, then:
   - **Application name**: `JJ Riggs Admin`
   - **Session duration**: `1 week` (re-login weekly; shorten later if you like)
   - **Public hostnames** — add BOTH so previews are covered too:
     | Domain | Path |
     |---|---|
     | `jjriggsequipment.com` | `admin/*` (subdomain blank / `www` as applicable) |
     | `*.jjriggs-new.pages.dev` | `admin/*` |
     (For the pages.dev wildcard, Cloudflare may ask you to enable Access on
     the Pages project: **Workers & Pages → jjriggs-new → Settings →
     Enable Access** — do it, then set its policy to this application.)

4. **Add a policy** on that application:
   - **Policy name**: `Owners` · **Action**: `Allow`
   - **Include → Emails**: `aaron@aaroncphelps.com`, Andrew's email
   - Save. Anyone not on the list gets a Cloudflare block page.

5. **Test**: open `https://jjriggsequipment.com/admin/` in a private window →
   you should see the Cloudflare login, enter your email, paste the PIN from
   your inbox, land on the builder. Then try a wrong email → blocked.

## Notes & gotchas

- **Don't put `/api/*` behind Access.** `functions/api/lead.js` powers the
  public contact form and must stay open; `fetch-page.js`/`fetch-image.js` are
  already restricted by their own manufacturer-host allowlist. Gating only
  `admin/*` keeps the public site untouched.
- The admin pages call `api.anthropic.com` and `api.github.com` directly from
  the browser — Access does not interfere with those.
- Adding a future helper = add their email to the policy. Removing = delete it.
  They'll also need their own GitHub token to publish (Settings ⚙ in any admin
  tool).
- If Andrew ever finds the PIN email annoying, session duration can go up to
  1 month — still safer than a password taped to the monitor.
