/** @type {import('next').NextConfig} */

// The studio deploys as static files at <site>/studio/ on Cloudflare Pages
// (domain root, e.g. jjriggs-new.pages.dev/studio/). If the site ever moves
// back under a project path (GitHub Pages style), change BASE to match
// (e.g. '/jjriggs-new/studio'), then `npm run deploy`.
const BASE = '/studio';

module.exports = {
  output: 'export',
  basePath: BASE,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE,
  },
};
