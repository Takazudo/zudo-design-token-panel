/**
 * ElementPathToast — transient top-center notification shown after a copy.
 *
 * Self-contained presentation: it owns its own fixed, top-center, full-width
 * `pointer-events:none` container AND the pill, so the inspector overlay just
 * renders `<ElementPathToast>` without wrapping it in positioning markup. The
 * `pointer-events:none` keeps it from intercepting hover while inspect mode is
 * active. Rendered inside the Element Path Copy portal (outside
 * `.tokenpanel-shell`), so it carries its own `--tokentweak-*` scope via panel.css.
 *
 * Stateless: the parent owns the message lifecycle (auto-dismiss timer). When
 * `message` is null nothing renders.
 *
 * Purely visual — it carries no ARIA live-region semantics. InspectorOverlay
 * renders a separate always-mounted visually-hidden live region for screen
 * reader announcements (a region inserted already-populated is often not
 * announced), so duplicating `role="status"` here would be redundant and
 * unreliable. The icon is `aria-hidden` and the text is conveyed by the
 * persistent announcer.
 */

import type { JSX } from 'preact';
import { Z } from '../styles/z-index-tokens';

const TOAST_Z_INDEX = Z.toast;

export interface ElementPathToastProps {
  /** Toast body; null hides the toast. */
  message: string | null;
  /** Whether the copy succeeded — drives the accent colour. */
  ok: boolean;
}

export function ElementPathToast({ message, ok }: ElementPathToastProps): JSX.Element | null {
  if (message === null) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: TOAST_Z_INDEX,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        className={ok ? 'tokenpanel-elpath-toast' : 'tokenpanel-elpath-toast is-error'}
        aria-hidden="true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {ok ? (
            <path d="M20 6 9 17l-5-5" />
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </>
          )}
        </svg>
        <span className="tokenpanel-elpath-toast-text">{message}</span>
      </div>
    </div>
  );
}
