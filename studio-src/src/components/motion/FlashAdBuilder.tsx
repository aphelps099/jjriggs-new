'use client';

/* ═══════════════════════════════════════════════════════
   JJ Riggs Flash Ads — the "Simple mode" ad builder.
   Type 3–6 short sales lines; each becomes a hard-cut
   statement card in alternating inverse brand colors,
   closing on the logo + phone end card. Pure typography —
   no product data, media uploads, or timeline. The same
   deterministic engine as the studio renders preview and
   MP4 export, so what plays is what downloads.

   Phase A+ of QUICK-AD-BUILDER-PLAN.md. Brand constants
   here mirror RiggsMotionStudio.tsx — if the schemes or
   end-card copy change there, change them here too.
   ═══════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MotionDoc, Scene, CustomScheme, AspectId, TextAnimId, AssetMap,
  makeScene, getAspect, docDuration, defaultDoc,
} from '@/lib/motion/types';
import { renderFrame } from '@/lib/motion/render';
import {
  exportMp4, exportWebm, downloadBlob, supportsMp4Export, ExportProgress,
} from '@/lib/motion/export';
import { ensureFontsReady } from '@/lib/motion/fonts';
import './flash-ads.css';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// ── Brand color pairs (site style guide — warm darks, one Bad Boy Red) ──
const RED_ON_WHITE: CustomScheme = { bg: '#fbfbf9', fg: '#cf1f2a', accent: '#14171a' };
const WHITE_ON_RED: CustomScheme = { bg: '#cf1f2a', fg: '#fbfbf9', accent: '#14171a' };
const RED_ON_INK: CustomScheme   = { bg: '#14171a', fg: '#cf1f2a', accent: '#fbfbf9' };
const BONE_ON_INK: CustomScheme  = { bg: '#14171a', fg: '#f3f1ea', accent: '#cf1f2a' };
const INK_ON_BONE: CustomScheme  = { bg: '#f3f1ea', fg: '#14171a', accent: '#cf1f2a' };
const BONE_ON_DEEP: CustomScheme = { bg: '#0f1215', fg: '#f3f1ea', accent: '#cf1f2a' };

interface Rotation {
  id: string;
  label: string;
  hint: string;
  cycle: CustomScheme[];
}

// Fixed rotations of validated pairs — no free color picker by design.
const ROTATIONS: Rotation[] = [
  {
    id: 'red-flash', label: 'Red Flash', hint: 'White → red → black',
    cycle: [RED_ON_WHITE, WHITE_ON_RED, RED_ON_INK],
  },
  {
    id: 'bold-dark', label: 'Bold Dark', hint: 'Black → red → deep',
    cycle: [BONE_ON_INK, WHITE_ON_RED, BONE_ON_DEEP],
  },
  {
    id: 'clean-bone', label: 'Clean Bone', hint: 'Paper → white → red',
    cycle: [INK_ON_BONE, RED_ON_WHITE, WHITE_ON_RED],
  },
];

// SAFETY FLOOR — 600ms/card keeps color changes under ~2 per second,
// inside WCAG 2.3.1's three-flashes-per-second line and Meta's
// no-strobe creative policy. Don't add a faster preset.
const PACES = [
  { id: 'steady', label: 'Steady', ms: 1200 },
  { id: 'quick',  label: 'Quick',  ms: 900 },
  { id: 'rapid',  label: 'Rapid',  ms: 600 },
] as const;

const ANIMS: { id: TextAnimId; label: string }[] = [
  { id: 'scale-in',    label: 'Pop' },
  { id: 'mask-reveal', label: 'Reveal' },
  { id: 'rise',        label: 'Rise' },
];

const AD_ASPECTS: { id: AspectId; label: string; hint: string }[] = [
  { id: '4:5',  label: 'Feed',   hint: '1080×1350' },
  { id: '9:16', label: 'Reel',   hint: '1080×1920' },
  { id: '1:1',  label: 'Square', hint: '1080×1080' },
];

const MAX_CARDS = 6;
const MAX_WORDS = 5;

// Mirrors RIGGS_SCENE_DEFAULTS.endcard / DEFAULT_DISCLAIMER in the studio.
const END_CARD = {
  kicker: 'FAMILY OWNED IN COLVILLE',
  title: 'JJRIGGSEQUIPMENT.COM',
  subtitle: 'JJ Riggs Equipment · Colville, WA · 509-738-2985',
};
const FINE_PRINT =
  'Financing on approved credit. Advertised price excludes tax, title, freight, and dealer fees. '
  + 'Offers subject to change without notice. Equipment availability and specifications may vary. '
  + 'See dealer for complete details.';

// Default lines are all true statements — the offer line is typed in,
// never invented for the user (site rule: never invent offers/prices).
const DEFAULT_LINES = 'TYM TRACTORS\nBAD BOY MOWERS\nFAMILY OWNED IN COLVILLE\nCALL ANDREW TODAY';

function splitLines(raw: string): string[] {
  return raw.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, MAX_CARDS);
}

function wordCount(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

/** Assemble the MotionDoc — the whole template lives in this function. */
function buildFlashDoc(opts: {
  lines: string[];
  rotation: Rotation;
  paceMs: number;
  anim: TextAnimId;
  aspect: AspectId;
  finePrint: boolean;
}): MotionDoc {
  const { lines, rotation, paceMs, anim, aspect, finePrint } = opts;

  const scenes: Scene[] = lines.map((line, i) =>
    makeScene('statement', {
      title: line.toUpperCase(),
      serifTitle: true,
      anim,
      transition: 'cut',
      duration: paceMs,
      customScheme: { ...rotation.cycle[i % rotation.cycle.length] },
      align: 'center',
      textScale: 1,
    }),
  );

  if (finePrint) {
    scenes.push(
      makeScene('disclaimer', {
        kicker: 'THE FINE PRINT',
        body: FINE_PRINT,
        anim: 'rise',
        transition: 'fade',
        duration: 5000,
        customScheme: { ...BONE_ON_INK },
        align: 'center',
      }),
    );
  }

  scenes.push(
    makeScene('endcard', {
      ...END_CARD,
      serifTitle: true,
      anim: 'rise',
      transition: 'fade',
      duration: 3200,
      customScheme: { ...BONE_ON_INK },
    }),
  );

  return {
    ...defaultDoc(),
    aspect,
    fps: 30,
    scenes,
    fontHeading: 'Tactic Sans Bld',
    fontBody: 'Questrial',
    fontLabel: 'Michroma',
    accentSkewDeg: -13,
    showGrain: false,
    watermark: '',
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function fmtSecs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function FlashAdBuilder() {
  const [rawLines, setRawLines] = useState(DEFAULT_LINES);
  const [rotationId, setRotationId] = useState(ROTATIONS[0].id);
  const [paceId, setPaceId] = useState<(typeof PACES)[number]['id']>('quick');
  const [anim, setAnim] = useState<TextAnimId>('scale-in');
  const [aspect, setAspect] = useState<AspectId>('4:5');
  const [finePrint, setFinePrint] = useState(false);
  const finePrintTouched = useRef(false);

  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const lines = splitLines(rawLines);
  const rotation = ROTATIONS.find((r) => r.id === rotationId) ?? ROTATIONS[0];
  const paceMs = PACES.find((p) => p.id === paceId)?.ms ?? 900;
  const doc = buildFlashDoc({ lines, rotation, paceMs, anim, aspect, finePrint });
  const totalMs = docDuration(doc);

  // Financing-style copy legally needs its fine print — suggest it once,
  // but the human's explicit choice always wins after that.
  useEffect(() => {
    if (finePrintTouched.current) return;
    if (/financ|%|apr\b/i.test(rawLines)) setFinePrint(true);
  }, [rawLines]);

  // ── Engine plumbing: fonts, the built-in logo, the preview loop ──
  const docRef = useRef(doc);
  docRef.current = doc;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const exportingRef = useRef(exporting);
  exportingRef.current = exporting;
  const assetsRef = useRef<AssetMap>({});
  const playheadRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeElRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ensureFontsReady(['Tactic Sans Bld', 'Questrial', 'Michroma']);
  }, []);

  useEffect(() => {
    let alive = true;
    loadImage(`${ASSET_BASE}/jjriggs-logo-white.png`)
      .then((img) => {
        if (!alive) return;
        assetsRef.current['__logo-white'] = {
          id: '__logo-white', name: 'jjriggs-logo-white.png', url: img.src, img,
        };
      })
      .catch(() => { /* end card just skips the mark */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last;
      last = now;
      const d = docRef.current;
      const total = docDuration(d);
      if (playingRef.current && total > 0 && !exportingRef.current) {
        playheadRef.current = (playheadRef.current + dt) % total;
      } else if (playheadRef.current > total) {
        playheadRef.current = 0;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const { w: W, h: H } = getAspect(d.aspect);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      renderFrame(ctx, d, playheadRef.current, assetsRef.current, {});

      if (timeElRef.current) {
        timeElRef.current.textContent = `${fmtSecs(playheadRef.current)} / ${fmtSecs(total)}`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const restart = useCallback(() => {
    playheadRef.current = 0;
    setPlaying(true);
  }, []);

  // ── Export ──
  const handleExport = useCallback(async () => {
    if (exportingRef.current) return;
    if (splitLines(rawLines).length === 0) {
      setStatus({ ok: false, msg: 'Type at least one line first.' });
      return;
    }
    setExporting(true);
    setStatus(null);
    setProgress(0);
    const onP = (p: ExportProgress) => setProgress(p.ratio);
    try {
      await ensureFontsReady(['Tactic Sans Bld', 'Questrial', 'Michroma']);
      const d = docRef.current;
      const stamp = `${d.aspect.replace(':', 'x')}`;
      if (supportsMp4Export()) {
        const blob = await exportMp4(d, assetsRef.current, onP, undefined, { audioBuffer: null });
        downloadBlob(blob, `jjriggs-flash-ad-${stamp}.mp4`);
        setStatus({ ok: true, msg: 'MP4 saved to your downloads.' });
      } else {
        const blob = await exportWebm(d, assetsRef.current, onP, undefined, {});
        downloadBlob(blob, `jjriggs-flash-ad-${stamp}.webm`);
        setStatus({ ok: true, msg: 'Saved as WebM — use Chrome or Edge for MP4.' });
      }
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Export failed — try again.' });
    } finally {
      setExporting(false);
    }
  }, [rawLines]);

  const longLines = lines.filter((l) => wordCount(l) > MAX_WORDS);
  const { w: aw, h: ah } = getAspect(aspect);

  return (
    <div className="fa-root">
      <aside className="fa-controls">

        <section className="fa-block">
          <h2 className="fa-label">Your lines <span className="fa-count">{lines.length}/{MAX_CARDS} cards</span></h2>
          <textarea
            className="fa-lines"
            value={rawLines}
            onChange={(e) => setRawLines(e.target.value)}
            rows={6}
            placeholder={'0% FINANCING\nON TYM TRACTORS\nENDS AUGUST 31\nCALL ANDREW'}
            spellCheck={false}
          />
          <p className="fa-hint">
            One line per card — short sells. Keep each line to {MAX_WORDS} words.
            {longLines.length > 0 && (
              <span className="fa-warn"> {longLines.length === 1 ? 'One line is' : `${longLines.length} lines are`} over {MAX_WORDS} words — trim for punch.</span>
            )}
          </p>
        </section>

        <section className="fa-block">
          <h2 className="fa-label">Colors</h2>
          <div className="fa-seg" role="group">
            {ROTATIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`fa-seg-btn${r.id === rotationId ? ' is-on' : ''}`}
                onClick={() => setRotationId(r.id)}
                title={r.hint}
              >
                <span className="fa-swatches" aria-hidden>
                  {r.cycle.map((c, i) => (
                    <span key={i} className="fa-swatch" style={{ background: c.bg, color: c.fg }}>A</span>
                  ))}
                </span>
                {r.label}
              </button>
            ))}
          </div>
        </section>

        <section className="fa-block">
          <h2 className="fa-label">Pace</h2>
          <div className="fa-seg" role="group">
            {PACES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`fa-seg-btn${p.id === paceId ? ' is-on' : ''}`}
                onClick={() => setPaceId(p.id)}
              >
                {p.label} <span className="fa-sub">{fmtSecs(p.ms)}/card</span>
              </button>
            ))}
          </div>
          <p className="fa-hint">Rapid is the safe limit — faster flashing risks Facebook rejection and viewer safety.</p>
        </section>

        <section className="fa-block">
          <h2 className="fa-label">Text motion</h2>
          <div className="fa-seg" role="group">
            {ANIMS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`fa-seg-btn${a.id === anim ? ' is-on' : ''}`}
                onClick={() => setAnim(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </section>

        <section className="fa-block">
          <h2 className="fa-label">Size</h2>
          <div className="fa-seg" role="group">
            {AD_ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`fa-seg-btn${a.id === aspect ? ' is-on' : ''}`}
                onClick={() => setAspect(a.id)}
                title={a.hint}
              >
                {a.label} <span className="fa-sub">{a.id}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="fa-block">
          <label className="fa-check">
            <input
              type="checkbox"
              checked={finePrint}
              onChange={(e) => { finePrintTouched.current = true; setFinePrint(e.target.checked); }}
            />
            Add financing fine print
          </label>
          <p className="fa-hint">Turns on by itself when your lines mention financing or a % rate.</p>
        </section>

        <section className="fa-block">
          <button type="button" className="fa-export" onClick={handleExport} disabled={exporting}>
            {exporting ? `Rendering… ${Math.round(progress * 100)}%` : `Download video (${fmtSecs(totalMs)})`}
          </button>
          {exporting && (
            <div className="fa-bar"><span style={{ width: `${progress * 100}%` }} /></div>
          )}
          {status && (
            <p className={`fa-status${status.ok ? ' is-ok' : ' is-err'}`} role="status">{status.msg}</p>
          )}
          <p className="fa-hint">The end card with the logo and phone number is always included. Use Chrome or Edge for MP4.</p>
        </section>

      </aside>

      <main className="fa-stage">
        <div className="fa-canvas-wrap" style={{ aspectRatio: `${aw} / ${ah}` }}>
          <canvas ref={canvasRef} className="fa-canvas" />
        </div>
        <div className="fa-transport">
          <button type="button" className="fa-t-btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="fa-t-btn" onClick={restart}>Restart</button>
          <span className="fa-time" ref={timeElRef} />
        </div>
      </main>
    </div>
  );
}
