/* ═══════════════════════════════════════════════════════
   Motion Studio — audio engine
   · Decode uploaded music files (and the audio track of
     uploaded video clips) to PCM for export mixing.
   · Mix the full soundtrack offline: background music with
     fade-in/out under everything, plus each video scene's
     own audio placed at its position on the timeline.
   · musicGainAt() is the single fade curve — the preview
     volume and the offline mix both use it, so what you
     hear is what exports.
   ═══════════════════════════════════════════════════════ */

import { MotionDoc, AudioMap, VideoMap, AudioAsset, VoClip, docDuration } from './types';

/** A time window (ms) on the timeline where narration is speaking. */
export interface VoWindow { s: number; e: number }

/**
 * The document's effective narration clips: the VO lane when it has
 * entries, else the legacy single take (voId from voStart, full length).
 */
export function effectiveVoClips(doc: MotionDoc, audio: AudioMap): VoClip[] {
  if (doc.voClips && doc.voClips.length) {
    return doc.voClips.filter((c) => c.audioId && audio[c.audioId] && c.duration > 0);
  }
  const legacy = doc.voId ? audio[doc.voId] : null;
  if (!legacy) return [];
  return [{
    id: '__legacy-vo', audioId: doc.voId as string,
    start: doc.voStart, offset: 0, duration: legacy.buffer.duration * 1000,
  }];
}

/**
 * Speaking windows for the duck curve — clip spans clamped to their
 * source length, sorted, and merged when closer than a duck ramp so the
 * music doesn't bounce between back-to-back clips.
 */
export function voWindowsFor(doc: MotionDoc, audio: AudioMap): VoWindow[] {
  const spans = effectiveVoClips(doc, audio)
    .map((c) => {
      const buf = audio[c.audioId].buffer;
      const dur = Math.min(c.duration, Math.max(0, buf.duration * 1000 - c.offset));
      return { s: c.start, e: c.start + dur };
    })
    .filter((w) => w.e > w.s)
    .sort((a, b) => a.s - b.s);
  const merged: VoWindow[] = [];
  for (const w of spans) {
    const last = merged[merged.length - 1];
    if (last && w.s - last.e < DUCK_RAMP_MS * 2) last.e = Math.max(last.e, w.e);
    else merged.push({ ...w });
  }
  return merged;
}

const MIX_SAMPLE_RATE = 48000;
const MIX_CHANNELS = 2;

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext({ sampleRate: MIX_SAMPLE_RATE });
  return sharedCtx;
}

/** Decode any audio-bearing file (mp3/wav/m4a — or an mp4 video's audio track). */
export async function decodeAudio(buf: ArrayBuffer): Promise<AudioBuffer> {
  return getAudioContext().decodeAudioData(buf);
}

/** Decode a video file's audio track; null when silent or undecodable. */
export async function tryDecodeVideoAudio(buf: ArrayBuffer): Promise<AudioBuffer | null> {
  try {
    return await decodeAudio(buf);
  } catch {
    return null;
  }
}

/** Build an AudioAsset (decoded PCM + preview element) from an uploaded file. */
export async function loadAudioAsset(file: File): Promise<AudioAsset> {
  const arrayBuf = await file.arrayBuffer();
  const buffer = await decodeAudio(arrayBuf);
  const url = URL.createObjectURL(file);
  const element = new Audio(url);
  element.preload = 'auto';
  element.loop = true;
  return {
    id: `aud-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: file.name,
    url,
    buffer,
    element,
  };
}

/**
 * Music gain at global time t — linear fade-in from 0, hold at
 * doc.audioVolume, linear fade-out to 0 at the end. Fades are clamped
 * so they never overlap on very short documents. `voWindows` are the
 * speaking spans the duck curve dips under (see voWindowsFor).
 */
export function musicGainAt(doc: MotionDoc, tMs: number, totalMs: number, voWindows: VoWindow[] = []): number {
  const vol = Math.max(0, Math.min(1, doc.audioVolume));
  if (totalMs <= 0) return 0;
  const fadeIn = Math.max(0, Math.min(doc.audioFadeIn, totalMs / 2));
  const fadeOut = Math.max(0, Math.min(doc.audioFadeOut, totalMs / 2));
  let g = 1;
  if (fadeIn > 0 && tMs < fadeIn) g = Math.min(g, tMs / fadeIn);
  if (fadeOut > 0 && tMs > totalMs - fadeOut) g = Math.min(g, (totalMs - tMs) / fadeOut);
  return Math.max(0, Math.min(1, g)) * vol * duckGainAt(doc, tMs, voWindows);
}

const DUCK_RAMP_MS = 300;

/**
 * Duck multiplier at global time t — 1 outside every speaking window,
 * doc.audioDuckLevel inside one, linear ramps either side.
 */
export function duckGainAt(doc: MotionDoc, tMs: number, voWindows: VoWindow[]): number {
  if (!doc.audioDuckOn || !voWindows.length || doc.voVolume <= 0) return 1;
  const lvl = Math.max(0, Math.min(1, doc.audioDuckLevel ?? 0.3));
  let duck = 0;
  for (const { s, e } of voWindows) {
    if (tMs >= s && tMs <= e) { duck = 1; break; }
    if (tMs > s - DUCK_RAMP_MS && tMs < s) duck = Math.max(duck, (tMs - (s - DUCK_RAMP_MS)) / DUCK_RAMP_MS);
    else if (tMs > e && tMs < e + DUCK_RAMP_MS) duck = Math.max(duck, 1 - (tMs - e) / DUCK_RAMP_MS);
  }
  return 1 - duck * (1 - lvl);
}

/**
 * Render the document's full soundtrack to a PCM buffer:
 * looped background music with the fade envelope, plus every video
 * scene's own audio at its timeline position. Returns null when the
 * document has no audible sources (export then skips the audio track).
 */
export async function renderMixdown(
  doc: MotionDoc,
  audio: AudioMap,
  videos: VideoMap,
): Promise<AudioBuffer | null> {
  const totalMs = docDuration(doc);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return null;

  const music = doc.audioId ? audio[doc.audioId] : null;
  const musicAudible = !!music && doc.audioVolume > 0;

  interface ClipSource { buffer: AudioBuffer; startS: number; offsetS: number; durS: number; gain: number }
  const clips: ClipSource[] = [];
  const addClip = (buffer: AudioBuffer | null, startMs: number, trimMs: number, durMs: number, gain: number) => {
    if (!buffer || gain <= 0) return;
    const offsetS = Math.min(trimMs / 1000, Math.max(0, buffer.duration - 0.01));
    const durS = Math.min(durMs / 1000, buffer.duration - offsetS);
    if (durS > 0) clips.push({ buffer, startS: startMs / 1000, offsetS, durS, gain });
  };

  let acc = 0;
  for (const scene of doc.scenes) {
    // Any non-image scene's background clip contributes its audio
    if (scene.template !== 'image' && scene.videoId && !scene.videoMuted) {
      addClip(videos[scene.videoId]?.audioBuffer ?? null, acc, scene.videoTrimStart, scene.duration, scene.videoVolume);
    }
    // Coach-cam thumbnail audio (any template)
    if (scene.pipVideoId && !scene.pipMuted) {
      addClip(videos[scene.pipVideoId]?.audioBuffer ?? null, acc, scene.pipTrimStart, scene.duration, scene.pipVolume);
    }
    acc += scene.duration;
  }

  // Voiceover — every clip on the VO lane (or the legacy single take)
  if (doc.voVolume > 0) {
    for (const c of effectiveVoClips(doc, audio)) {
      const startMs = Math.max(0, Math.min(c.start, totalMs));
      addClip(audio[c.audioId].buffer, startMs, c.offset, Math.min(c.duration, totalMs - startMs), doc.voVolume);
    }
  }

  if (!musicAudible && clips.length === 0) return null;

  const totalS = totalMs / 1000;
  const octx = new OfflineAudioContext(
    MIX_CHANNELS,
    Math.max(1, Math.ceil(totalS * MIX_SAMPLE_RATE)),
    MIX_SAMPLE_RATE,
  );

  if (musicAudible && music) {
    const src = octx.createBufferSource();
    src.buffer = music.buffer;
    src.loop = true;
    const gain = octx.createGain();
    // Piecewise-linear envelope matching musicGainAt()
    const fadeIn = Math.max(0, Math.min(doc.audioFadeIn, totalMs / 2)) / 1000;
    const fadeOut = Math.max(0, Math.min(doc.audioFadeOut, totalMs / 2)) / 1000;
    const vol = Math.max(0, Math.min(1, doc.audioVolume));
    gain.gain.setValueAtTime(fadeIn > 0 ? 0 : vol, 0);
    if (fadeIn > 0) gain.gain.linearRampToValueAtTime(vol, fadeIn);
    if (fadeOut > 0) {
      gain.gain.setValueAtTime(vol, Math.max(fadeIn, totalS - fadeOut));
      gain.gain.linearRampToValueAtTime(0, totalS);
    }

    // Duck envelope multiplies the fade envelope via a second gain node
    // in series — same ramps duckGainAt() gives the preview, one dip per
    // merged speaking window.
    const duck = octx.createGain();
    duck.gain.value = 1;
    if (doc.audioDuckOn && doc.voVolume > 0) {
      const lvl = Math.max(0, Math.min(1, doc.audioDuckLevel ?? 0.3));
      const ramp = DUCK_RAMP_MS / 1000;
      for (const w of voWindowsFor(doc, audio)) {
        const s = Math.max(0, Math.min(w.s, totalMs)) / 1000;
        const e = Math.min(w.e / 1000, totalS);
        if (e <= s) continue;
        duck.gain.setValueAtTime(1, Math.max(0, s - ramp));
        duck.gain.linearRampToValueAtTime(lvl, s);
        duck.gain.setValueAtTime(lvl, e);
        duck.gain.linearRampToValueAtTime(1, Math.min(totalS, e + ramp));
      }
    }

    src.connect(gain).connect(duck).connect(octx.destination);
    src.start(0);
    src.stop(totalS);
  }

  for (const clip of clips) {
    const src = octx.createBufferSource();
    src.buffer = clip.buffer;
    const gain = octx.createGain();
    gain.gain.value = clip.gain;
    src.connect(gain).connect(octx.destination);
    src.start(clip.startS, clip.offsetS, clip.durS);
  }

  return octx.startRendering();
}
