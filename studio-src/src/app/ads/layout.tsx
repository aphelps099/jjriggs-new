import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JJ Riggs Flash Ads — Quick Attention Ads',
  description:
    'Type a few short sales lines and get a flashing, brand-colored attention ad for Facebook — Tactic Sans type, inverse JJ Riggs colors, logo end card, MP4 export.',
  robots: { index: false, follow: false },
};

export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
