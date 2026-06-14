/**
 * ElementPathToast — transient top-center notification shown after a copy.
 *
 * Rendered inside the Element Path Copy portal (outside `.tokenpanel-shell`), so
 * it carries its own `--tokentweak-*` scope via panel.css. `pointer-events:none`
 * keeps it from intercepting hover while inspect mode is active.
 *
 * Stateless: the parent owns the message lifecycle (auto-dismiss timer). When
 * `message` is null nothing renders.
 */

import type { JSX } from 'preact';

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
      className={ok ? 'tokenpanel-elpath-toast' : 'tokenpanel-elpath-toast is-error'}
      role="status"
      aria-live="polite"
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
  );
}
