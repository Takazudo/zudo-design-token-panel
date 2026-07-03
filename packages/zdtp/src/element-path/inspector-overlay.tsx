/**
 * InspectorOverlay — the interactive heart of Element Path Copy.
 *
 * Behaviour (only while the feature is `enabled`):
 *   1. Holding **Alt** arms the inspector. While Alt is down, the element under
 *      the cursor is resolved via `document.elementFromPoint` (panel surfaces
 *      excluded) and drawn with a DevTools-style box + an attached label tag
 *      (`tag#id.class  W × H`) on its top-left edge.
 *   2. **Clicking** while armed copies the annotated path block for that element
 *      to the clipboard (the click is swallowed so host links/handlers don't
 *      fire) and shows a transient top-center toast.
 *
 * Rendering follows the highlight-overlay convention: the box + label positions
 * are written imperatively from a RAF loop (so they track scroll/reflow without
 * a Preact re-render per frame). Preact only re-renders when the hovered element
 * or armed/toast state changes.
 *
 * Self-contained — does NOT own its portal mount; the orchestrator decides where
 * in the DOM this renders.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import type { JSX } from 'preact';
import { PANEL_EXCLUSION_SELECTOR } from '../highlight/find-elements';
import { buildSummary, buildElementPathString } from './build-element-path';
import { copyToClipboard } from '../utils/copy-to-clipboard';
import { ElementPathToast } from './element-path-toast';
import { Z } from '../styles/z-index-tokens';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOX_Z_INDEX = Z.inspectorBox;
/** Auto-dismiss delay for the copy toast (ms). */
const TOAST_DURATION = 2200;
/** Gap between the element box and its label tag (px). */
const LABEL_GAP = 2;

// ---------------------------------------------------------------------------
// Props / toast state
// ---------------------------------------------------------------------------

export interface InspectorOverlayProps {
  /** Whether inspect mode is enabled. When false the overlay is fully inert. */
  enabled: boolean;
}

interface ToastState {
  message: string;
  ok: boolean;
  /** Monotonic key so re-copying the same element restarts the dismiss timer/animation. */
  key: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True when `el` is part of the panel's own UI (shell, modals, portal mounts). */
function isPanelElement(el: Element): boolean {
  try {
    return el.closest(PANEL_EXCLUSION_SELECTOR) !== null;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectorOverlay({ enabled }: InspectorOverlayProps): JSX.Element | null {
  const [armed, setArmed] = useState(false);
  const [hoverEl, setHoverEl] = useState<Element | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Refs mirroring state for use inside stable event handlers / the RAF loop.
  const armedRef = useRef(false);
  armedRef.current = armed;
  const hoverElRef = useRef<Element | null>(null);
  hoverElRef.current = hoverEl;

  const boxRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastKeyRef = useRef(0);
  // Last known pointer position so pressing Alt highlights the element already
  // under the cursor immediately (no need to nudge the mouse first).
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  // -------------------------------------------------------------------------
  // Copy handler
  // -------------------------------------------------------------------------

  const copyPathFor = useCallback(async (el: Element) => {
    const text = buildElementPathString(el);
    const ok = await copyToClipboard(text);
    toastKeyRef.current += 1;
    setToast({
      message: ok ? `Copied path: ${buildSummary(el)}` : 'Copy failed — clipboard unavailable',
      ok,
      key: toastKeyRef.current,
    });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  // -------------------------------------------------------------------------
  // Reset everything when the feature is disabled.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (enabled) return;
    setArmed(false);
    setHoverEl(null);
  }, [enabled]);

  // -------------------------------------------------------------------------
  // Pointer position + Alt arming (active whenever the feature is enabled).
  //
  // A single always-on mousemove records the cursor position; it only resolves
  // a hovered element while armed. Pressing Alt arms AND resolves the element
  // already under the cursor, so the highlight appears without a mouse nudge.
  // keyup / window-blur release a "stuck" Alt.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!enabled) return;

    function resolveHoverAt(x: number, y: number) {
      const el = document.elementFromPoint(x, y);
      setHoverEl(!el || isPanelElement(el) ? null : el);
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
        setArmed(true);
        const last = lastMouseRef.current;
        if (last) resolveHoverAt(last.x, last.y);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Alt' || !e.altKey) {
        setArmed(false);
        setHoverEl(null);
      }
    }
    function onBlur() {
      setArmed(false);
      setHoverEl(null);
    }

    // mousemove is passive + non-capture: it only records the pointer position
    // (and resolves a hovered element while armed) — it never preventDefault/
    // stopPropagation, so it has no reason to run in the capture phase ahead of
    // host handlers. keydown/keyup stay in capture so Alt arming is observed
    // before host shortcuts.
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);

  // -------------------------------------------------------------------------
  // Click-to-copy (active only while armed). The click + mousedown listeners
  // are in the capture phase so the interaction is intercepted before any host
  // handler (<a> navigation, button onClick, focus, text selection) can run.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!enabled || !armed) return;

    // Suppress mousedown side-effects (focus shift, text selection, drag start)
    // so an inspect-click is purely a copy gesture.
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
      void copyPathFor(el);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled, armed, copyPathFor]);

  // -------------------------------------------------------------------------
  // Crosshair cursor + selection lock while armed. A class on <html> drives a
  // CSS rule (panel.css) so the crosshair wins over host element cursors
  // (links, buttons) — more reliable than setting body.style.cursor.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!enabled || !armed) return;
    const root = document.documentElement;
    root.classList.add('tokenpanel-elpath-inspecting');
    return () => {
      root.classList.remove('tokenpanel-elpath-inspecting');
    };
  }, [enabled, armed]);

  // -------------------------------------------------------------------------
  // Imperative position loop — tracks scroll/reflow without re-rendering.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!armed || !hoverEl) return;
    let rafId = 0;

    // NB: box + label styles are rewritten unconditionally every frame on
    // purpose. The label's vertical position (above the box) differs from the
    // label's JSX inline `top` (the box's own top), so a re-render that fires
    // while hovering (e.g. the copy toast) re-applies the JSX value and would
    // strand the label on the box edge — the unconditional rewrite self-heals
    // that within a frame. (A geometry short-circuit here regressed exactly
    // this; see the element-path review notes.)
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
          let labelTop = r.top - lh - LABEL_GAP;
          if (labelTop < 0) labelTop = r.top + LABEL_GAP;
          label.style.left = `${Math.max(0, r.left)}px`;
          label.style.top = `${labelTop}px`;
        }
      }
      rafId = requestAnimationFrame(position);
    }

    rafId = requestAnimationFrame(position);
    return () => cancelAnimationFrame(rafId);
  }, [armed, hoverEl]);

  // -------------------------------------------------------------------------
  // Clean up the toast timer on unmount.
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const showBox = enabled && armed && hoverEl !== null;
  // Memoize the summary so unrelated re-renders (e.g. a toast appearing) don't
  // re-run buildSummary's attribute reads + class-filter regexes; it recomputes
  // only when the hovered element changes. The rect below stays a live read so
  // the box paints at the right place on the first frame before the RAF loop.
  const labelText = useMemo(
    () => (showBox && hoverEl ? buildSummary(hoverEl) : ''),
    [showBox, hoverEl],
  );
  const rect = showBox && hoverEl ? hoverEl.getBoundingClientRect() : null;

  return (
    <>
      {/*
        Persistent, always-mounted live region. Screen readers reliably announce
        a live region only when it already exists in the DOM and its text then
        changes — a region inserted already-populated is frequently NOT announced
        (JAWS/NVDA/VoiceOver). So the announcer stays mounted and we only swap its
        text; the visual ElementPathToast below is purely presentational.
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
        {toast?.message ?? ''}
      </div>
      {showBox && rect && (
        <>
          <div
            ref={boxRef}
            className="tokenpanel-elpath-box"
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              zIndex: BOX_Z_INDEX,
            }}
          />
          <div
            ref={labelRef}
            className="tokenpanel-elpath-label"
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              zIndex: BOX_Z_INDEX,
            }}
          >
            <span className="tokenpanel-elpath-label-name">{labelText}</span>
            <span className="tokenpanel-elpath-label-size">
              {Math.round(rect.width)} × {Math.round(rect.height)}
            </span>
          </div>
        </>
      )}
      {toast && (
        <ElementPathToast key={toast.key} message={toast.message} ok={toast.ok} />
      )}
    </>
  );
}
