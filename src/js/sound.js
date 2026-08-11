/*
 * Interaction sounds — cuelume, opt-in, default OFF.
 *
 * The *bindings* live in the markup as data-cuelume-* attributes (see
 * index.html). This module owns only load / enable / volume. The state
 * is never persisted — every page load starts off.
 *
 * Two kinds of cue, both answering a deliberate act. Keep in sync with
 * index.html:
 *
 *   click   data-cuelume-press on the 19 targets press / ready / page
 *   scroll  data-sound-on / -off on the steps    toggle / error
 *   menu    data-sound-on / -off on the nav      arrival / scan
 *
 * No hover cues, by choice. cuelume throttles pointerenter with a single
 * module-level timestamp shared across every element, so moving between
 * two links inside 150ms silently drops the second sound — which reads
 * as lag rather than restraint. Bluetooth output latency compounds it.
 * Sound now only ever answers a click or a step lighting up.
 *
 * No data-cuelume-release either: every target opens a new tab or the
 * mail client, so a pointerup sound would fire into a backgrounding tab.
 *
 * WCAG 1.4.2 (Audio Control) is satisfied by construction — nothing plays
 * without an explicit opt-in gesture, every clip is far under 3s, and the
 * stop control is always visible on screen. Deliberately NOT
 * gated on prefers-reduced-motion: there is no sound analogue of that
 * query, and a user who clicks a control labelled "[ sound: off ]" to turn
 * it on has given an unambiguous instruction. Don't "fix" this.
 *
 * cuelume handles more than its README documents (verified in
 * node_modules/cuelume/dist/interactions/bind.js): bind() is idempotent
 * and unknown sound names fall back safely rather than throwing. Note
 * play() is also a hard no-op until navigator.userActivation reports
 * real interaction, so audio genuinely cannot fire on load.
 *
 * NOTE (Webflow migration): cuelume is bundled from npm here. In Webflow,
 * load it from a pinned ESM CDN URL and keep the data-cuelume-* attributes
 * on elements via the custom-attributes panel.
 */

const VOLUME = 0.35;
const STORAGE_KEY = 'royeyal:sound';

// Dev-only guard: cuelume is pre-1.0, so catch a renamed sound at
// `npm run dev` rather than by ear in production.
const USED_SOUNDS = [
  'press',
  'ready',
  'page',
  'toggle',
  'error',
  'arrival',
  'scan',
];

/*
 * The preference is deliberately NOT persisted. Every page load starts
 * silent, full stop — no storage to read, so there is no state that can
 * survive and surprise someone later. On a single-page site the cost is
 * one click if you reload; the benefit is that "off by default" is a
 * property of the code rather than a promise about stored values.
 */

// Clear keys written by earlier builds, which did persist the choice.
function clearStoredPrefs(key) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {
    /* nothing to clean up if storage is blocked */
  }
}

export function initSound(toggle, options = {}) {
  if (!toggle) return null;

  const {
    volume = VOLUME,
    storageKey = STORAGE_KEY,
    root = document,
  } = options;

  const state = toggle.querySelector('[data-sound-state]');

  clearStoredPrefs(storageKey);
  // Always starts off. Never read from storage.
  let enabled = false;
  let api = null; // resolved cuelume module namespace
  let loading = null; // in-flight import promise (singleton)
  let broken = false; // import or API validation failed

  // The button is inert without JS, so it ships hidden and we reveal it.
  toggle.hidden = false;

  // Never let a pre-1.0 library throw out of an event handler.
  function safe(fn) {
    try {
      fn();
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[sound]', err);
    }
  }

  function render() {
    toggle.setAttribute('aria-pressed', String(enabled));
    if (state) state.textContent = enabled ? 'on' : 'off';
  }

  function markUnavailable() {
    enabled = false;
    toggle.disabled = true;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Sound effects unavailable');
    if (state) state.textContent = 'n/a';
  }

  function load() {
    if (api || broken) return Promise.resolve(api);
    if (loading) return loading;

    loading = import('cuelume')
      .then((mod) => {
        if (
          typeof mod.bind !== 'function' ||
          typeof mod.setEnabled !== 'function' ||
          typeof mod.setVolume !== 'function' ||
          typeof mod.play !== 'function'
        ) {
          throw new Error('cuelume: unexpected API shape');
        }
        if (import.meta.env.DEV && Array.isArray(mod.sounds)) {
          const missing = USED_SOUNDS.filter((n) => !mod.sounds.includes(n));
          if (missing.length) {
            console.warn('[sound] unknown cuelume sounds:', missing);
          }
        }
        api = mod;
        api.setVolume(volume);

        /* CRITICAL: cuelume's engine starts with `let enabled = true`
           (verified in node_modules/cuelume/dist/audio/engine.js), so
           merely importing and binding it arms every cue. Without this
           line the site plays sounds from the first tap onwards while
           the toggle still reads "off" — the module is warmed by a
           document-level pointerdown listener below, so the user never
           has to touch the toggle for it to happen.
           Syncing to `enabled` rather than hardcoding false also keeps
           the case where someone hits the toggle while the import is
           still in flight. */
        api.setEnabled(enabled);

        api.bind(root); // idempotent — guarded by a WeakSet upstream
        return api;
      })
      .catch((err) => {
        broken = true;
        if (import.meta.env.DEV) console.warn('[sound] unavailable', err);
        markUnavailable();
        return null;
      });

    return loading;
  }

  /* ---- Safari's gesture window -----------------------------------
   * Safari will only create or resume an AudioContext inside the
   * SYNCHRONOUS run of a user-gesture handler. Chrome tracks "sticky
   * activation" that survives an await, so it does not care. cuelume
   * creates its context lazily on the first play(), which means that if
   * that first play() lands in a promise continuation after the dynamic
   * import, Safari refuses to resume and the page is mute forever —
   * every later cue then finds a permanently suspended context.
   *
   * So the enable path must reach play() with no promise in between.
   * We warm the module on any earlier interaction, and if it is already
   * resolved when the click arrives we do the work inline.
   */
  let needsUnlock = false;

  function onClick() {
    enabled = !enabled;
    render();

    if (!enabled) {
      if (api) safe(() => api.setEnabled(false));
      return;
    }

    if (api) {
      // Inline — still inside the gesture, so Safari resumes.
      safe(() => api.setEnabled(true));
      safe(() => api.play('toggle'));
      return;
    }

    // Module not warm yet. Unavoidably async, so Safari will not resume
    // here; flag it and retry inline on the next real gesture.
    load().then((mod) => {
      if (!mod || !enabled) return;
      safe(() => mod.setEnabled(true));
      safe(() => mod.play('toggle'));
      needsUnlock = true;
    });
  }

  // Warm on any earlier interaction so the toggle click finds the module
  // resolved. ~9 kB, off the critical path, still never fetched for a
  // visitor who does not interact at all.
  function preload() {
    load();
  }

  // Retries the unlock inside a genuine gesture after an async enable.
  function onUnlockGesture() {
    if (!needsUnlock || !enabled || !api) return;
    needsUnlock = false;
    safe(() => api.play('toggle'));
  }

  toggle.addEventListener('click', onClick);
  toggle.addEventListener('pointerenter', preload, { once: true });
  toggle.addEventListener('focusin', preload, { once: true });
  document.addEventListener('pointerdown', preload, {
    once: true,
    capture: true,
  });
  document.addEventListener('pointerdown', onUnlockGesture, true);

  /* ---- keyboard bridge -------------------------------------------
   * cuelume binds pointerdown/pointerenter, and NEITHER fires when a
   * link or button is activated from the keyboard — browsers dispatch
   * only a click. Without this, sound would be a mouse-only feature.
   */
  function onKeydown(event) {
    if (!enabled || !api || event.repeat) return;
    const el = event.target.closest?.('[data-cuelume-press]');
    if (!el || el === toggle) return;
    // Space activates buttons but only scrolls when a link is focused.
    const isLink = el.tagName === 'A';
    if (event.key !== 'Enter' && !(event.key === ' ' && !isLink)) return;
    safe(() => api.play(el.dataset.cuelumePress || 'press'));
  }

  document.addEventListener('keydown', onKeydown);

  /* ---- state-change cues -----------------------------------------
   * cuelume's bind() only covers pointer and click events. The timeline
   * steps light up from scroll position, not from a pointer, so their
   * cue comes from watching the data-status attribute that the Osmo
   * script writes. Declared in the markup as data-sound-on/off so the
   * mapping stays with the element and ports to Webflow like the
   * data-cuelume-* attributes do.
   */
  /* The nav carries data-sound-on/off too, but it signals through
     data-bottom-nav-open rather than data-status, so it gets its own
     observer below and is excluded here. */
  const stateNodes = document.querySelectorAll(
    '[data-sound-on]:not([data-bottom-nav-init]), [data-sound-off]:not([data-bottom-nav-init])'
  );

  // ScrollTrigger sets statuses during init and on every refresh; if the
  // page loads deep-linked mid-timeline that would fire a burst. Stay
  // disarmed until things have settled.
  let armed = false;
  let armTimer = 0;
  let lastCue = 0;

  const observer = stateNodes.length
    ? new MutationObserver((records) => {
        if (!armed || !enabled || !api) return;
        const now = performance.now();
        for (const record of records) {
          const el = record.target;
          const was = record.oldValue;
          const is = el.getAttribute('data-status');
          if (was === is) continue;

          const name =
            is === 'active' && was !== 'active'
              ? el.dataset.soundOn
              : was === 'active' && is !== 'active'
                ? el.dataset.soundOff
                : null;
          if (!name) continue;

          // A fast scroll can cross several steps in one frame; keep them
          // from stacking into a chord.
          if (now - lastCue < 70) continue;
          lastCue = now;
          if (import.meta.env.DEV) {
            // cuelume's play() is a no-op until the document has real
            // user activation, so this is the only way to confirm cues
            // fire without a human at the keyboard.
            window.__soundCues = (window.__soundCues || []).concat(name);
          }
          safe(() => api.play(name));
        }
      })
    : null;

  if (observer) {
    stateNodes.forEach((node) =>
      observer.observe(node, {
        attributes: true,
        attributeFilter: ['data-status'],
        attributeOldValue: true,
      })
    );
    armTimer = setTimeout(() => {
      armed = true;
    }, 700);
  }

  /* ---- bottom nav open / close -----------------------------------
   * Same declarative idea as the timeline steps, different attribute:
   * the vendored Osmo script writes data-bottom-nav-open, so watching
   * that keeps the cue out of nav.js entirely.
   *
   * No arming delay is needed here, unlike the timeline: the attribute
   * only ever changes from a real click on the toggle, so there is no
   * init/refresh burst to suppress.
   */
  const navNode = document.querySelector('[data-bottom-nav-init]');
  const navObserver =
    navNode && (navNode.dataset.soundOn || navNode.dataset.soundOff)
      ? new MutationObserver((records) => {
          if (!enabled || !api) return;
          for (const record of records) {
            const is = navNode.getAttribute('data-bottom-nav-open');
            if (record.oldValue === is) continue;
            const name =
              is === 'true'
                ? navNode.dataset.soundOn
                : navNode.dataset.soundOff;
            if (name) safe(() => api.play(name));
          }
        })
      : null;

  navObserver?.observe(navNode, {
    attributes: true,
    attributeFilter: ['data-bottom-nav-open'],
    attributeOldValue: true,
  });

  // Clicking a _blank link backgrounds the tab; don't play into it.
  function onVisibility() {
    if (!api) return;
    safe(() => api.setEnabled(enabled && !document.hidden));
  }
  document.addEventListener('visibilitychange', onVisibility);

  // Always renders the off state; nothing is loaded until a real click.
  render();

  return function destroy() {
    toggle.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('pointerdown', onUnlockGesture, true);
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(armTimer);
    observer?.disconnect();
    navObserver?.disconnect();
    // cuelume 0.2.2 exposes no unbind(); muting is the best we can do.
    if (api) safe(() => api.setEnabled(false));
  };
}
