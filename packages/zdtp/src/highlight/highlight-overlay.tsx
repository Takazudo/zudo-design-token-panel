/**
 * HighlightOverlay — absolutely-positioned div rings around host elements.
 *
 * Renders one overlay <div> per {element, slot} item, using
 * getBoundingClientRect() + position:fixed so the outlines track the element
 * regardless of page scroll or layout reflow.
 *
 * Reposition strategy
 * -------------------
 * A single RAF loop runs while items.length > 0.  Each tick reads
 * getBoundingClientRect() for every item and updates the corresponding overlay
 * div's inline style IMPERATIVELY (direct DOM mutation — no Preact re-render
 * per frame). This keeps animation cost O(items) DOM writes per frame rather
 * than O(items) VDOM diffs.
 *
 * Hostile-host fallback
 * ---------------------
 * Some hosts reset `outline: none !important`.  We also apply
 * `box-shadow: inset 0 0 0 <w>px <color>` so the visual cue survives even
 * when outline is killed.
 *
 * Self-contained — does NOT manage its own portal mount.
 * The orchestrator (#232) owns where in the DOM this component is rendered.
 */

import { useEffect, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { Z } from '../styles/z-index-tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Inline copy of HighlightSlotSpec.  After sub-issue #227 merges, the
 * orchestrator (#232) can import from either source — the shapes are
 * identical so TypeScript will accept either.
 */
export interface HighlightSlotSpec {
  color: string;
  outlineWidth: number;
}

export interface HighlightOverlayItem {
  element: Element;
  slot: HighlightSlotSpec;
}

export interface HighlightOverlayProps {
  items: ReadonlyArray<HighlightOverlayItem>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cap to avoid runaway DOM cost with huge item lists. */
const MAX_ITEMS = 200;

const OVERLAY_Z_INDEX = Z.overlay;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOverlayStyle(
  rect: DOMRect,
  slot: HighlightSlotSpec,
): Partial<CSSStyleDeclaration> {
  return {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    outline: `${slot.outlineWidth}px solid ${slot.color}`,
    outlineOffset: '-1px',
    // Hostile-host fallback: some hosts apply `outline: none !important`.
    // box-shadow inset draws the same ring without relying on outline.
    boxShadow: `inset 0 0 0 ${slot.outlineWidth}px ${slot.color}`,
    pointerEvents: 'none',
    zIndex: String(OVERLAY_Z_INDEX),
    boxSizing: 'border-box',
  };
}

function applyStyle(el: HTMLDivElement, style: Partial<CSSStyleDeclaration>): void {
  for (const key of Object.keys(style) as Array<keyof CSSStyleDeclaration>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el.style as any)[key] = style[key];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HighlightOverlay({ items }: HighlightOverlayProps): JSX.Element | null {
  const visibleItems = items.length > MAX_ITEMS ? items.slice(0, MAX_ITEMS) : items;

  // Warn once when the list exceeds the cap.  A ref prevents the warning from
  // firing on every parent re-render while the list stays oversized.
  const warnedRef = useRef(false);
  if (items.length > MAX_ITEMS && !warnedRef.current) {
    warnedRef.current = true;
    console.warn(
      `HighlightOverlay: received ${items.length} items (max ${MAX_ITEMS}). ` +
        `Only the first ${MAX_ITEMS} overlays will be rendered.`,
    );
  }
  // Reset warn flag when list drops back below cap.
  if (items.length <= MAX_ITEMS) {
    warnedRef.current = false;
  }

  // One ref per visible item — stores the rendered overlay div.
  const overlayRefs = useRef<Array<HTMLDivElement | null>>([]);

  // RAF loop — updates overlay positions imperatively each frame.
  useEffect(() => {
    if (visibleItems.length === 0) return;

    let rafId: number;

    function tick() {
      for (let i = 0; i < visibleItems.length; i++) {
        const divEl = overlayRefs.current[i];
        if (!divEl) continue;
        // F26: Hide overlay when element is disconnected from the DOM.
        // In browsers, getBoundingClientRect() on a disconnected element returns
        // a 0×0 rect at the viewport origin, which would draw a phantom ring.
        // Setting display:none hides the overlay ring immediately; the
        // orchestrator evicts and re-probes on the next invalidation, removing
        // the stale item from the items list. Mirrors the isConnected guard in
        // inspector-overlay.tsx.
        if (!visibleItems[i].element.isConnected) {
          divEl.style.display = 'none';
          continue;
        }
        divEl.style.display = '';
        const rect = visibleItems[i].element.getBoundingClientRect();
        applyStyle(divEl, buildOverlayStyle(rect, visibleItems[i].slot));
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [visibleItems]);

  if (visibleItems.length === 0) return null;

  return (
    <>
      {visibleItems.map((item, i) => {
        const rect = item.element.getBoundingClientRect();
        const style = buildOverlayStyle(rect, item.slot);
        return (
          <div
            key={i}
            className="tokenpanel-highlight-overlay"
            aria-hidden="true"
            ref={(el) => {
              overlayRefs.current[i] = el as HTMLDivElement | null;
            }}
            style={style as JSX.CSSProperties}
          />
        );
      })}
    </>
  );
}
