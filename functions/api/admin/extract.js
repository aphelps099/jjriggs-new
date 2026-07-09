// POST /api/admin/extract — the whole product fact-fetch in one server call.
//
// Client sends { url, name, fields:[...], want_images, model } and gets back
// { fields:{...}, suggested_images:[...], images:[...], source:{url,title} }.
// The server fetches the manufacturer page itself (shared allowlist code in
// ../../_lib-page.js) and calls Anthropic with STRUCTURED OUTPUTS
// (output_config.format json_schema), so the reply's text block is
// API-validated JSON — no prompt-side "return only JSON", no client parsing,
// immune to markdown fences, trailing prose, and thinking blocks.
//
// Reliability rules baked in:
//   - never read content[0]: scan for the text block (claude-sonnet-5 runs
//     adaptive thinking by default, so a thinking block can come first)
//   - stop_reason checked: max_tokens → one retry with a larger cap;
//     refusal → honest message
//   - 429/529/5xx from Anthropic → one retry after a short wait
//   - guards: ADMIN_PASSCODE + session (defense in depth), model allowlist

import { hasValidSession } from "../../_auth.js";
import { fetchPage } from "../../_lib-page.js";

const MODELS = ["claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-opus-4-8"];

// One source of truth for what each extractable field is. The client sends
// key names only; unknown keys are rejected. num=true → number, else string.
const FIELD_DEFS = {
  hp: { num: true, desc: "Engine horsepower as a plain number" },
  series: { desc: "Product series (e.g. Sub-Compact, Compact, Utility)" },
  series_name: { desc: "Series name exactly as the manufacturer writes it (e.g. 40 Series)" },
  engine: { desc: "Engine description, verbatim from the page" },
  transmission: { desc: "Transmission, verbatim" },
  drive: { desc: "Drive type (e.g. 4WD)" },
  fuel: { desc: "Fuel type" },
  loader_lift_lbs: { num: true, desc: "Loader lift capacity in pounds, plain number" },
  blurb: { desc: "1-2 short sentences rewritten from the page's own copy in the JJ Riggs voice: sharp, plain-spoken, like a dealer who knows the equipment; no hype, no exclamation points, no emoji; say \"Open Station\", never \"Open\"; prefer a middot (·) or colon over an em-dash. Never add claims the page doesn't make." },
  cat: { desc: "Mower class: Residential or Commercial" },
  type: { desc: "Mower type (e.g. Zero Turn, Stand-On, Walk-Behind)" },
  decks: { desc: "Deck sizes in inches, comma-separated (e.g. 48, 54, 60)" },
  price: { num: true, desc: "Price in dollars, plain number, only if the page states one" },
  brand: { desc: "Brand name" },
  category: { desc: "Implement category" },
  duty: { desc: "Duty rating (Standard, Heavy, Extreme)" },
  attach: { desc: "Attach system (e.g. Skid steer quick attach)" },
  hitch: { desc: "Hitch (e.g. Cat 1 3-point)" },
  width: { num: true, desc: "Width in FEET, plain number, only when the page states feet" },
  widthIn: { num: true, desc: "Width in INCHES, plain number" },
  weight: { num: true, desc: "Weight in pounds, plain number" },
  hpMin: { num: true, desc: "Minimum tractor horsepower, plain number" },
  hpMax: { num: true, desc: "Maximum tractor horsepower, plain number" },
  sku: { desc: "SKU or part number" },
  fitNote: { desc: "Fitment/compatibility statement, customer-facing" },
};

function buildSchema(fields, wantImages) {
  const props = {};
  for (const f of fields) {
    const def = FIELD_DEFS[f];
    props[f] = {
      description: def.desc + ". null when the page does not state it — NEVER guess or infer.",
      anyOf: [{ type: def.num ? "number" : "string" }, { type: "null" }],
    };
  }
  return {
    type: "object",
    properties: {
      fields: { type: "object", properties: props, required: fields, additionalProperties: false },
      suggested_images: {
        description: wantImages
          ? "Up to 6 indexes from the numbered image candidates most likely to show EXACTLY this model and configuration (match model numbers and cab/open-station in alt text and filenames). When unsure, leave it out — a human picks the final photos. Best first."
          : "Return an empty array.",
        type: "array",
        items: {
          type: "object",
          properties: { i: { type: "integer" }, why: { type: "string" } },
          required: ["i", "why"],
          additionalProperties: false,
        },
      },
    },
    required: ["fields", "suggested_images"],
    additionalProperties: false,
  };
}

function buildPrompt(name, page, wantImages) {
  const imgList = wantImages
    ? (page.images || []).slice(0, 50).map((im, i) => i + ": " + im.src + (im.alt ? " | alt: " + im.alt : "")).join("\n") || "(none)"
    : "(not requested)";
  return `Fill the product template for the dealer site of JJ Riggs Equipment (Colville, WA) from the manufacturer's own page for "${name}".
Use ONLY what this page states: verbatim values, numbers as plain numbers. A field the page doesn't state is null — never guess, infer, or fill from general knowledge.

PAGE TITLE: ${page.title}
IMAGE CANDIDATES:
${imgList}
PAGE TEXT:
${(page.text || "").slice(0, 20000)}`;
}

async function callAnthropic(env, model, prompt, schema, maxTokens) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      output_config: { format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: prompt }],
    }),
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return err("Server extract key not configured", 501);
  if (!env.ADMIN_PASSCODE) return err("Set ADMIN_PASSCODE before adding server keys", 501);
  if (!(await hasValidSession(request, env.ADMIN_PASSCODE))) return err("Signed out — reload the admin page and enter the passcode.", 401);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  const model = MODELS.includes(body.model) ? body.model : MODELS[0];
  const name = String(body.name || "").slice(0, 120);
  const fields = Array.isArray(body.fields) ? body.fields : [];
  if (!name || !body.url || !fields.length) return err("url, name and fields are required", 400);
  for (const f of fields) if (!FIELD_DEFS[f]) return err("Unknown field: " + f, 400);
  const wantImages = !!body.want_images;

  // 1. fetch the manufacturer page server-side (allowlisted)
  let page;
  try {
    page = await fetchPage(body.url);
  } catch (e) {
    return err("Manufacturer page: " + e.message, e.status === 403 ? 403 : 502);
  }

  // 2. call Anthropic with structured outputs; retry once on transient errors
  const schema = buildSchema(fields, wantImages);
  const prompt = buildPrompt(name, page, wantImages);
  let res, data, maxTokens = 4000;
  for (let attempt = 0; ; attempt++) {
    res = await callAnthropic(env, model, prompt, schema, maxTokens);
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const m = data && data.error && (data.error.message || data.error.type);
      return err("Anthropic: " + (m || res.status), 502);
    }
    if (data.stop_reason === "max_tokens" && attempt === 0) {
      maxTokens = 9000; // adaptive thinking spends from the same budget
      continue;
    }
    break;
  }

  // 3. read structurally — never content[0] (a thinking block can come first)
  if (data.stop_reason === "refusal") return err("Claude declined this request (safety filters). Try rephrasing or a different page.", 502);
  if (data.stop_reason === "max_tokens") return err("Claude's reply ran out of room twice — try the claude-sonnet-5 model, or a simpler page.", 502);
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) {
    const types = (data.content || []).map((b) => b.type).join(", ") || "(no content)";
    return err("No text in Claude's reply (blocks: " + types + ", stop_reason: " + data.stop_reason + ")", 502);
  }
  let out;
  try {
    out = JSON.parse(textBlock.text); // API-validated against the schema
  } catch (e) {
    return err("Claude's JSON did not parse: " + e.message, 502, textBlock.text.slice(0, 1500));
  }

  return new Response(
    JSON.stringify({
      fields: out.fields || {},
      suggested_images: out.suggested_images || [],
      images: wantImages ? page.images : [],
      source: { url: page.url, title: page.title },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

function err(message, status, detail) {
  return new Response(JSON.stringify({ error: message, ...(detail ? { detail } : {}) }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
