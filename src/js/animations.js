/*
 * GSAP-driven motion: hero intro + scroll reveals.
 *
 * NOTE (Webflow migration): gsap here comes from the npm bundle. In Webflow,
 * remove these imports and use the global `gsap` / `ScrollTrigger` loaded by
 * Webflow or a CDN <script> tag instead.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* ScrollTrigger is registered in initScrollAnimations(), not here.
   Registering it measures the page (it reads the body's bounds), and at
   import time that dragged the page's first full style and layout into
   the one long startup task — see the note in src/main.js. */

if (import.meta.env.DEV) {
  // console access for debugging during development only
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;
}

/**
 * Returns a promise that resolves once the hero intro's copy has landed
 * — or at once, when there is no intro to wait for. src/main.js holds
 * the WebGL strands back until then; see the note there.
 */
export function initAnimations() {
  const mm = gsap.matchMedia();

  let introLanded;
  const intro = new Promise((resolve) => (introLanded = resolve));

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
      /* The headline starts at 0, alongside the logo, not 0.7s in. It
         is the page's LCP element, and Chrome does not count an element
         as painted while it sits at opacity 0 — so LCP waited on this
         tween's start, a delay chosen for choreography, not content.

         Everything after it keeps its old timing. The sub used to be
         placed relative to the headline's end ('-=0.75' of 1.8s), which
         would now drag it and the buttons 0.6s earlier; 1.05 is where
         it has always started. */
      .from('[data-hero="title"]', { opacity: 0, y: 40, duration: 1.1 }, 0)
      .from('[data-hero="sub"]', { opacity: 0, y: 24, duration: 0.9 }, 1.05)
      .from(
        '[data-hero="actions"] .btn',
        { opacity: 0, y: 20, duration: 0.7, stagger: 0.09 },
        '-=0.6'
      )
      /* The copy has landed; only the scroll hint's slow fade is left.
         That is the cue for the strands — compiling their shader any
         earlier would stall frames of the logo's blur-in, the one
         moment on the page that must not stutter. A zero-length call
         does not move the timeline's end, so the hint's '-=0.3' below
         still overlaps exactly what it did before. */
      .call(introLanded)
      .from('[data-hero="hint"]', { opacity: 0, duration: 1 }, '-=0.3');

    /* The bottom nav stays hidden over the hero (see the reveal in
       initScrollAnimations()). That reveal is set up after the first
       paint, so hide the bar now, or it would sit on the hero for the
       first frame. Opacity, visibility and a custom property only —
       nothing here reads layout. The matchMedia context reverts this
       set, so reduced motion gets the nav back. */
    if (document.querySelector('.bottom-nav')) {
      gsap.set('.bottom-nav', { '--nav-reveal-offset': '8rem', autoAlpha: 0 });
    }
  });

  /* Under reduced motion the block above never ran, so there is no
     intro to wait for. (matchMedia runs a matching block synchronously,
     so by this line the answer is settled.) */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    introLanded();
  }

  return intro;
}

/**
 * Everything scroll-driven: reveals, the giant footer, the nav's
 * arrival and the section indicator. None of it is on screen at load,
 * so src/main.js runs this in its own task after the first paint.
 */
export function initScrollAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // --- Scroll reveals --------------------------------------------
    /* This runs after the first paint now, so anything already on
       screen — a deep link, a restored scroll position — has been seen
       at full opacity. Hiding it to fade it back in would read as a
       flicker; it is left as it is. The check mirrors the 'top 85%'
       start below. */
    const revealLine = window.innerHeight * 0.85;
    const toReveal = gsap.utils
      .toArray('[data-reveal]')
      .filter((el) => el.getBoundingClientRect().top >= revealLine);

    /* One set for every element, not a gsap.from() per element. A
       from() renders its start state the moment it is created, so the
       loop alternated: write one element's opacity and transform, then
       read the next one's computed style — which forces a fresh style
       recalc of the whole page. 22 of them in a row made this the
       longest task after startup: 155ms at 6x CPU, ~360ms on
       PageSpeed's desktop run. A single tween reads every target
       first and writes them all after, so the page is restyled once.

       The ScrollTriggers below are callbacks only; they write nothing
       when created, so measuring 22 of them costs one layout, not 22.
       The end state, opacity 1 and y 0, is exactly what the from()
       returned to: no reveal target has a resting opacity or transform
       of its own. */
    gsap.set(toReveal, { opacity: 0, y: 44 });
    toReveal.forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () =>
          gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }),
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
     * way. Living inside a no-preference matchMedia block (here, and
     * where initAnimations() pre-hides it) means the nav is simply
     * always visible under reduced motion, which is correct.
     *
     * The slide is a tween on --nav-reveal-offset, which nav.css folds
     * into `bottom` so the env() safe-area inset survives. This tween
     * was once blamed for Safari frosting the whole viewport when the
     * nav appeared; it was not the cause — see the note on .bottom-nav
     * at the top of src/styles/nav.css.
     *
     * Everything it writes — opacity, visibility and that offset — is
     * on the OUTER element and leaves the pill's box alone, so it does
     * not matter whether it attaches before or after nav.js measures.
     *
     * 8rem clears the bar (3.75em) plus its bottom inset with room to
     * spare, so it starts fully off-screen at any root font size.
     *
     * A fromTo rather than a from: initAnimations() has already set the
     * hidden state, and a from() would read that back as its end state.
     */
    if (document.querySelector('.bottom-nav')) {
      gsap.fromTo(
        '.bottom-nav',
        { '--nav-reveal-offset': '8rem', autoAlpha: 0 },
        {
          '--nav-reveal-offset': '0rem',
          autoAlpha: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.hero',
            start: 'bottom 80%',
            toggleActions: 'play none none reverse',
            /* Reload deep in the page and no boundary is ever crossed,
               so no toggleAction fires and the nav stays parked
               off-screen until you scroll back up through the hero and
               down again. On refresh, anything already past the start
               is simply put in its finished state. */
            onRefresh: (self) => {
              if (self.progress > 0) self.animation.progress(1);
            },
          },
        }
      );
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
