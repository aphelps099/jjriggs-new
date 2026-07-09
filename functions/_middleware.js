// Site-wide Pages middleware — the admin passcode gate.
// Everything outside /admin/ and /api/admin/ passes straight through
// (the public site, /api/lead, the fetch proxies are untouched).
//
// Until the ADMIN_PASSCODE env var is set, this does nothing, so the
// site behaves exactly as before setup. Once set: /admin/* serves a
// login screen to strangers, /api/admin/* returns 401 JSON.

import { hasValidSession } from "./_auth.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const path = new URL(request.url).pathname;

  const gated = path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/");
  if (!gated) return next();
  if (path === "/api/admin/login") return next();
  if (!env.ADMIN_PASSCODE) return next(); // not configured yet — legacy mode

  if (await hasValidSession(request, env.ADMIN_PASSCODE)) return next();

  if (path.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "Signed out — reload the admin page and enter the passcode." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(LOGIN_HTML, {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const LOGIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>JJ Riggs — Admin sign in</title>
<meta name="robots" content="noindex,nofollow">
<link href="https://fonts.googleapis.com/css2?family=Questrial&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Michroma&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Questrial",system-ui,sans-serif;background:#14171a;color:#f3f1ea;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-size:16px}
.box{width:100%;max-width:430px;background:#1b2025;border:1px solid rgba(255,255,255,.12);border-top:4px solid #cf1f2a;padding:2rem}
h1{font-family:"Michroma",sans-serif;font-size:1.15rem;margin-bottom:.4rem}
p{color:#8b939c;font-size:.95rem;margin-bottom:1.3rem}
label{display:block;font-size:.74rem;letter-spacing:.07em;text-transform:uppercase;color:#8b939c;margin-bottom:.4rem;font-weight:600}
input{width:100%;font-family:inherit;font-size:1.15rem;padding:.85rem .9rem;border:1.5px solid rgba(255,255,255,.25);background:#14171a;color:#fff;border-radius:0}
input:focus{outline:2px solid #cf1f2a;border-color:#cf1f2a}
button{width:100%;margin-top:1rem;font-family:inherit;font-weight:700;font-size:1.05rem;letter-spacing:.03em;padding:.9rem;border:0;background:#cf1f2a;color:#fff;cursor:pointer}
button:hover{background:#a5151f}
button:disabled{opacity:.6}
.err{display:none;margin-top:.9rem;color:#ff9a9a;font-size:.95rem}
.note{margin-top:1.3rem;color:#5d656e;font-size:.83rem}
</style>
</head>
<body>
<form class="box" id="f">
  <h1>JJ Riggs Admin</h1>
  <p>This area is for the shop. Enter the admin passcode — you'll stay signed in on this device for 30 days.</p>
  <label for="pc">Admin passcode</label>
  <input id="pc" type="password" autocomplete="current-password" autofocus>
  <button id="go" type="submit">Sign in</button>
  <div class="err" id="err">That's not it — check the passcode and try again.</div>
  <div class="note">Locked out? Call Aaron. Customers: this page isn't part of the store — head to jjriggsequipment.com.</div>
</form>
<script>
document.getElementById('f').addEventListener('submit',async function(e){
  e.preventDefault();
  var b=document.getElementById('go');b.disabled=true;b.textContent='Checking…';
  try{
    var r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({passcode:document.getElementById('pc').value})});
    if(r.ok){location.reload();return;}
  }catch(err){}
  document.getElementById('err').style.display='block';
  b.disabled=false;b.textContent='Sign in';
});
</script>
</body>
</html>`;
