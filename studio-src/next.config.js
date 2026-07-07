/** @type {import('next').NextConfig} */

// The studio deploys as static files at <site>/studio/ on GitHub Pages
// (aphelps099.github.io/jjriggs-new/studio/). Change BASE if the site
// moves to a custom domain root (e.g. '/studio'), then `npm run deploy`.
const BASE = '/jjriggs-new/studio';

module.exports = {
  output: 'export',
  basePath: BASE,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE,
  },
};
