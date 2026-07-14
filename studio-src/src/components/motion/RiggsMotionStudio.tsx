'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MotionDoc, Scene, TemplateId, AssetMap, ImageAsset, VideoAsset, VideoMap, AudioAsset, AudioMap,
  CustomScheme, TransitionId, TextCue,
  ASPECTS, TEMPLATES, TEXT_ANIMS, TRANSITIONS, KEN_BURNS, OVERLAYS, ALIGNMENTS,
  PIP_POSITIONS, TEXT_SCALES, CUE_STYLES, CUE_POSITIONS, KEN_BURNS_EASES, KEN_BURNS_SPEEDS,
  defaultDoc, makeScene, makeCue, getAspect, resolveScheme, docDuration, sceneAt,
} from '@/lib/motion/types';
import { harvestLibrary, fetchLibraryPhoto, fetchableUrl, LibraryModel } from '@/lib/site-library';
import { renderFrame } from '@/lib/motion/render';
import {
  exportMp4, exportWebm, exportPng, downloadBlob, supportsMp4Export,
} from '@/lib/motion/export';
import { loadAudioAsset, tryDecodeVideoAudio, musicGainAt, renderMixdown } from '@/lib/motion/audio';
import { FontOption, builtinFonts, registerFontFile, ensureFontsReady } from '@/lib/motion/fonts';
import { Field, TextInput, TextArea, Seg, Slider, Section } from './controls';
import './motion-studio.css';
import './motion-studio-riggs.css';

/* ═══════════════════════════════════════════════════════
   RiggsMotionStudio — the equipment video editor for
   JJ Riggs Equipment (Colville, WA). The site's visual
   system baked in: warm ink darks, Bone paper, one Bad
   Boy Red, Tactic Sans display / Questrial body /
   Michroma tech labels, and the −13° signature diagonal
   on accent marks and wipes. On top of the Motion Studio
   engine: uploaded walk-around clips as scenes with
   timed text overlays and price tips, a presenter-cam
   lower third, music with ducking, voiceover, and an
   Inventory Builder that seeds a full unit video
   (sting → unit title → spec sheet → walk-around →
   price → fine print → end card). MP4 export muxes the
   full soundtrack in.
   ═══════════════════════════════════════════════════════ */

const HEADING_OPTS = [
  { id: 'sans', label: 'Body' },
  { id: 'serif', label: 'Display' },
] as const;

const CLIP_SOUND_OPTS = [
  { id: 'on', label: 'On' },
  { id: 'mute', label: 'Mute' },
] as const;

// Public-asset prefix — the GitHub Pages basePath (/jjriggs-new/studio)
const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
// The site root above the studio — where the inventory CSV lives
const SITE_BASE = ASSET_BASE.replace(/\/studio\/?$/, '');

/** Minimal CSV parser (quoted fields, embedded commas/newlines). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      cur.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.some((f) => f.trim())) rows.push(cur);
      cur = [];
    } else {
      field += c;
    }
  }
  if (field || cur.length) {
    cur.push(field);
    if (cur.some((f) => f.trim())) rows.push(cur);
  }
  const [head, ...body] = rows;
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

/** Snap a Ken Burns travel multiplier to the nearest preset id. */
function nearestSpeedId(speed?: number): typeof KEN_BURNS_SPEEDS[number]['id'] {
  const v = speed ?? 1;
  return v < 0.75 ? '0.5' : v < 1.5 ? '1' : '2';
}

/** 3×3 focal-point picker — which part of the photo the cover crop keeps. */
function FocalGrid({ fx, fy, onPick }: {
  fx?: number; fy?: number; onPick: (x: number, y: number) => void;
}) {
  const STOPS = [0, 0.5, 1];
  const NAMES = ['left', 'center', 'right'];
  const ROWS = ['top', 'middle', 'bottom'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 24px)', gap: 3 }}>
      {STOPS.map((y, yi) => STOPS.map((x, xi) => {
        const on = Math.abs((fx ?? 0.5) - x) < 0.17 && Math.abs((fy ?? 0.5) - y) < 0.17;
        return (
          <button
            key={`${x}-${y}`}
            type="button"
            title={`${ROWS[yi]} ${NAMES[xi]}`}
            aria-label={`Focus ${ROWS[yi]} ${NAMES[xi]}`}
            aria-pressed={on}
            onClick={() => onPick(x, y)}
            style={{
              width: 24, height: 24, cursor: 'pointer', borderRadius: 3, padding: 0,
              border: `1.5px solid ${on ? '#cf1f2a' : 'rgba(255,255,255,0.25)'}`,
              background: on ? '#cf1f2a' : '#1b2025',
            }}
          />
        );
      }))}
    </div>
  );
}

/** Snap an arbitrary scale to the nearest preset id for the Seg control. */
function nearestScaleId(scale: number): typeof TEXT_SCALES[number]['id'] {
  let best = TEXT_SCALES[TEXT_SCALES.length - 1];
  let bestDist = Infinity;
  for (const s of TEXT_SCALES) {
    const d = Math.abs(Number(s.id) - (scale || 1));
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best.id;
}

// JJ Riggs brand schemes — tokens from the site's visual style guide.
// Warm darks and warm off-white, never pure #000/#fff; one Bad Boy Red.
const RIGGS_SCHEMES: { id: string; label: string; bg: string; fg: string; accent: string }[] = [
  { id: 'ink',   label: 'Ink',   bg: '#14171a', fg: '#fbfbf9', accent: '#cf1f2a' },
  { id: 'deep',  label: 'Deep',  bg: '#0f1215', fg: '#fbfbf9', accent: '#cf1f2a' },
  { id: 'bone',  label: 'Bone',  bg: '#f3f1ea', fg: '#14171a', accent: '#cf1f2a' },
  { id: 'red',   label: 'Red',   bg: '#cf1f2a', fg: '#fbfbf9', accent: '#14171a' },
  { id: 'white', label: 'White', bg: '#fbfbf9', fg: '#14171a', accent: '#cf1f2a' },
];

const RIGGS_INK: CustomScheme = { bg: '#14171a', fg: '#fbfbf9', accent: '#cf1f2a' };
const RIGGS_BONE: CustomScheme = { bg: '#f3f1ea', fg: '#14171a', accent: '#cf1f2a' };
const DEFAULT_BRAND: CustomScheme = { ...RIGGS_INK };

const DEFAULT_DISCLAIMER =
  'Financing on approved credit. Advertised price excludes tax, title, freight, and dealer fees. '
  + 'Offers subject to change without notice. Equipment availability and specifications may vary. '
  + 'See dealer for complete details.';

// JJ Riggs default copy per template — dealer voice: short, confident,
// middot-separated spec strings, no hype punctuation.
const RIGGS_SCENE_DEFAULTS: Partial<Record<TemplateId, Partial<Scene>>> = {
  title: {
    kicker: 'JJ RIGGS EQUIPMENT',
    title: 'BAD BOY 4035',
    subtitle: 'Buy it from the people who service it.',
    serifTitle: true,
  },
  statement: {
    title: 'BUILT FOR THE LONG HAUL.',
    serifTitle: true,
  },
  stat: {
    statPrefix: '',
    statValue: 35,
    statSuffix: ' HP',
    attribution: 'Compact · 4WD · Loader ready',
    serifTitle: true,
  },
  list: {
    kicker: 'SPEC SHEET',
    body: 'Engine · 35 HP diesel\nTransmission · HST 3-range\nLoader · quick-attach bucket\nWarranty · see dealer for coverage',
    align: 'lower-left',
    // Plain lines by default — flip Numbers on per scene for the 01/02/03 markers
    listMarkers: false,
  },
  quote: {
    title: 'They had the part on the shelf and the tractor loaded by noon.',
    attribution: 'Colville customer',
    serifTitle: true,
  },
  image: {
    kicker: 'JUST ARRIVED',
    title: 'BAD BOY 4035',
    subtitle: 'Compact · 35 HP · Open Station',
    serifTitle: true,
  },
  video: {
    kicker: 'BAD BOY 4035',
    title: '',
    subtitle: '',
    align: 'lower-left',
    overlay: 'gradient-bottom',
    overlayOpacity: 0.55,
    serifTitle: true,
  },
  disclaimer: {
    kicker: 'THE FINE PRINT',
    body: DEFAULT_DISCLAIMER,
    duration: 6000,
  },
  endcard: {
    title: 'JJRIGGSEQUIPMENT.COM',
    kicker: 'FAMILY OWNED IN COLVILLE',
    subtitle: 'JJ Riggs Equipment · Colville, WA · 509-738-2985',
    serifTitle: true,
  },
};

function riggsScene(template: TemplateId, overrides: Partial<Scene> = {}): Scene {
  return makeScene(template, {
    customScheme: { ...RIGGS_INK },
    ...(RIGGS_SCENE_DEFAULTS[template] ?? {}),
    ...overrides,
  });
}

function riggsDefaultDoc(): MotionDoc {
  return {
    ...defaultDoc(),
    scenes: [riggsScene('title'), riggsScene('list'), riggsScene('endcard')],
    fontHeading: 'Tactic Sans Bld',
    fontBody: 'Questrial',
    fontLabel: 'Michroma',
    // The brand signature: −13° forward lean on accent marks and wipes
    accentSkewDeg: -13,
    audioFadeIn: 2000,
    audioFadeOut: 2500,
    audioVolume: 0.7,
  };
}

const RIGGS_FONTS: FontOption[] = [
  { family: 'Tactic Sans Bld', label: 'Tactic Sans Bld (display)', source: 'local' },
  { family: 'Questrial', label: 'Questrial (body)', source: 'local' },
  { family: 'Michroma', label: 'Michroma (tech labels)', source: 'local' },
  ...builtinFonts(),
];

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function loadVideoElement(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = async () => {
      // Screen/MediaRecorder captures often report duration = Infinity until
      // the tail is parsed — seek far past the end to force the real value.
      if (!Number.isFinite(video.duration)) {
        await new Promise<void>((res) => {
          const timer = setTimeout(res, 4000);
          video.ondurationchange = () => {
            if (Number.isFinite(video.duration)) {
              clearTimeout(timer);
              video.ondurationchange = null;
              video.currentTime = 0;
              res();
            }
          };
          video.currentTime = Number.MAX_SAFE_INTEGER;
        });
      }
      resolve(video);
    };
    video.onerror = () => reject(new Error('Could not read that video file'));
    video.src = url;
  });
}

function fmtTime(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const AUTOSAVE_KEY = 'jjriggs-motion-autosave-v1';

/** Parse an SRT file into ms-timed entries. Tolerant of missing index lines. */
function parseSrt(srt: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  for (const block of srt.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    const m = lines[ti].match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);
    if (!m) continue;
    const ms = (h: string, mn: string, s: string, f: string) =>
      Number(h) * 3600000 + Number(mn) * 60000 + Number(s) * 1000 + Number(f.padEnd(3, '0'));
    const start = ms(m[1], m[2], m[3], m[4]);
    const end = ms(m[5], m[6], m[7], m[8]);
    const text = lines.slice(ti + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim();
    if (text && end > start) out.push({ start, end, text });
  }
  return out;
}

/** Mini render of a scene for the strip — same renderer, scaled down. */
function SceneThumb({ scene, doc, assets, videos }: {
  scene: Scene; doc: MotionDoc; assets: AssetMap; videos: VideoMap;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const c = ref.current;
      if (!c) return;
      const { w: W, h: H } = getAspect(doc.aspect);
      const scale = 156 / W;
      c.width = 156;
      c.height = Math.max(24, Math.round(H * scale));
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      try {
        // Late in the scene: text fully entered, exit not yet started
        renderFrame(ctx, { ...doc, scenes: [scene], showGrain: false },
          Math.max(0, scene.duration - 600), assets, videos);
      } catch { /* thumbnail is best-effort */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [scene, doc, assets, videos]);
  return <canvas ref={ref} className="ms-scene-thumb" />;
}

function sameScheme(a: CustomScheme | null | undefined, b: { bg: string; fg: string; accent: string }): boolean {
  return !!a && a.bg.toLowerCase() === b.bg.toLowerCase()
    && a.fg.toLowerCase() === b.fg.toLowerCase()
    && a.accent.toLowerCase() === b.accent.toLowerCase();
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="ms-color-row">
      <span className="ms-color-label">{label}</span>
      <input
        type="color"
        className="ms-color-input"
        value={HEX_RE.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        key={value}
        type="text"
        className="ms-input ms-color-hex"
        defaultValue={value}
        onBlur={(e) => { const v = e.target.value.trim(); if (HEX_RE.test(v)) onChange(v); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = (e.target as HTMLInputElement).value.trim();
            if (HEX_RE.test(v)) onChange(v);
          }
        }}
      />
    </div>
  );
}

export default function RiggsMotionStudio() {
  // ── Document & selection ──
  const [doc, setDoc] = useState<MotionDoc>(riggsDefaultDoc);
  const [selectedId, setSelectedId] = useState<string | null>(doc.scenes[0]?.id ?? null);
  const docRef = useRef(doc);
  docRef.current = doc;

  const selected = doc.scenes.find((s) => s.id === selectedId) ?? null;
  const selectedIndex = selected ? doc.scenes.indexOf(selected) : -1;
  const totalMs = docDuration(doc);
  const aspect = getAspect(doc.aspect);

  // ── Assets ──
  const assetsRef = useRef<AssetMap>({});
  const [images, setImages] = useState<ImageAsset[]>([]);
  const videosRef = useRef<VideoMap>({});
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const audioRef = useRef<AudioMap>({});
  const [audioTracks, setAudioTracks] = useState<AudioAsset[]>([]);

  // Built-in JJ Riggs mark for end cards (brand uploads still win).
  // Only the white-outline lockup exists, so light Bone end cards fall
  // back to the typeset wordmark — upload a dark mark to override.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const [id, url] of [
        ['__logo-white', `${ASSET_BASE}/jjriggs-logo-white.png`], // dark backgrounds
      ] as const) {
        try {
          const img = await loadImage(url);
          if (alive) assetsRef.current[id] = { id, name: url, url, img };
        } catch { /* logo missing — end card just skips it */ }
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Brand ──
  const [brandColors, setBrandColors] = useState<CustomScheme>(DEFAULT_BRAND);
  const [logoLight, setLogoLight] = useState<ImageAsset | null>(null); // light mark, dark backgrounds
  const [logoDark, setLogoDark] = useState<ImageAsset | null>(null);   // dark mark, light backgrounds
  const logoLightRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (file: File, kind: 'light' | 'dark') => {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const id = kind === 'light' ? '__logo-brand-light' : '__logo-brand-dark';
      const asset: ImageAsset = { id, name: file.name, url, img };
      assetsRef.current[id] = asset;
      (kind === 'light' ? setLogoLight : setLogoDark)(asset);
    } catch {
      URL.revokeObjectURL(url);
    }
  };

  const removeLogo = (kind: 'light' | 'dark') => {
    const id = kind === 'light' ? '__logo-brand-light' : '__logo-brand-dark';
    const existing = assetsRef.current[id];
    if (existing) URL.revokeObjectURL(existing.url);
    delete assetsRef.current[id];
    (kind === 'light' ? setLogoLight : setLogoDark)(null);
  };

  const applyBrandToAll = () => {
    setDoc((d) => ({ ...d, scenes: d.scenes.map((s) => ({ ...s, customScheme: { ...brandColors } })) }));
  };

  const resetToRiggsInk = () => {
    setDoc((d) => ({ ...d, scenes: d.scenes.map((s) => ({ ...s, customScheme: { ...RIGGS_INK } })) }));
  };

  // ── Fonts ──
  const [fontOptions, setFontOptions] = useState<FontOption[]>(RIGGS_FONTS);
  const [fontStatus, setFontStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureFontsReady([doc.fontHeading, doc.fontBody, doc.fontLabel]);
  }, [doc.fontHeading, doc.fontBody, doc.fontLabel]);

  const handleFontFiles = async (files: FileList) => {
    const added: FontOption[] = [];
    let err: string | null = null;
    for (const file of Array.from(files)) {
      try {
        added.push(await registerFontFile(file));
      } catch {
        err = `Couldn't read ${file.name}`;
      }
    }
    if (added.length) {
      setFontOptions((opts) => {
        const known = new Set(opts.map((o) => o.family));
        return [...opts, ...added.filter((a) => !known.has(a.family))];
      });
      setFontStatus({ ok: true, msg: `Registered: ${added.map((a) => a.family).join(', ')}` });
    } else if (err) {
      setFontStatus({ ok: false, msg: err });
    }
  };

  // ── Playback ──
  const [playing, setPlaying] = useState(true);
  const [loopMode, setLoopMode] = useState(true);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const loopRef = useRef(loopMode);
  loopRef.current = loopMode;
  const playheadRef = useRef(0);
  const exportingRef = useRef(false);
  /** J/K/L shuttle rate: 1 = normal, 2/4 = fast, negative = reverse. */
  const rateRef = useRef(1);
  const [showGuides, setShowGuides] = useState(false);
  const guidesRef = useRef(false);
  guidesRef.current = showGuides;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const playheadElRef = useRef<HTMLDivElement>(null);
  const timeElRef = useRef<HTMLSpanElement>(null);
  const [stageDims, setStageDims] = useState({ w: 640, h: 360 });

  // Fit the stage into the available space
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const pad = 8;
      const bw = el.clientWidth - pad;
      const bh = el.clientHeight - pad;
      const ratio = aspect.w / aspect.h;
      let w = bw;
      let h = w / ratio;
      if (h > bh) { h = bh; w = h * ratio; }
      setStageDims({ w: Math.max(200, w), h: Math.max(120, h) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect.w, aspect.h]);

  /**
   * Keep media elements in step with the playhead: the active video scene's
   * clip plays/seeks along (with its own sound per scene settings), everything
   * else pauses, and the music bed follows the shared fade curve. Skipped
   * entirely during export — the exporter owns the elements then.
   */
  const syncMedia = useCallback(() => {
    if (exportingRef.current) return;
    const d = docRef.current;
    const total = docDuration(d);
    const { index, local } = sceneAt(d, playheadRef.current);
    const active = d.scenes[index];
    const voDurMs = d.voId && audioRef.current[d.voId]
      ? audioRef.current[d.voId].buffer.duration * 1000 : 0;
    // Media elements only free-run at normal forward speed; while
    // shuttling (J/L fast or reverse) they pause and chase by seeking.
    const smooth = playingRef.current && rateRef.current === 1;

    for (const id in videosRef.current) {
      const v = videosRef.current[id].video;
      const isMain = !!active && active.template !== 'image' && active.videoId === id;
      const isPip = !!active && !isMain && active.pipVideoId === id;
      if (isMain || isPip) {
        const trim = isMain ? active.videoTrimStart : active.pipTrimStart;
        const muted = isMain ? active.videoMuted : active.pipMuted;
        const vol = isMain ? active.videoVolume : active.pipVolume;
        const targetS = (trim + local) / 1000;
        v.muted = muted;
        v.volume = Math.max(0, Math.min(1, vol));
        if (smooth) {
          if (v.paused) v.play().catch(() => {});
          if (Math.abs(v.currentTime - targetS) > 0.3) v.currentTime = targetS;
        } else {
          if (!v.paused) v.pause();
          if (Math.abs(v.currentTime - targetS) > 0.05) v.currentTime = targetS;
        }
      } else if (!v.paused) {
        v.pause();
      }
    }

    for (const id in audioRef.current) {
      const a = audioRef.current[id];
      const isBed = d.audioId === id && total > 0;
      const isVo = !isBed && d.voId === id && total > 0;
      if (isBed) {
        a.element.loop = true;
        a.element.volume = Math.max(0, Math.min(1, musicGainAt(d, playheadRef.current, total, voDurMs)));
        if (smooth) {
          if (a.element.paused) a.element.play().catch(() => {});
          const targetS = (playheadRef.current / 1000) % Math.max(0.01, a.buffer.duration);
          if (Math.abs(a.element.currentTime - targetS) > 0.4) a.element.currentTime = targetS;
        } else if (!a.element.paused) {
          a.element.pause();
        }
      } else if (isVo) {
        a.element.loop = false;
        a.element.volume = Math.max(0, Math.min(1, d.voVolume));
        const relS = (playheadRef.current - d.voStart) / 1000;
        const within = relS >= 0 && relS < a.buffer.duration;
        if (smooth && within) {
          if (a.element.paused) a.element.play().catch(() => {});
          if (Math.abs(a.element.currentTime - relS) > 0.4) a.element.currentTime = relS;
        } else if (!a.element.paused) {
          a.element.pause();
        }
      } else if (!a.element.paused) {
        a.element.pause();
      }
    }
  }, []);

  // Render loop — draws every frame from the deterministic renderer
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
        playheadRef.current += dt * rateRef.current;
        if (playheadRef.current <= 0 && rateRef.current < 0) {
          playheadRef.current = 0;
          rateRef.current = 1;
          setPlaying(false);
        } else if (playheadRef.current >= total) {
          if (loopRef.current && rateRef.current === 1) playheadRef.current %= total;
          else { playheadRef.current = total - 1; rateRef.current = 1; setPlaying(false); }
        }
      }

      syncMedia();

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
      renderFrame(ctx, d, playheadRef.current, assetsRef.current, videosRef.current);

      // Safe-area guides — preview only, never in exports (the exporters
      // render offline through renderFrame directly)
      if (guidesRef.current) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);   // action safe
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.strokeRect(W * 0.1, H * 0.1, W * 0.8, H * 0.8);     // title safe
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.moveTo(W / 2 - 24, H / 2); ctx.lineTo(W / 2 + 24, H / 2);
        ctx.moveTo(W / 2, H / 2 - 24); ctx.lineTo(W / 2, H / 2 + 24);
        ctx.stroke();
        ctx.restore();
      }

      // Imperative UI updates (no React re-render at 60fps)
      if (playheadElRef.current && total > 0) {
        playheadElRef.current.style.left = `${(playheadRef.current / total) * 100}%`;
      }
      if (timeElRef.current) {
        timeElRef.current.textContent = `${fmtTime(playheadRef.current)} / ${fmtTime(total)}`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [syncMedia]);

  // ── Keyboard: space play/pause, J/K/L shuttle, arrows nudge,
  //    S split, Del remove scene, ⌘Z/⇧⌘Z undo/redo ──
  // Latest handlers reach the mount-once listener through this ref.
  const keysRef = useRef({
    undo: () => {}, redo: () => {}, split: () => {}, del: () => {},
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) keysRef.current.redo(); else keysRef.current.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); keysRef.current.redo(); return; }
      if (mod) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          rateRef.current = 1;
          setPlaying((p) => !p);
          break;
        case 'k': case 'K':
          rateRef.current = 1;
          setPlaying(false);
          break;
        case 'l': case 'L':
          // repeat presses double the forward speed (1× → 2× → 4×)
          rateRef.current = playingRef.current && rateRef.current >= 1
            ? Math.min(4, rateRef.current * 2) : 1;
          setPlaying(true);
          break;
        case 'j': case 'J':
          // reverse shuttle, doubling the same way
          rateRef.current = playingRef.current && rateRef.current <= -1
            ? Math.max(-4, rateRef.current * 2) : -1;
          setPlaying(true);
          break;
        case 'ArrowRight': {
          e.preventDefault();
          setPlaying(false);
          const d = docRef.current;
          playheadRef.current = Math.min(Math.max(0, docDuration(d) - 1),
            playheadRef.current + (e.shiftKey ? 1000 : 1000 / d.fps));
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          setPlaying(false);
          playheadRef.current = Math.max(0,
            playheadRef.current - (e.shiftKey ? 1000 : 1000 / docRef.current.fps));
          break;
        }
        case 'Home':
          playheadRef.current = 0;
          break;
        case 'End':
          playheadRef.current = Math.max(0, docDuration(docRef.current) - 1);
          break;
        case 's': case 'S':
          keysRef.current.split();
          break;
        case 'Delete': case 'Backspace':
          e.preventDefault();
          keysRef.current.del();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Doc/scene mutation helpers ──
  const patchDoc = useCallback((p: Partial<MotionDoc>) => {
    setDoc((d) => ({ ...d, ...p }));
  }, []);

  const patchScene = useCallback((id: string, p: Partial<Scene>) => {
    setDoc((d) => ({ ...d, scenes: d.scenes.map((s) => (s.id === id ? { ...s, ...p } : s)) }));
  }, []);

  // ── Timed text cues (tips / extra snippets on a scene) ──
  const addCue = useCallback((sceneId: string) => {
    setDoc((d) => ({
      ...d,
      scenes: d.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        const cue = makeCue({
          start: Math.min(2000, Math.max(0, s.duration - 4000)),
          duration: Math.min(4000, Math.max(1000, s.duration - 1000)),
        });
        return { ...s, cues: [...(s.cues ?? []), cue] };
      }),
    }));
  }, []);

  const patchCue = useCallback((sceneId: string, cueId: string, p: Partial<TextCue>) => {
    setDoc((d) => ({
      ...d,
      scenes: d.scenes.map((s) => (s.id === sceneId
        ? { ...s, cues: (s.cues ?? []).map((c) => (c.id === cueId ? { ...c, ...p } : c)) }
        : s)),
    }));
  }, []);

  const removeCue = useCallback((sceneId: string, cueId: string) => {
    setDoc((d) => ({
      ...d,
      scenes: d.scenes.map((s) => (s.id === sceneId
        ? { ...s, cues: (s.cues ?? []).filter((c) => c.id !== cueId) }
        : s)),
    }));
  }, []);

  // ── Undo / redo ──
  // Doc snapshots are cheap (immutable updates share scene objects).
  // Rapid edits — slider drags, typing — coalesce via the 350ms debounce.
  // Undo/redo set the doc to stack[index] by reference, so the effect's
  // identity check skips re-pushing those without any extra flag.
  const histRef = useRef<{ stack: MotionDoc[]; index: number }>({
    stack: [doc], index: 0,
  });
  const [histTick, setHistTick] = useState(0);

  /** Commit the current doc as a snapshot if it isn't one already. */
  const flushHistory = useCallback(() => {
    const h = histRef.current;
    const cur = docRef.current;
    if (h.stack[h.index] === cur) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(cur);
    if (h.stack.length > 120) h.stack.shift();
    h.index = h.stack.length - 1;
  }, []);

  useEffect(() => {
    const h = histRef.current;
    if (h.stack[h.index] === doc) return;
    const timer = setTimeout(() => {
      // An undo/redo/flush may have already committed this state
      if (h.stack[h.index] === doc) return;
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(doc);
      if (h.stack.length > 120) h.stack.shift();
      h.index = h.stack.length - 1;
      setHistTick((n) => n + 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [doc]);

  const undo = useCallback(() => {
    // Commit any still-debouncing edit first so undo steps back exactly
    // one state — not past the edit the user just made.
    flushHistory();
    const h = histRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    setDoc(h.stack[h.index]);
    setHistTick((n) => n + 1);
  }, [flushHistory]);

  const redo = useCallback(() => {
    const h = histRef.current;
    if (h.index >= h.stack.length - 1) return;
    h.index += 1;
    setDoc(h.stack[h.index]);
    setHistTick((n) => n + 1);
  }, []);

  const canUndo = histTick >= 0
    && (histRef.current.index > 0 || histRef.current.stack[histRef.current.index] !== doc);
  const canRedo = histTick >= 0 && histRef.current.index < histRef.current.stack.length - 1;

  // ── Split at playhead ──
  const splitAtPlayhead = useCallback(() => {
    const d = docRef.current;
    const { index, local } = sceneAt(d, playheadRef.current);
    const scene = d.scenes[index];
    if (!scene || local < 500 || scene.duration - local < 500) return;
    const cut = Math.round(local);
    const textTail = scene.textEnd > 0 ? scene.textEnd - cut : 0;
    const first: Scene = {
      ...scene,
      duration: cut,
      textEnd: scene.textEnd > 0 && scene.textEnd <= cut ? scene.textEnd : 0,
      cues: (scene.cues ?? []).filter((c) => c.start < cut),
    };
    const second: Scene = {
      ...scene,
      id: `${scene.id}-b-${Math.floor(Math.random() * 1e6)}`,
      duration: scene.duration - cut,
      transition: 'cut',
      videoTrimStart: scene.template !== 'image' && scene.videoId ? scene.videoTrimStart + cut : scene.videoTrimStart,
      pipTrimStart: scene.pipVideoId ? scene.pipTrimStart + cut : scene.pipTrimStart,
      // Text that already finished in the first half stays hidden here
      textStart: scene.textEnd > 0 && textTail <= 0
        ? scene.duration - cut
        : Math.max(0, (scene.textStart || 0) - cut),
      textEnd: textTail > 0 ? textTail : 0,
      cues: (scene.cues ?? [])
        .filter((c) => c.start >= cut)
        .map((c) => ({ ...c, start: c.start - cut })),
    };
    setDoc((dd) => {
      const scenes = [...dd.scenes];
      scenes.splice(index, 1, first, second);
      return { ...dd, scenes };
    });
    setSelectedId(second.id);
  }, []);

  // ── Project save / load / autosave ──
  // The JSON carries the doc plus a filename→id manifest for media;
  // binaries stay on disk. Re-uploading a file by the same name relinks
  // it to its old asset id, so scenes rejoin automatically.
  const savedMediaRef = useRef<{
    videos: Record<string, string>;
    images: Record<string, string>;
    audio: Record<string, string>;
  }>({ videos: {}, images: {}, audio: {} });
  const [missingMedia, setMissingMedia] = useState<string[]>([]);
  const [projectStatus, setProjectStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const projectPayload = useCallback(() => {
    const nameMap = (m: Record<string, { name: string }>) => {
      const out: Record<string, string> = {};
      for (const id in m) if (!id.startsWith('__')) out[m[id].name] = id;
      return out;
    };
    return JSON.stringify({
      app: 'jjriggs-motion',
      version: 1,
      doc: docRef.current,
      media: {
        videos: { ...savedMediaRef.current.videos, ...nameMap(videosRef.current) },
        images: { ...savedMediaRef.current.images, ...nameMap(assetsRef.current) },
        audio: { ...savedMediaRef.current.audio, ...nameMap(audioRef.current) },
      },
    });
  }, []);

  /** Returns the number of media files awaiting re-upload, or -1 on a bad file. */
  const applyLoadedProject = useCallback((raw: string): number => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.app !== 'jjriggs-motion' || !parsed.doc?.scenes?.length) return -1;
      // Merge over fresh defaults so docs saved before a field existed load clean
      const scenes: Scene[] = parsed.doc.scenes.map((s: Partial<Scene>) => ({
        ...makeScene((s.template as TemplateId) ?? 'title'),
        ...s,
      }));
      const doc2: MotionDoc = { ...riggsDefaultDoc(), ...parsed.doc, scenes };
      savedMediaRef.current = {
        videos: { ...(parsed.media?.videos ?? {}) },
        images: { ...(parsed.media?.images ?? {}) },
        audio: { ...(parsed.media?.audio ?? {}) },
      };
      const missing: string[] = [];
      for (const kind of ['videos', 'images', 'audio'] as const) {
        const loaded: Record<string, unknown> = kind === 'videos' ? videosRef.current
          : kind === 'images' ? assetsRef.current : audioRef.current;
        for (const name in savedMediaRef.current[kind]) {
          if (loaded[savedMediaRef.current[kind][name]]) delete savedMediaRef.current[kind][name];
          else missing.push(name);
        }
      }
      setMissingMedia(missing);
      setDoc(doc2);
      setSelectedId(doc2.scenes[0]?.id ?? null);
      playheadRef.current = 0;
      setPlaying(false);
      return missing.length;
    } catch {
      return -1;
    }
  }, []);

  const saveProject = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([projectPayload()], { type: 'application/json' }), `jjriggs-project-${stamp}.json`);
    setProjectStatus({ ok: true, msg: 'Project saved. Media files travel by name — keep them alongside the JSON.' });
  };

  const handleProjectFile = async (file: File) => {
    const missing = applyLoadedProject(await file.text());
    setProjectStatus(missing < 0
      ? { ok: false, msg: 'Could not read that project file.' }
      : {
        ok: true,
        msg: missing > 0
          ? `Project loaded — re-upload ${missing} media file(s) by the same name to relink.`
          : 'Project loaded.',
      });
  };

  const newProject = () => {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* private mode */ }
    savedMediaRef.current = { videos: {}, images: {}, audio: {} };
    setMissingMedia([]);
    const d = riggsDefaultDoc();
    setDoc(d);
    setSelectedId(d.scenes[0].id);
    playheadRef.current = 0;
    setProjectStatus({ ok: true, msg: 'New project.' });
  };

  // Autosave the doc (not the media binaries) to this browser as you edit
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(AUTOSAVE_KEY, projectPayload()); } catch { /* quota/private mode */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [doc, projectPayload]);

  // Restore the autosaved session once on mount
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const missing = applyLoadedProject(raw);
      if (missing >= 0) {
        setProjectStatus({
          ok: true,
          msg: missing > 0
            ? `Session restored — re-upload ${missing} media file(s) by the same name to relink.`
            : 'Session restored from autosave.',
        });
      }
    } catch { /* ignore */ }
  }, [applyLoadedProject]);

  // ── Captions (SRT import) ──
  const srtInputRef = useRef<HTMLInputElement>(null);
  const [captionStatus, setCaptionStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSrtFile = async (file: File) => {
    const entries = parseSrt(await file.text());
    if (!entries.length) {
      setCaptionStatus({ ok: false, msg: 'No captions found — is that an SRT file?' });
      return;
    }
    // Slice the global SRT times into scene-local caption cues
    const d = docRef.current;
    const perScene = new Map<string, TextCue[]>();
    let placed = 0;
    let acc = 0;
    for (const s of d.scenes) {
      const cues = entries
        .filter((en) => en.start >= acc && en.start < acc + s.duration)
        .map((en) => makeCue({
          style: 'caption',
          label: '',
          text: en.text,
          start: en.start - acc,
          duration: Math.max(300, Math.min(en.end, acc + s.duration) - en.start),
          position: 'lower-center',
        }));
      if (cues.length) { perScene.set(s.id, cues); placed += cues.length; }
      acc += s.duration;
    }
    setDoc((dd) => ({
      ...dd,
      scenes: dd.scenes.map((s) => ({
        ...s,
        cues: [...(s.cues ?? []).filter((c) => c.style !== 'caption'), ...(perScene.get(s.id) ?? [])],
      })),
    }));
    const skipped = entries.length - placed;
    setCaptionStatus({
      ok: true,
      msg: `${placed} caption${placed === 1 ? '' : 's'} placed${skipped > 0 ? ` — ${skipped} fell past the end of the timeline` : ''}.`,
    });
  };

  const clearCaptions = () => {
    setDoc((dd) => ({
      ...dd,
      scenes: dd.scenes.map((s) => ({ ...s, cues: (s.cues ?? []).filter((c) => c.style !== 'caption') })),
    }));
    setCaptionStatus({ ok: true, msg: 'Captions cleared.' });
  };


  const sceneStart = useCallback((index: number) => {
    return docRef.current.scenes.slice(0, index).reduce((a, s) => a + s.duration, 0);
  }, []);

  const seekToScene = useCallback((index: number) => {
    playheadRef.current = sceneStart(index) + 1;
  }, [sceneStart]);

  const addScene = (template: TemplateId) => {
    const scene = riggsScene(template);
    setDoc((d) => {
      const i = selectedIndex >= 0 ? selectedIndex + 1 : d.scenes.length;
      const scenes = [...d.scenes];
      scenes.splice(i, 0, scene);
      return { ...d, scenes };
    });
    setSelectedId(scene.id);
  };

  const duplicateScene = (id: string) => {
    setDoc((d) => {
      const i = d.scenes.findIndex((s) => s.id === id);
      if (i < 0) return d;
      const copy = { ...d.scenes[i], id: `${d.scenes[i].id}-copy-${Math.floor(Math.random() * 1e6)}` };
      const scenes = [...d.scenes];
      scenes.splice(i + 1, 0, copy);
      setSelectedId(copy.id);
      return { ...d, scenes };
    });
  };

  const removeScene = (id: string) => {
    setDoc((d) => {
      const i = d.scenes.findIndex((s) => s.id === id);
      const scenes = d.scenes.filter((s) => s.id !== id);
      if (selectedId === id) setSelectedId(scenes[Math.max(0, i - 1)]?.id ?? null);
      return { ...d, scenes };
    });
  };

  const moveScene = (id: string, dir: -1 | 1) => {
    setDoc((d) => {
      const i = d.scenes.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.scenes.length) return d;
      const scenes = [...d.scenes];
      [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
      return { ...d, scenes };
    });
  };

  // ── Timeline scrubbing ──
  const timelineRef = useRef<HTMLDivElement>(null);

  const scrubTo = useCallback((clientX: number) => {
    const el = timelineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const total = docDuration(docRef.current);
    playheadRef.current = ratio * total;
    const { index } = sceneAt(docRef.current, playheadRef.current);
    const scene = docRef.current.scenes[index];
    if (scene) setSelectedId(scene.id);
  }, []);

  const onTimelinePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    scrubTo(e.clientX);
    const move = (ev: PointerEvent) => scrubTo(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ── Timeline trim-drag (right edge of a block sets its duration) ──
  const onTrimStart = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const el = timelineRef.current;
    if (!el) return;
    const d0 = docRef.current;
    const scene = d0.scenes.find((s) => s.id === id);
    if (!scene) return;
    const msPerPx = docDuration(d0) / el.getBoundingClientRect().width;
    const x0 = e.clientX;
    const dur0 = scene.duration;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const nd = Math.round(Math.max(1000, dur0 + (ev.clientX - x0) * msPerPx) / 100) * 100;
      patchScene(id, { duration: nd });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ── Scene-card drag & drop reorder ──
  const dragIndexRef = useRef(-1);

  const moveSceneTo = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to) return;
    setDoc((d) => {
      if (from >= d.scenes.length || to >= d.scenes.length) return d;
      const scenes = [...d.scenes];
      const [moved] = scenes.splice(from, 1);
      scenes.splice(to, 0, moved);
      return { ...d, scenes };
    });
  };

  // ── Image upload ──
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      // A saved project references this filename — reuse its old id so
      // the scenes that pointed at it rejoin automatically.
      const savedId = savedMediaRef.current.images[file.name];
      const asset: ImageAsset = { id: savedId ?? `img-${Date.now().toString(36)}`, name: file.name, url, img };
      assetsRef.current[asset.id] = asset;
      setImages((list) => [...list, asset]);
      if (savedId) {
        delete savedMediaRef.current.images[file.name];
        setMissingMedia((m) => m.filter((n) => n !== file.name));
      } else if (selected) {
        patchScene(selected.id, { imageId: asset.id });
      }
    } catch {
      URL.revokeObjectURL(url);
    }
  };

  // ── Website image library (the site's own js/*.data.js photos) ──
  const [libOpen, setLibOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryModel[] | null>(null);
  const [libModel, setLibModel] = useState('');
  const [libBusy, setLibBusy] = useState(false);

  const toggleLibrary = () => {
    setLibOpen((o) => !o);
    if (library === null) harvestLibrary().then(setLibrary).catch(() => setLibrary([]));
  };

  const pickLibraryPhoto = async (url: string, label: string) => {
    setLibBusy(true);
    try {
      await handleImageFile(await fetchLibraryPhoto(url, label));
    } catch { /* photo didn't load — bin unchanged */ }
    setLibBusy(false);
  };

  // ── Video upload (main clip + coach cam) ──
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pipInputRef = useRef<HTMLInputElement>(null);
  const [videoStatus, setVideoStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleVideoFile = async (file: File, target: 'main' | 'pip') => {
    const url = URL.createObjectURL(file);
    setVideoStatus(null);
    try {
      const video = await loadVideoElement(url);
      // Relink: a saved project references this filename — reuse the old id
      const savedId = savedMediaRef.current.videos[file.name];
      const asset: VideoAsset = {
        id: savedId ?? `vid-${Date.now().toString(36)}`,
        name: file.name,
        url,
        video,
        duration: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 10000,
        width: video.videoWidth,
        height: video.videoHeight,
        audioBuffer: null,
      };
      videosRef.current[asset.id] = asset;
      setVideos((list) => [...list, asset]);
      if (savedId) {
        delete savedMediaRef.current.videos[file.name];
        setMissingMedia((m) => m.filter((n) => n !== file.name));
      } else if (selected) {
        if (target === 'main' && selected.template === 'video') {
          patchScene(selected.id, {
            videoId: asset.id,
            videoTrimStart: 0,
            duration: Math.max(1000, asset.duration),
          });
        } else if (target === 'main' && selected.template !== 'image') {
          // Background clip on a non-video scene — keep the scene's timing
          patchScene(selected.id, { videoId: asset.id, videoTrimStart: 0 });
        } else if (target === 'pip') {
          patchScene(selected.id, { pipVideoId: asset.id, pipTrimStart: 0 });
        }
      }
      setVideoStatus({ ok: true, msg: `${file.name} — ${fmtTime(asset.duration)} loaded. Decoding clip audio…` });
      // Decode the clip's own audio track in the background (for export mixing)
      file.arrayBuffer()
        .then(tryDecodeVideoAudio)
        .then((buf) => {
          asset.audioBuffer = buf;
          setVideoStatus({
            ok: true,
            msg: buf
              ? `${file.name} ready — clip audio will be in the export.`
              : `${file.name} ready — no audio track found in the clip.`,
          });
        });
    } catch {
      URL.revokeObjectURL(url);
      setVideoStatus({ ok: false, msg: 'Could not read that video — MP4 (H.264) works best.' });
    }
  };

  const selectedVideo = selected?.videoId ? videosRef.current[selected.videoId] ?? null : null;
  const selectedPip = selected?.pipVideoId ? videosRef.current[selected.pipVideoId] ?? null : null;

  // ── Music + voiceover upload ──
  const audioInputRef = useRef<HTMLInputElement>(null);
  const voInputRef = useRef<HTMLInputElement>(null);
  const [audioStatus, setAudioStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [voStatus, setVoStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleAudioFile = async (file: File, target: 'music' | 'vo') => {
    const setStatus = target === 'music' ? setAudioStatus : setVoStatus;
    setStatus(null);
    try {
      let asset = await loadAudioAsset(file);
      // Relink: a saved project references this filename — reuse the old id
      const savedId = savedMediaRef.current.audio[file.name];
      if (savedId) {
        asset = { ...asset, id: savedId };
        delete savedMediaRef.current.audio[file.name];
        setMissingMedia((m) => m.filter((n) => n !== file.name));
      }
      audioRef.current[asset.id] = asset;
      setAudioTracks((list) => [...list, asset]);
      if (target === 'music') {
        patchDoc({ audioId: asset.id });
        setStatus({ ok: true, msg: `${file.name} — ${fmtTime(asset.buffer.duration * 1000)}. Loops under the whole video.` });
      } else {
        patchDoc({ voId: asset.id });
        setStatus({ ok: true, msg: `${file.name} — ${fmtTime(asset.buffer.duration * 1000)}. Plays once from the start position.` });
      }
    } catch {
      setStatus({ ok: false, msg: 'Could not decode that file — MP3, WAV, or M4A work best.' });
    }
  };

  // ── Inventory Builder ──
  // Price is optional by design — most units on the lot don't list one,
  // and the builder simply skips the price scenes when it's blank.
  const [modPrice, setModPrice] = useState('');
  const [modTitle, setModTitle] = useState('BAD BOY 4035');
  const [modSubtitle, setModSubtitle] = useState('Compact · 35 HP · Open Station');
  const [modSpecs, setModSpecs] = useState('Engine · 35 HP diesel\nTransmission · HST 3-range\nLoader · quick-attach bucket\nWarranty · see dealer for coverage');
  const [modDisclaimer, setModDisclaimer] = useState(DEFAULT_DISCLAIMER);
  const [modMode, setModMode] = useState<'replace' | 'append'>('replace');

  // ── Build from URL — the site's own inventory CSV is the source ──
  const [srcUrl, setSrcUrl] = useState('');
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [unitImageId, setUnitImageId] = useState<string | null>(null);
  const inventoryRef = useRef<Record<string, string>[] | null>(null);

  const importFromUrl = async () => {
    setImportStatus(null);
    const q = srcUrl.trim().toLowerCase();
    if (!q) {
      setImportStatus({ ok: false, msg: 'Paste a product URL or type a model name first.' });
      return;
    }
    try {
      if (!inventoryRef.current) {
        const res = await fetch(`${SITE_BASE}/jjriggs-full-inventory.csv`);
        if (!res.ok) throw new Error(String(res.status));
        inventoryRef.current = parseCsv(await res.text());
      }
    } catch {
      setImportStatus({ ok: false, msg: 'Could not load the site inventory CSV — is the site deployed alongside the studio?' });
      return;
    }
    const rows = inventoryRef.current;
    const qSlug = q.replace(/\s+/g, '-');
    const row =
      rows.find((r) => r.Slug && q.includes(r.Slug.toLowerCase()))
      ?? rows.find((r) => (r['Product Page URL'] || '').toLowerCase().replace(/\/+$/, '') === q.replace(/\/+$/, ''))
      ?? rows.find((r) => (r['Product Name'] || '').toLowerCase() === q)
      // whole-word match beats substring: "t25" must hit T25, not T254
      ?? rows.find((r) => (r['Product Name'] || '').toLowerCase().split(/\s+/).includes(q))
      ?? rows.find((r) => q.length >= 3 && (r['Product Name'] || '').toLowerCase().includes(q))
      ?? rows.find((r) => q.length >= 3 && (r.Slug || '').toLowerCase().includes(qSlug));
    if (!row) {
      setImportStatus({ ok: false, msg: 'No matching unit in the site inventory — check the URL or try the model name.' });
      return;
    }

    setModTitle((row['Product Name'] || '').toUpperCase());
    const oneliner = [
      row['Sub-Category'],
      row.HP ? `${row.HP} HP` : '',
      row.Configuration,
    ].filter(Boolean).join(' · ');
    if (oneliner) setModSubtitle(oneliner);
    const specPairs: [string, string][] = [
      ['Engine', row.Engine ?? ''],
      ['Drive', row.Drive ?? ''],
      ['Transmission', row.Transmission ?? ''],
      ['Fuel', row.Fuel ?? ''],
      ['Weight', row['Weight (lbs)'] ? `${row['Weight (lbs)']} lbs` : ''],
      ['Loader lift', row['Loader Lift (lbs)'] ? `${row['Loader Lift (lbs)']} lbs` : ''],
    ];
    const specs = specPairs
      .filter(([, v]) => v && v.trim())
      .slice(0, 5)
      .map(([k, v]) => `${k} · ${v.trim()}`)
      .join('\n');
    if (specs) setModSpecs(specs);
    setModPrice(''); // the inventory carries no pricing

    // Catalog photo: CORS fetch → blob keeps the canvas untainted so
    // exports still work. If the host blocks it, fill text only.
    let photoMsg = '';
    const imgUrl = (row['Image URL'] || '').trim();
    if (imgUrl) {
      try {
        const ir = await fetch(imgUrl, { mode: 'cors' });
        if (!ir.ok) throw new Error(String(ir.status));
        const blob = await ir.blob();
        const url = URL.createObjectURL(blob);
        const img = await loadImage(url);
        const asset: ImageAsset = {
          id: `img-${Date.now().toString(36)}`,
          name: `${row['Product Name']} — catalog`,
          url,
          img,
        };
        assetsRef.current[asset.id] = asset;
        setImages((list) => [...list, asset]);
        setUnitImageId(asset.id);
        photoMsg = ' Catalog photo imported — the unit title will sit on it.';
      } catch {
        setUnitImageId(null);
        photoMsg = ' The photo host blocked the import (CORS) — save the image and upload it manually.';
      }
    }
    setImportStatus({ ok: true, msg: `Imported ${row['Product Name']}.${photoMsg}` });
  };

  const buildUnit = () => {
    const priceNum = Math.round(Number(modPrice.replace(/[^0-9.]/g, ''))) || 0;
    const scenes: Scene[] = [
      // 1 — brand sting
      riggsScene('statement', {
        title: 'JJ RIGGS EQUIPMENT',
        anim: 'mask-reveal',
        duration: 2500,
        transition: 'cut',
      }),
      // 2 — unit title (the wipe carries the −13° slash); an imported
      //     catalog photo becomes its backdrop, dimmed for legibility
      riggsScene('title', {
        kicker: 'JUST ARRIVED · COLVILLE WA',
        title: modTitle,
        subtitle: modSubtitle,
        anim: 'rise',
        duration: 3500,
        transition: 'wipe',
        ...(unitImageId && assetsRef.current[unitImageId]
          ? { imageId: unitImageId, kenBurns: 'zoom-in', overlay: 'scrim', overlayOpacity: 0.45 }
          : {}),
      }),
      // 3 — spec sheet
      riggsScene('list', {
        kicker: 'SPEC SHEET',
        body: modSpecs,
        align: 'lower-left',
        duration: 5000,
        transition: 'fade',
      }),
      // 4 — walk-around video (upload the clip, then assign it here);
      //     the price sweeps in as a tip lower third while it plays
      riggsScene('video', {
        kicker: modTitle,
        title: '',
        subtitle: '',
        align: 'lower-left',
        duration: 10000,
        transition: 'wipe',
        cues: modPrice.trim()
          ? [makeCue({
              style: 'tip',
              label: 'PRICE',
              text: modPrice.trim(),
              start: 2500,
              duration: 4500,
              position: 'lower-right',
            })]
          : [],
      }),
      // 5 — price counter (skipped when the price doesn't parse)
      ...(priceNum > 0
        ? [riggsScene('stat', {
            statPrefix: '$',
            statValue: priceNum,
            statSuffix: '',
            attribution: 'cash price · financing available on approved credit',
            anim: 'rise',
            duration: 3500,
            transition: 'fade',
          })]
        : []),
      // 6 — the fine print (a price on screen always brings its fine print)
      riggsScene('disclaimer', {
        kicker: 'THE FINE PRINT',
        body: modDisclaimer,
        customScheme: { bg: '#0f1215', fg: '#fbfbf9', accent: '#cf1f2a' },
        duration: 6500,
        transition: 'fade',
      }),
      // 7 — end card
      riggsScene('endcard', {
        duration: 4000,
        transition: 'fade',
      }),
    ];
    setDoc((d) => ({
      ...d,
      scenes: modMode === 'replace' ? scenes : [...d.scenes, ...scenes],
    }));
    setSelectedId(scenes[0].id);
    playheadRef.current = modMode === 'replace' ? 0 : docDuration(docRef.current);
    setPlaying(true);
  };

  // ── Export ──
  const [exporting, setExporting] = useState<null | 'mp4' | 'webm' | 'png'>(null);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Resolved after mount so SSR and first client render match
  const [mp4Supported, setMp4Supported] = useState<boolean | null>(null);
  useEffect(() => { setMp4Supported(supportsMp4Export()); }, []);

  const handleExportVideo = async (kind: 'mp4' | 'webm') => {
    setPlaying(false);
    setExporting(kind);
    exportingRef.current = true;
    setProgress(0);
    setExportStatus(null);
    abortRef.current = new AbortController();
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await ensureFontsReady([doc.fontHeading, doc.fontBody, doc.fontLabel]);
      const onP = (p: { ratio: number }) => setProgress(p.ratio);
      let blob: Blob;
      if (kind === 'mp4') {
        const audioBuffer = await renderMixdown(docRef.current, audioRef.current, videosRef.current);
        blob = await exportMp4(docRef.current, assetsRef.current, onP, abortRef.current.signal, {
          videos: videosRef.current,
          audioBuffer,
        });
      } else {
        blob = await exportWebm(docRef.current, assetsRef.current, onP, abortRef.current.signal, {
          videos: videosRef.current,
        });
      }
      const base = modTitle ? `jjriggs-${modTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 'jjriggs-unit';
      downloadBlob(blob, `${base}-${doc.aspect.replace(':', 'x')}-${stamp}.${kind}`);
      setExportStatus({ ok: true, msg: `${kind.toUpperCase()} exported — check your downloads.` });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setExportStatus({ ok: false, msg: 'Export cancelled.' });
      } else {
        setExportStatus({ ok: false, msg: e instanceof Error ? e.message : 'Export failed' });
      }
    } finally {
      setExporting(null);
      exportingRef.current = false;
      abortRef.current = null;
    }
  };

  const handleExportPng = async () => {
    setExporting('png');
    exportingRef.current = true;
    setExportStatus(null);
    try {
      await ensureFontsReady([doc.fontHeading, doc.fontBody, doc.fontLabel]);
      const blob = await exportPng(doc, assetsRef.current, playheadRef.current, { videos: videosRef.current });
      downloadBlob(blob, `jjriggs-frame-${doc.aspect.replace(':', 'x')}.png`);
      setExportStatus({ ok: true, msg: 'PNG frame exported.' });
    } catch (e) {
      setExportStatus({ ok: false, msg: e instanceof Error ? e.message : 'Export failed' });
    } finally {
      setExporting(null);
      exportingRef.current = false;
    }
  };

  // ── Scene preview label ──
  const sceneLabel = (s: Scene) =>
    s.template === 'stat'
      ? `${s.statPrefix}${s.statValue.toLocaleString('en-US')}${s.statSuffix}`
      : s.template === 'list'
        ? (s.body.split('\n')[0] || 'Specs')
        : s.template === 'disclaimer'
          ? (s.kicker || 'Disclaimer')
          : s.template === 'video'
            ? (s.title || s.kicker || (s.videoId ? videosRef.current[s.videoId]?.name : '') || 'Video')
            : (s.title || TEMPLATES.find((t) => t.id === s.template)?.label || '');

  const activeRiggsSwatch = selected
    ? RIGGS_SCHEMES.find((s) => sameScheme(selected.customScheme, s))
    : undefined;

  const durationMax = selectedVideo
    ? Math.max(10000, selectedVideo.duration)
    : 10000;

  const selectedImage = selected?.imageId ? assetsRef.current[selected.imageId] ?? null : null;

  // "▤ Website" button + picker panel, shared by the Image and Background
  // fields. Photos come from the site's own library and land in the bin
  // as normal named assets (so projects relink like any upload).
  const libSelected = library?.find((l) => l.label === libModel) ?? null;
  const websiteLibraryUi = (
    <>
      <button className="ms-file-btn" onClick={toggleLibrary}>▤ Website</button>
      {libOpen && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {library === null && <p className="ms-hint">Loading the website&rsquo;s photo library…</p>}
          {library !== null && library.length === 0 && (
            <p className="ms-hint">Library isn&rsquo;t reachable here — upload a photo instead.</p>
          )}
          {!!library?.length && (
            <select
              className="ms-input"
              value={libModel}
              onChange={(e) => setLibModel(e.target.value)}
            >
              <option value="">Choose equipment…</option>
              {Array.from(new Set(library.map((l) => l.group))).map((g) => (
                <optgroup key={g} label={g}>
                  {library.filter((l) => l.group === g).map((l) => (
                    <option key={l.label} value={l.label}>{l.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {libSelected && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, opacity: libBusy ? 0.5 : 1 }}>
              {libSelected.urls.slice(0, 12).map((u) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={u}
                  src={fetchableUrl(u)}
                  alt={libSelected.label}
                  loading="lazy"
                  onClick={() => { if (!libBusy) pickLibraryPhoto(u, libSelected.label); }}
                  style={{
                    width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
                    borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.16)',
                    cursor: libBusy ? 'progress' : 'pointer', background: '#0f1215',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
  const hasBgMedia = !!selected && (
    selected.template === 'image' || selected.template === 'video'
    || !!selectedImage || !!selectedVideo
  );

  // Route keyboard shortcuts to the latest handlers (listener mounts once)
  keysRef.current = {
    undo,
    redo,
    split: splitAtPlayhead,
    del: () => {
      if (selected && docRef.current.scenes.length > 1) removeScene(selected.id);
    },
  };

  return (
    <div className="ms-root ms-riggs">

      {/* ══ Scene strip ══ */}
      <aside className="ms-scenes">
        <p className="ms-scenes-title">Scenes · {fmtTime(totalMs)}</p>

        {doc.scenes.map((s, i) => {
          const scheme = resolveScheme(s);
          const active = s.id === selectedId;
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              className={`ms-scene-card ${active ? 'is-active' : ''}`}
              draggable
              onDragStart={(e) => {
                dragIndexRef.current = i;
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => {
                e.preventDefault();
                moveSceneTo(dragIndexRef.current, i);
                dragIndexRef.current = -1;
              }}
              onClick={() => { setSelectedId(s.id); seekToScene(i); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedId(s.id); seekToScene(i); } }}
            >
              <div className="ms-scene-card-top">
                <span className="ms-scene-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ms-scene-kind">{TEMPLATES.find((t) => t.id === s.template)?.label}</span>
                <span className="ms-scene-dot" style={{ background: scheme.bg }} />
              </div>
              <SceneThumb scene={s} doc={doc} assets={assetsRef.current} videos={videosRef.current} />
              <div className="ms-scene-preview">{sceneLabel(s) || '—'}</div>
              <div className="ms-scene-meta">{(s.duration / 1000).toFixed(1)}s · {TEXT_ANIMS.find((a) => a.id === s.anim)?.label}</div>

              {active && (
                <div className="ms-scene-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="ms-icon-btn" title="Move up" disabled={i === 0} onClick={() => moveScene(s.id, -1)}>↑</button>
                  <button className="ms-icon-btn" title="Move down" disabled={i === doc.scenes.length - 1} onClick={() => moveScene(s.id, 1)}>↓</button>
                  <button className="ms-icon-btn" title="Duplicate" onClick={() => duplicateScene(s.id)}>⧉</button>
                  <button className="ms-icon-btn is-danger" title="Delete" disabled={doc.scenes.length <= 1} onClick={() => removeScene(s.id)}>✕</button>
                </div>
              )}
            </div>
          );
        })}

        <p className="ms-scenes-title" style={{ marginTop: 10 }}>Add Scene</p>
        <div className="ms-add-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="ms-add-btn" title={t.hint} onClick={() => addScene(t.id)}>
              + {t.label}
            </button>
          ))}
        </div>
      </aside>

      {/* ══ Preview ══ */}
      <div className="ms-center">
        <div className="ms-stage-wrap" ref={wrapRef}>
          <div className="ms-stage" ref={stageRef} style={{ width: stageDims.w, height: stageDims.h }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Transport */}
        <div className="ms-transport">
          <button className="ms-btn is-primary" onClick={() => setPlaying((p) => !p)}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button
            className="ms-btn"
            onClick={() => { playheadRef.current = 0; setPlaying(true); }}
          >
            ⏮ Restart
          </button>
          <button
            className={`ms-btn ${loopMode ? 'is-toggled' : ''}`}
            onClick={() => setLoopMode((l) => !l)}
            title="Loop playback"
          >
            ↻ Loop
          </button>
          <button className="ms-btn" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↶</button>
          <button className="ms-btn" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)">↷</button>
          <button className="ms-btn" onClick={splitAtPlayhead} title="Split scene at playhead (S)">✂ Split</button>
          <button
            className={`ms-btn ${showGuides ? 'is-toggled' : ''}`}
            onClick={() => setShowGuides((g) => !g)}
            title="Safe-area guides (preview only)"
          >
            ⊞ Safe
          </button>
          <button
            className="ms-btn"
            onClick={() => stageRef.current?.requestFullscreen?.()}
            title="Fullscreen preview"
          >
            ⛶
          </button>
          <span className="ms-time" ref={timeElRef}>0:00.0 / 0:00.0</span>
        </div>

        {/* Timeline */}
        <div className="ms-timeline" ref={timelineRef} onPointerDown={onTimelinePointerDown}>
          {doc.scenes.map((s) => (
            <div
              key={s.id}
              className={`ms-tl-scene ${s.id === selectedId ? 'is-active' : ''}`}
              style={{ width: `${(s.duration / Math.max(1, totalMs)) * 100}%`, minWidth: 18 }}
            >
              <span className="ms-tl-label">{sceneLabel(s)}</span>
              {(s.cues ?? [])
                .filter((c) => c.text.trim() || c.label.trim())
                .map((c) => (
                  <span
                    key={c.id}
                    className="ms-tl-cue"
                    title={c.text || c.label}
                    style={{ left: `${Math.min(98, (c.start / Math.max(1, s.duration)) * 100)}%` }}
                  />
                ))}
              <div
                className="ms-tl-trim"
                title="Drag to set scene duration"
                onPointerDown={(e) => onTrimStart(e, s.id)}
              />
            </div>
          ))}
          <div className="ms-playhead" ref={playheadElRef} style={{ left: 0 }} />
        </div>
      </div>

      {/* ══ Inspector ══ */}
      <aside className="ms-inspector">

        {/* — Scene — */}
        {selected && (
          <Section
            title={`Scene ${selectedIndex + 1} — ${TEMPLATES.find((t) => t.id === selected.template)?.label}`}
            badge={TEMPLATES.find((t) => t.id === selected.template)?.hint}
          >
            {/* Hidden pickers — reachable from every template's controls */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f, 'main'); e.target.value = ''; }}
            />
            {(selected.template === 'title' || selected.template === 'image' || selected.template === 'video' || selected.template === 'endcard' || selected.template === 'list' || selected.template === 'disclaimer') && (
              <Field label={selected.template === 'endcard' ? 'CTA line' : 'Kicker'}>
                <TextInput value={selected.kicker} onChange={(v) => patchScene(selected.id, { kicker: v })} placeholder="JJ RIGGS EQUIPMENT" />
              </Field>
            )}

            {selected.template !== 'list' && selected.template !== 'stat' && selected.template !== 'disclaimer' && (
              <Field label={selected.template === 'quote' ? 'Quote' : selected.template === 'endcard' ? 'URL / main line' : selected.template === 'video' ? 'Overlay title' : 'Title'}>
                {selected.template === 'quote' || selected.template === 'statement' ? (
                  <TextArea value={selected.title} onChange={(v) => patchScene(selected.id, { title: v })} rows={2} />
                ) : (
                  <TextInput value={selected.title} onChange={(v) => patchScene(selected.id, { title: v })} />
                )}
              </Field>
            )}

            {(selected.template === 'title' || selected.template === 'image' || selected.template === 'video' || selected.template === 'endcard') && (
              <Field label={selected.template === 'endcard' ? 'Fine print' : 'Subtitle'}>
                <TextInput value={selected.subtitle} onChange={(v) => patchScene(selected.id, { subtitle: v })} />
              </Field>
            )}

            {selected.template === 'list' && (
              <Field label="Lines (one per row)">
                <TextArea value={selected.body} onChange={(v) => patchScene(selected.id, { body: v })} rows={4} />
              </Field>
            )}

            {selected.template === 'disclaimer' && (
              <Field label="Disclaimer text">
                <TextArea value={selected.body} onChange={(v) => patchScene(selected.id, { body: v })} rows={5} />
              </Field>
            )}

            {selected.template === 'stat' && (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Field label="Prefix">
                    <TextInput value={selected.statPrefix} onChange={(v) => patchScene(selected.id, { statPrefix: v })} placeholder="$" />
                  </Field>
                  <Field label="Value">
                    <input
                      type="number"
                      className="ms-input ms-input-mono"
                      value={selected.statValue}
                      onChange={(e) => patchScene(selected.id, { statValue: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="Suffix">
                    <TextInput value={selected.statSuffix} onChange={(v) => patchScene(selected.id, { statSuffix: v })} placeholder=" MIN" />
                  </Field>
                </div>
                <Field label="Label">
                  <TextInput value={selected.attribution} onChange={(v) => patchScene(selected.id, { attribution: v })} />
                </Field>
              </>
            )}

            {selected.template === 'quote' && (
              <Field label="Attribution">
                <TextInput value={selected.attribution} onChange={(v) => patchScene(selected.id, { attribution: v })} placeholder="Colville customer" />
              </Field>
            )}

            {/* Image controls */}
            {selected.template === 'image' && (
              <>
                <Field label="Image">
                  {selected.imageId && assetsRef.current[selected.imageId] && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={assetsRef.current[selected.imageId].url}
                      alt=""
                      className="ms-img-thumb"
                      style={{ marginBottom: 6 }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="ms-file-btn" onClick={() => imageInputRef.current?.click()}>
                      ⬆ Upload image
                    </button>
                    {websiteLibraryUi}
                    {images.length > 0 && (
                      <select
                        className="ms-input"
                        style={{ width: 'auto', flex: 1 }}
                        value={selected.imageId ?? ''}
                        onChange={(e) => patchScene(selected.id, { imageId: e.target.value || null })}
                      >
                        <option value="">— none —</option>
                        {images.map((im) => (
                          <option key={im.id} value={im.id}>{im.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </Field>
                <Field label="Motion">
                  <Seg options={KEN_BURNS} value={selected.kenBurns} onChange={(v) => patchScene(selected.id, { kenBurns: v })} small />
                </Field>
                {selected.kenBurns !== 'none' && (
                  <>
                    <Field label="Motion strength">
                      <Seg options={KEN_BURNS_SPEEDS} value={nearestSpeedId(selected.kenBurnsSpeed)} onChange={(v) => patchScene(selected.id, { kenBurnsSpeed: Number(v) })} small />
                    </Field>
                    <Field label="Motion ramp">
                      <Seg options={KEN_BURNS_EASES} value={selected.kenBurnsEase ?? 'in-out'} onChange={(v) => patchScene(selected.id, { kenBurnsEase: v })} small />
                    </Field>
                  </>
                )}
                {selected.imageId && (
                  <Field label="Position">
                    <FocalGrid
                      fx={selected.imageFocusX}
                      fy={selected.imageFocusY}
                      onPick={(x, y) => patchScene(selected.id, { imageFocusX: x, imageFocusY: y })}
                    />
                    <p className="ms-hint">Which part of the photo stays in frame when it&rsquo;s cropped to fit.</p>
                  </Field>
                )}
              </>
            )}

            {/* Video controls */}
            {selected.template === 'video' && (
              <>
                <Field label="Walk-around clip">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="ms-file-btn" onClick={() => videoInputRef.current?.click()}>
                      ⬆ Upload video
                    </button>
                    {videos.length > 0 && (
                      <select
                        className="ms-input"
                        style={{ width: 'auto', flex: 1 }}
                        value={selected.videoId ?? ''}
                        onChange={(e) => {
                          const id = e.target.value || null;
                          const v = id ? videosRef.current[id] : null;
                          patchScene(selected.id, {
                            videoId: id,
                            videoTrimStart: 0,
                            ...(v ? { duration: Math.max(1000, v.duration) } : {}),
                          });
                        }}
                      >
                        <option value="">— none —</option>
                        {videos.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {videoStatus && (
                    <p className={`ms-status ${videoStatus.ok ? 'is-ok' : 'is-err'}`}>{videoStatus.msg}</p>
                  )}
                </Field>
                {selectedVideo && (
                  <>
                    <Field label="Start clip at">
                      <Slider
                        value={selected.videoTrimStart}
                        onChange={(v) => patchScene(selected.id, { videoTrimStart: v })}
                        min={0}
                        max={Math.max(0, selectedVideo.duration - 1000)}
                        step={100}
                        format={(v) => fmtTime(v)}
                      />
                    </Field>
                    <button
                      className="ms-btn"
                      style={{ width: '100%', marginBottom: 10 }}
                      onClick={() => patchScene(selected.id, {
                        duration: Math.max(1000, selectedVideo.duration - selected.videoTrimStart),
                      })}
                    >
                      ⇔ Match scene length to clip
                    </button>
                    <Field label="Clip audio">
                      <Seg
                        options={CLIP_SOUND_OPTS}
                        value={selected.videoMuted ? 'mute' : 'on'}
                        onChange={(v) => patchScene(selected.id, { videoMuted: v === 'mute' })}
                        small
                      />
                    </Field>
                    {!selected.videoMuted && (
                      <Field label="Clip volume">
                        <Slider
                          value={selected.videoVolume}
                          onChange={(v) => patchScene(selected.id, { videoVolume: v })}
                          min={0} max={1} step={0.05}
                          format={(v) => `${Math.round(v * 100)}%`}
                        />
                      </Field>
                    )}
                  </>
                )}
              </>
            )}

            {/* Background media — any scene can sit on a photo or a clip */}
            {selected.template !== 'image' && selected.template !== 'video' && (
              <>
                <Field label="Background">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="ms-file-btn" onClick={() => imageInputRef.current?.click()}>
                      ⬆ Image
                    </button>
                    <button className="ms-file-btn" onClick={() => videoInputRef.current?.click()}>
                      ⬆ Video
                    </button>
                    {websiteLibraryUi}
                  </div>
                  {(images.length > 0 || videos.length > 0) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {images.length > 0 && (
                        <select
                          className="ms-input"
                          style={{ width: 'auto', flex: 1, minWidth: 90 }}
                          value={selected.imageId ?? ''}
                          onChange={(e) => patchScene(selected.id, { imageId: e.target.value || null })}
                        >
                          <option value="">— no image —</option>
                          {images.map((im) => (
                            <option key={im.id} value={im.id}>{im.name}</option>
                          ))}
                        </select>
                      )}
                      {videos.length > 0 && (
                        <select
                          className="ms-input"
                          style={{ width: 'auto', flex: 1, minWidth: 90 }}
                          value={selected.videoId ?? ''}
                          onChange={(e) => patchScene(selected.id, { videoId: e.target.value || null, videoTrimStart: 0 })}
                        >
                          <option value="">— no clip —</option>
                          {videos.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  <p className="ms-hint">
                    A clip wins over a photo. Text flips to white over media — the overlay
                    below keeps it readable.
                  </p>
                </Field>
                {selectedImage && !selectedVideo && (
                  <>
                    <Field label="Photo motion">
                      <Seg options={KEN_BURNS} value={selected.kenBurns} onChange={(v) => patchScene(selected.id, { kenBurns: v })} small />
                    </Field>
                    {selected.kenBurns !== 'none' && (
                      <>
                        <Field label="Motion strength">
                          <Seg options={KEN_BURNS_SPEEDS} value={nearestSpeedId(selected.kenBurnsSpeed)} onChange={(v) => patchScene(selected.id, { kenBurnsSpeed: Number(v) })} small />
                        </Field>
                        <Field label="Motion ramp">
                          <Seg options={KEN_BURNS_EASES} value={selected.kenBurnsEase ?? 'in-out'} onChange={(v) => patchScene(selected.id, { kenBurnsEase: v })} small />
                        </Field>
                      </>
                    )}
                    <Field label="Position">
                      <FocalGrid
                        fx={selected.imageFocusX}
                        fy={selected.imageFocusY}
                        onPick={(x, y) => patchScene(selected.id, { imageFocusX: x, imageFocusY: y })}
                      />
                      <p className="ms-hint">Which part of the photo stays in frame when it&rsquo;s cropped to fit.</p>
                    </Field>
                  </>
                )}
                {selectedVideo && (
                  <>
                    <Field label="Clip starts at">
                      <Slider
                        value={selected.videoTrimStart}
                        onChange={(v) => patchScene(selected.id, { videoTrimStart: v })}
                        min={0}
                        max={Math.max(0, selectedVideo.duration - 1000)}
                        step={100}
                        format={(v) => fmtTime(v)}
                      />
                    </Field>
                    <Field label="Clip audio">
                      <Seg
                        options={CLIP_SOUND_OPTS}
                        value={selected.videoMuted ? 'mute' : 'on'}
                        onChange={(v) => patchScene(selected.id, { videoMuted: v === 'mute' })}
                        small
                      />
                    </Field>
                    {!selected.videoMuted && (
                      <Field label="Clip volume">
                        <Slider
                          value={selected.videoVolume}
                          onChange={(v) => patchScene(selected.id, { videoVolume: v })}
                          min={0} max={1} step={0.05}
                          format={(v) => `${Math.round(v * 100)}%`}
                        />
                      </Field>
                    )}
                  </>
                )}
              </>
            )}

            {hasBgMedia && (
              <>
                <Field label="Overlay">
                  <Seg options={OVERLAYS} value={selected.overlay} onChange={(v) => patchScene(selected.id, { overlay: v })} small />
                </Field>
                {selected.overlay !== 'none' && (
                  <Field label="Overlay strength">
                    <Slider
                      value={selected.overlayOpacity}
                      onChange={(v) => patchScene(selected.id, { overlayOpacity: v })}
                      min={0.1} max={1} step={0.05}
                      format={(v) => `${Math.round(v * 100)}%`}
                    />
                  </Field>
                )}
              </>
            )}

            {/* Text overlay timing — video scenes */}
            {selected.template === 'video' && (
              <>
                <Field label="Text in at">
                  <Slider
                    value={selected.textStart}
                    onChange={(v) => patchScene(selected.id, { textStart: v })}
                    min={0} max={Math.max(0, selected.duration - 1000)} step={100}
                    format={(v) => (v <= 0 ? 'scene start' : fmtTime(v))}
                  />
                </Field>
                <Field label="Text out at">
                  <Slider
                    value={selected.textEnd}
                    onChange={(v) => patchScene(selected.id, { textEnd: v })}
                    min={0} max={selected.duration} step={100}
                    format={(v) => (v <= 0 ? 'with scene' : fmtTime(v))}
                  />
                </Field>

                <Field label="Tips & timed text">
                  {(selected.cues ?? []).map((cue) => (
                    <div key={cue.id} className="ms-cue-card">
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                        <Seg
                          options={CUE_STYLES}
                          value={cue.style}
                          onChange={(v) => patchCue(selected.id, cue.id, { style: v })}
                          small
                        />
                        <button
                          className="ms-icon-btn is-danger"
                          style={{ marginLeft: 'auto', flex: 'none' }}
                          title="Remove"
                          onClick={() => removeCue(selected.id, cue.id)}
                        >
                          ✕
                        </button>
                      </div>
                      {cue.style === 'tip' && (
                        <Field label="Label">
                          <TextInput value={cue.label} onChange={(v) => patchCue(selected.id, cue.id, { label: v })} placeholder="TIP" />
                        </Field>
                      )}
                      <Field label={cue.style === 'tip' ? 'Tip text' : 'Text'}>
                        <TextArea value={cue.text} onChange={(v) => patchCue(selected.id, cue.id, { text: v })} rows={2} />
                      </Field>
                      <Field label="Appears at">
                        <Slider
                          value={cue.start}
                          onChange={(v) => patchCue(selected.id, cue.id, { start: v })}
                          min={0} max={Math.max(0, selected.duration - 800)} step={100}
                          format={(v) => fmtTime(v)}
                        />
                      </Field>
                      <Field label="On screen for">
                        <Slider
                          value={cue.duration}
                          onChange={(v) => patchCue(selected.id, cue.id, { duration: v })}
                          min={1000} max={Math.max(1000, selected.duration)} step={250}
                          format={(v) => fmtTime(v)}
                        />
                      </Field>
                      <Field label="Position">
                        <Seg
                          options={CUE_POSITIONS}
                          value={cue.position}
                          onChange={(v) => patchCue(selected.id, cue.id, { position: v })}
                          small
                        />
                      </Field>
                    </div>
                  ))}
                  <button className="ms-btn" style={{ width: '100%' }} onClick={() => addCue(selected.id)}>
                    + Add tip / text
                  </button>
                  <p className="ms-hint">
                    Tips sweep in over the footage on their own clock and sweep away — the clip
                    keeps playing behind them. Add as many as the scene needs.
                  </p>
                </Field>
              </>
            )}

            <Field label="Animation">
              <Seg options={TEXT_ANIMS} value={selected.anim} onChange={(v) => patchScene(selected.id, { anim: v })} small />
            </Field>

            <Field label="Text size">
              <Seg
                options={TEXT_SCALES}
                value={nearestScaleId(selected.textScale)}
                onChange={(v) => patchScene(selected.id, { textScale: Number(v) })}
                small
              />
            </Field>

            {selected.template === 'list' && (
              <Field label="Numbers">
                <Seg
                  options={[{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }] as const}
                  value={selected.listMarkers ? 'on' : 'off'}
                  onChange={(v) => patchScene(selected.id, { listMarkers: v === 'on' })}
                  small
                />
              </Field>
            )}

            {/* — Presenter cam (picture-in-picture) — any template — */}
            <Field label="Presenter cam (lower third)">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="ms-file-btn" onClick={() => pipInputRef.current?.click()}>
                  ⬆ Upload cam clip
                </button>
                {videos.length > 0 && (
                  <select
                    className="ms-input"
                    style={{ width: 'auto', flex: 1 }}
                    value={selected.pipVideoId ?? ''}
                    onChange={(e) => patchScene(selected.id, { pipVideoId: e.target.value || null, pipTrimStart: 0 })}
                  >
                    <option value="">— none —</option>
                    {videos.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <input
                ref={pipInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f, 'pip'); e.target.value = ''; }}
              />
            </Field>
            {selectedPip && (
              <>
                <Field label="Cam position">
                  <Seg options={PIP_POSITIONS} value={selected.pipPos} onChange={(v) => patchScene(selected.id, { pipPos: v })} small />
                </Field>
                <Field label="Cam size">
                  <Slider
                    value={selected.pipSize}
                    onChange={(v) => patchScene(selected.id, { pipSize: v })}
                    min={0.12} max={0.4} step={0.02}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                </Field>
                <Field label="Cam starts at">
                  <Slider
                    value={selected.pipTrimStart}
                    onChange={(v) => patchScene(selected.id, { pipTrimStart: v })}
                    min={0}
                    max={Math.max(0, selectedPip.duration - 1000)}
                    step={100}
                    format={(v) => fmtTime(v)}
                  />
                </Field>
                <Field label="Cam audio">
                  <Seg
                    options={CLIP_SOUND_OPTS}
                    value={selected.pipMuted ? 'mute' : 'on'}
                    onChange={(v) => patchScene(selected.id, { pipMuted: v === 'mute' })}
                    small
                  />
                </Field>
                {!selected.pipMuted && (
                  <Field label="Cam volume">
                    <Slider
                      value={selected.pipVolume}
                      onChange={(v) => patchScene(selected.id, { pipVolume: v })}
                      min={0} max={1} step={0.05}
                      format={(v) => `${Math.round(v * 100)}%`}
                    />
                  </Field>
                )}
              </>
            )}

            <Field label="Heading weight">
              <Seg
                options={HEADING_OPTS}
                value={selected.serifTitle ? 'serif' : 'sans'}
                onChange={(v) => patchScene(selected.id, { serifTitle: v === 'serif' })}
                small
              />
            </Field>

            <Field label="Duration">
              <Slider
                value={selected.duration}
                onChange={(v) => patchScene(selected.id, { duration: v })}
                min={100} max={durationMax} step={100}
                format={(v) => fmtTime(v)}
              />
              {selected.duration < 600 && (
                <p className="ms-hint">
                  Fast cut — great for photo strobes. Use Cut transitions, and keep
                  the whole ad under ~2 flashes/sec or Facebook may reject it.
                </p>
              )}
            </Field>

            <Field label="Color scheme">
              <div className="ms-swatches">
                {RIGGS_SCHEMES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.label}
                    className={`ms-swatch ${activeRiggsSwatch?.id === s.id ? 'is-active' : ''}`}
                    style={{ background: s.bg, borderColor: s.accent }}
                    onClick={() => patchScene(selected.id, { customScheme: { bg: s.bg, fg: s.fg, accent: s.accent } })}
                  />
                ))}
                <button
                  type="button"
                  title="Custom colors"
                  className={`ms-swatch ms-swatch-custom ${selected.customScheme && !activeRiggsSwatch ? 'is-active' : ''}`}
                  onClick={() => patchScene(selected.id, { customScheme: { ...brandColors } })}
                />
              </div>
              {selected.customScheme && !activeRiggsSwatch && (
                <div style={{ marginTop: 10 }}>
                  <ColorRow
                    label="Background"
                    value={selected.customScheme.bg}
                    onChange={(v) => patchScene(selected.id, { customScheme: { ...selected.customScheme!, bg: v } })}
                  />
                  <ColorRow
                    label="Text"
                    value={selected.customScheme.fg}
                    onChange={(v) => patchScene(selected.id, { customScheme: { ...selected.customScheme!, fg: v } })}
                  />
                  <ColorRow
                    label="Accent"
                    value={selected.customScheme.accent}
                    onChange={(v) => patchScene(selected.id, { customScheme: { ...selected.customScheme!, accent: v } })}
                  />
                </div>
              )}
            </Field>

            <Field label="Alignment">
              <Seg options={ALIGNMENTS} value={selected.align} onChange={(v) => patchScene(selected.id, { align: v })} small />
            </Field>

            {selectedIndex > 0 && (
              <Field label="Transition in">
                <Seg options={TRANSITIONS} value={selected.transition} onChange={(v) => patchScene(selected.id, { transition: v as TransitionId })} small />
              </Field>
            )}
          </Section>
        )}

        {/* — Inventory Builder — */}
        <Section title="Inventory Builder" badge="Unit video wizard">
          <Field label="Build from URL / model">
            <TextInput
              value={srcUrl}
              onChange={setSrcUrl}
              placeholder="Paste a jjriggsequipment.com product URL — or a model name"
            />
            <button className="ms-btn" style={{ width: '100%', marginTop: 6 }} onClick={importFromUrl}>
              ⤓ Import from site inventory
            </button>
            {importStatus && (
              <p className={`ms-status ${importStatus.ok ? 'is-ok' : 'is-err'}`}>{importStatus.msg}</p>
            )}
            <p className="ms-hint">
              Looks the unit up in the site&apos;s inventory, fills the fields below, and pulls
              the catalog photo into the image bin.
            </p>
          </Field>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 2 }}>
              <Field label="Unit / model">
                <TextInput value={modTitle} onChange={setModTitle} placeholder="BAD BOY 4035" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Price (optional)">
                <TextInput value={modPrice} onChange={setModPrice} placeholder="—" />
              </Field>
            </div>
          </div>
          <Field label="One-liner">
            <TextInput value={modSubtitle} onChange={setModSubtitle} placeholder="Compact · 35 HP · Open Station" />
          </Field>
          <Field label="Spec sheet (one line per spec)">
            <TextArea value={modSpecs} onChange={setModSpecs} rows={4} />
          </Field>
          <Field label="Fine print">
            <TextArea value={modDisclaimer} onChange={setModDisclaimer} rows={4} />
          </Field>
          <Field label="Mode">
            <Seg
              options={[{ id: 'replace', label: 'Replace scenes' }, { id: 'append', label: 'Append' }] as const}
              value={modMode}
              onChange={setModMode}
              small
            />
          </Field>
          <button className="ms-btn is-primary" style={{ width: '100%' }} onClick={buildUnit}>
            ⚡ Build unit video
          </button>
          <p className="ms-hint">
            Seeds the full unit skeleton: brand sting → unit title → spec sheet → walk-around
            video → fine print → end card. With a price set, it also sweeps in as a lower
            third on the video and gets a counter scene; leave it blank (most units don&apos;t
            list one) and those are simply skipped. Then select the video scene and upload
            the walk-around clip.
          </p>
        </Section>

        {/* — Music — */}
        <Section title="Music" badge="Background bed">
          <Field label="Track">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="ms-file-btn" onClick={() => audioInputRef.current?.click()}>
                ⬆ Upload MP3 / WAV / M4A
              </button>
              {audioTracks.length > 0 && (
                <select
                  className="ms-input"
                  style={{ width: 'auto', flex: 1 }}
                  value={doc.audioId ?? ''}
                  onChange={(e) => patchDoc({ audioId: e.target.value || null })}
                >
                  <option value="">— no music —</option>
                  {audioTracks.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFile(f, 'music'); e.target.value = ''; }}
            />
            {audioStatus && (
              <p className={`ms-status ${audioStatus.ok ? 'is-ok' : 'is-err'}`}>{audioStatus.msg}</p>
            )}
          </Field>
          {doc.audioId && (
            <>
              <Field label="Music volume">
                <Slider
                  value={doc.audioVolume}
                  onChange={(v) => patchDoc({ audioVolume: v })}
                  min={0} max={1} step={0.05}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </Field>
              <Field label="Fade in">
                <Slider
                  value={doc.audioFadeIn}
                  onChange={(v) => patchDoc({ audioFadeIn: v })}
                  min={0} max={10000} step={250}
                  format={(v) => `${(v / 1000).toFixed(2)}s`}
                />
              </Field>
              <Field label="Fade out">
                <Slider
                  value={doc.audioFadeOut}
                  onChange={(v) => patchDoc({ audioFadeOut: v })}
                  min={0} max={10000} step={250}
                  format={(v) => `${(v / 1000).toFixed(2)}s`}
                />
              </Field>
              <Field label="Duck under voiceover">
                <Seg
                  options={[{ id: 'on', label: 'Auto-duck' }, { id: 'off', label: 'Off' }] as const}
                  value={doc.audioDuckOn ? 'on' : 'off'}
                  onChange={(v) => patchDoc({ audioDuckOn: v === 'on' })}
                  small
                />
              </Field>
              {doc.audioDuckOn && (
                <Field label="Duck music to">
                  <Slider
                    value={doc.audioDuckLevel}
                    onChange={(v) => patchDoc({ audioDuckLevel: v })}
                    min={0} max={1} step={0.05}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                </Field>
              )}
            </>
          )}
          <p className="ms-hint">
            Loops under the whole video; with auto-duck on it dips while the voiceover
            plays and recovers after. The same curves play in the preview and in the MP4.
          </p>
        </Section>

        {/* — Voiceover — */}
        <Section title="Voiceover" badge="Plays once">
          <Field label="Track">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="ms-file-btn" onClick={() => voInputRef.current?.click()}>
                ⬆ Upload VO (MP3 / WAV / M4A)
              </button>
              {audioTracks.length > 0 && (
                <select
                  className="ms-input"
                  style={{ width: 'auto', flex: 1 }}
                  value={doc.voId ?? ''}
                  onChange={(e) => patchDoc({ voId: e.target.value || null })}
                >
                  <option value="">— no voiceover —</option>
                  {audioTracks.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
            <input
              ref={voInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFile(f, 'vo'); e.target.value = ''; }}
            />
            {voStatus && (
              <p className={`ms-status ${voStatus.ok ? 'is-ok' : 'is-err'}`}>{voStatus.msg}</p>
            )}
          </Field>
          {doc.voId && (
            <>
              <Field label="VO volume">
                <Slider
                  value={doc.voVolume}
                  onChange={(v) => patchDoc({ voVolume: v })}
                  min={0} max={1} step={0.05}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </Field>
              <Field label="Starts at">
                <Slider
                  value={doc.voStart}
                  onChange={(v) => patchDoc({ voStart: v })}
                  min={0} max={Math.max(1000, totalMs)} step={250}
                  format={(v) => fmtTime(v)}
                />
              </Field>
            </>
          )}
          <p className="ms-hint">
            Recorded narration (or an ElevenLabs render) mixed over the music. For someone
            talking on camera, use the presenter cam on a scene instead — its audio mixes in
            automatically.
          </p>
        </Section>

        {/* — Captions — */}
        <Section title="Captions" badge="SRT import">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="ms-file-btn" onClick={() => srtInputRef.current?.click()}>
              ⬆ Import .srt
            </button>
            <button className="ms-btn" onClick={clearCaptions}>Clear captions</button>
          </div>
          <input
            ref={srtInputRef}
            type="file"
            accept=".srt,text/plain"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSrtFile(f); e.target.value = ''; }}
          />
          {captionStatus && (
            <p className={`ms-status ${captionStatus.ok ? 'is-ok' : 'is-err'}`}>{captionStatus.msg}</p>
          )}
          <p className="ms-hint">
            Captions land on the scenes they fall over as quick-fade subtitle pills (lower
            center) and burn into the export. Re-importing replaces the previous captions.
          </p>
        </Section>

        {/* — Brand — */}
        <Section title="Brand" badge="JJ Riggs defaults">
          <Field label="Brand colors">
            <ColorRow label="Background" value={brandColors.bg} onChange={(v) => setBrandColors((c) => ({ ...c, bg: v }))} />
            <ColorRow label="Text" value={brandColors.fg} onChange={(v) => setBrandColors((c) => ({ ...c, fg: v }))} />
            <ColorRow label="Accent" value={brandColors.accent} onChange={(v) => setBrandColors((c) => ({ ...c, accent: v }))} />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="ms-btn" style={{ flex: 1, padding: '7px 8px' }} onClick={applyBrandToAll}>
                Apply to all scenes
              </button>
              <button className="ms-btn" style={{ flex: 1, padding: '7px 8px' }} onClick={resetToRiggsInk}>
                Reset to Riggs ink
              </button>
            </div>
          </Field>
          <Field label="Logo (end cards)">
            <div className="ms-logo-row">
              {logoLight ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoLight.url} alt="Light logo" className="ms-logo-thumb is-dark-bg" />
                  <button className="ms-icon-btn is-danger" style={{ flex: 'none', padding: '4px 10px' }} onClick={() => removeLogo('light')}>✕</button>
                </>
              ) : (
                <button className="ms-file-btn" onClick={() => logoLightRef.current?.click()}>
                  ⬆ Light logo (dark backgrounds)
                </button>
              )}
            </div>
            <div className="ms-logo-row">
              {logoDark ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoDark.url} alt="Dark logo" className="ms-logo-thumb is-light-bg" />
                  <button className="ms-icon-btn is-danger" style={{ flex: 'none', padding: '4px 10px' }} onClick={() => removeLogo('dark')}>✕</button>
                </>
              ) : (
                <button className="ms-file-btn" onClick={() => logoDarkRef.current?.click()}>
                  ⬆ Dark logo (light backgrounds)
                </button>
              )}
            </div>
            <input
              ref={logoLightRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f, 'light'); e.target.value = ''; }}
            />
            <input
              ref={logoDarkRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f, 'dark'); e.target.value = ''; }}
            />
            <p className="ms-hint">
              Dark end cards use the JJ Riggs white-outline lockup; light Bone end cards show
              the typeset wordmark until a dark logo file is uploaded here. PNG with
              transparency works best.
            </p>
          </Field>
        </Section>

        {/* — Document — */}
        <Section title="Document">
          <Field label="Format">
            <Seg
              options={ASPECTS.map((a) => ({ id: a.id, label: `${a.id} ${a.label}` }))}
              value={doc.aspect}
              onChange={(v) => patchDoc({ aspect: v })}
              small
            />
            <p className="ms-hint">{aspect.w}×{aspect.h} · {aspect.hint}</p>
          </Field>
          <Field label="Film grain">
            <Seg
              options={[{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }] as const}
              value={doc.showGrain ? 'on' : 'off'}
              onChange={(v) => patchDoc({ showGrain: v === 'on' })}
              small
            />
          </Field>
          <Field label="Watermark">
            <TextInput value={doc.watermark} onChange={(v) => patchDoc({ watermark: v })} placeholder="JJ RIGGS" />
          </Field>
        </Section>

        {/* — Project — */}
        <Section title="Project" badge="Autosaves locally">
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="ms-btn" style={{ flex: 1 }} onClick={saveProject}>⬇ Save JSON</button>
            <button className="ms-btn" style={{ flex: 1 }} onClick={() => projectInputRef.current?.click()}>⬆ Load</button>
            <button className="ms-btn" style={{ flex: 1 }} onClick={newProject}>✦ New</button>
          </div>
          <input
            ref={projectInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProjectFile(f); e.target.value = ''; }}
          />
          {missingMedia.length > 0 && (
            <p className="ms-status is-err">
              Missing media — re-upload by the same name to relink: {missingMedia.join(', ')}
            </p>
          )}
          {projectStatus && (
            <p className={`ms-status ${projectStatus.ok ? 'is-ok' : 'is-err'}`}>{projectStatus.msg}</p>
          )}
          <p className="ms-hint">
            The document autosaves to this browser as you edit and restores on reload.
            Media binaries aren&apos;t embedded — projects reference them by filename.
          </p>
        </Section>

        {/* — Fonts — */}
        <Section title="Fonts" badge="Brand trio">
          <datalist id="ms-font-list-riggs">
            {fontOptions.map((f) => (
              <option key={f.family} value={f.family}>{f.label}</option>
            ))}
          </datalist>
          <Field label="Heading font">
            <input
              className="ms-input"
              list="ms-font-list-riggs"
              value={doc.fontHeading}
              onChange={(e) => patchDoc({ fontHeading: e.target.value })}
            />
          </Field>
          <Field label="Body font">
            <input
              className="ms-input"
              list="ms-font-list-riggs"
              value={doc.fontBody}
              onChange={(e) => patchDoc({ fontBody: e.target.value })}
            />
          </Field>
          <Field label="Label font (tech voice)">
            <input
              className="ms-input"
              list="ms-font-list-riggs"
              value={doc.fontLabel}
              onChange={(e) => patchDoc({ fontLabel: e.target.value })}
            />
          </Field>
          <Field label="Upload font files">
            <button className="ms-file-btn" onClick={() => fontFileRef.current?.click()}>
              ⬆ Add .woff2 / .otf / .ttf
            </button>
            <input
              ref={fontFileRef}
              type="file"
              accept=".woff,.woff2,.otf,.ttf"
              multiple
              hidden
              onChange={(e) => { if (e.target.files?.length) handleFontFiles(e.target.files); e.target.value = ''; }}
            />
          </Field>
          {fontStatus && (
            <p className={`ms-status ${fontStatus.ok ? 'is-ok' : 'is-err'}`}>{fontStatus.msg}</p>
          )}
          <p className="ms-hint">
            The brand trio is self-hosted: Tactic Sans Bld shouts the headlines, Questrial
            reads the body, Michroma whispers the kickers and spec labels. &quot;Display&quot;
            heading weight uses Tactic Sans.
          </p>
        </Section>

        {/* — Export — */}
        <Section title="Export" badge={`${aspect.w}×${aspect.h} · ${doc.fps}fps`}>
          {exporting && exporting !== 'png' ? (
            <>
              <div className="ms-progress">
                <div className="ms-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="ms-hint">Rendering {exporting.toUpperCase()} — {Math.round(progress * 100)}%</p>
              <button className="ms-btn" style={{ marginTop: 8 }} onClick={() => abortRef.current?.abort()}>
                Cancel
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="ms-btn is-primary"
                disabled={!mp4Supported || !!exporting}
                onClick={() => handleExportVideo('mp4')}
              >
                ⬇ Export MP4 (with audio)
              </button>
              {mp4Supported === false && (
                <p className="ms-hint">
                  This browser doesn&apos;t support WebCodecs — use Chrome or Edge for MP4, or export WebM below.
                </p>
              )}
              <button className="ms-btn" disabled={!!exporting} onClick={() => handleExportVideo('webm')}>
                ⬇ Export WebM (silent fallback)
              </button>
              <button className="ms-btn" disabled={!!exporting} onClick={handleExportPng}>
                ⬇ PNG of current frame
              </button>
            </div>
          )}
          {exportStatus && (
            <p className={`ms-status ${exportStatus.ok ? 'is-ok' : 'is-err'}`}>{exportStatus.msg}</p>
          )}
          <p className="ms-hint">
            MP4 renders offline frame-by-frame with music + clip audio mixed in — output is
            exactly what the preview shows. Long exercise clips take a few minutes; the export
            steps through the clip frame by frame.
          </p>
        </Section>
      </aside>
    </div>
  );
}
