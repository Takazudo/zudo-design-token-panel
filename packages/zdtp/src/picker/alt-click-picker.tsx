/**
 * AltClickPicker — reusable primitive for DevTools-style Alt+click picking.
 *
 * Behaviour while `enabled`:
 *   - capture-phase Alt keydown arms the picker and requests exclusive
 *     ownership from the arming coordinator.
 *   - mousemove tracks the last cursor and resolves `document.elementFromPoint`
 *     while armed, skipping panel-owned surfaces.
 *   - capture-phase mousedown/click prevent host side effects; click calls
 *     `onElementPicked` with the resolved host element.
 *   - keyup/window-blur disarm the picker.
 *   - a fixed-position box + label track the hovered element with RAF.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { PANEL_EXCLUSION_SELECTOR } from '../highlight/find-elements';
import { Z } from '../styles/z-index-tokens';
import {
  registerArmingOwner,
  releaseArming,
  requestArming,
} from './arming-coordinator';

const DEFAULT_LABEL_GAP = 2;

export interface AltClickPickerClassNames {
  /** Highlight box class. */
  box: string;
  /** Label container class. */
  label: string;
  /** Label element-name text class. */
  labelName: string;
  /** Label size text class. */
  labelSize: string;
  /** Class toggled on <html> while armed. */
  inspectingRoot: string;
}

export interface AltClickPickerProps {
  /** Whether this feature is enabled. When false, the picker is fully inert. */
  enabled: boolean;
  /** Stable feature id used by the single-owner arming coordinator. */
  featureId: string;
  /** Called once an armed click picks a host element. */
  onElementPicked: (el: Element) => void;
  /** Label text shown before the element dimensions. */
  getLabelText?: (el: Element) => string;
  /** Hidden live-region text. Kept in the primitive so announcements stay mounted. */
  ariaLiveMessage?: string | null;
  /** Selector for UI surfaces that must not be picked. */
  excludeSelector?: string;
  /** Class-name hooks for feature-specific styling. */
  classNames?: Partial<AltClickPickerClassNames>;
  /** z-index applied inline to the box and label. */
  zIndex?: number;
  /** Gap between the element box and its label tag. */
  labelGap?: number;
}

const DEFAULT_CLASS_NAMES: AltClickPickerClassNames = {
  box: 'tokenpanel-picker-box',
  label: 'tokenpanel-picker-label',
  labelName: 'tokenpanel-picker-label-name',
  labelSize: 'tokenpanel-picker-label-size',
  inspectingRoot: 'tokenpanel-picker-inspecting',
};

function defaultLabelText(el: Element): string {
  return el.tagName.toLowerCase();
}

function isExcludedElement(el: Element, selector: string): boolean {
  if (!selector) return false;
  try {
    return el.closest(selector) !== null;
  } catch {
    return false;
  }
}

export function AltClickPicker({
  enabled,
  featureId,
  onElementPicked,
  getLabelText = defaultLabelText,
  ariaLiveMessage,
  excludeSelector = PANEL_EXCLUSION_SELECTOR,
  classNames,
  zIndex = Z.inspectorBox,
  labelGap = DEFAULT_LABEL_GAP,
}: AltClickPickerProps): JSX.Element {
  const [armed, setArmed] = useState(false);
  const [hoverEl, setHoverEl] = useState<Element | null>(null);

  // Refs mirroring state for stable event handlers / RAF loop.
  const armedRef = useRef(false);
  armedRef.current = armed;
  const hoverElRef = useRef<Element | null>(null);
  hoverElRef.current = hoverEl;

  const boxRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  // Last known pointer position so pressing Alt highlights the element already
  // under the cursor immediately (no need to nudge the mouse first).
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  const classes = useMemo<AltClickPickerClassNames>(
    () => ({ ...DEFAULT_CLASS_NAMES, ...classNames }),
    [classNames],
  );

  const disarm = useCallback(() => {
    setArmed(false);
    setHoverEl(null);
    releaseArming(featureId);
  }, [featureId]);

  useEffect(() => {
    return registerArmingOwner(featureId, {
      onArmingRevoked: () => {
        setArmed(false);
        setHoverEl(null);
      },
    });
  }, [featureId]);

  // Reset everything when the feature is disabled.
  useEffect(() => {
    if (enabled) return;
    disarm();
  }, [disarm, enabled]);

  // Pointer position + Alt arming (active whenever the feature is enabled).
  useEffect(() => {
    if (!enabled) return;

    function resolveHoverAt(x: number, y: number) {
      const el = document.elementFromPoint(x, y);
      setHoverEl(!el || isExcludedElement(el, excludeSelector) ? null : el);
    }

    function onMouseMove(e: MouseEvent) {
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      if (armedRef.current) resolveHoverAt(e.clientX, e.clientY);
    }

    function onKeyDown(e: KeyboardEvent) {
      // Only do the arm-transition work on the first Alt-down. Without the
      // `!armedRef.current` guard, every Alt-modified keystroke (Alt+letter host
      // shortcuts, Alt+Tab attempts) would re-run the layout-querying
      // elementFromPoint for no behavioural benefit — the position is already
      // tracked by the always-on mousemove handler.
      if ((e.key === 'Alt' || e.altKey) && !armedRef.current) {
        requestArming(featureId);
        setArmed(true);
        const last = lastMouseRef.current;
        if (last) resolveHoverAt(last.x, last.y);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Alt' || !e.altKey) disarm();
    }

    // mousemove is passive + non-capture: it only records the pointer position
    // (and resolves a hovered element while armed) — it never preventDefault/
    // stopPropagation, so it has no reason to run in the capture phase ahead of
    // host handlers. keydown/keyup stay in capture so Alt arming is observed
    // before host shortcuts.
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', disarm);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', disarm);
    };
  }, [disarm, enabled, excludeSelector, featureId]);

  // Click-to-pick (active only while armed). The click + mousedown listeners
  // are in the capture phase so the interaction is intercepted before any host
  // handler (<a> navigation, button onClick, focus, text selection) can run.
  useEffect(() => {
    if (!enabled || !armed) return;

    // Suppress mousedown side-effects (focus shift, text selection, drag start)
    // so an inspect-click is purely a picker gesture.
    function onMouseDown(e: MouseEvent) {
      if (!hoverElRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    function onClick(e: MouseEvent) {
      const el = hoverElRef.current;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onElementPicked(el);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [armed, enabled, onElementPicked]);

  // Crosshair cursor + selection lock while armed. A class on <html> drives a
  // CSS rule so the crosshair wins over host element cursors (links, buttons).
  useEffect(() => {
    if (!enabled || !armed) return;
    const root = document.documentElement;
    root.classList.add(classes.inspectingRoot);
    return () => {
      root.classList.remove(classes.inspectingRoot);
    };
  }, [armed, classes.inspectingRoot, enabled]);

  // Imperative position loop — tracks scroll/reflow without re-rendering.
  useEffect(() => {
    if (!armed || !hoverEl) return;
    let rafId = 0;

    // NB: box + label styles are rewritten unconditionally every frame on
    // purpose. The label's vertical position (above the box) differs from the
    // label's JSX inline `top` (the box's own top), so a re-render that fires
    // while hovering re-applies the JSX value and would strand the label on the
    // box edge — the unconditional rewrite self-heals that within a frame.
    function position() {
      const el = hoverElRef.current;
      const box = boxRef.current;
      if (el && box) {
        if (!el.isConnected) {
          setHoverEl(null);
          return;
        }
        const r = el.getBoundingClientRect();
        box.style.top = `${r.top}px`;
        box.style.left = `${r.left}px`;
        box.style.width = `${r.width}px`;
        box.style.height = `${r.height}px`;

        const label = labelRef.current;
        if (label) {
          const lh = label.offsetHeight;
          // Prefer above the box; drop inside the top edge when there's no room.
          let labelTop = r.top - lh - labelGap;
          if (labelTop < 0) labelTop = r.top + labelGap;
          label.style.left = `${Math.max(0, r.left)}px`;
          label.style.top = `${labelTop}px`;
        }
      }
      rafId = requestAnimationFrame(position);
    }

    rafId = requestAnimationFrame(position);
    return () => cancelAnimationFrame(rafId);
  }, [armed, hoverEl, labelGap]);

  const showBox = enabled && armed && hoverEl !== null;
  // Memoize the summary so unrelated re-renders don't re-run attribute reads /
  // class-filter regexes; it recomputes only when the hovered element changes.
  const labelText = useMemo(
    () => (showBox && hoverEl ? getLabelText(hoverEl) : ''),
    [getLabelText, hoverEl, showBox],
  );
  const rect = showBox && hoverEl ? hoverEl.getBoundingClientRect() : null;

  return (
    <>
      {/*
        Persistent, always-mounted live region. Screen readers reliably announce
        a live region only when it already exists in the DOM and its text then
        changes — a region inserted already-populated is frequently NOT announced.
      */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'fixed',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {ariaLiveMessage ?? ''}
      </div>
      {showBox && rect && (
        <>
          <div
            ref={boxRef}
            className={classes.box}
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              zIndex,
              pointerEvents: 'none',
            }}
          />
          <div
            ref={labelRef}
            className={classes.label}
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              zIndex,
              pointerEvents: 'none',
            }}
          >
            <span className={classes.labelName}>{labelText}</span>
            <span className={classes.labelSize}>
              {Math.round(rect.width)} × {Math.round(rect.height)}
            </span>
          </div>
        </>
      )}
    </>
  );
}
