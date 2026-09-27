/*
 * royeyal.com — entry point
 *
 * NOTE (Webflow migration): GSAP is bundled from npm for now. When this
 * design moves to Webflow, REMOVE the gsap import below and rely on the
 * GSAP global that Webflow / a CDN <script> provides — do not ship two
 * copies of GSAP.
 */
import './main.css'; /* includes all @font-face declarations */

import { initStrands } from './js/strands.js';
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
});

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

initAnimations();
initStepTimeline();
initSmoothScroll();
initClipboard();
initSound(document.querySelector('[data-sound-toggle]'));

/* Last, so the greeting is the final thing in the console rather than
   something the init logs scroll away. Its twin lives in the HTML
   comment at the top of View Source — see build/strip-html-comments.js. */
initSignature();
