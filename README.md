# royeyal.com

Personal CV site for Roy Eyal — Marketing Web Developer. Single page,
Apple-meets-cyberpunk (magenta `#F900B9` / cyan `#42EFFE` on black),
built as plain HTML/CSS/JS with Vite, hosted on Cloudflare Workers.

## Stack

- **Vite 8** — dev server + build (`npm run dev`, `npm run build`)
- **GSAP** (npm) — hero intro, scroll reveals, footer scrub, anchor
  scrolling (**ScrollToPlugin**) and the bottom nav's easing
  (**CustomEase**). Both were Club-only once and have been free since
  GSAP 3.13, so they come straight from npm with no license gate
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
  English) — declared in `src/styles/fonts.css`, served from
  `public/fonts/`, licenses in
  [`public/fonts/LICENSES.md`](./public/fonts/LICENSES.md):
  - **Tektur** — display/headings, variable weight 400–900. SIL OFL 1.1.
  - **Satoshi Variable** — body, variable weight 300–900. The range in the
    `@font-face` is load-bearing: Satoshi's default instance is wght 900,
    so without it body copy can render Black. **Not in this repo** — the
    ITF Free Font License forbids redistributing the file, so it is
    gitignored; grab it from Fontshare after cloning. The page still
    builds and renders without it, on `system-ui`.
  - **Departure Mono** — terminal accents (single weight, never fake-bold
    it). MIT.
- **Typography tokens** — every weight and line-height is a token in
  `src/styles/tokens.css`; no component carries a bare number.
  `--weight-mono` is fixed at 400 because Departure Mono has no weight
  axis, and anything else makes the browser synthesise a bold over its
  pixel grid.
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
public/fonts/         the woff2 files themselves (public/ so the URLs stay
                       stable enough for index.html to preload them)
src/js/strands.js      WebGL hero background (ogl)
src/js/animations.js   GSAP hero intro, reveals, nav reveal + section indicator
src/js/timeline.js     GSAP scroll-highlighted "four disciplines" timeline
src/js/sound.js        cuelume interaction sounds (opt-in)
src/js/nav.js          expanding bottom nav — VENDORED from Osmo Supply
src/js/scroll.js       GSAP ScrollToPlugin anchor scrolling
src/js/clipboard.js    copy-to-clipboard email fields
src/js/signature.js    the ANSI wordmark + hello, in the console and (via
                       the build) in the HTML source. Single source of truth
build/llms-txt.js      Vite plugin — emits dist/llms.txt from index.html
build/strip-html-comments.js
                       Vite plugin — removes HTML comments from dist/ and
                       prepends the signature block
public/                static assets, copied verbatim into dist/ on build
public/og.png          1200x630 link-preview card (generated — see docs/)
public/404.html        standalone 404 (inline CSS, no JS, no build step)
public/_headers        security + cache headers, read from dist/ root
worker/index.js        Cloudflare Worker — serves dist/ via assets binding
wrangler.jsonc         Worker config — account_id, assets, 404 handling
docs/og-image-source.html  source for public/og.png + regenerate command
docs/copy-options.md   alternate hero/positioning copy
docs/font-options.md   font research and pairing recommendations
docs/cloudflare-workers.md  hosting and deployment reference
```

> **`hello@royeyal.com` is live and that migration is closed.** The
> Workspace account moved off `royeyal.studio`, and DNS was verified
> 2026-08-15: Cloudflare Email Routing off, MX a single
> `smtp.google.com`, exactly one SPF record, `google._domainkey` live,
> `_dmarc` pointed at `dmarc@royeyal.com`. Seven records, all correct.
>
> Two standing constraints outlive the move. The `dmarc@` alias must
> exist or reports bounce. And `royeyal.studio` must keep both its MX
> records and its registration — the `hello@royeyal.studio` alias stops
> routing the day either goes, and a live 301 to this site depends on
> the registration too. **Auto-renew must stay on.**

## Comments, and what ships

The comments in `index.html` are the point, not clutter — they are why
the next change to this page is a five-minute change. **Keep writing
them.** They do not go over the wire.

`build/strip-html-comments.js` removes every HTML comment from
`dist/index.html` at build time. Source is untouched; only the built file
is rewritten. Measured on the real build, that is **17.1 kB of 66.2 kB
raw and 7.4 kB of 17.0 kB gzipped** — the comments were 43% of the
transferred HTML on a page that preloads two fonts to save one round
trip.

- **To keep a comment in the shipped file**, write it as `<!--! … -->`.
  It survives with the `!` removed. Same convention Terser and esbuild
  use for legal banners.
- **Conditional comments** (`<!--[if …]>`) are never touched.
- The contents of `<script>`, `<style>`, `<pre>` and `<textarea>` are
  lifted out before the strip and put back after, so a `-->` inside the
  `application/ld+json` block cannot end a comment early and eat live
  markup. The plugin asserts the output still ends in `</html>` and that
  something was actually removed, and **fails the build** rather than
  emitting a damaged page.
- CSS and JS comments need no equivalent — esbuild already strips those
  when it minifies. Only HTML was leaking.

The one comment that does ship is the signature: the ANSI wordmark and a
hello, prepended above the doctype (valid HTML5, and verified not to
trigger quirks mode — `document.compatMode` is `CSS1Compat`). It is also
printed to the DevTools console. Both come from `LOGO` and `HELLO` in
`src/js/signature.js`, which the build plugin imports, so the two copies
cannot drift — **edit the wording there, not in the plugin.** Everything
above `initSignature()` in that file is inert data with no DOM access,
because Node evaluates the module during the build.

`build/llms-txt.js` is unaffected by any of this: it reads `index.html`
off disk rather than taking the transformed HTML.

## Deploy

Hosted on Cloudflare Workers using a static assets binding — Vite already
writes hashed filenames into `index.html`, so no stable-URL worker logic
is needed. Full reference, including the two silent-failure gotchas, is
in `docs/cloudflare-workers.md`.

**Live at [royeyal.com](https://royeyal.com)** since 2026-08-09.

`npm run deploy` builds fresh and ships. Validate config changes with
`npx wrangler deploy --dry-run` first (local only — it does **not**
check token scopes; the real deploy is the test for those).

`account_id` is committed in `wrangler.jsonc` — it is not a secret, it
appears in every dashboard URL. `CLOUDFLARE_API_TOKEN` lives in the
gitignored `.env`.

**Deploying from a git worktree**: `.env` is gitignored, and worktrees do
not share gitignored files — each is its own working directory. A fresh
worktree therefore has no `.env`, so `npm run deploy` exports nothing and
`wrangler deploy` fails for lack of a token, with an error that points at
credentials rather than at the missing file. Symlink it in once per
worktree, from the repo root:

```bash
ln -sf "$(git rev-parse --path-format=absolute --git-common-dir)/../.env" .env
```

A symlink rather than a copy, so it stays current if the token rotates.

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

## JS hooks (`data-*`)

Every behavior on this page is wired through a `data-*` attribute
rather than a class name. **There is no class-name fallback**: rename or
drop one in the markup and the feature stops, usually with no error.

- `src/main.js` — `data-strands`, `data-sound-toggle`, `data-year`
- `src/js/animations.js` — `data-hero`, `data-reveal`, `data-giant`, and
  `data-nav-current` (the section label in the closed nav pill)
- `src/js/timeline.js` — `data-step-timeline-*`
- cuelume itself — `data-cuelume-press`
- `src/js/sound.js` — `data-sound-state`, plus `data-sound-on` /
  `data-sound-off` in **two** places. The easiest to miss and the only
  ones that fail **silently**: drop them and the page still works
  perfectly, just mute.
  - on the timeline steps, driving the per-step scroll cues through a
    MutationObserver watching `data-status`
  - on the `<nav>`, driving the menu's open/close cues (`arrival` /
    `scan`) through a second observer watching `data-bottom-nav-open`.
    Keeping the cue here rather than in `nav.js` is what lets the Osmo
    script stay untouched.
- `src/styles/sections.css` — `data-brand`, the only CSS-only one
  (picks the logo tile color)
- `src/js/clipboard.js` — `data-clip` (holds the value **and** is the
  hook), plus `data-copied`, which the module writes and
  `clipboard.css` animates off
- `src/js/scroll.js` — none of its own; it delegates off `href="#…"`
- `src/js/nav.js` — **`data-bottom-nav-*`: seven vendor-owned hooks**
  (`-init`, `-open`, `-inner`, `-bar`, `-toggle`, `-panel`, `-reveal`,
  `-divider`). These are Osmo Supply's, not ours — the vendored script
  reads every one by name, and `--closed-width` / `--open-width` /
  `--bar-height` are read by name too. Renaming any collapses the nav to
  zero width.

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
- [x] **Neue Machina** — **decided against.** Tektur is the display face
      and this is closed, not pending. The dead commented-out
      `@font-face` that used to sit in `src/styles/fonts.css` has been
      removed; the swap procedure and the reasoning now live in
      [`docs/font-options.md`](./docs/font-options.md). Short version:
      Neue Machina ships as a single static weight, so it would collapse
      `--weight-display` / `--weight-display-max` to one value and cost
      the footer wordmark its contrast against the headings.
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
- [x] **Search favicon** — `public/icon-96.png`, `public/icon-192.png`
      and a real `public/favicon.ico` (which used to 404). These are a
      SEPARATE problem from the tab icons above, not a duplicate of them:
      Google composites onto its own plate and clips to a rounded square,
      which turns the tab icon's two virtues into faults — transparency
      puts magenta hairlines on white at 16px, and an edge-to-edge glyph
      loses its corners to the crop. So these carry an opaque `#05060a`
      plate with the R inset to 68%. Generated from
      [`docs/favicon-source.html`](./docs/favicon-source.html) (Chrome
      command in its header) and packed into the `.ico` by
      [`build/favicon-ico.js`](./build/favicon-ico.js) — not hand-drawn,
      and not wired into `npm run build`, because they change on a
      rebrand and never otherwise.
- [x] **Link preview** — `public/og.png` (1200×630) plus the OG and
      Twitter tags in `<head>`. This site's job is being pasted into a
      LinkedIn message or an email to a hiring manager, so the unfurled
      card is the real first impression; without the tags it rendered as
      a bare URL. The card is deliberately sparse — the wordmark and one
      line. An earlier version carried the eyebrow, the full hero tagline
      and a footer row of employers; it read well at full size and turned
      to mush at the ~500px LinkedIn actually renders. A share card is
      seen small, so it gets one idea. The image is **generated, not
      drawn** — `docs/og-image-source.html` is the source, rendered with
      headless Chrome so it uses the real body-font file and the
      same masked ANSI wordmark as the hero. That file's header carries
      the regenerate command. Re-rendered for Satoshi (2026-08-15) — it
      carries the same `font-feature-settings` as the site so the card's
      letterforms match the live page, and the role line is weight 800
      because Satoshi's axis runs light — see the weight note in
      `tokens.css`. `og:image` must stay an **absolute** URL: scrapers
      don't resolve relative paths.
- [x] **404 page** — `public/404.html`, wired up by
      `not_found_handling: "404-page"` in `wrangler.jsonc`. Without that
      key the asset server answered unknown paths with a 404 and a
      **zero-byte body** — a blank white page. Deliberately not
      `"single-page-application"`, which would return `200` for every
      made-up path and let an infinite URL space get indexed. The page is
      standalone (inline CSS, no JS, system mono) because it has to
      render when something else has already failed. Its **one** external
      dependency is the ANSI wordmark, and that is safe: `public/` is
      copied into `dist/` verbatim, so `/images/royeyal-logo.svg` is a
      path no build step can rename — it is masked, not inlined, so the
      gradient comes from CSS exactly as `.ansi-logo` does. The copy is a
      deadpan shell transcript and deliberately never says the page
      "never existed": retiring royeyal.studio will send real dead links
      here, and telling someone their link was never real is both wrong
      and useless.
- [x] **Security + cache headers** — `public/_headers`. HSTS,
      `nosniff`, `Referrer-Policy`, `frame-ancestors 'none'` +
      `X-Frame-Options`, and a `Permissions-Policy` that hands back
      camera/mic/geolocation. Also `immutable` year-long caching for
      `/assets/*`, which is safe because Vite content-hashes those
      filenames — `index.html` is excluded on purpose, since it is what
      points at the hashed names. Two deliberate omissions: no `preload`
      on HSTS (easy to join, months to leave) and no full CSP beyond
      `frame-ancestors`, which would need testing against GSAP and the
      inline styles before it could go on a live site. The file **must
      live in `public/`**, not the repo root: the asset server reads
      `_headers` from the root of `dist/`, and a misplaced or malformed
      one fails **silently** — no build error, the header just never
      appears. So verify against the live edge after every deploy with
      `curl -sI https://royeyal.com | grep -i strict-transport`, never
      against the local build.

- [x] **hello@royeyal.com** — done. DNS verified, the Workspace rename
      off `royeyal.studio` completed, and the Step 7 long tail (billing
      and recovery addresses, Gmail's Send-mail-as default, per-device
      re-auth) is closed out. The step-by-step runbook has been retired;
      see the standing constraints under **Structure**.
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
