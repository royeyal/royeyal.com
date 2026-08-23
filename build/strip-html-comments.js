import { LOGO, HELLO } from '../src/js/signature.js';

/*
 * Strips HTML comments from the built index.html, and prepends the
 * signature block that View Source is actually meant to show.
 *
 * WHY THIS EXISTS
 * index.html carries ~280 lines of design rationale — why the fonts are
 * preloaded, why the email copies instead of opening a mail client, why
 * the timeline items carry no data-reveal. That prose is worth keeping:
 * it is the reason the next change to this page is a five-minute change
 * rather than an archaeology dig.
 *
 * But Vite does not strip HTML comments, so every word of it was being
 * shipped. Measured on the real build, the comments were 17.1 kB of
 * 66.2 kB raw and 7.4 kB of 17.0 kB gzipped — 43% of the transferred
 * HTML, on a page that preloads two fonts to save a single round trip.
 * They also made View Source read like a worked example rather than a
 * finished site.
 *
 * So the rationale stays in the repo, which is what it is for, and does
 * not go over the wire. Source is untouched; only dist/ is rewritten.
 *
 * KEEPING A COMMENT
 * Write it as `<!--! ... -->` and it survives, minus the marker. That is
 * the convention Terser and esbuild use to preserve legal banners,
 * borrowed here for the same reason: there has to be a way to say "this
 * one is for the reader, not for me".
 *
 * SAFETY
 * The regex is deliberately narrow. It will not touch:
 *   - `<!--!` blocks (the opt-out above)
 *   - `<!--[if ...]>` downlevel-revealed conditional comments
 *   - anything inside <script>, <style>, <pre> or <textarea>, which are
 *     lifted out and put back around the strip. A `-->` inside a JS
 *     string would otherwise end a comment early and eat live markup;
 *     this page ships an application/ld+json block, so that guard is
 *     load-bearing rather than theoretical.
 * It then asserts the document still ends in </html> and that the output
 * actually shrank, and fails the build rather than emitting a damaged
 * page.
 */

/* LOGO and HELLO come from the client module that also prints them to
   the console, so the two copies of the signature cannot drift. Nothing
   above initSignature() in that file touches the DOM, which is what
   makes it safe to evaluate here in Node. */
const indent = (line) => (line ? `  ${line}` : '');

const SIGNATURE = `<!--\n${LOGO.split('\n').map(indent).join('\n')}\n\n${HELLO.map(indent).join('\n')}\n-->\n`;

/* Regions whose text is not markup and must not be scanned for comment
   delimiters. Lifted out, replaced by a placeholder, restored after. */
const OPAQUE = /<(script|style|pre|textarea)\b[\s\S]*?<\/\1\s*>/gi;

/* An HTML comment that is NOT `<!--!` and NOT `<!--[`. The leading
   newline and indent go too, so a removed comment does not leave behind
   the blank line it used to sit on.

   Non-global, and matched with .test() only where a boolean is wanted;
   the stripping pass builds its own global copy. A shared /g regex
   carries lastIndex between calls, which makes .test() alternate
   true/false on identical input — a genuinely nasty bug to read back. */
const COMMENT = /\n?[ \t]*<!--(?![![])[\s\S]*?-->/;

/* U+0000 cannot occur in the input: Vite would have had to read a NUL out
   of index.html to put one there. A readable sentinel like "OPAQUE0"
   could in principle collide with page copy and be swapped for a <script>
   block on the way back — the kind of bug that only shows in production. */
const MARK = '\u0000';

export function stripComments(html) {
  const parked = [];
  const masked = html.replace(OPAQUE, (match) => {
    parked.push(match);
    return `${MARK}${parked.length - 1}${MARK}`;
  });

  return (
    masked
      .replace(new RegExp(COMMENT.source, 'g'), '')
      /* `<!--! keep -->` becomes `<!-- keep -->`: the marker is an
       instruction to this file, not something the reader should see. */
      .replace(/<!--!/g, '<!--')
      .replace(
        new RegExp(`${MARK}(\\d+)${MARK}`, 'g'),
        (_, i) => parked[Number(i)]
      )
  );
}

/* Whether this document holds anything the stripper should remove. Asked
   so the "nothing was removed" assertion can tell a regex that has quietly
   stopped matching apart from a source file that legitimately has no
   comments left — only the first is a build failure. */
export function hasStrippableComment(html) {
  return COMMENT.test(html.replace(OPAQUE, ''));
}

export default function stripHtmlComments() {
  return {
    name: 'royeyal-strip-html-comments',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const stripped = stripComments(html);
        const out = SIGNATURE + stripped;

        /* Both assertions guard the same failure: a `-->` somewhere the
           mask did not cover would swallow real markup and leave a page
           that is shorter AND broken. Cheaper to fail the build than to
           find out from the live site. */
        if (!/<\/html>\s*$/.test(out)) {
          throw new Error(
            'strip-html-comments: output no longer ends in </html> — a comment probably ate live markup'
          );
        }
        if (hasStrippableComment(html) && stripped.length >= html.length) {
          throw new Error(
            'strip-html-comments: index.html has comments but none were removed — the comment regex has stopped matching'
          );
        }

        const saved = html.length - stripped.length;
        this.info?.(
          `strip-html-comments: removed ${(saved / 1024).toFixed(1)} kB of comments`
        );
        return out;
      },
    },
  };
}
