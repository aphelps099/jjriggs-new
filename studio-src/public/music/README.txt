Bundled music for the Flash Ads builder (/studio/ads/)
=======================================================

Drop commercially-licensed tracks in this folder (MP3 or M4A, ideally
under ~2 MB each), then list them in BUNDLED_TRACKS at the top of
src/components/motion/FlashAdBuilder.tsx and run `npm run deploy`.
They appear as one-tap choices under the "Add music" toggle.

Licensing rules (these are ads — commercial use):
- The license must explicitly allow use in paid/social advertising.
  Good sources: Pixabay Music (Pixabay Content License), Mixkit
  (Mixkit License), or any paid library (Artlist, Epidemic Sound).
- Avoid Creative Commons NC (non-commercial) tracks entirely, and
  avoid CC-BY unless you're prepared to attribute in every post.
- The YouTube Audio Library's terms are written around YouTube —
  don't rely on it for Facebook ads.
- Keep a copy of each track's license/receipt in this folder as
  <trackname>-license.txt so provenance survives handoffs.
