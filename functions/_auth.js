// Shared session logic for the admin tools' passcode gate.
// Underscore-prefixed: not routed, import-only.
//
// Sessions are HMAC-signed expiry tokens (Web Crypto), keyed off
// ADMIN_PASSCODE — no database, no state, revoke-all by changing the
// passcode. Cookie is HttpOnly + Secure + SameSite=Lax.

const COOKIE = "jj_admin_sess";
const MAX_AGE = 30 * 24 * 3600; // 30 days

const enc = new TextEncoder();

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function makeSessionCookie(passcode) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = exp + "." + (await hmac(passcode, "jj-admin." + exp));
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export async function hasValidSession(request, passcode) {
  if (!passcode) return false;
  const cookies = request.headers.get("Cookie") || "";
  const m = cookies.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  if (!m) return false;
  const [expStr, sig] = m[1].split(".");
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Date.now() / 1000) return false;
  const expect = await hmac(passcode, "jj-admin." + exp);
  return timingSafeEqual(sig || "", expect);
}

export async function checkPasscode(supplied, passcode) {
  // hash both sides so length differences leak nothing
  const a = await hmac("jj-cmp", String(supplied || ""));
  const b = await hmac("jj-cmp", String(passcode || ""));
  return timingSafeEqual(a, b);
}
