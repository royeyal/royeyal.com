/*
 * GSAP-driven motion: hero intro + scroll reveals.
 *
 * NOTE (Webflow migration): gsap here comes from the npm bundle. In Webflow,
 * remove these imports and use the global `gsap` / `ScrollTrigger` loaded by
 * Webflow or a CDN <script> tag instead.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

if (import.meta.env.DEV) {
  // console access for debugging during development only
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;
}

export function initAnimations() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // --- Hero intro -------------------------------------------------
    // expo.out = long deceleration tail; elements arrive with mass
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl.from('[data-hero="logo"]', {
      opacity: 0,
      y: 32,
      filter: 'blur(8px)',
      duration: 1.2,
    })
      .from(
        '[data-hero="eyebrow"]',
        { opacity: 0, x: -20, duration: 0.7 },
        '-=0.7'
      )
      .from(
        '[data-hero="title"]',
        { opacity: 0, y: 40, duration: 1.1 },
        '-=0.5'
      )
      .from('[data-hero="sub"]', { opacity: 0, y: 24, duration: 0.9 }, '-=0.75')
      .from(
        '[data-hero="actions"] .btn',
        { opacity: 0, y: 20, duration: 0.7, stagger: 0.09 },
        '-=0.6'
      )
      .from('[data-hero="hint"]', { opacity: 0, duration: 1 }, '-=0.3');

    // --- Scroll reveals --------------------------------------------
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 44,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      });
    });

    // --- Giant footer wordmark rises as it scrolls in ---------------
    const giant = document.querySelector('[data-giant]');
    if (giant) {
      gsap.from(giant, {
        yPercent: 45,
        opacity: 0.2,
        ease: 'none',
        scrollTrigger: {
          trigger: '.footer__giant',
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      });
    }
  });
}
