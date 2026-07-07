# JJ Riggs Motion — source

The equipment video editor for JJ Riggs Equipment (Colville, WA), live at
**`/studio/`** on the site (aphelps099.github.io/jjriggs-new/studio/).
Upload walk-around clips, wrap them in the unit package, and export a
finished MP4 — everything runs in the browser, no video backend.

Ported from the ZFIT Motion studio (`aphelps099/zebs`, `studio-src/`) per
the handoff plan there (`docs/handoff-next-version.md`) and rebranded to
the JJ Riggs visual style guide: warm ink darks, Bone paper, one Bad Boy
Red, Tactic Sans Bld / Questrial / Michroma, sharp 4px corners, and the
−13° signature diagonal on accent marks and scene wipes.

## What it does

- **Inventory Builder** — type a unit, price, one-liner, and spec lines;
  one click seeds the whole video: brand sting → unit title → spec sheet →
  walk-around video (price sweeps in as a lower third) → price counter →
  fine print → end card. A price scene always brings the fine print.
- **Video scenes** — upload MP4/MOV/WebM, trim the start, match scene
  length to the clip, clip audio on/mute + volume. Text overlays with
  their own in/out timing, plus timed tip/text/caption cues.
- **Presenter cam** — a small talking-head clip in the lower third of any
  scene.
- **Editing** — undo/redo, split at playhead (S), J/K/L shuttle, drag
  timeline edges to trim, drag cards to reorder, live thumbnails,
  safe-area guides.
- **Project** — save/load JSON, autosave to the browser, media relinks by
  filename on re-upload.
- **Audio** — music bed with fades, auto-duck under voiceover, per-clip
  sound. **Captions** — SRT import burns subtitle pills into the export.
- **Export** — MP4 (H.264 + AAC in Chrome/Edge) rendered frame-by-frame;
  the file matches the preview exactly.

Use **Chrome or Edge** — MP4 export needs WebCodecs.

## Brand notes (from the style guide)

- Schemes: Ink `#14171a` · Deep `#0f1215` · Bone `#f3f1ea` · Red `#cf1f2a`
  · White `#fbfbf9`. Warm darks, never pure `#000`/`#fff`. Red is rare on
  purpose — one red thing per screen.
- Type: Tactic Sans Bld (display, self-hosted from the site kit),
  Questrial (body), Michroma (kickers, spec labels, watermark — the
  document's "Label font").
- The −13° lean lives in `doc.accentSkewDeg` — it skews tip bars and the
  wipe transition edge. Engine default is 0; the JJ Riggs default doc sets
  −13.

## Editing the studio

```bash
cd studio-src
npm install
npm run dev        # local dev at http://localhost:3000/jjriggs-new/studio
npm run deploy     # builds and replaces ../studio with the fresh export
```

Commit both `studio-src/` (source) and `studio/` (the built site GitHub
Pages serves), plus the repo-root `.nojekyll` (required — without it Pages
drops the `_next/` asset folder and the app won't load).

If the site moves off the `/jjriggs-new/` project path, change `BASE` in
`next.config.js` and run `npm run deploy` again.

## Layout

```
studio-src/
  src/lib/motion/       engine — scene model, deterministic canvas renderer,
                        audio mixdown, WebCodecs MP4 export (brand-free)
  src/components/motion RiggsMotionStudio editor + JJ Riggs chrome
  public/               Tactic Sans + Questrial + Michroma, JJ Riggs lockup
studio/                 built static site (what Pages serves) — regenerate
                        with `npm run deploy`, don't edit by hand
```

The engine is shared with the ZFIT studio in `aphelps099/zebs` — it
contains no brand, so engine improvements cherry-pick cleanly between the
two repos.
