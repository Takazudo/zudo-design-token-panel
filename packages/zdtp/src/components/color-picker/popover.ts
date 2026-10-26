import { pushDismissLayer } from '../../controls/dismiss-layer';

export interface FixedPopoverStyle {
  position: 'fixed';
  left?: number;
  top?: number;
  maxHeight?: number;
  overflowY?: 'auto';
}

/**
 * Compute a `position: fixed` style that places the popover below (or above,
 * if flipped) the anchor element, then clamps all edges inside the viewport.
 *
 * When vertical space is scarce on both sides, the popover is pinned to the
 * top edge (top = pad) and given a max-height + overflow: auto so it scrolls
 * rather than clips.
 *
 * Returns camelCase keys with px numbers (React style); zudo-react callers
 * pass the result through `toZrStyle`.
 */
export function getFixedPopoverStyle(
  anchor: HTMLElement | null,
  estW: number,
  estH: number,
): FixedPopoverStyle {
  if (!anchor) return { position: 'fixed' };
  const rect = anchor.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = vh - rect.bottom - gap - pad;
  const above = rect.top - gap - pad;
  const flipAbove = below < estH && above > below;

  // Horizontal: clamp left so the popover stays inside the viewport.
  let left = rect.left;
  if (left + estW > vw - pad) left = vw - pad - estW;
  if (left < pad) left = pad;

  // Vertical: derive a top value from the chosen placement.
  let top: number;
  if (flipAbove) {
    top = rect.top - gap - estH;
  } else {
    top = rect.bottom + gap;
  }

  // Clamp top to keep the popover fully visible.
  if (top < pad) top = pad;
  if (top + estH > vh - pad) top = vh - pad - estH;

  const style: FixedPopoverStyle = { position: 'fixed', left, top };

  // When the content is taller than the viewport, pin to the top edge and
  // let the popover scroll rather than clip off-screen.
  if (estH > vh - 2 * pad) {
    style.top = pad;
    style.maxHeight = vh - 2 * pad;
    style.overflowY = 'auto';
  }

  return style;
}

type ElementRef = { readonly current: HTMLElement | null };

/**
 * Close the popover on outside pointerdown or Escape key. Returns the
 * matching unbind.
 *
 * Deliberately does NOT close on scroll — a scroll event on the host page
 * should not dismiss an in-flight color edit.
 *
 * `anchorRef` (F11): the popover's trigger element lives OUTSIDE `containerRef`.
 * A pointerdown on the trigger while the popover is open must NOT trigger the
 * outside-close, otherwise it races the trigger's own click-to-toggle: the
 * pointerdown closes, then the click reopens, so the trigger can never dismiss
 * its own popover. Excluding the anchor lets the click toggle it shut.
 *
 * Escape is arbitrated by the shared dismiss-layer stack (F10): only the
 * topmost open popover consumes a single Escape, so one keypress never also
 * tears down the panel underneath.
 */
export function bindPopoverClose(
  containerRef: ElementRef,
  onClose: () => void,
  anchorRef?: ElementRef,
): () => void {
  function handlePointerDown(e: PointerEvent) {
    const target = e.target as Node;
    if (containerRef.current && containerRef.current.contains(target)) return;
    if (anchorRef?.current && anchorRef.current.contains(target)) return;
    onClose();
  }
  document.addEventListener('pointerdown', handlePointerDown);
  const removeLayer = pushDismissLayer({
    onEscape: () => onClose(),
    getElement: () => containerRef.current,
  });
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
    removeLayer();
  };
}
