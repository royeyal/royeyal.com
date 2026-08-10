/*
 * Expanding bottom navigation — Osmo Supply (Vault) component.
 *
 * VENDORED CODE. `initExpandingBottomNav()` below is Osmo's, copied
 * verbatim. Exactly two changes were made to fit this project, both
 * mechanical:
 *
 *   1. The trailing DOMContentLoaded bootstrap was dropped and the
 *      function exported instead, so src/main.js starts it the same way
 *      it starts every other module.
 *   2. The two CDN <script> tags became npm imports, matching
 *      src/js/animations.js. GSAP 3.15 is already the installed version,
 *      which is the version Osmo pins.
 *
 * Do not refactor it, rename anything, or touch a data-bottom-nav-*
 * attribute — the script reads every one of them by name. If it needs to
 * change, take the change from Osmo rather than editing here.
 *
 * The reveal-after-hero tween and the current-section indicator are NOT
 * in here on purpose: they live in src/js/animations.js and act on the
 * outer .bottom-nav, while this timeline only ever touches
 * .bottom-nav__inner. The two never write the same property.
 *
 * NOTE (Webflow migration): gsap and CustomEase come from the npm bundle
 * here. In Webflow, drop these imports and use the globals — CustomEase
 * has been free since GSAP 3.13, so Webflow's CDN already carries it.
 */
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);
CustomEase.create('osmo', 'M0,0 C0.625,0.05 0,1 1,1');

export function initExpandingBottomNav() {
  const nav = document.querySelector('[data-bottom-nav-init]');
  if (!nav) return;

  const inner = nav.querySelector('[data-bottom-nav-inner]');
  const bar = nav.querySelector('[data-bottom-nav-bar]');
  const panel = nav.querySelector('[data-bottom-nav-panel]');
  const toggle = nav.querySelector('[data-bottom-nav-toggle]');
  if (!inner || !bar || !panel || !toggle) return;

  const reveals = panel.querySelectorAll('[data-bottom-nav-reveal]');
  const barTop = toggle.querySelector('.bottom-nav__toggle-bar.is--top');
  const barBot = toggle.querySelector('.bottom-nav__toggle-bar.is--btm');
  const divider = nav.querySelector('[data-bottom-nav-divider]');

  let isOpen = false;
  let enterEnd = 0;
  let dimensions = { closedW: 0, closedH: 0, openW: 0, openH: 0 };
  let tl;

  function measure() {
    const w = inner.style.width;
    const h = inner.style.height;
    inner.style.width = 'var(--open-width)';
    inner.style.height = 'auto';
    const openW = inner.offsetWidth;
    const openH = inner.offsetHeight;
    inner.style.width = 'var(--closed-width)';
    const closedW = inner.offsetWidth;
    inner.style.width = w;
    inner.style.height = h;
    return { closedW, closedH: bar.offsetHeight, openW, openH };
  }

  function applyClosed() {
    gsap.set(inner, { width: dimensions.closedW, height: dimensions.closedH });
  }

  function buildTimeline() {
    tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'osmo', easeReverse: 'power2.inOut' },
    });

    tl.to(
      inner,
      {
        width: () => dimensions.openW,
        height: () => dimensions.openH,
        duration: 0.65,
      },
      0
    )

      .to(
        barTop,
        {
          y: '0.175em',
          rotation: 45,
          duration: 0.4,
          ease: 'back.out(2)',
          easeReverse: 'power3.out',
        },
        0.05
      )

      .to(
        barBot,
        {
          y: '-0.175em',
          rotation: -45,
          duration: 0.4,
          ease: 'back.out(2)',
          easeReverse: 'power3.out',
        },
        0.05
      )

      .set(
        panel,
        {
          autoAlpha: 1,
        },
        0.1
      )

      .fromTo(
        reveals,
        {
          autoAlpha: 0,
          yPercent: 100,
        },
        {
          autoAlpha: 1,
          yPercent: 0,
          duration: 0.6,
          stagger: 0.03,
        },
        0.1
      );

    if (divider) {
      tl.fromTo(
        divider,
        {
          scaleX: 0,
          autoAlpha: 0,
        },
        {
          scaleX: 1,
          autoAlpha: 1,
          duration: 1.1,
        },
        0
      );
    }

    enterEnd = tl.duration();
    tl.addPause();

    // Close half
    tl.to(reveals, {
      autoAlpha: 0,
      yPercent: 10,
      duration: 0.25,
      stagger: { each: 0.01, from: 'end' },
    })
      .to(
        inner,
        {
          width: () => dimensions.closedW,
          height: () => dimensions.closedH,
          duration: 0.45,
          ease: 'power3.inOut',
        },
        '<'
      )
      .to(
        [barTop, barBot],
        { y: 0, rotation: 0, duration: 0.3, ease: 'power3.in' },
        '<'
      )
      .set(panel, { autoAlpha: 0 });
  }

  function setState(open) {
    isOpen = open;
    nav.setAttribute('data-bottom-nav-open', String(open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'close menu' : 'open menu');
    panel.setAttribute('aria-hidden', String(!open));
  }

  function toggleNav() {
    setState(!isOpen);
    if (isOpen) {
      tl.invalidate();
      if (tl.time() >= enterEnd) tl.timeScale(1).restart();
      else tl.timeScale(1).play();
    } else if (tl.time() < enterEnd) {
      tl.timeScale(1).reverse();
    } else {
      tl.timeScale(1).play();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      toggleNav();
      toggle.focus();
    }
  }

  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      dimensions = measure();
      if (isOpen)
        gsap.set(inner, { width: dimensions.openW, height: dimensions.openH });
      else {
        tl.invalidate();
        applyClosed();
      }
    }, 150);
  }

  dimensions = measure();
  applyClosed();
  buildTimeline();

  toggle.addEventListener('click', toggleNav);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
}

/* ---- END VENDORED CODE -------------------------------------------- */

/*
 * Additive a11y fix, deliberately kept OUT of the function above so the
 * vendored code stays byte-comparable against Osmo's original.
 *
 * The closed panel is only clipped by `overflow: hidden`, not removed
 * from the document, so its links stay in the tab order while the panel
 * carries aria-hidden="true". That combination is an ARIA violation — a
 * keyboard user tabs into links a screen reader has been told do not
 * exist. `inert` fixes both halves at once.
 *
 * Driven off the data-bottom-nav-open attribute the script already
 * writes, so it needs no hook into the timeline.
 */
export function initNavInert() {
  const nav = document.querySelector('[data-bottom-nav-init]');
  const panel = nav?.querySelector('[data-bottom-nav-panel]');
  if (!panel) return;

  const sync = () => {
    panel.inert = nav.getAttribute('data-bottom-nav-open') !== 'true';
  };

  new MutationObserver(sync).observe(nav, {
    attributes: true,
    attributeFilter: ['data-bottom-nav-open'],
  });

  sync();
}
