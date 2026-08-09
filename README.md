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
- **cuelume** (npm) — opt-in interaction sounds, synthesised via Web Audio
  (no audio files). Default OFF, never persisted — every page load starts
  silent. The toggle is a body-level fixed control at the bottom-right,
  not in the footer (nobody found it there); when a nav bar exists, move
  it in and drop the `.sound-toggle--fixed` modifier. Loaded lazily, so
  it costs nothing unless enabled
- Self-hosted fonts, no font CDN, **latin subset only** (this site is US
  English) — all three live in `src/assets/fonts/` and are declared in
  `src/styles/fonts.css`:
  - **Tektur** — display/headings, variable weight 400–900
  - **Switzer Variable** — body
  - **Departure Mono** — terminal accents (single weight, never fake-bold it)
- **Prettier** — `npm run format`
- **Wrangler** — deploys to Cloudflare Workers (see Deploy below)

## Commands

| Command                | What it does                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server (hot reload) at localhost:5173                                                                                                                                                                                                                    |
| `npm run build`        | Production build to `dist/` (hashed filenames, copies `public/` verbatim — this is what puts `favicon.png` etc. into `dist/`)                                                                                                                                               |
| `npm run preview`      | Serve the built `dist/` over HTTP so you can sanity-check the real production output before deploying. Opening `dist/index.html` directly (`file://`) will **not** work — ES modules are blocked under `file://`, so this is the only way to view a finished build locally. |
| `npm run format`       | Format the whole repo with Prettier                                                                                                                                                                                                                                         |
| `npm run format:check` | Check formatting without writing                                                                                                                                                                                                                                            |
| `npm run deploy`       | Build fresh, then `wrangler deploy` to Cloudflare. Sources `CLOUDFLARE_API_TOKEN` from the gitignored `.env`. Never deploys a stale `dist/`.                                                                                                                                |

## Structure

```
index.html             page markup (all sections)
vite.config.js         build config (target es2020 — dynamic import)
src/main.js            entry — css, strands, animations, timeline, sound
src/main.css           imports the style layers
src/styles/            fonts / tokens / base / sections / timeline / footer
src/styles/fonts.css   self-hosted @font-face declarations
src/assets/fonts/      the three woff2 files themselves
src/js/strands.js      WebGL hero background (ogl)
src/js/animations.js   GSAP hero intro + scroll reveals
src/js/timeline.js     GSAP scroll-highlighted "four disciplines" timeline
src/js/sound.js        cuelume interaction sounds (opt-in)
public/                static assets, copied verbatim into dist/ on build
worker/index.js        Cloudflare Worker — serves dist/ via assets binding
wrangler.jsonc         Worker config (account_id still a placeholder)
docs/copy-options.md   alternate hero/positioning copy
docs/font-options.md   font research and pairing recommendations
docs/cloudflare-workers.md  hosting + Webflow-pivot deployment reference
docs/google-workspace-domain-change.md
                       moving Workspace from royeyal.studio to royeyal.com
docs/webflow-studio-wind-down.md
                       retiring the .studio site, keeping the Workspace plan
```

> ⚠️ The site advertises `hello@royeyal.com`, but the mailbox still lives
> at `royeyal.studio`. **Don't go live until that's resolved** — see
> `docs/google-workspace-domain-change.md`.

## Deploy

Hosted on Cloudflare Workers using a static assets binding — Vite already
writes hashed filenames into `index.html`, so no stable-URL worker logic
is needed. Full reference, including the Webflow-pivot variant and the two
silent-failure gotchas, is in `docs/cloudflare-workers.md`.

Before the first deploy, two placeholders need real values:

1. `account_id` in `wrangler.jsonc` (still `<YOUR_ACCOUNT_ID>`) — from the
   Cloudflare dashboard or `npx wrangler whoami`
2. `CLOUDFLARE_API_TOKEN` in `.env` (gitignored), needs `Workers
Scripts:Edit`

Then `npm run deploy`. Validate config changes with
`npx wrangler deploy --dry-run` first. The domain is registered with
Cloudflare Registrar, so attaching `royeyal.com` is a same-account
dashboard action — no external DNS changes.

## ⚠️ Webflow migration notes

- **Remove bundled GSAP**: `src/main.js`, `src/js/animations.js` and
  `src/js/timeline.js` import GSAP from npm. In Webflow, delete those
  imports and use the global `gsap` / `ScrollTrigger` from Webflow's CDN
  script — never ship two copies.
- **cuelume is ESM-only**, so the CDN form is a pinned module URL:
  `<script type="module">import { bind } from 'https://esm.sh/cuelume@0.2.2'`.
  Same bundled-now/CDN-later situation as GSAP.
- Everything driven by `data-*` attributes ports cleanly — Webflow's
  custom-attributes panel takes them verbatim. **All of them have to come
  across**: each is a JS hook with no class-name fallback, and one of the
  files below reads it by name.
  - `src/main.js` — `data-strands`, `data-sound-toggle`, `data-year`
  - `src/js/animations.js` — `data-hero`, `data-reveal`, `data-giant`
  - `src/js/timeline.js` — `data-step-timeline-*`
  - cuelume itself — `data-cuelume-press`
  - `src/js/sound.js` — `data-sound-state`, and `data-sound-on` /
    `data-sound-off` on the timeline steps. Easiest to miss and the only
    ones that fail **silently**: they drive the per-step scroll cues
    through a MutationObserver watching `data-status`, so if they get
    dropped the page still works perfectly, just mute on scroll.
  - `src/styles/sections.css` — `data-brand`, the only CSS-only one
    (picks the logo tile colour)

  Class-name-based selectors would **not** survive, since Webflow
  generates its own.

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
- [x] **Company logos** — Lusha, Wix, Elementor and Roy's own R monogram
      are inline SVGs (currentColor) in the four `.work-card__logo` slots.
      Canonical copies of the first three are at
      `public/images/{lusha,wix,elementor}.svg`. The R has **no separate
      file** — it is the 20 subpaths of the letter R cut out of
      `public/images/royeyal-logo.svg`, the same ANSI wordmark the hero
      masks, so the two can never drift apart.
- [x] **Display font** — Tektur is live (self-hosted, latin-only).
- [ ] **Neue Machina** — optional upgrade. Once purchased, drop the
      Ultrabold woff2 into `src/assets/fonts/` and follow the switch steps
      commented at the bottom of `src/styles/fonts.css`. Note it is a
      single static weight, so `--weight-display` / `--weight-display-max`
      both need to become `800`.
- [ ] **Cloudflare** — fill in `account_id` and `CLOUDFLARE_API_TOKEN`,
      then `npm run deploy` (see Deploy above).
- [ ] Decide on navigation (currently none, by design).
