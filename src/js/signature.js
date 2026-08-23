/*
 * The hidden signature — the ANSI wordmark and a hello, for whoever is
 * reading rather than just looking.
 *
 * It goes out twice, to catch both kinds of curious visitor: as an HTML
 * comment at the top of View Source, and as a DevTools console greeting.
 * The two must not drift, so the artwork and the copy live here, once,
 * and build/strip-html-comments.js imports LOGO and HELLO from this file
 * to build the comment at build time.
 *
 * That import is why everything above initSignature() is inert data with
 * no DOM access: this module gets evaluated in Node during the build as
 * well as in the browser at runtime. Keep any browser-only work inside
 * the function, not at module scope.
 */

/* The same letterforms as public/images/royeyal-logo.svg, which the hero
   paints as a CSS mask over a cyan->magenta gradient. */
export const LOGO = String.raw`
██████╗  ██████╗ ██╗   ██╗    ███████╗██╗   ██╗ █████╗ ██╗
██╔══██╗██╔═══██╗╚██╗ ██╔╝    ██╔════╝╚██╗ ██╔╝██╔══██╗██║
██████╔╝██║   ██║ ╚████╔╝     █████╗   ╚████╔╝ ███████║██║
██╔══██╗██║   ██║  ╚██╔╝      ██╔══╝    ╚██╔╝  ██╔══██║██║
██║  ██║╚██████╔╝   ██║       ███████╗   ██║   ██║  ██║███████╗
╚═╝  ╚═╝ ╚═════╝    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝
`.trim();

export const HELLO = [
  'Marketing Web Developer — design, code, marketing, AI.',
  'Hand-written HTML, CSS and JavaScript. No page builder, no',
  'framework, no component library.',
  '',
  'If you got here by reading the source, we would probably get on.',
  '',
  '  hello@royeyal.com',
  '  https://www.linkedin.com/in/royeyal',
  '  https://github.com/royeyal',
];

/* Console styling. The wordmark takes the cyan because the console
   renders it as one block and a per-character gradient is not worth the
   dozen extra %c substitutions it would cost. */
const LOGO_STYLE = [
  'color:#42effe',
  'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
  'font-size:11px',
  'line-height:1.15',
].join(';');

const HELLO_STYLE = [
  'color:#9aa3b8',
  'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
  'font-size:12px',
  'line-height:1.5',
].join(';');

export function initSignature() {
  /* Two calls, not one: a single %c run cannot carry two font sizes, and
     the wordmark needs to be small enough to hold its 62-column grid
     inside a narrow console while the copy stays readable.

     Deliberately console.log and not console.info — Chrome files info
     under a level that is filtered out by default in some setups, and a
     signature nobody sees is not a signature. */
  console.log(`%c${LOGO}`, LOGO_STYLE);
  console.log(`%c${HELLO.join('\n')}`, HELLO_STYLE);
}
