// Cloudflare Pages Function — POST /api/lead
// Receives a JSON lead from the contact.html forms and emails it via Resend.
//
// Required env var (set in Cloudflare Pages → Settings → Environment variables):
//   RESEND_API_KEY   your Resend API key
// Optional env vars:
//   LEAD_TO          recipient (default sales@jjriggsequipment.com)
//                    NOTE: until you verify a domain in Resend, Resend only delivers
//                    to the email address on your Resend account. For testing, set
//                    LEAD_TO to that address; switch back once the domain is verified.
//   LEAD_FROM        From header (default "JJ Riggs Website <onboarding@resend.dev>")
//                    Once jjriggsequipment.com is verified, use e.g.
//                    "JJ Riggs Equipment <quotes@jjriggsequipment.com>"

const FIELD_LABELS = {
  type: "Request type",
  name: "Name",
  phone: "Phone",
  email: "Email",
  interest: "Interested in",
  equipment: "Equipment",
  servicetype: "Service type",
  urgency: "Urgency",
  date: "Preferred day",
  time: "Preferred time",
  product: "Came from product",
  message: "Message",
};

const TYPE_SUBJECT = {
  quote: "New quote request",
  visit: "New visit request",
  service: "New service request",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request" }, 400);
  }

  // Honeypot — bots fill hidden "company" field; silently accept and drop.
  if (data.company) return json({ ok: true });

  // Turnstile — spam protection. Enforced only when TURNSTILE_SECRET_KEY is set
  // (Pages → Settings → Environment variables), so forms keep working before the
  // real widget/secret exist. Explicit verification failures are rejected;
  // a siteverify OUTAGE fails open — losing a real customer lead costs more
  // than letting one spam email through.
  if (env.TURNSTILE_SECRET_KEY) {
    const token = (data.turnstile || "").trim();
    if (!token) {
      return json({ ok: false, error: "Security check missing — please reload the page and try again, or call 509-738-2985." }, 403);
    }
    try {
      const vr = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get("CF-Connecting-IP") || undefined,
        }),
      });
      const v = await vr.json();
      if (!v.success) {
        console.log("Turnstile rejected", v["error-codes"]);
        return json({ ok: false, error: "Security check failed — please reload the page and try again, or call 509-738-2985." }, 403);
      }
    } catch (e) {
      console.log("Turnstile siteverify unreachable — failing open", String(e));
    }
  }

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "Name and a valid email are required." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: "Email is not configured." }, 500);
  }

  const type = data.type || "lead";
  const subject = `${TYPE_SUBJECT[type] || "New website lead"} — ${name}`;

  // Build readable bodies from whatever fields came in (keep a sensible order).
  const order = ["type", "name", "phone", "email", "interest", "equipment",
    "servicetype", "urgency", "date", "time", "product", "message"];
  const rows = order
    .filter((k) => data[k] && String(data[k]).trim() && k !== "company")
    .map((k) => [FIELD_LABELS[k] || k, String(data[k]).trim()]);

  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html =
    `<h2 style="font-family:Arial,sans-serif">${esc(subject)}</h2>` +
    `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top"><strong>${esc(
            k
          )}</strong></td><td style="padding:4px 0;white-space:pre-wrap">${esc(v)}</td></tr>`
      )
      .join("") +
    `</table>`;

  // Route by request type: quotes -> sales, visits & service -> service.
  // env.LEAD_TO (if set) forces ALL mail to one address — handy for testing
  // before the sending domain is verified in Resend.
  const TYPE_TO = {
    quote:   env.LEAD_TO_QUOTE   || "sales@jjriggsequipment.com",
    visit:   env.LEAD_TO_SERVICE || "service@jjriggsequipment.com",
    service: env.LEAD_TO_SERVICE || "service@jjriggsequipment.com",
  };
  const to = env.LEAD_TO || TYPE_TO[type] || "sales@jjriggsequipment.com";
  // BCC every incoming lead (comma-separate for multiple). Dealer notification only.
  // Set LEAD_BCC="" to disable (needed for Resend test mode, which rejects a
  // BCC to any address other than your own account email).
  const bccRaw = env.LEAD_BCC !== undefined ? env.LEAD_BCC : "aaronphelps.c@gmail.com";
  const bcc = bccRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const from = env.LEAD_FROM || "JJ Riggs Website <onboarding@resend.dev>";
  const replyContact = env.LEAD_REPLY_TO || "sales@jjriggsequipment.com";

  const RESEND_URL = env.RESEND_API_URL || "https://api.resend.com/emails";
  async function sendEmail(payload) {
    return fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  // 1) Notify the dealer.
  const res = await sendEmail({
    from,
    to: [to],
    ...(bcc.length ? { bcc } : {}),
    reply_to: email,
    subject,
    text,
    html,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.log("Resend error (lead)", res.status, detail);
    return json({ ok: false, error: "Could not send your request." }, 502);
  }

  // 2) Confirmation auto-reply to the customer (best-effort; never blocks the lead).
  // NOTE: until jjriggsequipment.com is verified in Resend, Resend only delivers to
  // your own account email, so customer confirmations won't arrive until DNS is set.
  // Set SEND_CONFIRMATIONS=off to disable.
  if ((env.SEND_CONFIRMATIONS || "on").toLowerCase() !== "off") {
    const kind =
      type === "service" ? "service request"
      : type === "visit" ? "visit request"
      : "request";
    const cText =
      `Hi ${name},\n\n` +
      `Thanks for reaching out to JJ Riggs Equipment — we got your ${kind} and someone ` +
      `from our sales team will be in touch shortly, usually the same day.\n\n` +
      `Need us sooner? Call 509-738-2985.\n\n` +
      `685 Elm Tree Dr, Colville, WA 99114\n` +
      `JJ Riggs Equipment`;
    const cHtml =
      `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#14171a">` +
      `<p>Hi ${esc(name)},</p>` +
      `<p>Thanks for reaching out to <strong>JJ Riggs Equipment</strong> — we got your ${esc(kind)} ` +
      `and someone from our sales team will be in touch shortly, usually the same day.</p>` +
      `<p>Need us sooner? Call <a href="tel:+15097382985" style="color:#cf1f2a;font-weight:bold">509-738-2985</a>.</p>` +
      `<p style="color:#5a6066;font-size:13px;margin-top:20px">685 Elm Tree Dr, Colville, WA 99114<br>JJ Riggs Equipment</p>` +
      `</div>`;
    try {
      const cRes = await sendEmail({
        from,
        to: [email],
        reply_to: replyContact,
        subject: "We got your request — JJ Riggs Equipment",
        text: cText,
        html: cHtml,
      });
      if (!cRes.ok) console.log("Resend error (confirmation)", cRes.status, await cRes.text().catch(() => ""));
    } catch (e) {
      console.log("Confirmation send failed", e);
    }
  }

  return json({ ok: true });
}
