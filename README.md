# royeyal.com

Personal CV site for Roy Eyal — Marketing Web Developer. Single page,
Apple-meets-cyberpunk (magenta `#F900B9` / cyan `#42EFFE` on black),
built as plain HTML/CSS/JS with Vite so it can later be rebuilt in Webflow.

## Stack

- **Vite** — dev server + build (`npm run dev`, `npm run build`)
- **GSAP** (npm) — hero intro, scroll reveals, footer scrub
- **ogl** (npm) — WebGL "Strands" hero background, a vanilla port of
  [reactbits.dev/animations/strands](https://reactbits.dev/animations/strands)
  (no React needed)
- **Fontsource** — self-hosted Archivo Variable + JetBrains Mono (no font CDN)
- **Prettier** — `npm run format`

## Structure

```
index.html            page markup (all sections)
src/main.js           entry — fonts, css, strands, animations
src/main.css          imports the style layers
src/styles/           tokens / base / sections / footer
src/js/strands.js     WebGL hero background (ogl)
src/js/animations.js  GSAP motion
public/images/        static assets
docs/copy-options.md  alternate hero/positioning copy
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
- [ ] **Headshot** — save the Elementor headshot as
      `public/images/roy-eyal.jpg` (the `<img>` already points there and
      falls back to the placeholder SVG until the file exists).
- [ ] **Favicon** — save the ANSI "R" image as `public/favicon.png`
      (512×512); the `<link>` tags are already wired.
- [ ] **Company logos** — paste inline SVG logos (fill="currentColor") into
      the `.work-card__logo` slots for Lusha, Wix, and Elementor.
- [ ] **Freelance projects** — replace the four placeholder cards in the
      Freelance section with real projects (name, link, screenshot).
- [ ] **Email** — links use `hello@royeyal.com`; confirm that's the address
      you want public.
- [ ] Decide on navigation (currently none, by design).
