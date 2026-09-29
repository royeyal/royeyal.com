/*
 * royeyal.com — entry point
 *
 * NOTE (Webflow migration): GSAP is bundled from npm for now. When this
 * design moves to Webflow, REMOVE the gsap import below and rely on the
 * GSAP global that Webflow / a CDN <script> provides — do not ship two
 * copies of GSAP.
 */
import './main.css'; /* includes all @font-face declarations */

import { initAnimations, initScrollAnimations } from './js/animations.js';
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

/* initNavEnhancements() does not measure anything, so it runs now: the
   closed panel's links should leave the tab order from the start. The
   rest of the nav is set up after the first paint — see "Everything
   else" at the bottom of this file. */
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

/* Listeners only, and cheap: they run now so a click in the first
   frame already scrolls smoothly and copies. */
initSmoothScroll();
initClipboard();

/* ---- Everything else, after the first paint -------------------------
 * Startup used to be one long task. Profiled at 6x CPU throttling on a
 * desktop viewport it was ~210ms, and PageSpeed's desktop run measured
 * the same task at ~400ms — nearly all of its 363ms Total Blocking
 * Time. Inside it: ~95ms of the page's first style and layout, forced
 * early by registering ScrollTrigger at import time, then ~80ms of
 * setup for things nobody can see yet.
 *
 * Only the hero intro has to run before the first paint: it hides the
 * hero copy so it can animate it in, and a frame painted before that
 * would flash the copy. Everything below it is below the fold, hidden
 * (the nav), or not visual at all (the console signature), so it waits
 * for a painted frame and then runs one step per task. Each step is
 * short, and a task under 50ms costs Total Blocking Time nothing.
 *
 * afterPaint: requestAnimationFrame fires just before a frame is
 * painted, and a timeout queued from inside it runs just after.
 * nextTask: scheduler.yield() where it exists (it keeps our place in
 * the queue ahead of other work), a timeout elsewhere. A background
 * tab paints nothing, so there this waits until the tab is shown —
 * which is exactly when any of it starts to matter.
 *
 * The order keeps two old promises. The nav still starts only once
 * its stylesheet has applied — measured unstyled, the pill comes out
 * viewport-sized and frosts the whole page (whenNavStyled() in
 * src/js/nav.js). And the signature still runs last, so the greeting
 * is the final thing in the console; its twin lives in the HTML
 * comment at the top of View Source (build/strip-html-comments.js).
 */
const afterPaint = () =>
  new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const nextTask = () =>
  globalThis.scheduler?.yield
    ? globalThis.scheduler.yield()
    : new Promise((resolve) => setTimeout(resolve, 0));

afterPaint().then(async () => {
  const steps = [
    initScrollAnimations,
    initStepTimeline,
    () => whenNavStyled().then(initExpandingBottomNav),
    () => initSound(document.querySelector('[data-sound-toggle]')),
    initSignature,
  ];
  for (const step of steps) {
    await step();
    await nextTask();
  }
});
