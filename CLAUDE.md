# Working in this repo

`README.md` is the real documentation — architecture, fonts, the build
plugins, Cloudflare, token scopes. Read it before a non-trivial change.
This file is only the things that are easy to get wrong and cheap to
say up front.

## Shape of the thing

A hand-written static site. One page (`index.html`), plain CSS in
`src/styles/`, plain ES modules in `src/js/`, Vite for the build,
Cloudflare Workers for hosting. No framework, no CMS, no TypeScript, no
test runner. Three Vite plugins in `build/` do the generation;
`build/favicon-ico.js` beside them is a one-off script, not part of the
build.

The code carries long comments explaining _why_ — the font weight range,
why the email copies instead of opening a mail client, why the project
screenshots dim with opacity rather than `brightness()`. That prose is
load-bearing and it is stripped from `dist/`, so it costs the reader
nothing. **Match it.** A change that removes the reasoning is a
regression even when the markup is right.

## Single sources of truth

Edit these, not their output:

| Thing                           | Lives in                              | Rendered by                                              |
| ------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Freelance projects              | `src/data/projects.js`                | `build/projects.js` → `<!--#projects-->` in `index.html` |
| Console + View Source signature | `src/js/signature.js`                 | `build/strip-html-comments.js`                           |
| `dist/llms.txt`                 | `index.html` + `src/data/projects.js` | `build/llms-txt.js`                                      |

Everything else on the page is written where you see it.

## Traps

- **Never build or deploy from a git worktree without copying
  `public/fonts/Satoshi-Variable.woff2` in first.** It is gitignored
  (licence), worktrees do not share gitignored files, and nothing fails
  — the site just ships with no body font. `.env` has the same cause but
  fails loudly. Both are in README → Deploy.
- **`npm run deploy` builds fresh and needs `CLOUDFLARE_API_TOKEN` from
  the gitignored `.env`.** Never hand-edit `dist/`.
- **The repo is public.** Anything committed is published immediately.
- Standalone pages in `public/` (`cv.html`, `404.html`, `privacy.html`,
  `accessibility.html`) have inline CSS and no build step. They are
  prettier-ignored; do not reformat them.

## Before you say it works

`npm run build` is the test suite. All three plugins assert and fail the
build rather than shipping a damaged page, so a green build genuinely
means something. Then check the rendered result in the browser — this is
a site whose whole point is how it looks.

```bash
npm run build && npm run format:check
```
