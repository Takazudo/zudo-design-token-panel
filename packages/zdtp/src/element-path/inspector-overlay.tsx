/** @jsxImportSource @takazudo/zfb/zudo-react */
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
 * scroll/reflow without a re-render per frame).
 *
 * Self-contained — does NOT own its portal mount; the orchestrator decides where
 * in the DOM this renders.
 */

import { computed, getScope, signal } from '@takazudo/zfb/zudo-react';
import { buildSummary, buildElementPathString } from './build-element-path';
import { copyToClipboard } from '../utils/copy-to-clipboard';
import { ElementPathToast } from './element-path-toast';
import { AltClickPicker, type AltClickPickerClassNames } from '../picker';
import { Z } from '../styles/z-index-tokens';
import type { Reactive } from '../zr/live';
import { Rebuild } from '../zr/rebuild';

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

export function InspectorOverlay(props: Reactive<InspectorOverlayProps, 'onArmingRevoked'>) {
  const toast = signal<ToastState | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let toastKey = 0;

  const copyPathFor = async (el: Element) => {
    const text = buildElementPathString(el);
    const ok = await copyToClipboard(text);
    toastKey += 1;
    toast.value = {
      message: ok ? `Copied path: ${buildSummary(el)}` : 'Copy failed — clipboard unavailable',
      ok,
      key: toastKey,
    };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.value = null;
    }, TOAST_DURATION);
  };

  getScope().onActivate(() => () => {
    if (toastTimer) clearTimeout(toastTimer);
  });

  return [
    <AltClickPicker
      enabled={props.enabled}
      featureId={ELEMENT_PATH_PICKER_FEATURE_ID}
      onElementPicked={copyPathFor}
      onArmingRevoked={props.onArmingRevoked}
      claimArmingOnEnable
      getLabelText={buildSummary}
      ariaLiveMessage={computed(() => toast.value?.message ?? '')}
      classNames={ELEMENT_PATH_PICKER_CLASS_NAMES}
      zIndex={Z.inspectorBox}
    />,
    <Rebuild value={toast}>
      {(current) => (current ? <ElementPathToast message={current.message} ok={current.ok} /> : null)}
    </Rebuild>,
  ];
}
