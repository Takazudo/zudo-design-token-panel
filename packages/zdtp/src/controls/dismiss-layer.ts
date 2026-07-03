/**
 * Dismiss-layer stack — shared Escape arbitration for the panel's layered
 * popovers (#446).
 *
 * Problem it solves
 * -----------------
 * The panel stacks several dismissable surfaces on top of each other:
 * a ColorPicker popover, the HighlightSettingsPopover (which can itself host a
 * nested ColorPicker), and the PaletteSelector listbox — plus the panel shell
 * underneath. Each surface used to register its OWN `document` keydown listener
 * that closed it on Escape. Because they were all bound to `document`, a single
 * Escape fired EVERY listener at once: the popover closed AND the panel torn
 * down, and with a nested picker all three layers collapsed on one keypress.
 *
 * The fix is a single, shared arbiter. Every dismissable JS-managed popover
 * registers a layer here instead of adding its own key listener. One
 * capture-phase `keydown` listener on `document` routes Escape to exactly ONE
 * layer — the topmost — and marks the event handled via `preventDefault()`.
 * Base surfaces that keep their own listener (the panel shell) bail when they
 * see `event.defaultPrevented`, so one Escape never closes two layers.
 *
 * Native `<dialog>` modals (Export / Import / Apply) are intentionally NOT
 * layers here: the browser already gives them their own top-layer Escape
 * handling. The panel guards against those separately via its modal-open flags.
 *
 * Topmost selection
 * -----------------
 * "Topmost" is resolved by DOM depth, not registration order: the layer whose
 * element is the deepest descendant wins (a nested popover's container is a DOM
 * descendant of its host popover's container). This is robust regardless of the
 * order in which effects register the layers (child effects run before parent
 * effects in Preact), which matters for the ColorPicker-inside-
 * HighlightSettingsPopover case. When elements are unrelated or unavailable it
 * falls back to the most-recently-registered layer.
 */

export interface DismissLayerOptions {
  /**
   * Invoked when this layer is the topmost and Escape is pressed. Should close
   * the layer (and may restore focus to its trigger).
   */
  onEscape: () => void;
  /**
   * Returns the layer's root element, used to resolve DOM depth when several
   * layers are open at once. May return null before the element mounts.
   */
  getElement: () => HTMLElement | null;
}

interface RegisteredLayer extends DismissLayerOptions {
  seq: number;
}

const stack: RegisteredLayer[] = [];
let seq = 0;
let installed = false;

function pickTopmost(): RegisteredLayer | undefined {
  if (stack.length === 0) return undefined;
  // Start from the most-recently-registered layer, then prefer any layer whose
  // element is a strict DOM descendant of the current pick (i.e. deeper/nested).
  let best = stack[stack.length - 1];
  let bestEl = best.getElement();
  for (let i = stack.length - 2; i >= 0; i--) {
    const cand = stack[i];
    const candEl = cand.getElement();
    if (!candEl) continue;
    if (!bestEl) {
      best = cand;
      bestEl = candEl;
      continue;
    }
    if (bestEl !== candEl && bestEl.contains(candEl)) {
      best = cand;
      bestEl = candEl;
    }
  }
  return best;
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return;
  // Another handler already consumed this Escape (e.g. a native dialog's own
  // capture-phase logic) — do not double-dismiss.
  if (e.defaultPrevented) return;
  const top = pickTopmost();
  if (!top) return;
  // Mark handled FIRST so base-layer listeners (the panel shell) that run in
  // the bubble phase see defaultPrevented and stand down, then dismiss.
  e.preventDefault();
  top.onEscape();
}

function ensureInstalled(): void {
  if (installed) return;
  if (typeof document === 'undefined') return;
  // Capture phase: this arbiter must run before bubble-phase base listeners so
  // its preventDefault() is visible to them.
  document.addEventListener('keydown', handleKeyDown, true);
  installed = true;
}

/**
 * Register a dismiss layer. Returns an unregister function to call on unmount.
 */
export function pushDismissLayer(options: DismissLayerOptions): () => void {
  ensureInstalled();
  const layer: RegisteredLayer = { ...options, seq: ++seq };
  stack.push(layer);
  return function remove(): void {
    const idx = stack.indexOf(layer);
    if (idx !== -1) stack.splice(idx, 1);
  };
}

/** Number of currently-registered layers (test/introspection helper). */
export function dismissLayerCount(): number {
  return stack.length;
}

/** Clear all registered layers. Test-only reset between cases. */
export function __resetDismissLayersForTests(): void {
  stack.length = 0;
}
