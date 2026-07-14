'use client';

/* ═══════════════════════════════════════════════════════
   JJ Riggs Flash Ads — the "Simple mode" ad builder.
   Type 3–6 short sales lines; each becomes a hard-cut
   statement card in alternating inverse brand colors,
   closing on the logo + phone end card. Optional photo
   backgrounds pull from the website's own image library
   (or an upload), and an optional music bed mixes into
   the export. The same deterministic engine as the
   studio renders preview and MP4, so what plays is what
   downloads.

   Phase A+ of QUICK-AD-BUILDER-PLAN.md. Brand constants
   here mirror RiggsMotionStudio.tsx — if the schemes or
   end-card copy change there, change them here too.
   ═══════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MotionDoc, Scene, CustomScheme, AspectId, TextAnimId, AssetMap, AudioAsset, ImageAsset,
  makeScene, getAspect, docDuration, defaultDoc,
} from '@/lib/motion/types';
import { renderFrame } from '@/lib/motion/render';
import {
  exportMp4, exportWebm, downloadBlob, supportsMp4Export, ExportProgress,
} from '@/lib/motion/export';
import { loadAudioAsset, renderMixdown, musicGainAt } from '@/lib/motion/audio';
import { ensureFontsReady } from '@/lib/motion/fonts';
import { harvestLibrary, fetchableUrl, SITE_BASE, LibraryModel } from '@/lib/site-library';
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

const PHOTO_PLACEMENTS = [
  { id: 'hook', label: 'First card' },
  { id: 'alt',  label: 'Every other' },
  { id: 'all',  label: 'All cards' },
] as const;
type PhotoPlacement = (typeof PHOTO_PLACEMENTS)[number]['id'];

// Bundled, commercially-licensed tracks (drop the files in
// studio-src/public/music/, list them here, `npm run deploy`).
// Empty until real licensed tracks are chosen — see public/music/README.txt.
const BUNDLED_TRACKS: { file: string; label: string }[] = [];

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

const FLASH_PHOTO_ID = '__flash-photo';
const FLASH_MUSIC_ID = '__flash-music';

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
  photoOn: boolean;
  hasPhoto: boolean;
  photoPlacement: PhotoPlacement;
  audioOn: boolean;
  hasMusic: boolean;
}): MotionDoc {
  const {
    lines, rotation, paceMs, anim, aspect, finePrint,
    photoOn, hasPhoto, photoPlacement, audioOn, hasMusic,
  } = opts;

  const photoActive = photoOn && hasPhoto;
  const photoOnCard = (i: number) =>
    photoActive && (
      photoPlacement === 'all'
      || (photoPlacement === 'hook' && i === 0)
      || (photoPlacement === 'alt' && i % 2 === 0)
    );

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
      ...(photoOnCard(i)
        ? { imageId: FLASH_PHOTO_ID, kenBurns: 'zoom-in' as const, overlay: 'scrim' as const, overlayOpacity: 0.55 }
        : {}),
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
    audioId: audioOn && hasMusic ? FLASH_MUSIC_ID : null,
    audioVolume: 0.7,
    audioFadeIn: 300,
    audioFadeOut: 900,
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

/** Downscale a flyer photo to ≤1600px JPEG base64 for the storyboard API. */
async function flyerToBase64(file: File): Promise<{ b64: string; mediaType: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    return { b64: c.toDataURL('image/jpeg', 0.85).split(',')[1], mediaType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface StoryboardFacts {
  offer_headline: string | null;
  urgency: string | null;
  phone: string | null;
  website: string | null;
  photo_description: string | null;
  requires_fine_print: boolean;
}

interface StoryboardProject {
  doc: { scenes: Array<Partial<Scene> & { template: string }> };
}

interface StoryboardResult {
  project: StoryboardProject;
  facts: StoryboardFacts;
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

  // Photo background
  const [photoOn, setPhotoOn] = useState(false);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoPlacement, setPhotoPlacement] = useState<PhotoPlacement>('hook');
  const [library, setLibrary] = useState<LibraryModel[] | null>(null);
  const [libModel, setLibModel] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // Music bed
  const [audioOn, setAudioOn] = useState(false);
  const [musicName, setMusicName] = useState<string | null>(null);
  const [musicBusy, setMusicBusy] = useState(false);
  const musicFileRef = useRef<HTMLInputElement>(null);

  // Flyer → storyboard (AI)
  const [flyerBusy, setFlyerBusy] = useState(false);
  const [storyboard, setStoryboard] = useState<StoryboardResult | null>(null);
  const flyerFileRef = useRef<HTMLInputElement>(null);

  const [playing, setPlaying] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const lines = splitLines(rawLines);
  const rotation = ROTATIONS.find((r) => r.id === rotationId) ?? ROTATIONS[0];
  const paceMs = PACES.find((p) => p.id === paceId)?.ms ?? 900;
  const doc = buildFlashDoc({
    lines, rotation, paceMs, anim, aspect, finePrint,
    photoOn, hasPhoto: !!photoName, photoPlacement,
    audioOn, hasMusic: !!musicName,
  });
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
  const musicRef = useRef<AudioAsset | null>(null);
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

      // Keep the preview music element on the playhead's clock
      const music = musicRef.current;
      if (music) {
        const el = music.element;
        const audible = !!d.audioId && playingRef.current && !exportingRef.current;
        if (audible) {
          el.volume = musicGainAt(d, playheadRef.current, total);
          const want = (playheadRef.current / 1000) % Math.max(0.05, music.buffer.duration);
          if (Math.abs(el.currentTime - want) > 0.35) el.currentTime = want;
          if (el.paused) el.play().catch(() => { /* needs a user gesture first */ });
        } else if (!el.paused) {
          el.pause();
        }
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

  // ── Photo background ──
  const applyPhoto = useCallback(async (src: string, name: string) => {
    setPhotoBusy(true);
    setStatus(null);
    try {
      // fetch → blob keeps the canvas untainted, so export still works
      const res = await fetch(src);
      if (!res.ok) throw new Error(`Photo failed to load (${res.status})`);
      const blob = await res.blob();
      const old = assetsRef.current[FLASH_PHOTO_ID];
      if (old && old.url.startsWith('blob:')) URL.revokeObjectURL(old.url);
      const url = URL.createObjectURL(blob);
      const img = await loadImage(url);
      assetsRef.current[FLASH_PHOTO_ID] = { id: FLASH_PHOTO_ID, name, url, img } as ImageAsset;
      setPhotoName(name);
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Photo failed to load.' });
    } finally {
      setPhotoBusy(false);
    }
  }, []);

  const handlePhotoFile = useCallback(async (file: File) => {
    setPhotoBusy(true);
    setStatus(null);
    try {
      const old = assetsRef.current[FLASH_PHOTO_ID];
      if (old && old.url.startsWith('blob:')) URL.revokeObjectURL(old.url);
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      assetsRef.current[FLASH_PHOTO_ID] = { id: FLASH_PHOTO_ID, name: file.name, url, img } as ImageAsset;
      setPhotoName(file.name);
    } catch {
      setStatus({ ok: false, msg: `Couldn't read ${file.name}.` });
    } finally {
      setPhotoBusy(false);
    }
  }, []);

  const clearPhoto = useCallback(() => {
    const old = assetsRef.current[FLASH_PHOTO_ID];
    if (old && old.url.startsWith('blob:')) URL.revokeObjectURL(old.url);
    delete assetsRef.current[FLASH_PHOTO_ID];
    setPhotoName(null);
  }, []);

  // Load the site's image library the first time the photo toggle opens
  useEffect(() => {
    if (!photoOn || library !== null) return;
    let alive = true;
    harvestLibrary()
      .then((lib) => { if (alive) setLibrary(lib); })
      .catch(() => { if (alive) setLibrary([]); });
    return () => { alive = false; };
  }, [photoOn, library]);

  const libGroups = library?.length
    ? Array.from(new Set(library.map((l) => l.group)))
    : [];
  const libSelected = library?.find((l) => l.label === libModel) ?? null;

  // ── Music bed ──
  const setMusicAsset = useCallback((asset: AudioAsset, name: string) => {
    const old = musicRef.current;
    if (old) {
      old.element.pause();
      if (old.url.startsWith('blob:')) URL.revokeObjectURL(old.url);
    }
    // renderMixdown looks the doc's audioId up in this map
    asset.id = FLASH_MUSIC_ID;
    musicRef.current = asset;
    setMusicName(name);
  }, []);

  const handleMusicFile = useCallback(async (file: File) => {
    setMusicBusy(true);
    setStatus(null);
    try {
      setMusicAsset(await loadAudioAsset(file), file.name);
    } catch {
      setStatus({ ok: false, msg: `Couldn't read ${file.name} — try an MP3 or M4A.` });
    } finally {
      setMusicBusy(false);
    }
  }, [setMusicAsset]);

  const pickBundledTrack = useCallback(async (track: { file: string; label: string }) => {
    setMusicBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`${ASSET_BASE}/music/${track.file}`);
      if (!res.ok) throw new Error(`Track failed to load (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], track.file, { type: blob.type || 'audio/mpeg' });
      setMusicAsset(await loadAudioAsset(file), track.label);
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Track failed to load.' });
    } finally {
      setMusicBusy(false);
    }
  }, [setMusicAsset]);

  const clearMusic = useCallback(() => {
    const old = musicRef.current;
    if (old) {
      old.element.pause();
      if (old.url.startsWith('blob:')) URL.revokeObjectURL(old.url);
    }
    musicRef.current = null;
    setMusicName(null);
  }, []);

  // ── Flyer → storyboard (AI) ──
  const handleFlyerFile = useCallback(async (file: File) => {
    setFlyerBusy(true);
    setStatus(null);
    setStoryboard(null);
    try {
      const { b64, mediaType } = await flyerToBase64(file);
      const res = await fetch(`${SITE_BASE}/api/admin/storyboard`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image_b64: b64, media_type: mediaType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 401
          ? 'Sign in first: open /admin in another tab, enter the passcode, then try again.'
          : (data as { error?: string }).error ?? `Storyboard failed (${res.status}).`;
        throw new Error(msg);
      }
      setStoryboard(data as StoryboardResult);
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Storyboard failed — try again.' });
    } finally {
      setFlyerBusy(false);
    }
  }, []);

  const applyStoryboardLines = useCallback(() => {
    if (!storyboard) return;
    const titles = storyboard.project.doc.scenes
      .filter((s) => s.template === 'statement' || s.template === 'title')
      .map((s) => (s.title ?? '').trim())
      .filter(Boolean)
      .slice(0, MAX_CARDS);
    if (!titles.length) {
      setStatus({ ok: false, msg: 'The storyboard has no headline cards to use here.' });
      return;
    }
    setRawLines(titles.join('\n'));
    finePrintTouched.current = true;
    setFinePrint(storyboard.facts.requires_fine_print);
    setStatus({
      ok: true,
      msg: storyboard.facts.photo_description
        ? `Lines loaded. The flyer's photo: ${storyboard.facts.photo_description} — pick a match under "Add photo background".`
        : 'Lines loaded from the flyer.',
    });
  }, [storyboard]);

  const downloadStoryboardProject = useCallback(() => {
    if (!storyboard) return;
    downloadBlob(
      new Blob([JSON.stringify(storyboard.project, null, 2)], { type: 'application/json' }),
      'flyer-storyboard.project.json',
    );
    setStatus({ ok: true, msg: 'Project saved — open the Advanced editor and use ⬆ Load.' });
  }, [storyboard]);

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
      const music = musicRef.current;
      const audioBuffer = d.audioId && music
        ? await renderMixdown(d, { [FLASH_MUSIC_ID]: music }, {})
        : null;
      const stamp = `${d.aspect.replace(':', 'x')}`;
      if (supportsMp4Export()) {
        const blob = await exportMp4(d, assetsRef.current, onP, undefined, { audioBuffer });
        downloadBlob(blob, `jjriggs-flash-ad-${stamp}.mp4`);
        setStatus({ ok: true, msg: 'MP4 saved to your downloads.' });
      } else {
        const blob = await exportWebm(d, assetsRef.current, onP, undefined, {});
        downloadBlob(blob, `jjriggs-flash-ad-${stamp}.webm`);
        setStatus({ ok: true, msg: 'Saved as WebM (no sound) — use Chrome or Edge for MP4 with music.' });
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
          <h2 className="fa-label">Build from a flyer</h2>
          <div className="fa-row">
            <button
              type="button"
              className="fa-mini-btn"
              onClick={() => flyerFileRef.current?.click()}
              disabled={flyerBusy}
            >
              {flyerBusy ? 'Reading the flyer…' : 'Upload a flyer'}
            </button>
            <input
              ref={flyerFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFlyerFile(f); e.target.value = ''; }}
            />
            <span className="fa-sub">AI turns a promo flyer into scenes</span>
          </div>
          {storyboard && (
            <div className="fa-panel">
              <p className="fa-story-head">
                {storyboard.project.doc.scenes.length} scenes
                {storyboard.facts.offer_headline ? ` · “${storyboard.facts.offer_headline}”` : ''}
                {storyboard.facts.requires_fine_print ? ' · fine print included' : ''}
              </p>
              {storyboard.facts.photo_description && (
                <p className="fa-hint">Flyer photo: {storyboard.facts.photo_description}</p>
              )}
              <div className="fa-row">
                <button type="button" className="fa-mini-btn" onClick={applyStoryboardLines}>
                  Use the lines here
                </button>
                <button type="button" className="fa-mini-btn" onClick={downloadStoryboardProject}>
                  Save for Advanced editor
                </button>
              </div>
              <p className="fa-hint">
                Every word is read off the flyer — check it before posting.
                The full storyboard (photo scenes, fine print, end card) loads in the Advanced editor via ⬆ Load.
              </p>
            </div>
          )}
        </section>

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
              checked={photoOn}
              onChange={(e) => setPhotoOn(e.target.checked)}
            />
            Add photo background
          </label>

          {photoOn && (
            <div className="fa-panel">
              <div className="fa-row">
                <button
                  type="button"
                  className="fa-mini-btn"
                  onClick={() => photoFileRef.current?.click()}
                  disabled={photoBusy}
                >
                  Upload photo
                </button>
                <input
                  ref={photoFileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ''; }}
                />
                {photoName && (
                  <span className="fa-chip">
                    {photoName}
                    <button type="button" className="fa-chip-x" onClick={clearPhoto} aria-label="Remove photo">×</button>
                  </span>
                )}
                {photoBusy && <span className="fa-sub">Loading…</span>}
              </div>

              {library === null && <p className="fa-hint">Loading the website&rsquo;s image library…</p>}
              {library !== null && library.length === 0 && (
                <p className="fa-hint">Website library isn&rsquo;t reachable here — upload a photo instead.</p>
              )}
              {library !== null && library.length > 0 && (
                <>
                  <select
                    className="fa-select"
                    value={libModel}
                    onChange={(e) => setLibModel(e.target.value)}
                  >
                    <option value="">From the website: choose equipment…</option>
                    {libGroups.map((g) => (
                      <optgroup key={g} label={g}>
                        {library.filter((l) => l.group === g).map((l) => (
                          <option key={l.label} value={l.label}>{l.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {libSelected && (
                    <div className="fa-thumbs">
                      {libSelected.urls.slice(0, 12).map((u) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={u}
                          src={fetchableUrl(u)}
                          alt={libSelected.label}
                          className="fa-thumb"
                          loading="lazy"
                          onClick={() => applyPhoto(fetchableUrl(u), libSelected.label)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="fa-row">
                <span className="fa-sub">Show it on</span>
                <div className="fa-seg" role="group">
                  {PHOTO_PLACEMENTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`fa-seg-btn fa-seg-sm${p.id === photoPlacement ? ' is-on' : ''}`}
                      onClick={() => setPhotoPlacement(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="fa-hint">The photo sits behind the words with a dark wash so the text stays readable.</p>
            </div>
          )}
        </section>

        <section className="fa-block">
          <label className="fa-check">
            <input
              type="checkbox"
              checked={audioOn}
              onChange={(e) => setAudioOn(e.target.checked)}
            />
            Add music
          </label>

          {audioOn && (
            <div className="fa-panel">
              <div className="fa-row">
                <button
                  type="button"
                  className="fa-mini-btn"
                  onClick={() => musicFileRef.current?.click()}
                  disabled={musicBusy}
                >
                  Upload music
                </button>
                <input
                  ref={musicFileRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav"
                  hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMusicFile(f); e.target.value = ''; }}
                />
                {musicName && (
                  <span className="fa-chip">
                    {musicName}
                    <button type="button" className="fa-chip-x" onClick={clearMusic} aria-label="Remove music">×</button>
                  </span>
                )}
                {musicBusy && <span className="fa-sub">Loading…</span>}
              </div>
              {BUNDLED_TRACKS.length > 0 && (
                <div className="fa-row">
                  {BUNDLED_TRACKS.map((t) => (
                    <button
                      key={t.file}
                      type="button"
                      className={`fa-seg-btn fa-seg-sm${musicName === t.label ? ' is-on' : ''}`}
                      onClick={() => pickBundledTrack(t)}
                      disabled={musicBusy}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="fa-hint">
                Use a track licensed for ads — uploads here aren&rsquo;t checked.
                It loops under the whole ad and fades out at the end. Every ad still reads with the sound off.
              </p>
            </div>
          )}
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
