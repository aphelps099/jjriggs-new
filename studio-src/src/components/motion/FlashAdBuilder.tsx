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

   Phase A+ of QUICK-AD-BUILDER-PLAN.md. The card
   generator itself lives in @/lib/flash-template and is
   shared with the studio's Flash Ads section.
   ═══════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Scene, AspectId, TextAnimId, AssetMap, AudioAsset, ImageAsset,
  getAspect, docDuration,
} from '@/lib/motion/types';
import { renderFrame } from '@/lib/motion/render';
import {
  exportMp4, exportWebm, exportPng, downloadBlob, supportsMp4Export, ExportProgress,
} from '@/lib/motion/export';
import { loadAudioAsset, renderMixdown, musicGainAt } from '@/lib/motion/audio';
import { ensureFontsReady } from '@/lib/motion/fonts';
import {
  ROTATIONS, PACES, FLASH_ANIMS, MAX_CARDS, MAX_WORDS,
  FLASH_PHOTO_ID, FLASH_MUSIC_ID, splitLines, wordCount, buildFlashDoc,
} from '@/lib/flash-template';
import {
  harvestLibrary, fetchableUrl, SITE_BASE, LibraryModel,
  fetchMusicList, uploadMedia, absoluteMediaUrl, createReviewLink, CloudTrack,
} from '@/lib/site-library';
import './flash-ads.css';

const ASSET_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

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

// Default lines are all true statements — the offer line is typed in,
// never invented for the user (site rule: never invent offers/prices).
const DEFAULT_LINES = 'TYM TRACTORS\nBAD BOY MOWERS\nFAMILY OWNED IN COLVILLE\nCALL ANDREW TODAY';

/** The studio's autosave slot — writing here then opening /studio/ hands
    the current ad to the advanced editor with full editing power. */
const STUDIO_AUTOSAVE_KEY = 'jjriggs-motion-autosave-v1';

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
  const [cloudTracks, setCloudTracks] = useState<CloudTrack[]>([]);
  const musicFileRef = useRef<HTMLInputElement>(null);

  // Cloud
  const [lastRender, setLastRender] = useState<{ blob: Blob; name: string } | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);

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
  const photoActive = photoOn && !!photoName;
  const doc = buildFlashDoc({
    lines, rotation, paceMs, anim, aspect, finePrint,
    hasMusic: audioOn && !!musicName,
    photoOnCard: (i) => photoActive && (
      photoPlacement === 'all'
      || (photoPlacement === 'hook' && i === 0)
      || (photoPlacement === 'alt' && i % 2 === 0)
    ),
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
    fetchMusicList().then((t) => { if (alive) setCloudTracks(t); });
    return () => { alive = false; };
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
        const name = `jjriggs-flash-ad-${stamp}.mp4`;
        downloadBlob(blob, name);
        setLastRender({ blob, name });
        setStatus({ ok: true, msg: 'MP4 saved to your downloads.' });
      } else {
        const blob = await exportWebm(d, assetsRef.current, onP, undefined, {});
        const name = `jjriggs-flash-ad-${stamp}.webm`;
        downloadBlob(blob, name);
        setLastRender({ blob, name });
        setStatus({ ok: true, msg: 'Saved as WebM (no sound) — use Chrome or Edge for MP4 with music.' });
      }
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Export failed — try again.' });
    } finally {
      setExporting(false);
    }
  }, [rawLines]);

  /** Snapshot the hook card's midpoint as the Facebook video cover. */
  const handleCover = useCallback(async () => {
    try {
      await ensureFontsReady(['Tactic Sans Bld', 'Questrial', 'Michroma']);
      const d = docRef.current;
      const t = Math.min(Math.max(200, d.scenes[0].duration * 0.7), docDuration(d) - 50);
      const blob = await exportPng(d, assetsRef.current, t, {});
      downloadBlob(blob, `jjriggs-flash-cover-${d.aspect.replace(':', 'x')}.png`);
      setStatus({ ok: true, msg: 'Cover image saved — use it as the video thumbnail on Facebook.' });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Cover export failed.' });
    }
  }, []);

  const saveToCloud = useCallback(async () => {
    if (!lastRender) return;
    setCloudBusy(true);
    try {
      const { key, url } = await uploadMedia('renders', lastRender.name, lastRender.blob);
      let link: string;
      try {
        const firstLine = splitLines(rawLines)[0] ?? 'Flash ad';
        link = absoluteMediaUrl(await createReviewLink(`${firstLine} — flash ad`, key));
      } catch {
        link = absoluteMediaUrl(url);
      }
      await navigator.clipboard.writeText(link).catch(() => {});
      setStatus({ ok: true, msg: `Review link copied — text it to Andrew: ${link}` });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Cloud save failed.' });
    } finally {
      setCloudBusy(false);
    }
  }, [lastRender, rawLines]);

  /** Hand the current ad to the advanced editor via its autosave slot —
      full timeline, photos per card, emoji layers, VO, the works. */
  const openInStudio = useCallback(() => {
    const photo = assetsRef.current[FLASH_PHOTO_ID];
    const music = musicRef.current;
    const payload = {
      app: 'jjriggs-motion',
      version: 1,
      doc: docRef.current,
      media: {
        videos: {},
        images: photo ? { [photo.name]: FLASH_PHOTO_ID } : {},
        audio: music ? { [music.name]: FLASH_MUSIC_ID } : {},
      },
    };
    try {
      localStorage.setItem(STUDIO_AUTOSAVE_KEY, JSON.stringify(payload));
      window.open(`${ASSET_BASE}/`, '_blank');
      setStatus({
        ok: true,
        msg: photo || music
          ? 'Opened in the studio — re-add the photo/music there by the same name to relink.'
          : 'Opened in the studio — full timeline editing from here.',
      });
    } catch {
      setStatus({ ok: false, msg: "Couldn't hand off — use Save for Advanced editor instead." });
    }
  }, []);

  const pickCloudTrack = useCallback(async (track: CloudTrack) => {
    setMusicBusy(true);
    setStatus(null);
    try {
      const res = await fetch(track.url);
      if (!res.ok) throw new Error(`Track failed to load (${res.status})`);
      const blob = await res.blob();
      const fname = track.url.split('/').pop() ?? `${track.name}.mp3`;
      const file = new File([blob], fname, { type: blob.type || 'audio/mpeg' });
      setMusicAsset(await loadAudioAsset(file), track.name);
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Track failed to load.' });
    } finally {
      setMusicBusy(false);
    }
  }, [setMusicAsset]);

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
            {FLASH_ANIMS.map((a) => (
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
              {(BUNDLED_TRACKS.length > 0 || cloudTracks.length > 0) && (
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
                  {cloudTracks.map((t) => (
                    <button
                      key={t.url}
                      type="button"
                      className={`fa-seg-btn fa-seg-sm${musicName === t.name ? ' is-on' : ''}`}
                      onClick={() => pickCloudTrack(t)}
                      disabled={musicBusy}
                      title="From the ad-music library"
                    >
                      ♪ {t.name}
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
          <div className="fa-row">
            <button type="button" className="fa-mini-btn" onClick={handleCover} disabled={exporting}>
              Save cover (PNG)
            </button>
            <button type="button" className="fa-mini-btn" onClick={openInStudio} disabled={exporting} title="Full timeline editing — photos per card, emoji, voiceover">
              Open in Advanced Studio →
            </button>
            {lastRender && (
              <button type="button" className="fa-mini-btn" onClick={saveToCloud} disabled={cloudBusy}>
                {cloudBusy ? 'Uploading…' : '☁ Save & create review link'}
              </button>
            )}
          </div>
          {status && (
            <p className={`fa-status${status.ok ? ' is-ok' : ' is-err'}`} role="status">{status.msg}</p>
          )}
          <p className="fa-hint">The end card with the logo and phone number is always included. Use Chrome or Edge for MP4. The cover PNG is the video&rsquo;s Facebook thumbnail; the cloud link is for approval before posting.</p>
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
