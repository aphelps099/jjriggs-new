# JJ Riggs — Visual Style Guide

*A working reference for anyone building JJ Riggs pages, ads, or graphics. Written for a junior designer: not just what the rules are, but why they exist and how to not break them.*

---

## 0. How to read this

Every value below is pulled straight from the live site's CSS — these aren't suggestions, they're the actual tokens the pages render with. When you're unsure, match the token. When you want to be creative, be creative inside the system, not against it. The whole point of a system is that one person can design a new page and it still looks like it came from the same shop.

Two mental models to hold the whole time:

**The brand is a work truck, not a showroom.** Dark, warm, high-contrast, one loud red. It should feel dependable and a little bit tough — never soft, pastel, or corporate-clean.

**One idea, repeated.** Great identity systems win by repetition, not variety. Here the repeated idea is a hard diagonal and a single red. Say it a hundred times; don't invent a second thing.

---

## 1. The brand in one breath

Warm near-black paper, one confident red, condensed uppercase display type, and a −13° forward lean. Serious, local, in-motion. "Buy it from the people who service it."

---

## 2. Color

The palette is small on purpose. Four families do all the work: **ink** (the darks), **paper/white** (the lights), **red** (the one accent), and **steel** (muted grays for hierarchy). Green is a bit-player.

### The palette

| Token | Hex | Name | What it's for |
|---|---|---|---|
| `--red` | `#cf1f2a` | Bad Boy Red | THE accent. CTAs, one-word headline emphasis, active states, the diagonal rules. |
| `--red-deep` | `#a5151f` | Deep Red | Hover/pressed red, and red-on-red depth. Never the primary red. |
| `--ink` | `#14171a` | Ink | Primary near-black. Body text on paper, and the main dark background. |
| `--ink-2` | `#1b2025` | Ink 2 | Slightly lifted dark — panels/cards sitting on top of Ink. |
| `--ink-3` | `#0f1215` | Ink 3 | The deepest dark. Mega-menu, footer, overlays. |
| `--bone` | `#f3f1ea` | Bone | Warm paper. The default light background. Not white. |
| `--white` | `#fbfbf9` | Off-White | Text/elements on dark. A hair warm — we don't use pure `#ffffff` for big fields. |
| `--steel` | `#8b939c` | Steel | Mid gray. Secondary text, captions, "30–50 HP" sub-labels. |
| `--steel-2` | `#c3c8ce` | Light Steel | Light gray. Muted labels on dark, faint dividers, eyebrows. |
| `--green` | `#1d7a3c` | Utility Green | Sparingly — "open," "in stock," financing checkmarks. Never decorative. |

### Dividers (hairlines)

| Token | Value | Use on |
|---|---|---|
| `--line` | `rgba(255,255,255,.12)` | Hairline on dark backgrounds |
| `--line-2` | `rgba(255,255,255,.06)` | Fainter hairline on dark |
| `--lined` | `rgba(20,23,26,.14–.32)` | Hairline on light (Bone) backgrounds |

Lines are transparency, not solid gray. That's deliberate — a border that's 12% white sits *into* the surface instead of drawing a hard box on top of it. Use these instead of picking a random gray.

### How to use color

The engine is **contrast, not color.** Almost everything is Ink or Bone. Red shows up rarely and therefore lands hard — that's the entire trick. If you find yourself using red for three different things on one screen, you've spent the budget; pull two of them back to Ink or Steel.

Hierarchy on a dark section goes: **Off-White** (primary) → **Steel-2 / Steel** (secondary) → **Red** (the one thing you want clicked or read first). On a light (Bone) section it's **Ink** → **Steel** → **Red**.

**Common mistakes to avoid**

- Using pure black `#000` or pure white `#fff` for big fields. Ours are warm — `--ink` and `--white`. Pure values look cheap and cold next to Bone.
- Red body text. Red is for accents and buttons, never paragraphs.
- Two reds fighting. `--red` is the star; `--red-deep` only exists for its hover/shadow.
- Green as decoration. It's a status color. If it isn't communicating "yes / open / go," don't reach for it.

---

## 3. Typography

Three typefaces, three jobs. Learn the roles and you'll rarely pick wrong.

### The three voices

**Tactic Sans Bld — the loud voice (display).**
Condensed, bold, all-caps. This is the shouting: headlines, section titles, model names, the wordmark. Self-hosted in `/fonts` (`tactic-sans-bld.woff2` / `.woff`), weight range 400–800, `font-display: swap`. Set it UPPERCASE with tight tracking and tight leading. It is *already* heavy, so heading weight stays at `400` — don't bold it further.

**Questrial — the calm voice (body & UI).**
A clean geometric sans (Google Fonts, single weight 400). Everything you actually *read*: paragraphs, descriptions, nav links, button labels. Sentence case. This is the quiet counterweight that makes Tactic Sans feel loud.

**Michroma — the spec-sheet voice (technical labels).**
Wide, mono-ish geometric (Google Fonts). Small technical moments: eyebrows, spec numerals, HP figures, wide letter-spaced kickers. It signals "engineering / data." Use it small and spaced-out; never for a paragraph — it's exhausting at length.

**Fallback:** display falls back to **Bebas Neue** → `sans-serif`; body falls back to Helvetica Neue → Helvetica → Arial → system-ui. Always keep the fallbacks in the stack so the page still reads if a web font stalls.

### The canonical stacks (copy these exactly)

```css
/* Display / headings */
font-family: "Tactic Sans Bld", "Bebas Neue", sans-serif;

/* Technical labels / eyebrows / spec numerals */
font-family: "Michroma", "Tactic Sans Bld", sans-serif;

/* Body & UI */
font-family: "Questrial", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
```

> Heads-up: some `*-preview` and `*-redesign` files contain experiments (Geist, Inter, Barlow Condensed, Switzer). Those are **not** the brand. The live trio is Tactic Sans + Questrial + Michroma, with Bebas Neue as display fallback. If you see anything else, it's a lab file — don't copy it into production.

### Type scale & settings

| Role | Font | Size | Case | Tracking | Leading |
|---|---|---|---|---|---|
| Hero display | Tactic Sans | `clamp(3.4rem, 7vw, 5.4rem)` | UPPER | `.012em` | `0.82` |
| Section title (H1–H3) | Tactic Sans | `clamp(2rem, 4vw, 3.2rem)` | UPPER | `.012em` | `0.94` |
| Eyebrow / kicker | Michroma or Questrial | `0.72rem` | UPPER | `.2em` | 1 |
| Body | Questrial | `17px` | Sentence | normal | `1.55` |
| UI / button label | Questrial | `0.82rem` | Sentence/UPPER | `.04em` | 1 |
| Small caption | Questrial / Steel | `0.9rem` | Sentence | normal | 1.4 |

The signature of the type system is **tight display, airy body.** Headlines are packed (leading below 1, letters nearly touching); body breathes at 1.55. That contrast in *density* is as much a brand cue as the fonts themselves.

### The red-word trick

Headlines are Ink (or Off-White), with **one** operative word in red. It's built into the CSS — inside a heading, `<em>` renders as `--red`, upright (not italic):

```html
<h2>Buy it from the people who <em>service it</em></h2>
```

Rules for the red word: pick the word that carries the meaning (the verb or the payoff), never more than one or two words, and never the whole line. The red is a spotlight — spotlight one thing.

### Eyebrows

The small kicker above a headline: Michroma or Questrial, `0.72rem`, weight 600, `letter-spacing: .2em`, uppercase, colored Steel-2. It sets context in a whisper before the headline shouts. Keep it to 1–4 words.

---

## 4. Layout & spacing tokens

| Token | Value | Meaning |
|---|---|---|
| `--maxw` | `1280px` | Max content width. Content stops here; background can bleed full-width. |
| `--gut` | `clamp(1.4rem, 5vw, 4rem)` | Side gutter. Scales with viewport — tight on phones, generous on desktop. |
| Corner radius | `3–4px` default | Corners are **sharp.** 4px on cards/buttons, 3px on small chips. |
| Pills / dots | `999px` / `50%` | Only for genuinely round things — avatar dots, icon circles, tag pills. |

Radius is a brand decision, not a detail. This system is **hard-cornered** — 4px reads as "engineered / industrial." Don't round cards to 12–16px; that's the soft SaaS look and it fights the trucks. Reserve full-round strictly for dots and pills.

Spacing rhythm: lean on the gutter token for edges and keep vertical spacing on a consistent step (roughly 8px base — `.5rem`, `1rem`, `1.7rem`, `2.5rem` show up throughout). When in doubt, more air between sections, less inside a component.

---

## 5. The diagonal — our signature move

The one geometric idea the whole brand repeats is a **−13° skew** (`transform: skewX(-13deg)`). It's the slash between the category cards, the little red rule inside menu items, the forward lean on dividers. It appears everywhere on purpose.

Why −13°: it reads as *forward motion and work* — a plow line, a machine leaning into the job. It's aggressive enough to feel intentional, shallow enough to stay legible.

How to use it well:

- Keep the angle consistent. It's **−13°** — not 12, not 15. One angle, repeated, is what makes it feel designed rather than random.
- Use it on structure (dividers, rules, accents, image edges), not on type you need people to read.
- A thin red skewed rule is the house "bullet" / separator. Reach for that before a plain line when you want energy.
- Occasionally a whole section tilts a hair (`skewY(-2deg)`) for a dynamic band — use rarely, as a moment, not a default.

One diagonal, said often. That repetition is the brand.

---

## 6. Buttons & UI

**Base button** — inline-flex, `gap: .6rem`, weight 600, `font-size: .82rem`, `letter-spacing: .04em`, `padding: 1rem 1.7rem`, `border: 1.5px solid transparent`, `border-radius: 4px`.

| Variant | Look | Use |
|---|---|---|
| `.btn-red` | Solid `--red` fill, white text | **Primary CTA** — one per view. "View details," "Get a Quote." |
| `.btn-ghost` | Transparent, `rgba(255,255,255,.32–.65)` border, white text | Secondary on **dark** backgrounds. |
| `.btn-dark` | Transparent, `rgba(20,23,26,.3)` border, Ink text | Secondary on **light** (Bone) backgrounds. |

Rules: one primary red button per screen — if everything is primary, nothing is. Pair it with a ghost/dark secondary for the "or…" action. Hover deepens toward `--red-deep`. Keep labels short and confident ("Schedule a Visit," not "Click here to schedule a visit with us today").

Note: on some full-dark hero sections `.btn-red` intentionally inverts to a white fill with Ink text so the CTA still pops against a red-heavy photo. That inversion is deliberate — match it if you're building a dark hero, otherwise stay solid red.

---

## 7. Photography

Two modes, two jobs. Mixing them up is the fastest way to make the site look amateur — so this rule is load-bearing.

**Isolated studio renders** — the machine cut out on white/transparent (`*_model_photo_1.png`). Clean, catalog, comparable. Use for **wayfinding and comparison**: category cards, the nav mega-menu, size selectors, thumbnails, spec tables. When the job is "help me choose," the background must disappear so the machines line up like a lineup.

**Real-lot photography** — actual units at the Colville lot, blue sky, gravel, the shop in the back (`bb4035.jpg`, `bb5055.jpg`, etc.). Warm, credible, "these are really here." Use for **hero and featured** spots: the top of a product page, the featured slide of a carousel. When the job is "make me trust you," the real yard does the work.

The rule in one line: **isolated to compare, real-lot to convince.** Never drop a lifestyle hero into a comparison grid, and never put a floating cut-out where a hero should sell trust. (This is exactly the fix we made on the category cards — the size cards must stay on isolated renders even when the featured hero uses a real-lot photo.)

Treatment: real-lot photos stay honest — natural color, no heavy filters. Isolated renders sit on Bone or white with a soft contact shadow so they don't look pasted.

---

## 8. Voice & copy

Sharp. Serious. A spark of creativity. Short sentences that sound like a person who knows the equipment.

- **Say less.** "Family owned in Colville." "For neighbors, not ticket numbers." Confidence is brevity.
- **Headlines shout, body explains.** Uppercase display for the hook; plain sentence-case Questrial for the substance.
- **One red word.** Match the copy to the color trick — write headlines with a single operative word worth spotlighting.
- **Punctuation with character.** Use the middot separator for spec strings — `Compact · 35 HP · Open Station`. It's cleaner and more branded than commas or slashes.
- **Skip the em-dash cliché.** Prefer the middot, a colon, or just a full stop. Interesting punctuation, not the default AI dash.
- **Never cutesy.** No exclamation-point hype, no emoji, no "🚜 deals!!" This is a tough, dependable brand. Wit is welcome; goofiness isn't.

---

## 9. Quick reference (copy-paste)

```css
:root{
  /* color */
  --red:#cf1f2a; --red-deep:#a5151f;
  --ink:#14171a; --ink-2:#1b2025; --ink-3:#0f1215;
  --bone:#f3f1ea; --white:#fbfbf9;
  --steel:#8b939c; --steel-2:#c3c8ce;
  --green:#1d7a3c;
  --line:rgba(255,255,255,.12); --line-2:rgba(255,255,255,.06);
  --lined:rgba(20,23,26,.32);
  /* layout */
  --maxw:1280px; --gut:clamp(1.4rem,5vw,4rem);
}
/* type */
--display:"Tactic Sans Bld","Bebas Neue",sans-serif;   /* UPPER, tracking .012em, leading .94 */
--tech:"Michroma","Tactic Sans Bld",sans-serif;        /* labels/eyebrows, tracking .2em */
--body:"Questrial","Helvetica Neue",Helvetica,Arial,system-ui,sans-serif; /* 17px / 1.55 */
/* signature */
transform:skewX(-13deg);   /* the diagonal — always -13° */
border-radius:4px;         /* sharp corners */
```

---

## 10. Do / Don't

**Do**
- Keep red rare so it stays loud.
- Set display type UPPERCASE, tight, weight 400.
- Use the −13° diagonal as the repeated signature.
- Isolated renders to compare; real-lot photos to convince.
- Warm darks and warm off-white — never pure `#000` / `#fff`.
- Sharp 4px corners.

**Don't**
- Use red for body text or three unrelated things at once.
- Bold or letter-space Tactic Sans into mush, or set long paragraphs in Michroma.
- Round cards to soft SaaS radii.
- Mix experimental fonts (Geist/Inter/Barlow/Switzer) from the lab files into production.
- Put lifestyle heroes in comparison grids, or floating cut-outs where trust needs to be earned.

---

*Tokens verified against the live CSS (`header.css` + page `:root` blocks) and the current image system. If a value here ever disagrees with the code, the code wins — flag it and we'll reconcile.*
