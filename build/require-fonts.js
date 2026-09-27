/*
 * Fails the build if any font that src/styles/fonts.css points at is
 * missing from public/, or is not actually a WOFF2.
 *
 * WHY THIS EXISTS
 * Satoshi is gitignored (its licence forbids redistributing it, see
 * public/fonts/LICENSES.md), so any checkout that is not Roy's working
 * directory — a git worktree, a fresh clone, the GitHub Actions runner
 * that deploys on push — starts without it. And nothing noticed. Vite
 * copies public/ verbatim, so a missing file is simply not copied; the
 * build succeeded, `wrangler deploy` succeeded, and the live site served
 * an @font-face that 404'd, with every word of body copy quietly falling
 * back to the system stack. That trap is written up in AGENTS.md and the
 * README because it had to be remembered. Now it cannot ship.
 *
 * WHY IT READS fonts.css RATHER THAN NAMING SATOSHI
 * The list of fonts the page needs already exists, in the @font-face
 * rules. Reading it means a new face is covered the day it is added, and
 * a renamed file fails here instead of 404ing in production.
 *
 * WHY IT CHECKS THE MAGIC NUMBER
 * CI does not have the file either: the deploy workflow downloads it
 * from royeyal.com before building (see .github/workflows/deploy.yml).
 * If that download ever comes back as something else — a Cloudflare
 * challenge page, an error page served with a 200 — the file exists and
 * a bare existence check would wave it through. Every WOFF2 starts with
 * the four bytes `wOF2`; an HTML page does not.
 *
 * Build only. `npm run dev` on a fresh clone should still start and
 * render in the fallback stack; it is shipping that must not happen.
 */

import { readFileSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';

const FONTS_CSS = 'src/styles/fonts.css';

function magic(path) {
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(4);
    readSync(fd, buf, 0, 4, 0);
    return buf.toString('latin1');
  } finally {
    closeSync(fd);
  }
}

export default function requireFonts() {
  return {
    name: 'royeyal-require-fonts',
    apply: 'build',
    buildStart() {
      const root = process.cwd();
      const css = readFileSync(resolve(root, FONTS_CSS), 'utf8');
      const urls = [...css.matchAll(/url\(\s*['"]?(\/fonts\/[^'")]+)/g)].map(
        (m) => m[1]
      );

      // A fonts.css that stopped matching would otherwise make this
      // plugin pass by checking nothing.
      if (urls.length === 0)
        this.error(
          `require-fonts: found no url('/fonts/…') in ${FONTS_CSS} — did the @font-face syntax change?`
        );

      const problems = [];
      for (const url of urls) {
        const file = resolve(root, 'public', url.slice(1));
        let head;
        try {
          head = magic(file);
        } catch {
          problems.push(`${url} is missing`);
          continue;
        }
        if (head !== 'wOF2')
          problems.push(
            `${url} is not a WOFF2 (starts with ${JSON.stringify(head)})`
          );
      }

      if (problems.length)
        this.error(
          `require-fonts: ${problems.join('; ')}.\n` +
            `Satoshi is gitignored — copy it in from the main checkout (README → Deploy), ` +
            `or download it from https://www.fontshare.com/fonts/satoshi.`
        );

      this.info?.(`require-fonts: ${urls.length} fonts present`);
    },
  };
}
