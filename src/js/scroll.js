/*
 * Smooth in-page scrolling for every anchor link — the bottom nav and the
 * hero's "What I do" button.
 *
 * NOTE (Webflow migration): gsap here comes from the npm bundle. In Webflow,
 * remove these imports and use the global `gsap` / `ScrollToPlugin` loaded by
 * Webflow or a CDN <script> tag instead. ScrollToPlugin has been free since
 * GSAP 3.13, so Webflow's own CDN already carries it.
 *
 * IMPORTANT: this only works because `html { scroll-behavior }` is `auto`
 * in base.css. With native smooth scrolling on, the browser tries to
 * animate every scrollTop that GSAP writes, and the two fight for the
 * same pixels. Don't reinstate it.
 */
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

const DURATION = 1.1;

export function initSmoothScroll(root = document) {
  root.addEventListener('click', (event) => {
    // Let modified clicks (new tab, download, etc.) behave normally.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest?.('a[href^="#"]');
    if (!link || link.getAttribute('href') === '#') return;

    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    /* Checked per click rather than through gsap.matchMedia(): this is a
       single delegated listener, not a set of tweens to build and tear
       down, and reading the query here means a mid-session OS change is
       honoured immediately. Not preventing default hands the browser its
       own instant jump, which is exactly the reduced-motion behaviour. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    event.preventDefault();

    /* ---- iOS hardening ---------------------------------------------
     * Three changes here, all made because anchor scrolling was jittery
     * and landed in the wrong place on a real iPhone while being perfect
     * in macOS Safari and in responsive mode. The common thread is that
     * iOS Safari's address bar collapses as soon as the page scrolls,
     * which resizes the viewport MID-TWEEN. None of it reproduces on a
     * desktop, where the viewport is constant.
     *
     * 1. Resolve the destination to a NUMBER now, not an element.
     *    Passing the element lets the plugin re-measure against a
     *    layout that is changing underneath it.
     * 2. Clamp to the real maximum scroll, so a target near the bottom
     *    can't ask for a position past the end and trigger rubber-band.
     * 3. autoKill OFF. It kills the tween when the scroll position
     *    diverges from what the plugin set — which is exactly what the
     *    address-bar collapse looks like to it. The cost is that a
     *    scroll gesture no longer interrupts a 1.1s tween; the benefit
     *    is that the tween actually finishes.
     */
    const documentTop = target.getBoundingClientRect().top + window.scrollY;
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const destination = Math.round(Math.min(documentTop, maxScroll));

    gsap.to(window, {
      duration: DURATION,
      ease: 'expo.out', // the site's display ease — arrives with mass
      scrollTo: { y: destination, autoKill: false },
      onComplete() {
        /* Anchor navigation normally moves focus as well as the viewport.
           preventDefault() took that away, so give it back — otherwise a
           keyboard user scrolls the page but keeps tabbing from the nav.

           preventScroll is requested but NOT trusted: Safari ignored it
           for years, and focusing a full-height section would then yank
           the page somewhere else entirely — a strong candidate for the
           "scrolls to the wrong part of the page" report. Restoring the
           position afterwards is correct whether or not it's honoured. */
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        const y = window.scrollY;
        target.focus({ preventScroll: true });
        if (window.scrollY !== y) window.scrollTo(0, y);
      },
    });

    /* Deliberately NOT pushing the hash into the address bar. On a
       one-page CV the URL people see and copy should stay
       `royeyal.com` — it matches the canonical tag and the address on
       the page, and `royeyal.com/#career` on a CV or in a paste looks
       like a broken link even though it works.
       Two side effects, both wanted: Back leaves the site instead of
       undoing a scroll, and no history entry is created per section.
       Inbound deep links still work — those are the browser's own
       anchor handling, which this never touches. */
  });
}
