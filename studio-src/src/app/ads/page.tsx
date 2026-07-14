'use client';

import FlashAdBuilder from '@/components/motion/FlashAdBuilder';

/* ═══════════════════════════════════════════════════════
   JJ Riggs Flash Ads — the simple, Andrew-friendly ad
   maker. Six controls, one red button. The advanced
   timeline editor stays at /studio/.
   ═══════════════════════════════════════════════════════ */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function FlashAdsPage() {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f1215' }}>

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
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 8,
              height: 18,
              background: '#cf1f2a',
              transform: 'skewX(-13deg)',
              flexShrink: 0,
            }}
          />
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
            JJ Riggs <span style={{ color: '#cf1f2a' }}>Flash Ads</span>
          </span>
        </div>
        <a
          href={`${BASE}/`}
          style={{
            fontFamily: "'Michroma', sans-serif",
            fontSize: 8.5,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#c3c8ce',
            textDecoration: 'none',
          }}
        >
          Advanced editor →
        </a>
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
        <FlashAdBuilder />
      </div>
    </div>
  );
}
