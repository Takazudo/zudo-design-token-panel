import { useEffect, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { Z } from '../styles/z-index-tokens';
import { buildSummary } from '../element-path/build-element-path';

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
 * no Preact render is needed for every scroll frame.
 */
function PinnedOverlay({ element, onDetached }: PinnedOverlayProps): JSX.Element | null {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef(element);
  elementRef.current = element;

  useEffect(() => {
    let rafId = 0;
    function position() {
      const target = elementRef.current;
      const box = boxRef.current;
      if (!target || !box) return;
      if (!target.isConnected) {
        // The overlay CSS intentionally uses `!important` for its defensive
        // display reset, so hide with the same priority before the state
        // update unmounts this marker.
        box.style.setProperty('display', 'none', 'important');
        labelRef.current?.style.setProperty('display', 'none', 'important');
        onDetached?.();
        return;
      }
      const rect = target.getBoundingClientRect();
      box.style.removeProperty('display');
      box.style.top = `${rect.top}px`;
      box.style.left = `${rect.left}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;

      const label = labelRef.current;
      if (label) {
        label.style.removeProperty('display');
        const labelTop = rect.top - label.offsetHeight - 2 < 0
          ? rect.top + 2
          : rect.top - label.offsetHeight - 2;
        label.style.left = `${Math.max(0, rect.left)}px`;
        label.style.top = `${labelTop}px`;
      }
      rafId = requestAnimationFrame(position);
    }
    rafId = requestAnimationFrame(position);
    return () => cancelAnimationFrame(rafId);
  }, [onDetached]);

  let rect: DOMRect;
  try {
    rect = element.getBoundingClientRect();
  } catch {
    return null;
  }

  return (
    <>
      <div
        ref={boxRef}
        className={`${ELEMENT_INSPECT_PICKER_CLASS_NAMES.box} is-pinned`}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          zIndex: Z.inspectorBox,
          pointerEvents: 'none',
        }}
      />
      <div
        ref={labelRef}
        className={`${ELEMENT_INSPECT_PICKER_CLASS_NAMES.label} is-pinned`}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${Math.max(0, rect.left)}px`,
          zIndex: Z.inspectorBox,
          pointerEvents: 'none',
        }}
      >
        <span className={ELEMENT_INSPECT_PICKER_CLASS_NAMES.labelName}>{buildSummary(element)}</span>
        <span className={ELEMENT_INSPECT_PICKER_CLASS_NAMES.labelSize}>
          {Math.round(rect.width)} × {Math.round(rect.height)}
        </span>
      </div>
    </>
  );
}

export interface ElementInspectOverlayProps {
  pinned: Element | null;
  onPinnedDetached?: () => void;
}

export function ElementInspectOverlay({
  pinned,
  onPinnedDetached,
}: ElementInspectOverlayProps): JSX.Element | null {
  if (!pinned) return null;
  return <PinnedOverlay element={pinned} onDetached={onPinnedDetached} />;
}
