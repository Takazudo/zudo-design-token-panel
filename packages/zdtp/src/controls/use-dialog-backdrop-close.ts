/**
 * useDialogBackdropClose — gesture-aware backdrop dismissal for native
 * `<dialog>` modals (#446, finding F14).
 *
 * The naive backdrop check tests only the *click* coordinates against the
 * dialog rect: `if (clientX < rect.left || ...) dialog.close()`. That misfires
 * on a text-selection drag — when the user presses inside a selectable region
 * (the export JSON block, the import textarea, the apply preview) and releases
 * on the backdrop, Chrome synthesizes the `click` on the common ancestor (the
 * `<dialog>` itself) using the mouseup coordinates, which land outside the rect.
 * The modal then closes and the user's unsaved input (e.g. pasted JSON) is lost.
 *
 * The fix tracks where the gesture STARTED. A backdrop dismissal fires only when
 * BOTH the mousedown and the click landed outside the dialog's content rect, so
 * a drag that began inside the dialog never dismisses it.
 *
 * Each call keeps its own mousedown origin, so the state is per modal instance.
 */

import { useMemo } from 'preact/compat';
import type { JSX } from 'preact';

function isOutsideRect(rect: DOMRect, x: number, y: number): boolean {
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}

/**
 * Framework-free core: returns mousedown/click listeners for a `<dialog>`.
 * The zudo-react modals bind these as `on:mousedown` / `on:click`.
 *
 * @param dialogRef  ref to the `<dialog>` element.
 * @param onBackdrop invoked for a genuine backdrop dismissal (a press+release
 *                   that both land outside the dialog's content rect).
 */
export function createDialogBackdropClose(
  dialogRef: { current: HTMLDialogElement | null },
  onBackdrop: () => void,
): { onMouseDown: (e: MouseEvent) => void; onClick: (e: MouseEvent) => void } {
  // True when the current gesture's mousedown landed inside the dialog's
  // content rect. Such a gesture is a drag/selection and must never dismiss.
  let startedInside = false;

  return {
    onMouseDown(e) {
      const dialog = dialogRef.current;
      if (!dialog) {
        startedInside = false;
        return;
      }
      const rect = dialog.getBoundingClientRect();
      startedInside = !isOutsideRect(rect, e.clientX, e.clientY);
    },
    onClick(e) {
      const began = startedInside;
      startedInside = false;
      const dialog = dialogRef.current;
      if (!dialog) return;
      // Gesture began inside the dialog (text selection etc.) — never dismiss,
      // regardless of where it ended.
      if (began) return;
      const rect = dialog.getBoundingClientRect();
      if (isOutsideRect(rect, e.clientX, e.clientY)) onBackdrop();
    },
  };
}

export interface DialogBackdropHandlers {
  onMouseDown: (e: JSX.TargetedMouseEvent<HTMLDialogElement>) => void;
  onClick: (e: JSX.TargetedMouseEvent<HTMLDialogElement>) => void;
}

/** Preact adapter over `createDialogBackdropClose`. */
export function useDialogBackdropClose(
  dialogRef: { current: HTMLDialogElement | null },
  onBackdrop: () => void,
): DialogBackdropHandlers {
  const latest = useMemo(() => ({ onBackdrop }), []);
  latest.onBackdrop = onBackdrop;
  return useMemo(
    () => createDialogBackdropClose(dialogRef, () => latest.onBackdrop()),
    [dialogRef, latest],
  );
}
