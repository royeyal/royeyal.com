/*
 * Copy-to-clipboard fields. Two instances: the oversized footer address
 * and the contact column inside the bottom nav.
 *
 * Why copy rather than mailto: on desktop `mailto:` fires whatever client
 * the OS has registered, which for most people is an Outlook or Mail.app
 * they have never configured — so the loudest contact control on the page
 * dead-ends. Copying never dead-ends. A small mailto link stays under the
 * footer field as the escape hatch for people who do have a client.
 *
 * The visible "Copied" swap is CSS (see clipboard.css); this module only
 * owns the clipboard write and the state flag it keys off.
 *
 * NOTE (Webflow migration): no dependencies — this ports as-is. Keep the
 * data-clip attribute; it carries the value AND is the JS hook.
 */

const REVERT_MS = 2000;

export function initClipboard(root = document) {
  const fields = root.querySelectorAll('[data-clip]');
  if (!fields.length) return null;

  /* One shared announcer for every field. Screen readers get the result
     from here; the visual .clip__done is aria-hidden so the same fact is
     not announced twice. role="status" implies aria-live="polite". */
  const live = document.createElement('span');
  live.className = 'clip__live';
  live.setAttribute('role', 'status');
  document.body.appendChild(live);

  const timers = new WeakMap();

  async function copy(field) {
    const value = field.dataset.clip;
    if (!value) return;

    /* Needs a secure context. If it is unavailable or the write is
       refused, leave the button untouched — claiming "Copied" when
       nothing was copied is worse than staying quiet, and the footer's
       mailto link is already the fallback path. */
    if (!navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }

    field.dataset.copied = 'true';
    live.textContent = `${value} copied to clipboard`;

    clearTimeout(timers.get(field));
    timers.set(
      field,
      setTimeout(() => {
        delete field.dataset.copied;
        // Clear it so the same message announces again on the next copy.
        live.textContent = '';
      }, REVERT_MS)
    );
  }

  const onClick = (event) => copy(event.currentTarget);
  fields.forEach((field) => field.addEventListener('click', onClick));

  return function destroy() {
    fields.forEach((field) => {
      field.removeEventListener('click', onClick);
      clearTimeout(timers.get(field));
    });
    live.remove();
  };
}
