# royeyal.com

Personal CV site for Roy Eyal — Marketing Web Developer. Single page,
Apple-meets-cyberpunk (magenta `#F900B9` / cyan `#42EFFE` on black),
built as plain HTML/CSS/JS with Vite so it can later be rebuilt in Webflow.

## Stack

- **Vite 8** — dev server + build (`npm run dev`, `npm run build`)
- **GSAP** (npm) — hero intro, scroll reveals, footer scrub, anchor
  scrolling (**ScrollToPlugin**) and the bottom nav's easing
  (**CustomEase**). Both were Club-only once and have been free since
  GSAP 3.13, so Webflow's own CDN carries them — the pivot needs no npm
  fallback for either
- **ogl** (npm) — WebGL "Strands" hero background, a vanilla port of
  [reactbits.dev/animations/strands](https://reactbits.dev/animations/strands)
  (no React needed)
- **cuelume** (npm) — opt-in interaction sounds, synthesised via Web Audio
  (no audio files). Default OFF, never persisted — every page load starts
  silent. The toggle now lives in the **bottom nav bar**, which is what
  the old `.sound-toggle--fixed` note anticipated; that modifier is gone.
  It sits in the always-visible bar rather than inside the menu panel on
  purpose — it was in the footer once and nobody found it, and hiding it
  behind a click would regress the same way. Loaded lazily, so it costs
  nothing unless enabled
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
src/styles/            fonts / tokens / base / clipboard / sections /
                       timeline / footer / nav
src/styles/fonts.css   self-hosted @font-face declarations
src/assets/fonts/      the three woff2 files themselves
src/js/strands.js      WebGL hero background (ogl)
src/js/animations.js   GSAP hero intro, reveals, nav reveal + section indicator
src/js/timeline.js     GSAP scroll-highlighted "four disciplines" timeline
src/js/sound.js        cuelume interaction sounds (opt-in)
src/js/nav.js          expanding bottom nav — VENDORED from Osmo Supply
src/js/scroll.js       GSAP ScrollToPlugin anchor scrolling
src/js/clipboard.js    copy-to-clipboard email fields
public/                static assets, copied verbatim into dist/ on build
worker/index.js        Cloudflare Worker — serves dist/ via assets binding
wrangler.jsonc         Worker config — account_id, assets binding
docs/copy-options.md   alternate hero/positioning copy
docs/font-options.md   font research and pairing recommendations
docs/cloudflare-workers.md  hosting + Webflow-pivot deployment reference
docs/google-workspace-domain-change.md
                       moving Workspace from royeyal.studio to royeyal.com
docs/webflow-studio-wind-down.md
                       retiring the .studio site, keeping the Workspace plan
```

> ⚠️ The site advertises `hello@royeyal.com`, which is not yet a real
> mailbox — `royeyal.com` still has **Cloudflare Email Routing** MX
> records, so at best mail forwards somewhere and cannot be replied to
> from that address. `royeyal.com` is being promoted to the Workspace
> primary domain to fix it: `docs/google-workspace-domain-change.md`.
> Worth finishing before the URL goes on a CV.

## Deploy

Hosted on Cloudflare Workers using a static assets binding — Vite already
writes hashed filenames into `index.html`, so no stable-URL worker logic
is needed. Full reference, including the Webflow-pivot variant and the two
silent-failure gotchas, is in `docs/cloudflare-workers.md`.

**Live at [royeyal.com](https://royeyal.com)** since 2026-08-09.

`npm run deploy` builds fresh and ships. Validate config changes with
`npx wrangler deploy --dry-run` first (local only — it does **not**
check token scopes; the real deploy is the test for those).

`account_id` is committed in `wrangler.jsonc` — it is not a secret, it
appears in every dashboard URL. `CLOUDFLARE_API_TOKEN` lives in the
gitignored `.env`.

The apex is attached as a Workers **custom domain**, which created its
own DNS record. It is not declared in `wrangler.jsonc` — see the note
there and the token-scope table below. `workers_dev` is **off**: a live
`*.workers.dev` URL would be a second indexable copy of the whole site.

### Token scopes

Probed against the live API, not inferred:

| Scope                          | State | Consequence                                                               |
| ------------------------------ | ----- | ------------------------------------------------------------------------- |
| Account → Workers Scripts:Edit | ✅    | deploys, and **custom domains** — those use `/accounts/…/workers/domains` |
| Zone → Zone:Read               | ✅    |                                                                           |
| Zone → Workers Routes:Edit     | ❌    | `routes` can't be declared in `wrangler.jsonc` — see the note there       |
| Zone → DNS:Edit                | ❌    | DNS records are a dashboard action                                        |
| Zone → Transform/Config Rules  | ❌    | Redirect Rules are a dashboard action                                     |

The custom-domain vs. routes split is the non-obvious one: attaching
`royeyal.com` worked, so it's tempting to conclude Workers Routes is
granted. It isn't — those are different endpoints, and declaring
`routes` makes `wrangler deploy` exit non-zero _after_ a successful
upload.

Granting `Workers Routes:Edit`, `DNS:Edit` and `Transform Rules:Edit`
would make the whole setup scriptable from the repo.

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
    `data-sound-off` in **two** places. Easiest to miss and the only
    ones that fail **silently**: if they get dropped the page still
    works perfectly, just mute.
    - on the timeline steps, driving the per-step scroll cues through a
      MutationObserver watching `data-status`
    - on the `<nav>`, driving the menu's open/close cues (`arrival` /
      `scan`) through a second observer watching
      `data-bottom-nav-open`. Keeping the cue here rather than in
      `nav.js` is what lets the Osmo script stay untouched.
  - `src/styles/sections.css` — `data-brand`, the only CSS-only one
    (picks the logo tile colour)
  - `src/js/scroll.js` — none of its own; it delegates off `href="#…"`
  - `src/js/clipboard.js` — `data-clip` (holds the value **and** is the
    hook), plus `data-copied`, which the module writes and
    `clipboard.css` animates off
  - `src/js/animations.js` — `data-nav-current`, the section label in
    the closed nav pill
  - `src/js/nav.js` — **`data-bottom-nav-*`: seven vendor-owned hooks**
    (`-init`, `-open`, `-inner`, `-bar`, `-toggle`, `-panel`, `-reveal`,
    `-divider`). These are Osmo Supply's, not ours — the vendored script
    reads every one by name, and `--closed-width` / `--open-width` /
    `--bar-height` are read by name too. Renaming any of them collapses
    the nav to zero width

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
- [x] **Cloudflare** — deployed and live at royeyal.com, apex attached
      as a Workers custom domain.
- [x] **www redirect** — `www.royeyal.com` 301s to the apex, preserving
      path and query. Verified with `curl --resolve` (this machine's
      resolver can't reach the zone). Path preservation was **not** what
      was originally specified, and is kept deliberately: nothing stale
      points at a www deep link, and stripping would silently break www
      links the day a second page exists.
- [x] **Favicon** — `public/favicon.svg`, the R monogram cut from
      `royeyal-logo.svg`, transparent so one file serves light and dark
      tab strips. At 16px it is soft; that is accepted, because 16px CSS
      is 32px physical on retina, where it's clean.
- [x] **apple-touch-icon** — 180×180, opaque, square-cornered.
- [ ] **hello@royeyal.com** — becoming the Workspace primary domain, so
      the address on the site can both send and receive. Step-by-step in
      `docs/google-workspace-domain-change.md`.
- [x] **Navigation** — expanding bottom nav (Osmo Supply, vendored in
      `src/js/nav.js`). Five stops, socials, a copy-email, and the sound
      toggle. Bottom placement keeps the WebGL hero uncontested and means
      **no `scroll-margin-top` is needed anywhere** — a bottom bar never
      covers a heading. Section IDs are `#top` / `#about` / `#career` /
      `#work` / `#contact`; note `#work` is now the portfolio and the
      employment history is `#career`.
- [x] **Copy-email** — `hello@royeyal.com` copies rather than firing
      `mailto:`, in the footer and the nav panel, with a quiet `mailto:`
      link under the footer field as the escape hatch.
