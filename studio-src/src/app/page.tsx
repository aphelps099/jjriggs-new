'use client';

import RiggsMotionStudio from '@/components/motion/RiggsMotionStudio';

/* ═══════════════════════════════════════════════════════
   JJ Riggs Motion — the equipment video editor for
   JJ Riggs Equipment, Colville WA. Upload walk-around
   clips, wrap them in the unit package (brand sting,
   unit title, spec sheet, price, financing fine print,
   end card), lay text overlays with gradient fades over
   the footage, add a presenter-cam lower third, music
   with fade-in, and a voiceover — then export MP4 with
   the full soundtrack. Everything runs in the browser.
   ═══════════════════════════════════════════════════════ */

export default function RiggsMotionPage() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f1215' }}>

      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          height: 48,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          background: '#0f1215',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="riggs-slash" aria-hidden />
          <span
            style={{
              fontFamily: "'Tactic Sans Bld', 'Bebas Neue', sans-serif",
              fontWeight: 400,
              fontSize: 13,
              letterSpacing: '0.012em',
              textTransform: 'uppercase',
              color: '#fbfbf9',
            }}
          >
            JJ Riggs <span style={{ color: '#cf1f2a' }}>Motion</span>
          </span>
        </div>
        <span
          style={{
            fontFamily: "'Michroma', sans-serif",
            fontSize: 8.5,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#c3c8ce',
          }}
        >
          JJ Riggs Equipment · Colville, WA
        </span>
      </header>

      {/* Studio fills the rest */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <RiggsMotionStudio />
      </div>
    </div>
  );
}
