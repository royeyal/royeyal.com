/*
 * Interaction sounds — cuelume, opt-in, default OFF.
 *
 * The *bindings* live in the markup as data-cuelume-* attributes (see
 * index.html). This module owns only load / enable / volume. The state
 * is never persisted — every page load starts off.
 *
 * Every cue answers a deliberate act. Keep in sync with index.html and
 * build/projects.js:
 *
 *   click   data-cuelume-tap, most links         tap
 *           … + data-cuelume-theme="press"       press:tap — every link
 *                                                that opens a new tab,
 *                                                project cards included
 *           data-cuelume-select, menu links      select
 *           data-cuelume-tap, copy buttons       tap
 *   copied  data-sound-on on the copy buttons    press:success
 *   scroll  data-sound-on / -off on the steps    toggle / error
 *   menu    data-sound-on / -off on the nav      bubble:ready / bubble:attention
 *
 * Themes are per cue, never global: setTheme() is not called, so anything
 * unmarked plays `default`. cuelume's bindings read data-cuelume-theme
 * from the element or an ancestor. The data-sound-* values are ours, so
 * they carry the theme inline as `theme:cue` and cueFrom() below splits
 * it; a bare name means `default`.
 *
 * Copying sounds twice: tap as the button goes down, success once the
 * clipboard write has actually landed (clipboard.js sets data-copied only
 * then). A refused write gets the tap and nothing else — the same honesty
 * as the button never claiming "Copied" for a copy that did not happen.
 *
 * These are cuelume's canonical names. Until November 2026 the markup
 * used the v0.2 palette (press, page, arrival, scan), which cuelume 0.2.4
 * turned into aliases for exactly these cues — so the rename changed no
 * sound, only removed names that 1.0 drops.
 *
 * The click cues used data-cuelume-press until November 2026. cuelume
 * deprecated it (gone in 1.0), and data-cuelume-tap is not a rename —
 * it changes when and how a cue sounds (bind.js, 0.2.8):
 *
 *   mouse     plays on pointerdown, as before, then lets go on the click.
 *             `default` has no release for tap or select, so most clicks
 *             are silent. `press` tap does have one, a lighter click, so
 *             the new-tab links sound twice with a mouse: down, then as
 *             the click opens the tab. Nothing mutes a hidden tab any
 *             more (see "hidden tab" below), so that release rings out.
 *   touch     plays whole on the click, not on touch-down, so a scroll
 *             that starts on a link — the project cards, the nav — stays
 *             silent. The old attribute sounded on every one of those.
 *   keyboard  Enter / Space dispatch a click (detail 0), which plays the
 *             cue, so this module no longer bridges keydown. Keeping a
 *             bridge would sound every keyboard activation twice.
 *
 * `tap` also changes timbre with the input. The old attribute fired on
 * pointerdown, which reports detail 0, so cuelume heard every mouse tap
 * as a keyboard one (lower, shorter, duller) and the bridge's play() as
 * neither. Now each input gets its own.
 *
 * No hover cues, by choice. cuelume throttles pointerenter with a single
 * module-level timestamp shared across every element, so moving between
 * two links inside 150ms silently drops the second sound — which reads
 * as lag rather than restraint. Bluetooth output latency compounds it.
 * Sound now only ever answers a click or a step lighting up.
 *
 * No data-cuelume-release either: most targets open a new tab or leave
 * the page, so a separate pointerup sound would fire into a tab that is
 * already going away.
 *
 * WCAG 1.4.2 (Audio Control) is satisfied by construction — nothing plays
 * without an explicit opt-in gesture, every clip is far under 3s, and the
 * stop control is always visible on screen. Deliberately NOT
 * gated on prefers-reduced-motion: there is no sound analogue of that
 * query, and a user who clicks a control labelled "[ sound: off ]" to turn
 * it on has given an unambiguous instruction. Don't "fix" this.
 *
 * cuelume handles more than its README documents (verified in
 * node_modules/cuelume/dist/interactions/bind.js, 0.2.8): bind() counts
 * its callers per root, so binding twice is harmless, and returns an
 * unbind that only lets go once every caller has. Unknown sound names
 * never throw — a binding falls back to `tap`, play() stays silent. Note
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
  'tap',
  'select',
  'success',
  'toggle',
  'error',
  'ready',
  'attention',
];
const USED_THEMES = ['press', 'bubble'];

/* `bubble:ready` → play('ready', { theme: 'bubble' }); `toggle` → plain
   play('toggle'). An unknown theme is not an error: cuelume ignores it
   and plays `default`, which is the safe way to be wrong. */
function cueFrom(value) {
  if (!value) return null;
  const at = value.indexOf(':');
  if (at === -1) return { name: value, options: undefined };
  return {
    name: value.slice(at + 1),
    options: { theme: value.slice(0, at) },
  };
}

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
  let unbind = null; // what bind() hands back; destroy() calls it

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

  // Plays a data-sound-* value (`cue` or `theme:cue`) for the observers.
  function playCue(value) {
    const cue = cueFrom(value);
    if (!cue) return;
    if (import.meta.env.DEV) {
      // cuelume's play() is a no-op until the document has real user
      // activation, so this is the only way to confirm cues fire
      // without a human at the keyboard.
      window.__soundCues = (window.__soundCues || []).concat(value);
    }
    safe(() => api.play(cue.name, cue.options));
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
        if (import.meta.env.DEV && Array.isArray(mod.themes)) {
          const missing = USED_THEMES.filter((t) => !mod.themes.includes(t));
          if (missing.length) {
            console.warn('[sound] unknown cuelume themes:', missing);
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

        /* Since 0.2.6 bind() returns its undo. Older versions returned
           nothing, hence the typeof guard in destroy() rather than
           trusting the return value. */
        unbind = api.bind(root);
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

  /* ---- state-change cues -----------------------------------------
   * cuelume's bind() only covers pointer and click events. The timeline
   * steps light up from scroll position, not from a pointer, so their
   * cue comes from watching the data-status attribute that the Osmo
   * script writes. Declared in the markup as data-sound-on/off so the
   * mapping stays with the element and ports to Webflow like the
   * data-cuelume-* attributes do.
   */
  /* The nav and the copy buttons carry data-sound-on/off too, but they
     signal through other attributes, so they get the flag watcher below.
     Selecting the steps by their own hook keeps them out of this one. */
  const stateNodes = document.querySelectorAll(
    '[data-step-timeline-item][data-sound-on], [data-step-timeline-item][data-sound-off]'
  );

  // ScrollTrigger sets statuses during init and on every refresh; if the
  // page loads deep-linked mid-timeline that would fire a burst. Stay
  // disarmed until things have settled.
  let armed = false;
  let armTimer = 0;
  let lastCue = 0;

  const observer = stateNodes.length
    ? new MutationObserver((records) => {
        if (!armed || !enabled || !api || document.hidden) return;
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
          playCue(name);
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

  /* ---- flag cues: bottom nav, copy buttons -----------------------
   * Same declarative idea as the timeline steps, different attribute.
   * Another script owns the flag and this module only listens, so the
   * cue stays out of nav.js and clipboard.js entirely:
   *
   *   nav    data-bottom-nav-open, written by the vendored Osmo script.
   *          "true" plays data-sound-on, anything else data-sound-off.
   *   copy   data-copied, written by clipboard.js after a successful
   *          write and removed 2s later. Only "true" plays.
   *
   * `everyWrite` is for the copy buttons. Copying again inside those 2s
   * sets "true" over "true"; a MutationObserver still records that, and
   * it is a second real copy, so it gets its own success. The nav keeps
   * the old === new skip in case Osmo ever rewrites the same state.
   *
   * No arming delay is needed here, unlike the timeline: both flags only
   * ever change from a real click, so there is no init/refresh burst.
   */
  function watchFlag(node, attr, everyWrite = false) {
    const mo = new MutationObserver((records) => {
      if (!enabled || !api || document.hidden) return;
      for (const record of records) {
        const is = node.getAttribute(attr);
        if (!everyWrite && record.oldValue === is) continue;
        playCue(is === 'true' ? node.dataset.soundOn : node.dataset.soundOff);
      }
    });
    mo.observe(node, {
      attributes: true,
      attributeFilter: [attr],
      attributeOldValue: true,
    });
    return mo;
  }

  const flagObservers = [];
  const navNode = document.querySelector('[data-bottom-nav-init]');
  if (navNode && (navNode.dataset.soundOn || navNode.dataset.soundOff)) {
    flagObservers.push(watchFlag(navNode, 'data-bottom-nav-open'));
  }
  document
    .querySelectorAll('[data-clip][data-sound-on]')
    .forEach((node) =>
      flagObservers.push(watchFlag(node, 'data-copied', true))
    );

  /* ---- hidden tab ------------------------------------------------
   * Nothing new may start while the tab is hidden: both observers above
   * bail on document.hidden, which keeps a ScrollTrigger re-measure on
   * the way back from firing a burst of step cues.
   *
   * This used to mute cuelume on visibilitychange instead. Since 0.2.6,
   * setEnabled(false) also fades whatever is still ringing within a few
   * milliseconds, and data-cuelume-tap plays a touch cue on the click —
   * the same instant a _blank link hides the tab. Muting there would cut
   * the tap on every external link on a phone. Letting a cue that
   * already started finish is not "playing into" the hidden tab.
   */

  // Always renders the off state; nothing is loaded until a real click.
  render();

  return function destroy() {
    toggle.removeEventListener('click', onClick);
    document.removeEventListener('pointerdown', onUnlockGesture, true);
    clearTimeout(armTimer);
    observer?.disconnect();
    flagObservers.forEach((mo) => mo.disconnect());
    // Mute first: since 0.2.6 setEnabled(false) also fades anything
    // still ringing within a few ms, so nothing outlives the teardown.
    if (api) safe(() => api.setEnabled(false));
    if (typeof unbind === 'function') safe(unbind);
    unbind = null;
  };
}
