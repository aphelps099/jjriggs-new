# JJ Riggs Equipment — Deploy & Integrations

Static site + Cloudflare Pages Functions (serverless) for form email.

## 1. Push to GitHub

The folder is already a git repo with an initial commit. Create an empty repo on
GitHub (no README/license), then connect and push:

```bash
cd jjriggs-website
git remote add origin https://github.com/<your-username>/jjriggs-website.git
git branch -M main
git push -u origin main
```

> Creating the GitHub repo and authenticating the push has to be done by you
> (it needs your GitHub login). Everything else is committed and ready.

## 2. Deploy to Cloudflare Pages

In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
pick the `jjriggs-website` repo, then use these build settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(leave blank)* |
| Build output directory | `/` (repo root) |
| Functions directory | `functions` (auto-detected) |

The `functions/` folder is picked up automatically, so `POST /api/lead` works once deployed.

## 3. Environment variables (Cloudflare Pages → Settings → Environment variables)

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | **Yes** | Your Resend API key (Production + Preview). |
| `LEAD_TO_QUOTE` | No | Where **quote** requests go. Default `sales@jjriggsequipment.com`. |
| `LEAD_TO_SERVICE` | No | Where **visit** and **service** requests go. Default `service@jjriggsequipment.com`. |
| `LEAD_TO` | No | **Global override** — forces ALL form mail to one address regardless of type. Leave unset in production so type-routing applies; set it to your Resend account email for testing before the domain is verified. |
| `LEAD_BCC` | No | BCC'd on every dealer notification (comma-separate for several). Default `aaronphelps.c@gmail.com`. **Set to empty (`""`) during Resend test mode** — a BCC to any non-account address makes the send fail until the domain is verified. |
| `LEAD_FROM` | No | From header. Default `JJ Riggs Website <onboarding@resend.dev>` (required value during test mode). After DNS verify, use e.g. `JJ Riggs Equipment <quotes@jjriggsequipment.com>`. |
| `LEAD_REPLY_TO` | No | Reply-to on customer confirmation emails. Default `sales@jjriggsequipment.com`. |
| `SEND_CONFIRMATIONS` | No | `on` (default) sends the customer auto-reply; set `off` to disable (recommended during test mode, since customer confirmations can't deliver until the domain is verified). |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile secret for spam protection on `/api/lead`. Create a widget at dash.cloudflare.com → Turnstile (domains: the pages.dev domain + jjriggsequipment.com), set this to its **Secret Key**, and paste its **Site Key** into `TS_SITE_KEY` in `contact.html`. Until set, verification is skipped (honeypot still active). |
| `RESEND_API_URL` | No | Override the Resend endpoint (testing only; defaults to `https://api.resend.com/emails`). |
| `ADMIN_PASSCODE` | For /admin | Gates `/admin/*` + `/api/admin/*` (passcode login → signed session cookie). Unset = admin tools run in legacy open mode. |
| `GH_PUBLISH_TOKEN` | For /admin | GitHub token the publish endpoint commits with (data files + `img/uploads/` only, per its path allowlist). |
| `ANTHROPIC_API_KEY` | For AI tools | Powers `/api/admin/extract` (product facts from manufacturer pages) and `/api/admin/storyboard` (flyer image → video-ad storyboard). |
| `ELEVENLABS_API_KEY` | For voiceover | Powers `/api/admin/voiceover` (script → speech in the studio). **Store as Secret type**, not plaintext. |
| `ELEVENLABS_VOICE_ID` | No | Default ElevenLabs voice (Andrew's clone) so the studio picks it automatically. |
| `STOCK_FEED_URL` | For badges | Published-to-web CSV of the sheet's "Website Feed" tab; feeds `/api/stock`. |
| `REVIEW_NOTIFY_TO` | No | Where ad-review decisions/notes are emailed (needs `RESEND_API_KEY`). Default `aaronphelps.c@gmail.com`. |

**Scope matters:** each variable is set per environment (Production / Preview). Anything you
want working on branch-preview URLs must be added to **Preview** too — and env changes only
apply to deployments created *after* the change, so push (or retry a deploy) afterwards.

## 3b. Media storage (R2) — cloud renders, voiceover takes, ad music

The studio and Flash Ads save rendered MP4s ("Save to cloud & copy link" for
approval), generated voiceover takes (so saved projects relink after reload),
and the one-tap ad-music library to an R2 bucket. One-time setup:

1. Cloudflare dashboard → **R2** → Create bucket → name it **`jjriggs-media`**.
2. Pages project → Settings → **Bindings** → Add → R2 bucket →
   variable name **`MEDIA`** → bucket `jjriggs-media`. Add it for
   **Production and Preview**, then redeploy.
3. Optional: seed the music library by uploading commercially-licensed MP3s
   with the studio signed in: `POST /api/admin/media?kind=music&name=<file>.mp3`
   (or drop files into the bucket's `music/` folder in the dashboard).
   They appear as one-tap "♪" tracks in both music pickers within minutes.

Until the binding exists, every cloud feature degrades gracefully (uploads
report "not configured"; the music list is just empty). Bucket layout:
`renders/` (timestamped MP4s), `vo/` (voiceover takes, exact filenames so
projects relink), `music/` (the ad library), `uploads/` (misc), `reviews/`
(review records). Everything under `/media/*` is publicly readable by
design — don't put secrets in it.

**Review links:** "Save & create review link" in the editors uploads the
render and mints a no-login page at `/review/{token}` where Andrew watches
the ad and taps **Approve** or sends a note. Decisions and notes are stored
on the review record and emailed to `REVIEW_NOTIFY_TO`. The token is the
credential (unguessable, Google-Docs-style); approving never auto-posts
anything. Each new version of an ad gets its own link — records are never
edited in place, so there's no confusion about which cut was approved.

**Email routing:** quote requests → `LEAD_TO_QUOTE` (sales@), visit + service requests → `LEAD_TO_SERVICE` (service@); every dealer notification is BCC'd to `LEAD_BCC`. `LEAD_TO`, if set, overrides all of that with a single address.

**Test-to-inbox recipe (before domain verification):** set `RESEND_API_KEY`, `LEAD_TO` = your Resend account email, `LEAD_BCC` = `""`, `SEND_CONFIRMATIONS` = `off`. Every form then lands in that one inbox. To go live: verify the domain (§4), set `LEAD_FROM` to a verified address, then **remove** `LEAD_TO` and restore `LEAD_BCC` so real sales@/service@ routing takes over.

After changing env vars, redeploy (or push) for them to take effect.

## 4. Resend — verify the sending domain (DNS)

Until `jjriggsequipment.com` is verified, Resend only delivers to your own account
email, and customer confirmation emails won't arrive. To fix:

1. Resend dashboard → **Domains → Add Domain** → `jjriggsequipment.com`.
2. Resend shows the exact **SPF, DKIM, and DMARC** records (these are unique to your
   account — they can't be pre-filled here).
3. Add those records at your DNS host. *If the domain's DNS is on Cloudflare, add them
   under that domain's DNS tab.*
4. Wait for Resend to show **Verified**, then set `LEAD_FROM` (and `LEAD_TO` back to
   `sales@jjriggsequipment.com`).

## 5. Forms — how it works

`schedule-visit.html` has three tabs:

- **Request a Quote** and **Schedule Service** → POST to `/api/lead` → emails the dealer
  and sends the customer a confirmation auto-reply.
- **Schedule a Visit** → embedded Google Calendar appointment scheduling (books directly
  on the calendar). The fallback request form behind it also posts to `/api/lead`.

## 6. Still to wire (needs your accounts/keys)

- **Constant Contact newsletter** — a `functions/api/subscribe.js` + signup form. Needs
  your Constant Contact API key/token and the target list ID. (See task list.)
- **Andrew's Google Calendar** — confirm the embedded appointment schedule is on Andrew's
  Google account (the embed URL is already wired in `schedule-visit.html`).
