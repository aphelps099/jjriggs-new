// POST /api/admin/storyboard — flyer image in, video-ad storyboard out.
//
// Client sends { image_b64, media_type, model? } (a print flyer / poster /
// promo graphic, resized client-side to ~1600px) and gets back
// { project, facts }: `project` is a ready-to-load jjriggs-motion project
// JSON (the same format /studio/'s Save/Load uses), `facts` is what was
// read off the flyer for the human to check.
//
// Same reliability pattern as extract.js: Anthropic STRUCTURED OUTPUTS
// (output_config.format json_schema), never read content[0], stop_reason
// checked with one adaptive retry, transient 429/5xx retried once, and
// ADMIN_PASSCODE + session + same-origin guards.
//
// House rules baked into the prompt AND the post-processor:
//   - flyer text is extracted VERBATIM — offers, prices, dates are never
//     composed, "improved", or filled from general knowledge
//   - financing/offer language forces a fine-print scene
//   - the end card (logo · phone · site) is always present
//   - color choices come from a fixed brand-pair enum, never free hexes

import { hasValidSession } from "../../_auth.js";

const MODELS = ["claude-sonnet-5", "claude-haiku-4-5-20251001", "claude-opus-4-8"];
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_B64 = 5_000_000; // ~3.7MB binary — Anthropic's per-image ceiling is 5MB

// Brand color pairs (mirrors the Flash Ads builder — site style guide values).
const COLOR_PAIRS = {
  "red-on-white": { bg: "#fbfbf9", fg: "#cf1f2a", accent: "#14171a" },
  "white-on-red": { bg: "#cf1f2a", fg: "#fbfbf9", accent: "#14171a" },
  "red-on-ink": { bg: "#14171a", fg: "#cf1f2a", accent: "#fbfbf9" },
  "bone-on-ink": { bg: "#14171a", fg: "#f3f1ea", accent: "#cf1f2a" },
  "ink-on-bone": { bg: "#f3f1ea", fg: "#14171a", accent: "#cf1f2a" },
  "bone-on-deep": { bg: "#0f1215", fg: "#f3f1ea", accent: "#cf1f2a" },
};

const TEMPLATES = ["statement", "title", "list", "image", "disclaimer", "endcard"];

const DEFAULT_FINE_PRINT =
  "Financing on approved credit. Advertised price excludes tax, title, freight, and dealer fees. "
  + "Offers subject to change without notice. Equipment availability and specifications may vary. "
  + "See dealer for complete details.";

const BRAND_ENDCARD = {
  kicker: "FAMILY OWNED IN COLVILLE",
  title: "509-738-2985",
  subtitle: "JJ Riggs Equipment · Colville, WA · jjriggsequipment.com",
};

const FLYER_PHOTO_ID = "img-flyer-photo";

const nullable = (desc) => ({ description: desc, anyOf: [{ type: "string" }, { type: "null" }] });

const SCHEMA = {
  type: "object",
  properties: {
    facts: {
      type: "object",
      properties: {
        offer_headline: nullable("The flyer's main offer, verbatim (e.g. \"0% FINANCING\"). null if the flyer has no offer."),
        urgency: nullable("Deadline/urgency line, verbatim (e.g. \"LIMITED TIME ONLY!\")."),
        brand_line: nullable("Dealer/brand tagline on the flyer, verbatim."),
        phone: nullable("Phone number printed on the flyer, digits and dashes as printed."),
        website: nullable("Website printed on the flyer."),
        fine_print_source: nullable("Fine print / disclaimer text printed on the flyer, verbatim. null if none is printed."),
        photo_description: nullable("One sentence describing the flyer's main photo(s) — equipment type, color, setting — so a human can pick a matching photo from the site's library."),
        requires_fine_print: {
          type: "boolean",
          description: "true when the flyer advertises financing, a rate, a rebate, or a price — those legally need a fine-print scene.",
        },
      },
      required: ["offer_headline", "urgency", "brand_line", "phone", "website", "fine_print_source", "photo_description", "requires_fine_print"],
      additionalProperties: false,
    },
    scenes: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      description: "The storyboard, hook-first: offer → urgency → brand/photo → up to 3 value props → CTA. Every text value must appear on the flyer (verbatim or lightly shortened) — never invent copy.",
      items: {
        type: "object",
        properties: {
          template: { type: "string", enum: TEMPLATES, description: "statement = one big line; title = kicker+title+subtitle; list = up to 3 short lines in body (newline-separated); image = full-bleed flyer photo moment; disclaimer = fine print in body; endcard = closing logo/CTA card." },
          kicker: nullable("Small caps line above the title. null when unused."),
          title: nullable("The big line. Statements: 5 words or fewer."),
          subtitle: nullable("Supporting line under the title. null when unused."),
          body: nullable("list: up to 3 newline-separated lines. disclaimer: the fine print. null otherwise."),
          color_pair: { type: "string", enum: Object.keys(COLOR_PAIRS), description: "Brand color pair for the card. Alternate pairs on consecutive statements for the flash effect." },
          duration_ms: { type: "integer", minimum: 1200, maximum: 6000, description: "Scene length. Statements 1800-2500; title/list/image ~3000; disclaimer 4500; endcard 3500." },
          use_flyer_photo: { type: "boolean", description: "true to put the flyer's equipment photo behind this scene (the human supplies the actual photo file)." },
        },
        required: ["template", "kicker", "title", "subtitle", "body", "color_pair", "duration_ms", "use_flyer_photo"],
        additionalProperties: false,
      },
    },
  },
  required: ["facts", "scenes"],
  additionalProperties: false,
};

const PROMPT = `This image is a print flyer / promo graphic for JJ Riggs Equipment, a family-owned TYM + Bad Boy dealership in Colville, WA. Translate it into a short vertical video-ad storyboard.

Rules — these are hard rules, not style suggestions:
- Every piece of text in the storyboard must be READ OFF THE FLYER, verbatim or lightly shortened. Never invent, extend, or "improve" offers, prices, percentages, dates, model names, warranties, or claims. If the flyer doesn't say it, it isn't in the storyboard.
- Hook first: the video opens with the offer (or the strongest line), NOT the logo. Dealer identity comes 2nd or 3rd.
- Statement titles: 5 words or fewer. List scenes: at most 3 lines, the strongest value props on the flyer.
- If the flyer mentions financing, a rate, a rebate, or a price, include a disclaimer scene (use the flyer's own fine print when printed; otherwise leave body null and requires_fine_print true — the server inserts the standard dealer fine print).
- End with an endcard scene carrying the phone number and/or website printed on the flyer.
- Facts fields the flyer doesn't show are null — never guessed.`;

async function callAnthropic(env, model, imageB64, mediaType, maxTokens) {
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
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageB64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });
}

/** Turn the model's storyboard into a loadable jjriggs-motion project. */
function assembleProject(facts, rawScenes) {
  const animFor = (t) => (t === "statement" ? "scale-in" : t === "endcard" || t === "disclaimer" || t === "list" ? "rise" : "rise");
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)));

  let usesPhoto = false;
  const scenes = [];
  for (const s of rawScenes) {
    if (!TEMPLATES.includes(s.template)) continue;
    const pair = COLOR_PAIRS[s.color_pair] ?? COLOR_PAIRS["bone-on-ink"];
    const scene = {
      template: s.template,
      kicker: (s.kicker || "").slice(0, 80),
      title: (s.title || "").slice(0, 90),
      subtitle: (s.subtitle || "").slice(0, 120),
      body: (s.body || "").split("\n").map((l) => l.trim()).filter(Boolean)
        .slice(0, s.template === "disclaimer" ? 12 : 3).join("\n").slice(0, 600),
      duration: clamp(s.duration_ms ?? 3000, 1200, 6000),
      anim: animFor(s.template),
      transition: scenes.length === 0 || s.template === "statement" ? "cut" : "fade",
      align: s.template === "list" ? "lower-left" : "center",
      serifTitle: true,
      listMarkers: false,
      customScheme: { ...pair },
    };
    if (s.use_flyer_photo && (s.template === "title" || s.template === "image" || s.template === "statement")) {
      usesPhoto = true;
      scene.imageId = FLYER_PHOTO_ID;
      scene.kenBurns = "zoom-in";
      scene.overlay = "scrim";
      scene.overlayOpacity = s.template === "image" ? 0.35 : 0.6;
    }
    scenes.push(scene);
  }

  // Fine print is not optional when the offer needs it.
  if (facts.requires_fine_print && !scenes.some((s) => s.template === "disclaimer")) {
    scenes.push({
      template: "disclaimer",
      kicker: "THE FINE PRINT",
      title: "", subtitle: "",
      body: facts.fine_print_source || DEFAULT_FINE_PRINT,
      duration: 4500, anim: "rise", transition: "fade", align: "center",
      serifTitle: true, listMarkers: false,
      customScheme: { ...COLOR_PAIRS["bone-on-deep"] },
    });
  }

  // The end card always closes the ad, and always carries real contact info.
  let end = scenes.find((s) => s.template === "endcard");
  if (!end) {
    end = {
      template: "endcard", kicker: "", title: "", subtitle: "", body: "",
      duration: 3500, anim: "rise", transition: "fade", align: "center",
      serifTitle: true, listMarkers: false,
      customScheme: { ...COLOR_PAIRS["bone-on-ink"] },
    };
    scenes.push(end);
  } else {
    // keep it last (after any inserted disclaimer)
    scenes.splice(scenes.indexOf(end), 1);
    scenes.push(end);
  }
  if (!end.title) end.title = facts.phone || BRAND_ENDCARD.title;
  if (!end.kicker) end.kicker = facts.phone ? "CALL TODAY" : BRAND_ENDCARD.kicker;
  if (!end.subtitle) end.subtitle = facts.website
    ? `JJ Riggs Equipment · Colville, WA · ${facts.website}`
    : BRAND_ENDCARD.subtitle;

  return {
    app: "jjriggs-motion",
    version: 1,
    doc: {
      aspect: "4:5",
      fps: 30,
      fontHeading: "Tactic Sans Bld",
      fontBody: "Questrial",
      fontLabel: "Michroma",
      accentSkewDeg: -13,
      watermark: "",
      showGrain: false,
      audioId: null, audioVolume: 0.7, audioFadeIn: 300, audioFadeOut: 900,
      scenes,
    },
    media: {
      videos: {},
      images: usesPhoto ? { "flyer-photo.jpg": FLYER_PHOTO_ID } : {},
      audio: {},
    },
  };
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return err("Server AI key not configured", 501);
  if (!env.ADMIN_PASSCODE) return err("Set ADMIN_PASSCODE before adding server keys", 501);
  if (!(await hasValidSession(request, env.ADMIN_PASSCODE))) return err("Signed out — open /admin, enter the passcode, then try again.", 401);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return err("Cross-origin not allowed", 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON", 400);
  }
  const model = MODELS.includes(body.model) ? body.model : MODELS[0];
  const mediaType = String(body.media_type || "");
  const imageB64 = String(body.image_b64 || "");
  if (!MEDIA_TYPES.includes(mediaType)) return err("media_type must be image/jpeg, image/png or image/webp", 400);
  if (!imageB64 || imageB64.length > MAX_B64) return err("image_b64 missing or too large (resize the flyer below ~3MB)", 400);
  if (!/^[A-Za-z0-9+/=]+$/.test(imageB64.slice(0, 200))) return err("image_b64 must be plain base64 (no data: prefix)", 400);

  let res, data, maxTokens = 4000;
  for (let attempt = 0; ; attempt++) {
    res = await callAnthropic(env, model, imageB64, mediaType, maxTokens);
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

  if (data.stop_reason === "refusal") return err("Claude declined this image (safety filters). Try a clearer photo of the flyer.", 502);
  if (data.stop_reason === "max_tokens") return err("Claude's reply ran out of room twice — try the claude-sonnet-5 model.", 502);
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

  const facts = out.facts || {};
  const project = assembleProject(facts, Array.isArray(out.scenes) ? out.scenes : []);
  if (project.doc.scenes.length < 2) return err("Couldn't read a usable storyboard off this image — is it a promo flyer?", 422);

  return new Response(JSON.stringify({ project, facts }), {
    headers: { "Content-Type": "application/json" },
  });
}

function err(message, status, detail) {
  return new Response(JSON.stringify({ error: message, ...(detail ? { detail } : {}) }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
