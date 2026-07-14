/* ═══════════════════════════════════════════════════════
   Flash Ads template — the typographic attention-ad
   generator shared by the simple builder (/studio/ads/)
   and the studio's Flash Ads section. Short sales lines
   become hard-cut statement cards in alternating inverse
   brand colors, closing on the logo + phone end card.

   The pace floor is a safety rule, not a style choice:
   600ms/card keeps color changes under ~2 per second —
   inside WCAG 2.3.1's three-flashes-per-second line and
   Meta's no-strobe creative policy. Don't add a faster
   preset.
   ═══════════════════════════════════════════════════════ */

import {
  MotionDoc, Scene, CustomScheme, AspectId, TextAnimId,
  makeScene, defaultDoc,
} from '@/lib/motion/types';

// ── Brand color pairs (site style guide — warm darks, one Bad Boy Red) ──
export const RED_ON_WHITE: CustomScheme = { bg: '#fbfbf9', fg: '#cf1f2a', accent: '#14171a' };
export const WHITE_ON_RED: CustomScheme = { bg: '#cf1f2a', fg: '#fbfbf9', accent: '#14171a' };
export const RED_ON_INK: CustomScheme   = { bg: '#14171a', fg: '#cf1f2a', accent: '#fbfbf9' };
export const BONE_ON_INK: CustomScheme  = { bg: '#14171a', fg: '#f3f1ea', accent: '#cf1f2a' };
export const INK_ON_BONE: CustomScheme  = { bg: '#f3f1ea', fg: '#14171a', accent: '#cf1f2a' };
export const BONE_ON_DEEP: CustomScheme = { bg: '#0f1215', fg: '#f3f1ea', accent: '#cf1f2a' };

export interface Rotation {
  id: string;
  label: string;
  hint: string;
  cycle: CustomScheme[];
}

// Fixed rotations of validated pairs — no free color picker by design.
export const ROTATIONS: Rotation[] = [
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

export const PACES = [
  { id: 'steady', label: 'Steady', ms: 1200 },
  { id: 'quick',  label: 'Quick',  ms: 900 },
  { id: 'rapid',  label: 'Rapid',  ms: 600 },
] as const;

export const FLASH_ANIMS: { id: TextAnimId; label: string }[] = [
  { id: 'scale-in',    label: 'Pop' },
  { id: 'mask-reveal', label: 'Reveal' },
  { id: 'rise',        label: 'Rise' },
];

export const MAX_CARDS = 6;
export const MAX_WORDS = 5;

// Mirrors RIGGS_SCENE_DEFAULTS.endcard / DEFAULT_DISCLAIMER in the studio.
export const END_CARD = {
  kicker: 'FAMILY OWNED IN COLVILLE',
  title: 'JJRIGGSEQUIPMENT.COM',
  subtitle: 'JJ Riggs Equipment · Colville, WA · 509-738-2985',
};
export const FINE_PRINT =
  'Financing on approved credit. Advertised price excludes tax, title, freight, and dealer fees. '
  + 'Offers subject to change without notice. Equipment availability and specifications may vary. '
  + 'See dealer for complete details.';

export const FLASH_PHOTO_ID = '__flash-photo';
export const FLASH_MUSIC_ID = '__flash-music';

export function splitLines(raw: string): string[] {
  return raw.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, MAX_CARDS);
}

export function wordCount(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

export interface FlashSceneOpts {
  lines: string[];
  rotation: Rotation;
  paceMs: number;
  anim: TextAnimId;
  finePrint: boolean;
  /** Card indexes that get the flash photo behind them (ads page only). */
  photoOnCard?: (i: number) => boolean;
}

/** The flash sequence as scenes — cards, optional fine print, end card. */
export function buildFlashScenes(opts: FlashSceneOpts): Scene[] {
  const { lines, rotation, paceMs, anim, finePrint, photoOnCard } = opts;

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
      ...(photoOnCard?.(i)
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

  return scenes;
}

export interface FlashDocOpts extends FlashSceneOpts {
  aspect: AspectId;
  hasMusic: boolean;
}

/** A complete flash-ad document (the simple builder's whole output). */
export function buildFlashDoc(opts: FlashDocOpts): MotionDoc {
  return {
    ...defaultDoc(),
    aspect: opts.aspect,
    fps: 30,
    scenes: buildFlashScenes(opts),
    fontHeading: 'Tactic Sans Bld',
    fontBody: 'Questrial',
    fontLabel: 'Michroma',
    accentSkewDeg: -13,
    showGrain: false,
    watermark: '',
    audioId: opts.hasMusic ? FLASH_MUSIC_ID : null,
    audioVolume: 0.7,
    audioFadeIn: 300,
    audioFadeOut: 900,
  };
}
