/*
 * Interaction sounds — cuelume, opt-in, default OFF.
 *
 * The *bindings* live in the markup as data-cuelume-* attributes (see
 * index.html). This module owns only load / enable / persist / volume.
 * Intended assignment — keep in sync with index.html:
 *
 *   contact   .btn--primary, .footer__mail        hover droplet  press ready
 *   outbound  .btn--ghost, .footer__links a,
 *             .hero__sub a                        hover tick     press press
 *   project   .project-card__link                 hover whisper  press page
 *
 * No data-cuelume-release anywhere: every target opens a new tab or the
 * mail client, so a pointerup sound would fire into a backgrounding tab.
 *
 * WCAG 1.4.2 (Audio Control) is satisfied by construction — nothing plays
 * without an explicit opt-in gesture, every clip is far under 3s, and the
 * stop control is permanently visible in the footer. Deliberately NOT
 * gated on prefers-reduced-motion: there is no sound analogue of that
 * query, and a user who clicks a control labelled "[ sound: off ]" to turn
 * it on has given an unambiguous instruction. Don't "fix" this.
 *
 * cuelume handles more than its README documents (verified in
 * node_modules/cuelume/dist/interactions/bind.js): bind() is idempotent,
 * hover is throttled to 150ms globally AND restricted to fine-pointer
 * mice, and unknown sound names fall back safely. So no custom throttle
 * is needed here.
 *
 * NOTE (Webflow migration): cuelume is bundled from npm here. In Webflow,
 * load it from a pinned ESM CDN URL and keep the data-cuelume-* attributes
 * on elements via the custom-attributes panel.
 */

const VOLUME = 0.35;
const STORAGE_KEY = 'royeyal:sound';

// Dev-only guard: cuelume is pre-1.0, so catch a renamed sound at
// `npm run dev` rather than by ear in production.
const USED_SOUNDS = ['droplet', 'ready', 'tick', 'press', 'whisper', 'page'];

/*
 * sessionStorage, deliberately NOT localStorage: every fresh visit must
 * start silent. Within a tab the choice survives reloads and in-page
 * navigation, but closing the tab resets to off — so a visitor can never
 * arrive to unexpected audio because of a choice made days earlier.
 */
function readPref(key) {
  try {
    return sessionStorage.getItem(key) === 'on';
  } catch {
    return false; // storage blocked (private mode, sandboxed context)
  }
}

function writePref(key, on) {
  try {
    sessionStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    /* in-memory state still drives the UI for this page view */
  }
}

// One-time cleanup: an earlier build persisted this in localStorage, so
// anyone who enabled sound back then would still be opted in forever.
function clearLegacyPref(key) {
  try {
    localStorage.removeItem(key);
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

  clearLegacyPref(storageKey);
  let enabled = readPref(storageKey);
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
    writePref(storageKey, false);
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

  function apply({ announce = false } = {}) {
    render();
    writePref(storageKey, enabled);

    if (!enabled) {
      if (api) safe(() => api.setEnabled(false));
      return;
    }

    load().then((mod) => {
      // The user may have toggled off again while the chunk loaded.
      if (!mod || !enabled) return;
      safe(() => mod.setEnabled(true));
      if (announce) safe(() => mod.play('toggle'));
    });
  }

  function onClick() {
    enabled = !enabled;
    // Confirm only off->on. Muting is confirmed by silence.
    apply({ announce: enabled });
  }

  // Warm the chunk on hover/focus so the click lands on a resolved module.
  function preload() {
    if (!enabled) load();
  }

  toggle.addEventListener('click', onClick);
  toggle.addEventListener('pointerenter', preload, { once: true });
  toggle.addEventListener('focusin', preload, { once: true });

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

  function onFocusin(event) {
    if (!enabled || !api) return;
    const el = event.target.closest?.('[data-cuelume-hover]');
    // :focus-visible is the browser's own "was this keyboard?" heuristic —
    // it stops a mouse click emitting both a hover and a focus sound.
    if (!el || el === toggle || !el.matches(':focus-visible')) return;
    safe(() => api.play(el.dataset.cuelumeHover || 'chime'));
  }

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('focusin', onFocusin);

  /* ---- state-change cues -----------------------------------------
   * cuelume's bind() only covers pointer and click events. The timeline
   * steps light up from scroll position, not from a pointer, so their
   * cue comes from watching the data-status attribute that the Osmo
   * script writes. Declared in the markup as data-sound-on/off so the
   * mapping stays with the element and ports to Webflow like the
   * data-cuelume-* attributes do.
   */
  const stateNodes = document.querySelectorAll(
    '[data-sound-on], [data-sound-off]'
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

  // Clicking a _blank link backgrounds the tab; don't play into it.
  function onVisibility() {
    if (!api) return;
    safe(() => api.setEnabled(enabled && !document.hidden));
  }
  document.addEventListener('visibilitychange', onVisibility);

  render();
  if (enabled) {
    // Returning opt-in: honour the stored choice without blocking paint.
    // The AudioContext stays suspended until this visit's first gesture;
    // cuelume resumes it, so the first hover/click is the unlock.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    idle(() => apply());
  }

  return function destroy() {
    toggle.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('focusin', onFocusin);
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(armTimer);
    observer?.disconnect();
    // cuelume 0.2.2 exposes no unbind(); muting is the best we can do.
    if (api) safe(() => api.setEnabled(false));
  };
}
