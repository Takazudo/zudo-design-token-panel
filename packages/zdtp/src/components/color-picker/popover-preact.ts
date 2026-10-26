import { useEffect, useRef } from 'preact/hooks';
import { bindPopoverClose } from './popover';

/** Preact adapter over `bindPopoverClose`, until its callers are ported (#1075). */
export function usePopoverClose(
  containerRef: { readonly current: HTMLElement | null },
  onClose: () => void,
  anchorRef?: { readonly current: HTMLElement | null },
): void {
  // Stable ref so effect deps don't change on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // containerRef / anchorRef are stable objects — their .current changes but
  // the ref identity does not. Omit from deps intentionally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => bindPopoverClose(containerRef, () => onCloseRef.current(), anchorRef), []);
}
