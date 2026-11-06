/**
 * A(DAI) — the field inside another page (A(DAI) Coil frames it as one of its views)
 *
 * A framed page keeps the keyboard once it is clicked, so the page around it
 * never hears its own keys again (the coil's `v`, which moves to its next
 * view). The framing page may ask for some keys back: it posts
 *
 *   { adai: 'embed-hello', keys: ['v'] }
 *
 * to this window, and from then on those keys, pressed outside a text field
 * with no modifier, are handed to it as { adai: 'embed-key', key } instead of
 * being used here. Only keys in HANDABLE can be asked for: letters the field
 * itself never binds, so no framer can take the field's own shortcuts or
 * swallow what a visitor types. Only the window that frames this one is
 * listened to, and keys go only to the origin that asked; nothing happens on
 * a page that is not framed, or whose framer never asks.
 */
(function () {
  if (window.parent === window) return;
  // Keep in step with the field's own bindings (adai-system.js, graph-field.js,
  // entity-view.js, search-palette.js): a key listed here must be free there.
  const HANDABLE = new Set(['v']);
  let host = null;

  window.addEventListener('message', (e) => {
    if (e.source !== window.parent) return;
    const d = e.data;
    if (!d || d.adai !== 'embed-hello' || !Array.isArray(d.keys)) return;
    const keys = new Set(
      d.keys.filter((k) => typeof k === 'string' && k.length === 1).map((k) => k.toLowerCase()).filter((k) => HANDABLE.has(k)),
    );
    host = { origin: e.origin, keys };
    window.parent.postMessage({ adai: 'embed-ready', keys: [...keys] }, e.origin);
  });

  // on the window, capturing, so it runs before any of the field's own handlers
  // and a key handed back is not also used here
  window.addEventListener(
    'keydown',
    (e) => {
      // e.key can be missing (autofill, some IMEs)
      if (!host || e.metaKey || e.ctrlKey || e.altKey || typeof e.key !== 'string' || e.key.length !== 1) return;
      const key = e.key.toLowerCase();
      if (!host.keys.has(key)) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      window.parent.postMessage({ adai: 'embed-key', key }, host.origin);
    },
    true,
  );
})();
