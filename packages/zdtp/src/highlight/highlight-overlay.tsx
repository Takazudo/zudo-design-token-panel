/** @jsxImportSource @takazudo/zfb/zudo-react */
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
 * div's inline style IMPERATIVELY (direct DOM mutation — no re-render
 * per frame). This keeps animation cost O(items) DOM writes per frame.
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

import { computed, For, getScope } from '@takazudo/zfb/zudo-react';
import { Z } from '../styles/z-index-tokens';
import { read, type Reactive } from '../zr/live';

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
): Record<string, string> {
  return {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    outline: `${slot.outlineWidth}px solid ${slot.color}`,
    'outline-offset': '-1px',
    // Hostile-host fallback: some hosts apply `outline: none !important`.
    // box-shadow inset draws the same ring without relying on outline.
    'box-shadow': `inset 0 0 0 ${slot.outlineWidth}px ${slot.color}`,
    'pointer-events': 'none',
    'z-index': String(OVERLAY_Z_INDEX),
    'box-sizing': 'border-box',
  };
}

function applyStyle(el: HTMLDivElement, style: Record<string, string>): void {
  for (const [key, value] of Object.entries(style)) el.style.setProperty(key, value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HighlightOverlay(props: Reactive<HighlightOverlayProps>) {
  let warned = false;
  const visibleItems = computed(() => {
    const items = read(props.items);
    // Warn once while the list stays above the cap.
    if (items.length > MAX_ITEMS && !warned) {
      warned = true;
      console.warn(
        `HighlightOverlay: received ${items.length} items (max ${MAX_ITEMS}). ` +
          `Only the first ${MAX_ITEMS} overlays will be rendered.`,
      );
    }
    if (items.length <= MAX_ITEMS) warned = false;
    return items.length > MAX_ITEMS ? items.slice(0, MAX_ITEMS) : items;
  });

  // One element per visible item — the rendered overlay div.
  const overlays: Array<HTMLDivElement | null> = [];

  // RAF loop — updates overlay positions imperatively each frame.
  getScope().effect(() => {
    const items = visibleItems.value;
    if (items.length === 0) return;

    let rafId: number;

    function tick() {
      for (let i = 0; i < items.length; i++) {
        const divEl = overlays[i];
        if (!divEl) continue;
        // F26: Hide overlay when element is disconnected from the DOM.
        // In browsers, getBoundingClientRect() on a disconnected element returns
        // a 0×0 rect at the viewport origin, which would draw a phantom ring.
        // Setting display:none hides the overlay ring immediately; the
        // orchestrator evicts and re-probes on the next invalidation, removing
        // the stale item from the items list. Mirrors the isConnected guard in
        // the AltClickPicker.
        if (!items[i].element.isConnected) {
          divEl.style.display = 'none';
          continue;
        }
        divEl.style.display = '';
        const rect = items[i].element.getBoundingClientRect();
        applyStyle(divEl, buildOverlayStyle(rect, items[i].slot));
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  });

  const indexes = computed(() => visibleItems.value.map((_, i) => i));

  return (
    <For each={indexes} by={(i) => i}>
      {(entry) => {
        const i = entry.value;
        const ref = {
          get current() {
            return overlays[i] ?? null;
          },
          set current(el: HTMLDivElement | null) {
            overlays[i] = el;
          },
        };
        return (
          <div
            class="tokenpanel-highlight-overlay"
            aria-hidden="true"
            ref={ref}
            style={computed(() => {
              const item = visibleItems.value[i];
              return item ? buildOverlayStyle(item.element.getBoundingClientRect(), item.slot) : {};
            })}
          />
        );
      }}
    </For>
  );
}
