/*
 * Emits dist/llms.txt — a Markdown rendering of the site, for LLMs and
 * the agent tooling that increasingly does the first-pass read on a
 * candidate. Linked from index.html as
 * <link rel="alternate" type="text/markdown">.
 *
 * WHY THIS IS GENERATED, NOT WRITTEN BY HAND
 * A second copy of a CV that someone has to remember to update is a CV
 * that goes stale, and a stale one is worse than none. This derives
 * every line from index.html at build time, so the two cannot drift.
 *
 * WHY IT THROWS
 * The extraction is regex over known class hooks (.work-card__company
 * and friends) rather than a real DOM parse, because a parser is a
 * dependency and this file is the only thing that needs one. The
 * trade-off is that a markup change can silently stop matching — so
 * every selector asserts, and a miss fails the build loudly instead of
 * shipping a half-empty document. If you rename a class below, the
 * error tells you which one.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE = 'https://royeyal.com/';

/* The printable one-page CV (public/cv.html, served at /cv). Named as a
   constant rather than extracted, because it is a location rather than
   content — there is nothing in index.html to derive it from, and a
   constant cannot drift out of step with markup the way an extraction
   can. Same reasoning as SITE above.

   Worth surfacing here specifically: an agent doing the first-pass read
   is exactly who wants the one-page version, and it is the only URL on
   the site that is not reachable by following a link from the root. */
const CV = 'https://royeyal.com/cv';

/* Only the entities index.html actually uses, plus the numeric form.
   Deliberately not a full table: an unknown entity should look wrong in
   review rather than be silently half-decoded. */
const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  mdash: '—',
  ndash: '–',
  hellip: '…',
};

/* HTML fragment -> plain text. <strong> survives as Markdown bold
   because the work-card bullets lead with a bolded label that carries
   real meaning ("Production code.", "AI automation."). */
function text(html) {
  return html
    .replace(/<\s*strong[^>]*>/gi, '**')
    .replace(/<\s*\/\s*strong\s*>/gi, '**')
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/* Every read goes through one of these two so that a rename surfaces as
   a build error naming the thing that vanished. */
function one(html, re, label) {
  const m = html.match(re);
  if (!m)
    throw new Error(`llms.txt: no match for ${label} — did the markup change?`);
  return text(m[1]);
}

function all(html, re, label, { min = 1 } = {}) {
  const out = [...html.matchAll(re)].map((m) => text(m[1]));
  if (out.length < min) {
    throw new Error(
      `llms.txt: expected at least ${min} match(es) for ${label}, found ${out.length}`
    );
  }
  return out;
}

/* Split on a repeated block open-tag. The cards never nest, so slicing
   between successive openings is enough and avoids balancing tags. */
function blocks(html, opener) {
  const parts = html.split(opener);
  parts.shift();
  return parts;
}

/* Exported so the guard rails above can actually be exercised — see the
   drift check in the repo README. Takes the HTML, returns the Markdown;
   no filesystem, no Vite. */
export function renderMarkdown(html) {
  const title = one(html, /<title>([\s\S]*?)<\/title>/, '<title>');
  const description = one(
    html,
    /<meta\s+name="description"\s+content="([\s\S]*?)"/,
    'meta[name=description]'
  );
  const heroSub = one(
    html,
    /class="hero__sub"[^>]*>([\s\S]*?)<\/p>/,
    '.hero__sub'
  );
  const aboutText = all(
    html,
    /<div class="about__text"[^>]*>([\s\S]*?)<\/div>/g,
    '.about__text'
  );

  const stepHeads = all(
    html,
    /class="step-timeline__content-h">([\s\S]*?)<\/h3>/g,
    '.step-timeline__content-h',
    { min: 2 }
  );
  const stepBodies = all(
    html,
    /class="step-timeline__p">([\s\S]*?)<\/p>/g,
    '.step-timeline__p',
    { min: 2 }
  );
  if (stepHeads.length !== stepBodies.length) {
    throw new Error(
      `llms.txt: timeline headings (${stepHeads.length}) and paragraphs (${stepBodies.length}) are out of step`
    );
  }

  const roles = blocks(html, '<li class="work-card"').map((b) => ({
    company: one(
      b,
      /class="work-card__company">([\s\S]*?)<\/h3>/,
      '.work-card__company'
    ),
    role: one(b, /class="work-card__role">([\s\S]*?)<\/p>/, '.work-card__role'),
    years: one(
      b,
      /class="work-card__years[^"]*">([\s\S]*?)<\/p>/,
      '.work-card__years'
    ),
    points: all(b, /<li>([\s\S]*?)<\/li>/g, '.work-card__points > li'),
    chips: [...b.matchAll(/class="chip">([\s\S]*?)<\/li>/g)].map((m) =>
      text(m[1])
    ),
  }));
  if (roles.length < 1) throw new Error('llms.txt: no .work-card blocks found');

  const projects = blocks(html, '<li class="project-card"').map((b) => ({
    name: one(
      b,
      /class="project-card__name">([\s\S]*?)<\/h3>/,
      '.project-card__name'
    ),
    meta: one(
      b,
      /class="project-card__meta[^"]*">([\s\S]*?)<\/p>/,
      '.project-card__meta'
    ),
    href: one(
      b,
      /class="project-card__link"[\s\S]*?href="([^"]+)"/,
      '.project-card__link[href]'
    ),
  }));
  if (projects.length < 1)
    throw new Error('llms.txt: no .project-card blocks found');

  const email = one(html, /data-clip="([^"]+)"/, '[data-clip] (email)');
  const linkedin = one(
    html,
    /href="(https:\/\/www\.linkedin\.com\/[^"]+)"/,
    'LinkedIn URL'
  );
  const github = one(
    html,
    /href="(https:\/\/github\.com\/[^"]+)"/,
    'GitHub URL'
  );

  const out = [];
  out.push(`# ${title}`, '');
  out.push(`> ${description}`, '');
  out.push(heroSub, '');
  out.push(`Canonical page: ${SITE}`, '');
  out.push(`Printable one-page CV: ${CV}`, '');

  out.push('## About', '');
  for (const p of aboutText) out.push(p, '');
  for (let i = 0; i < stepHeads.length; i++) {
    out.push(`### ${stepHeads[i]}`, '', stepBodies[i], '');
  }

  out.push('## Career', '');
  for (const r of roles) {
    out.push(`### ${r.company} — ${r.role} (${r.years})`, '');
    for (const p of r.points) out.push(`- ${p}`);
    out.push('');
    if (r.chips.length) out.push(`Tools: ${r.chips.join(', ')}`, '');
  }

  out.push('## Selected freelance work', '');
  for (const p of projects) out.push(`- [${p.name}](${p.href}) — ${p.meta}`);
  out.push('');

  out.push('## Contact', '');
  out.push(`- Email: ${email}`);
  out.push(`- LinkedIn: ${linkedin}`);
  out.push(`- GitHub: ${github}`);
  out.push('');

  return out.join('\n');
}

export default function llmsTxt() {
  let root;
  return {
    name: 'royeyal-llms-txt',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
    },
    writeBundle(options) {
      const html = readFileSync(resolve(root, 'index.html'), 'utf8');
      const md = renderMarkdown(html);
      writeFileSync(resolve(options.dir, 'llms.txt'), md, 'utf8');
      this.info?.(`llms.txt: ${md.split('\n').length} lines`);
    },
  };
}
