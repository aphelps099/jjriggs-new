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
| `LEAD_TO` | No | Where lead emails go. Default `sales@jjriggsequipment.com`. **Until the domain is verified in Resend, set this to your Resend account email so test leads deliver.** |
| `LEAD_FROM` | No | From header. Default `JJ Riggs Website <onboarding@resend.dev>`. After DNS verify, use e.g. `JJ Riggs Equipment <quotes@jjriggsequipment.com>`. |
| `LEAD_REPLY_TO` | No | Reply-to on customer confirmation emails. Default `sales@jjriggsequipment.com`. |
| `SEND_CONFIRMATIONS` | No | `on` (default) sends the customer auto-reply; set `off` to disable. |

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
