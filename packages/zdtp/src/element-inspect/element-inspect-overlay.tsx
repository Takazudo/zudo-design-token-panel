/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, type Ref } from '@takazudo/zfb/zudo-react';
import { Z } from '../styles/z-index-tokens';
import { buildSummary } from '../element-path/build-element-path';
import { PANEL_EXCLUSION_SELECTOR } from '../highlight/find-elements';
import { AltClickPicker, ELEMENT_INSPECT_PICKER_FEATURE_ID, type AltClickPickerHandle } from '../picker';
import { read, type Reactive } from '../zr/live';
import { Rebuild } from '../zr/rebuild';

/** Body-level mount used by the picker and the pinned inspect marker. */
export { ELEMENT_INSPECT_PORTAL_MOUNT_ID } from '../highlight/find-elements';

/** Class hooks shared by the hover picker and the pinned overlay. */
export const ELEMENT_INSPECT_PICKER_CLASS_NAMES = {
  box: 'tokenpanel-element-inspect-box',
  label: 'tokenpanel-element-inspect-label',
  labelName: 'tokenpanel-element-inspect-label-name',
  labelSize: 'tokenpanel-element-inspect-label-size',
  inspectingRoot: 'tokenpanel-element-inspect-inspecting',
} as const;

interface PinnedOverlayProps {
  element: Element;
  onDetached?: () => void;
}

/**
 * Keep the pinned marker viewport-relative while the host scrolls or reflows.
 * The marker is deliberately imperative, matching AltClickPicker's RAF loop;
 * no render is needed for every scroll frame.
 */
function PinnedOverlay({ element, onDetached }: PinnedOverlayProps) {
  const box: Ref<HTMLDivElement> = { current: null };
  const label: Ref<HTMLDivElement> = { current: null };

  getScope().onActivate(() => {
    let rafId = 0;
    function position() {
      const boxEl = box.current;
      if (!boxEl) return;
      if (!element.isConnected) {
        // The overlay CSS intentionally uses `!important` for its defensive
        // display reset, so hide with the same priority before the state
        // update unmounts this marker.
        boxEl.style.setProperty('display', 'none', 'important');
        label.current?.style.setProperty('display', 'none', 'important');
        onDetached?.();
        return;
      }
      const rect = element.getBoundingClientRect();
      boxEl.style.removeProperty('display');
      boxEl.style.top = `${rect.top}px`;
      boxEl.style.left = `${rect.left}px`;
      boxEl.style.width = `${rect.width}px`;
      boxEl.style.height = `${rect.height}px`;

      const labelEl = label.current;
      if (labelEl) {
        labelEl.style.removeProperty('display');
        const labelTop = rect.top - labelEl.offsetHeight - 2 < 0
          ? rect.top + 2
          : rect.top - labelEl.offsetHeight - 2;
        labelEl.style.left = `${Math.max(0, rect.left)}px`;
        labelEl.style.top = `${labelTop}px`;
      }
      rafId = requestAnimationFrame(position);
    }
    rafId = requestAnimationFrame(position);
    return () => cancelAnimationFrame(rafId);
  });

  let rect: DOMRect;
  try {
    rect = element.getBoundingClientRect();
  } catch {
    return null;
  }

  return [
    <div
      ref={box}
      class={`${ELEMENT_INSPECT_PICKER_CLASS_NAMES.box} is-pinned`}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        'z-index': String(Z.inspectorBox),
        'pointer-events': 'none',
      }}
    />,
    <div
      ref={label}
      class={`${ELEMENT_INSPECT_PICKER_CLASS_NAMES.label} is-pinned`}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${Math.max(0, rect.left)}px`,
        'z-index': String(Z.inspectorBox),
        'pointer-events': 'none',
      }}
    >
      <span class={ELEMENT_INSPECT_PICKER_CLASS_NAMES.labelName}>{buildSummary(element)}</span>
      <span class={ELEMENT_INSPECT_PICKER_CLASS_NAMES.labelSize}>
        {`${Math.round(rect.width)} × ${Math.round(rect.height)}`}
      </span>
    </div>,
  ];
}

export interface ElementInspectOverlayProps {
  pinned: Element | null;
  onPinnedDetached?: () => void;
}

export function ElementInspectOverlay(props: Reactive<ElementInspectOverlayProps, 'onPinnedDetached'>) {
  const pinned = computed(() => read(props.pinned));
  return (
    <Rebuild value={pinned}>
      {(element) => (element
        ? <PinnedOverlay element={element} onDetached={props.onPinnedDetached} />
        : null)}
    </Rebuild>
  );
}

export interface ElementInspectLayerProps {
  armed: boolean;
  pinned: Element | null;
  pickerHandle: { current: AltClickPickerHandle | null };
  onElementPicked: (element: Element) => void;
  onPinnedDetached: () => void;
  onArmingRevoked: () => void;
}

export type ElementInspectLayerStaticKeys =
  | 'pickerHandle'
  | 'onElementPicked'
  | 'onPinnedDetached'
  | 'onArmingRevoked';

/** The hover picker plus the pinned marker, rendered in the inspect portal. */
export function ElementInspectLayer(props: Reactive<ElementInspectLayerProps, ElementInspectLayerStaticKeys>) {
  return [
    <AltClickPicker
      handle={props.pickerHandle}
      enabled={props.armed}
      featureId={ELEMENT_INSPECT_PICKER_FEATURE_ID}
      onElementPicked={props.onElementPicked}
      onArmingRevoked={props.onArmingRevoked}
      classNames={ELEMENT_INSPECT_PICKER_CLASS_NAMES}
      excludeSelector={PANEL_EXCLUSION_SELECTOR}
      getLabelText={buildSummary}
    />,
    <ElementInspectOverlay pinned={props.pinned} onPinnedDetached={props.onPinnedDetached} />,
  ];
}
