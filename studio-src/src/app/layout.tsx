import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JJ Riggs Motion — Equipment Video Editor',
  description:
    'The inventory-video editor for JJ Riggs Equipment: upload walk-around clips, wrap them in the unit package (specs, price, financing fine print, end card), and export MP4 with music and voiceover.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
