/*
 * royeyal.com — entry point
 *
 * NOTE (Webflow migration): GSAP is bundled from npm for now. When this
 * design moves to Webflow, REMOVE the gsap import below and rely on the
 * GSAP global that Webflow / a CDN <script> provides — do not ship two
 * copies of GSAP.
 */
import '@fontsource-variable/tektur';
// Archivo kept during the Tektur trial as the --font-display fallback.
// If Tektur stays, drop this import and the dependency (~68 KB saved).
import '@fontsource-variable/archivo';
import './main.css'; /* includes Departure Mono @font-face */

import { initStrands } from './js/strands.js';
import { initAnimations } from './js/animations.js';

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

initAnimations();
