/*
 * Renders the freelance grid into index.html at build time, from
 * src/data/projects.js.
 *
 * WHY BUILD TIME AND NOT THE CLIENT
 * The output is the same static markup that used to be typed by hand —
 * in the HTML before the first byte of JavaScript runs, so it survives
 * a failed script, a crawler, Reader mode and the print stylesheet.
 * Rendering four cards in the browser would have traded all of that for
 * nothing: the data never changes between page loads.
 *
 * WHERE IT GOES
 * index.html carries `<!--#projects-->` inside <ul class="project-grid">.
 * This plugin swaps the placeholder for the cards. It runs `pre`, so
 * strip-html-comments (which runs `post`, build only) never sees the
 * placeholder, and it carries no `apply` so the dev server renders the
 * section too.
 *
 * WHY IT THROWS
 * A missing placeholder or a missing screenshot is a silently empty
 * section — the failure mode where the site ships looking finished and
 * the work is gone. Both fail the build instead.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECTS, SHOT } from '../src/data/projects.js';

const PLACEHOLDER = '<!--#projects-->';

/* Screenshots live in public/, which Vite copies verbatim — so the
   on-disk path and the URL differ only by this prefix. */
const SHOT_DIR = 'public/images/projects';
const SHOT_URL = '/images/projects';

/* Attribute-context escape. Ampersand first, or it would re-escape the
   entities the other replacements just wrote. Single quotes are left
   alone because every attribute below is double-quoted, and escaping
   them would put &#39; into alt text that screen readers read aloud in
   some older combinations. */
const attr = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/* Same escape, minus the quote handling that text content does not need. */
const textEsc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;');

const REQUIRED = ['name', 'href', 'meta', 'image', 'alt'];

function card(p, indent) {
  const pad = ' '.repeat(indent);
  const i = (n, line) => `${pad}${' '.repeat(n)}${line}`;
  return [
    i(0, '<li class="project-card" data-reveal>'),
    i(2, '<a'),
    i(4, 'class="project-card__link"'),
    i(4, 'data-cuelume-press="page"'),
    i(4, `href="${attr(p.href)}"`),
    i(4, 'target="_blank"'),
    i(4, 'rel="noreferrer"'),
    i(2, '>'),
    i(4, '<div class="project-card__media">'),
    i(6, '<img'),
    i(8, 'class="project-card__shot"'),
    i(8, `src="${SHOT_URL}/${attr(p.image)}"`),
    i(8, `alt="${attr(p.alt)}"`),
    i(8, `width="${SHOT.width}"`),
    i(8, `height="${SHOT.height}"`),
    i(8, 'loading="lazy"'),
    i(8, 'decoding="async"'),
    i(6, '/>'),
    i(4, '</div>'),
    i(4, `<h3 class="project-card__name">${textEsc(p.name)}</h3>`),
    i(4, `<p class="project-card__meta mono">${textEsc(p.meta)}</p>`),
    i(2, '</a>'),
    i(0, '</li>'),
  ].join('\n');
}

export function renderProjects(projects = PROJECTS, indent = 12) {
  return projects
    .map((p) => card(p, indent))
    .join('\n')
    .trimStart();
}

export default function projects({ root = process.cwd() } = {}) {
  let base = root;
  return {
    name: 'royeyal-projects',
    enforce: 'pre',
    configResolved(config) {
      base = config.root;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!PROJECTS.length) {
          throw new Error('projects: src/data/projects.js is empty');
        }

        for (const [n, p] of PROJECTS.entries()) {
          const missing = REQUIRED.filter((k) => !p[k]);
          if (missing.length) {
            throw new Error(
              `projects: the "${p.name ?? `entry #${n + 1}`}" entry in src/data/projects.js ` +
                `is missing: ${missing.join(', ')}`
            );
          }
          const file = resolve(base, SHOT_DIR, p.image);
          if (!existsSync(file)) {
            throw new Error(
              `projects: no screenshot found for "${p.name}".\n` +
                `  Expected: ${SHOT_DIR}/${p.image}\n` +
                `  Fix: save that ${SHOT.width}x${SHOT.height} WebP there, or remove the "${p.name}" entry from src/data/projects.js.`
            );
          }
        }

        if (!html.includes(PLACEHOLDER)) {
          throw new Error(
            `projects: the ${PLACEHOLDER} placeholder is gone from index.html, ` +
              `so the freelance grid would ship empty. Put it back inside ` +
              `<ul class="project-grid">.`
          );
        }

        this.info?.(`projects: rendered ${PROJECTS.length} cards`);
        return html.replace(PLACEHOLDER, renderProjects());
      },
    },
  };
}
