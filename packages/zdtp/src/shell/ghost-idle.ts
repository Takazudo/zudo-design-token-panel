import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

/** Time the pointer must stay outside the shell before it becomes translucent. */
export const GHOST_IDLE_DELAY_MS = 700;

/** Class applied to a shell that is currently ghosted. */
export const GHOST_IDLE_CLASS = 'is-ghosted';

/** The opacity used by the panel CSS while the shell is ghosted. */
export const GHOST_IDLE_OPACITY = 0.35;

/** Per-panel persisted preference key. */
export function storageKey_ghostIdle(storagePrefix: string): string {
  return `${storagePrefix}-ghost`;
}

/** Read the persisted ghost-when-idle preference, defaulting to off. */
export function loadGhostIdle(storagePrefix: string): boolean {
  try {
    return globalThis.localStorage.getItem(storageKey_ghostIdle(storagePrefix)) === '1';
  } catch {
    return false;
  }
}

/** Persist the ghost-when-idle preference without making storage mandatory. */
export function saveGhostIdle(storagePrefix: string, enabled: boolean): void {
  try {
    globalThis.localStorage.setItem(
      storageKey_ghostIdle(storagePrefix),
      enabled ? '1' : '0',
    );
  } catch {
    /* Storage can be unavailable in privacy-restricted hosts. */
  }
}

/**
 * Install ghost-when-idle behavior on a shell element.
 *
 * The shell is deliberately observed from the document as well as with
 * pointerenter/leave listeners. A pointer can enter the host page before it
 * ever enters the fixed panel, so a document-level pointermove is needed to
 * start the idle timer reliably. Focus-within and layer activity always win:
 * an open popover/modal must never become translucent underneath the user's
 * keyboard focus.
 */
export function useGhostIdle<T extends HTMLElement>(
  targetRef: RefObject<T>,
  enabled: boolean,
  layerActive: boolean,
  delayMs = GHOST_IDLE_DELAY_MS,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const pointerOutsideRef = useRef(true);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || !enabled) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      target?.classList.remove(GHOST_IDLE_CLASS);
      return;
    }

    const ownerWindow = target.ownerDocument.defaultView;
    const ownerDocument = target.ownerDocument;

    // When a shell is mounted beneath an already-positioned pointer, no
    // pointerenter event is guaranteed to fire. Use the browser's current
    // hover state as the initial source of truth, then let pointer events keep
    // it current.
    try {
      pointerOutsideRef.current = !target.matches(':hover');
    } catch {
      pointerOutsideRef.current = true;
    }

    const clearTimer = () => {
      if (timerRef.current === null) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const clearGhost = () => {
      clearTimer();
      target.classList.remove(GHOST_IDLE_CLASS);
    };

    const hasFocusWithin = () => {
      const activeElement = ownerDocument.activeElement;
      return activeElement !== null && target.contains(activeElement);
    };

    const schedule = () => {
      clearTimer();
      if (layerActive || !pointerOutsideRef.current || hasFocusWithin()) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (
          layerActive ||
          !pointerOutsideRef.current ||
          hasFocusWithin()
        ) {
          return;
        }
        target.classList.add(GHOST_IDLE_CLASS);
      }, delayMs);
    };

    const onPointerMove = (event: PointerEvent) => {
      const inside = event.target instanceof Node && target.contains(event.target);
      pointerOutsideRef.current = !inside;
      if (inside) clearGhost();
      else schedule();
    };
    const onPointerEnter = () => {
      pointerOutsideRef.current = false;
      clearGhost();
    };
    const onPointerLeave = () => {
      pointerOutsideRef.current = true;
      schedule();
    };
    const onFocusIn = () => {
      clearGhost();
    };
    const onFocusOut = () => {
      if (focusFrameRef.current !== null && ownerWindow) {
        ownerWindow.cancelAnimationFrame(focusFrameRef.current);
      }
      if (!ownerWindow) {
        schedule();
        return;
      }
      focusFrameRef.current = ownerWindow.requestAnimationFrame(() => {
        focusFrameRef.current = null;
        if (!hasFocusWithin()) schedule();
      });
    };

    // Capture so a host widget that stops pointer bubbling cannot strand the
    // shell in its previous idle state.
    ownerDocument.addEventListener('pointermove', onPointerMove, true);
    target.addEventListener('pointerenter', onPointerEnter);
    target.addEventListener('pointerleave', onPointerLeave);
    target.addEventListener('focusin', onFocusIn);
    target.addEventListener('focusout', onFocusOut);

    // A shell can mount while the pointer is already on the host page. Start
    // from the safe, outside state and let the normal focus guard decide if a
    // keyboard user is currently interacting with the panel.
    schedule();

    return () => {
      ownerDocument.removeEventListener('pointermove', onPointerMove, true);
      target.removeEventListener('pointerenter', onPointerEnter);
      target.removeEventListener('pointerleave', onPointerLeave);
      target.removeEventListener('focusin', onFocusIn);
      target.removeEventListener('focusout', onFocusOut);
      clearTimer();
      if (focusFrameRef.current !== null && ownerWindow) {
        ownerWindow.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
      target.classList.remove(GHOST_IDLE_CLASS);
    };
  }, [delayMs, enabled, layerActive, targetRef]);
}
