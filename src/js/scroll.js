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

    gsap.to(window, {
      duration: DURATION,
      ease: 'expo.out', // the site's display ease — arrives with mass
      scrollTo: { y: target, autoKill: true }, // autoKill: a scroll gesture wins
      onComplete() {
        /* Anchor navigation normally moves focus as well as the viewport.
           preventDefault() took that away, so give it back — otherwise a
           keyboard user scrolls the page but keeps tabbing from the nav. */
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        target.focus({ preventScroll: true });
      },
    });

    if (history.pushState) {
      history.pushState(null, '', `#${id}`);
    }
  });
}
