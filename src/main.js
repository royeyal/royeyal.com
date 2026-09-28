/*
 * royeyal.com — entry point
 *
 * NOTE (Webflow migration): GSAP is bundled from npm for now. When this
 * design moves to Webflow, REMOVE the gsap import below and rely on the
 * GSAP global that Webflow / a CDN <script> provides — do not ship two
 * copies of GSAP.
 */
import './main.css'; /* includes all @font-face declarations */

import { initAnimations } from './js/animations.js';
import { initStepTimeline } from './js/timeline.js';
import { initSound } from './js/sound.js';
import { initSmoothScroll } from './js/scroll.js';
import { initClipboard } from './js/clipboard.js';
import {
  initExpandingBottomNav,
  initNavEnhancements,
  whenNavStyled,
} from './js/nav.js';
import { initSignature } from './js/signature.js';

document.querySelector('[data-year]').textContent = new Date().getFullYear();

/* The nav measures itself once, in pixels, so it must not start until
   its stylesheet has applied — measured unstyled, the pill comes out
   viewport-sized and frosts the whole page. See whenNavStyled() in
   src/js/nav.js.

   That makes it asynchronous, so it may now start after
   initAnimations() has attached the reveal tween to .bottom-nav. That
   is safe: the tween writes only opacity, visibility and
   --nav-reveal-offset on the outer element, none of which change the
   inner box measure() reads. Nothing is visibly late either — the nav
   is hidden until you scroll past the hero.

   initNavEnhancements() does not measure anything, so it runs now: the
   closed panel's links should leave the tab order from the start. */
whenNavStyled().then(initExpandingBottomNav);
initNavEnhancements();

const intro = initAnimations();

/* ---- The strands wait their turn ------------------------------------
 * The WebGL hero used to start first, synchronously, ahead of
 * everything else here. Creating a WebGL2 context and compiling the
 * strand shader is real main-thread work — local Lighthouse mobile
 * runs caught this entry task at up to 1.2s when caches were cold,
 * against ~0.2s warm — and the hero intro could not begin until it
 * was done. The intro is what makes the
 * headline visible, and the headline is the page's LCP element, so the
 * shader was sitting directly in front of LCP.
 *
 * So the strands now arrive last, in this order:
 *   1. the intro's copy has landed (initAnimations() says when; at once
 *      under reduced motion), so the compile cannot stall its frames;
 *   2. the page has fired `load`, so it is off the loading path;
 *   3. the browser is idle.
 * Then ogl and the shader are fetched as their own chunk — a dynamic
 * import, like cuelume in sound.js, keeps ogl out of the main bundle —
 * and the canvas fades in over the CSS gradient the hero already has.
 * That gradient was always the no-WebGL fallback, so the hero is never
 * bare while it waits.
 *
 * The 5s cap is for a `load` held up by a slow asset, or an intro
 * killed half-way by reduced motion switching on — either would
 * otherwise leave the strands waiting forever. Safari has no
 * requestIdleCallback; a timeout stands in for it.
 */
const pageLoaded = new Promise((resolve) => {
  if (document.readyState === 'complete') resolve();
  else window.addEventListener('load', resolve, { once: true });
});
const cap = new Promise((resolve) => setTimeout(resolve, 5000));
const idle = () =>
  new Promise((resolve) =>
    'requestIdleCallback' in window
      ? requestIdleCallback(resolve, { timeout: 1000 })
      : setTimeout(resolve, 50)
  );

Promise.race([Promise.all([intro, pageLoaded]), cap])
  .then(idle)
  .then(() => import('./js/strands.js'))
  .then(({ initStrands }) =>
    initStrands(document.querySelector('[data-strands]'), {
      colors: ['#42effe', '#7c3aed', '#f900b9'],
      count: 6,
      speed: 0.2, // strand drift speed — raise/lower to taste
      amplitude: 1.25,
      waviness: 1.15,
      thickness: 0.75,
      glow: 2.0,
      taper: 3,
      spread: 1,
      intensity: 0.5,
      saturation: 1.35,
      scale: 1.35,
    })
  )
  /* A failed chunk fetch leaves the gradient, which is the designed
     fallback anyway — nothing worth surfacing to the reader. */
  .catch(() => {});

initStepTimeline();
initSmoothScroll();
initClipboard();
initSound(document.querySelector('[data-sound-toggle]'));

/* Last, so the greeting is the final thing in the console rather than
   something the init logs scroll away. Its twin lives in the HTML
   comment at the top of View Source — see build/strip-html-comments.js. */
initSignature();
