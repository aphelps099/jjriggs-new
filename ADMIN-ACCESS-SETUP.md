# Admin setup: login for Andrew, zero keys in the browser

Two one-time steps in the Cloudflare dashboard (~25 min total). After both,
the admin experience is: **open the URL → type your email → enter the 6-digit
PIN from your inbox → work.** No passwords, no tokens, no Settings dialog.

Do them **in this order** — Part 1 locks the doors, Part 2 puts the keys
inside. Never do Part 2 first.

---

## Part 1 — Cloudflare Access (who gets in)

Free for up to 50 users. No code. More secure than a WordPress login: there is
no password form on the public internet, nothing to brute-force, and revoking
a person = deleting their email from a list.

1. **Cloudflare dashboard → Zero Trust** (left sidebar). First visit asks for a
   team name (e.g. `jjriggs`) and a plan — choose **Free**.

2. **Settings → Authentication → Login methods**: confirm **One-time PIN** is
   enabled (default). Add nothing else — email PIN is the simplest flow.

3. **Access → Applications → Add an application → Self-hosted**:
   - **Application name**: `JJ Riggs Admin`
   - **Session duration**: `1 week`
   - **Public hostnames** — add ALL FOUR rows (the admin pages *and* the admin
     API must both be covered, on the live domain and the pages.dev domain):

     | Domain | Path |
     |---|---|
     | `jjriggsequipment.com` | `admin/*` |
     | `jjriggsequipment.com` | `api/admin/*` |
     | `*.jjriggs-new.pages.dev` | `admin/*` |
     | `*.jjriggs-new.pages.dev` | `api/admin/*` |

     (For the pages.dev wildcard, Cloudflare may ask you to enable Access on
     the Pages project: **Workers & Pages → jjriggs-new → Settings → Enable
     Access** — do it, then point its policy at this application.)

4. **Add a policy**: name `Owners`, action `Allow`, **Include → Emails**:
   `aaron@aaroncphelps.com` + Andrew's email. Save.

5. **Test** in a private window: `jjriggsequipment.com/admin/` should demand
   the email PIN; a wrong email gets blocked; `/api/admin/status` should also
   be blocked without login.

Do **NOT** gate `/api/*` broadly — `api/lead` powers the public contact form
and `api/fetch-page` / `api/fetch-image` are used by the admin pages but are
already restricted to the manufacturer allowlist. Only `api/admin/*` gets gated.

---

## Part 2 — server-side keys (nothing to paste, ever)

The admin tools call `/api/admin/extract` (Claude) and `/api/admin/publish`
(GitHub commits) — the site holds the keys, exactly like the contact form
already holds `RESEND_API_KEY`. Until these are set, the tools fall back to
the old paste-a-key ⚙ Settings dialog.

**Workers & Pages → jjriggs-new → Settings → Environment variables →
Production** (add to Preview too so builder-branch previews work). Add both
as **Secret** (encrypted):

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | an Anthropic API key from console.anthropic.com → API Keys. Make a fresh one named `jjriggs-admin` so it can be revoked alone. |
| `GH_PUBLISH_TOKEN` | a GitHub **fine-grained** personal access token: github.com → Settings → Developer settings → Fine-grained tokens → Generate. Repository access: **only `aphelps099/jjriggs-new`**. Permissions: **Contents → Read and write**. Nothing else. Set a 1-year expiry and calendar the renewal. |

Then **redeploy** (Deployments → Retry latest, or just push any commit) so the
functions pick up the vars.

**Test**: logged in via Access, open `jjriggsequipment.com/api/admin/status` —
it should show `{"extract":true,"publish":true}`. Then run a small publish
from the Photo editor and check the log says *"publishing through the site —
no keys on this device needed."*

### What the server will and won't do (built-in guards)

Even for someone logged in — and even if Access were misconfigured — the
publish endpoint only ever:
- commits to branches named `builder/*` (never main; a human still merges),
- writes the inventory data files and `img/uploads/` photos (no HTML, no
  functions, no workflows),
- deletes only under `img/uploads/`.

The extract endpoint only relays capped Claude calls on an allowlisted model
list, so a leak costs pennies, not a takeover.

### Housekeeping once this works

- Delete the old keys from browser localStorage (⚙ Settings → clear the
  fields → Save) and revoke the old GitHub PAT (the ledger one expiring
  2026-08-07) — the server token replaces it.
- Rotate the Anthropic key that transited chat during the original setup
  (credentials ledger note) — the new `jjriggs-admin` key replaces it.
