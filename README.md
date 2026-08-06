# royeyal.com

Personal CV site for Roy Eyal — Marketing Web Developer. Single page,
Apple-meets-cyberpunk (magenta `#F900B9` / cyan `#42EFFE` on black),
built as plain HTML/CSS/JS with Vite so it can later be rebuilt in Webflow.

## Stack

- **Vite 8** — dev server + build (`npm run dev`, `npm run build`)
- **GSAP** (npm) — hero intro, scroll reveals, footer scrub
- **ogl** (npm) — WebGL "Strands" hero background, a vanilla port of
  [reactbits.dev/animations/strands](https://reactbits.dev/animations/strands)
  (no React needed)
- Self-hosted fonts, no font CDN: **Archivo Variable** (Fontsource,
  headings — swaps to Neue Machina once purchased, see
  `docs/font-options.md`), **Switzer Variable** (body), **Departure Mono**
  (terminal accents) — see `src/styles/fonts.css`
- **Prettier** — `npm run format`

## Commands

| Command                | What it does                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server (hot reload) at localhost:5173                                                                                                                                                                                                                    |
| `npm run build`        | Production build to `dist/` (hashed filenames, copies `public/` verbatim — this is what puts `favicon.png` etc. into `dist/`)                                                                                                                                               |
| `npm run preview`      | Serve the built `dist/` over HTTP so you can sanity-check the real production output before deploying. Opening `dist/index.html` directly (`file://`) will **not** work — ES modules are blocked under `file://`, so this is the only way to view a finished build locally. |
| `npm run format`       | Format the whole repo with Prettier                                                                                                                                                                                                                                         |
| `npm run format:check` | Check formatting without writing                                                                                                                                                                                                                                            |

## Structure

```
index.html            page markup (all sections)
src/main.js           entry — fonts, css, strands, animations
src/main.css          imports the style layers
src/styles/           tokens / base / sections / footer
src/js/strands.js     WebGL hero background (ogl)
src/js/animations.js  GSAP motion
src/styles/fonts.css  self-hosted @font-face declarations
public/               static assets, copied verbatim into dist/ on build
docs/copy-options.md  alternate hero/positioning copy
docs/font-options.md  font research and pairing recommendations
docs/cloudflare-workers.md  hosting + Webflow-pivot deployment reference
```

## ⚠️ Webflow migration notes

- **Remove bundled GSAP**: `src/main.js` and `src/js/animations.js` import
  GSAP from npm. In Webflow, delete those imports and use the global `gsap`
  / `ScrollTrigger` from Webflow's CDN script — never ship two copies.
- The Strands background ports to Webflow as an embed `<div data-strands>` +
  the built JS; ogl stays bundled (Webflow doesn't provide it).

## TODO (placeholders to replace)

- [x] **ANSI logo** — `public/images/royeyal-logo.svg` (currentColor),
      applied in the hero as a CSS mask so the gradient comes from CSS.
- [x] **Headshot** — `public/images/roy-eyal.webp` is live.
- [x] **Favicon** — `public/favicon.png` is live.
- [x] **Freelance projects** — Minimus, The Identity Underground,
      Silverfort, SatYield are live and linked.
- [x] **Email** — `hello@royeyal.com` confirmed and used throughout.
- [x] **Company logos** — Lusha, Wix, and Elementor inline SVGs
      (currentColor) are live in the `.work-card__logo` slots; canonical
      copies at `public/images/{lusha,wix,elementor}.svg`.
- [ ] **Neue Machina** — once purchased, drop the Ultrabold woff2 into
      `src/assets/fonts/` and follow the switch steps commented in
      `src/styles/fonts.css`.
- [ ] Decide on navigation (currently none, by design).
