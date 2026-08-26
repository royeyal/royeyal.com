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

    /* --- Bottom nav arrives after the hero ------------------------
     * The hero is a full-screen WebGL moment and a nav bar sitting on
     * it from the first frame would undercut it.
     *
     * This targets the OUTER .bottom-nav; the Osmo timeline in
     * src/js/nav.js only ever animates .bottom-nav__inner, so the two
     * never write the same property on the same element. Keep it that
     * way. Living inside this matchMedia block also means the nav is
     * simply always visible under reduced motion, which is correct.
     */
    if (document.querySelector('.bottom-nav')) {
      gsap.from('.bottom-nav', {
        yPercent: 200,
        autoAlpha: 0,
        duration: 0.6,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: '.hero',
          start: 'bottom 80%',
          toggleActions: 'play none none reverse',
        },
      });
    }
  });

  /* --- Current section, shown in the closed nav pill ---------------
   * Outside the matchMedia block on purpose: this is information, not
   * motion, so it must work with reduced motion enabled too.
   */
  const current = document.querySelector('[data-nav-current]');
  if (current) {
    const stops = [
      ['top', 'Top'],
      ['about', 'About'],
      ['career', 'Career'],
      ['work', 'Work'],
      ['contact', 'Contact'],
    ];

    /* A hard text swap is, counter-intuitively, the LOUDER option: an
       instant change is exactly what peripheral motion detection is tuned
       to catch. A short opacity dip reads as quiet.
       Opacity only — no slide, no scale, no color flash, and short
       enough (~300ms end to end) that it never registers as an
       animation. Anything more would make the pill compete with the
       page, which is the opposite of the point. */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    stops.forEach(([id, label]) => {
      const section = document.getElementById(id);
      if (!section) return;

      const show = () => {
        // Re-entering a section you're already in shouldn't blink.
        if (current.textContent === label) return;

        if (reduce.matches) {
          current.textContent = label;
          return;
        }

        // A fast scroll can cross several stops before the first fade
        // finishes; killing in-flight tweens stops them stacking.
        gsap.killTweensOf(current);
        gsap
          .timeline()
          .to(current, {
            opacity: 0,
            duration: 0.12,
            ease: 'none',
            onComplete: () => {
              current.textContent = label;
            },
          })
          .to(current, { opacity: 1, duration: 0.18, ease: 'none' });
      };

      // 60% down the viewport: the band a reader is actually looking at.
      ScrollTrigger.create({
        trigger: section,
        start: 'top 60%',
        end: 'bottom 60%',
        onEnter: show,
        onEnterBack: show,
      });
    });
  }
}
