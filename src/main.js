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
import { initExpandingBottomNav, initNavEnhancements } from './js/nav.js';

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

/* The nav must be measured before anything animates it: measure() reads
   offsetWidth off a temporarily-restyled element, so it has to run
   before initAnimations() attaches the reveal tween to .bottom-nav. */
initExpandingBottomNav();
initNavEnhancements();

initAnimations();
initStepTimeline();
initSmoothScroll();
initClipboard();
initSound(document.querySelector('[data-sound-toggle]'));
