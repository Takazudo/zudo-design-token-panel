/**
 * InspectorOverlay — the interactive heart of Element Path Copy.
 *
 * Behaviour (only while the feature is `enabled`):
 *   1. Holding **Alt** arms the inspector via the shared AltClickPicker
 *      primitive. While Alt is down, the element under the cursor is resolved
 *      via `document.elementFromPoint` (panel surfaces excluded) and drawn with
 *      a DevTools-style box + attached label tag (`tag#id.class  W × H`).
 *   2. **Clicking** while armed copies the annotated path block for that element
 *      to the clipboard (the click is swallowed so host links/handlers don't
 *      fire) and shows a transient top-center toast.
 *
 * Rendering follows the highlight-overlay convention inside AltClickPicker: the
 * box + label positions are written imperatively from a RAF loop (so they track
 * scroll/reflow without a Preact re-render per frame).
 *
 * Self-contained — does NOT own its portal mount; the orchestrator decides where
 * in the DOM this renders.
 */

import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { JSX } from 'preact';
import { buildSummary, buildElementPathString } from './build-element-path';
import { copyToClipboard } from '../utils/copy-to-clipboard';
import { ElementPathToast } from './element-path-toast';
import { AltClickPicker, type AltClickPickerClassNames } from '../picker';
import { Z } from '../styles/z-index-tokens';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Auto-dismiss delay for the copy toast (ms). */
const TOAST_DURATION = 2200;

const ELEMENT_PATH_PICKER_FEATURE_ID = 'element-path';

const ELEMENT_PATH_PICKER_CLASS_NAMES: AltClickPickerClassNames = {
  box: 'tokenpanel-elpath-box',
  label: 'tokenpanel-elpath-label',
  labelName: 'tokenpanel-elpath-label-name',
  labelSize: 'tokenpanel-elpath-label-size',
  inspectingRoot: 'tokenpanel-elpath-inspecting',
};

// ---------------------------------------------------------------------------
// Props / toast state
// ---------------------------------------------------------------------------

export interface InspectorOverlayProps {
  /** Whether inspect mode is enabled. When false the overlay is fully inert. */
  enabled: boolean;
  /** Called when another real picker feature takes coordinator ownership. */
  onArmingRevoked?: () => void;
}

interface ToastState {
  message: string;
  ok: boolean;
  /** Monotonic key so re-copying the same element restarts the dismiss timer/animation. */
  key: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectorOverlay({
  enabled,
  onArmingRevoked,
}: InspectorOverlayProps): JSX.Element | null {
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastKeyRef = useRef(0);

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

  return (
    <>
      <AltClickPicker
        enabled={enabled}
        featureId={ELEMENT_PATH_PICKER_FEATURE_ID}
        onElementPicked={copyPathFor}
        onArmingRevoked={onArmingRevoked}
        claimArmingOnEnable
        getLabelText={buildSummary}
        ariaLiveMessage={toast?.message ?? ''}
        classNames={ELEMENT_PATH_PICKER_CLASS_NAMES}
        zIndex={Z.inspectorBox}
      />
      {toast && (
        <ElementPathToast key={toast.key} message={toast.message} ok={toast.ok} />
      )}
    </>
  );
}
