'use client';

/**
 * ModalDemo — button-triggered native <dialog> with open/close animation.
 *
 * DEMO-GRADE ONLY. This component deliberately omits:
 *   - Focus trap / tabindex cycling
 *   - Scroll lock
 *   - ARIA live-region announcements
 *   - Focus restoration on close
 * It uses `inert` on the page's <main> element to prevent interaction with
 * background content while open. The native <dialog>.showModal() call
 * hoists the element to the top layer, so it is NOT affected by <main inert>.
 *
 * Token consumption (via frozen nx-* vocabulary):
 *   .nx-button.is-primary → trigger button
 *   .nx-modal             → dialog panel with open/close animation
 *   .nx-modal__header     → title + close button row
 *   .nx-modal__title      → heading text
 *   .nx-modal__close      → close button (×)
 *   .nx-modal__body       → flex-col content wrapper
 *
 * Backdrop and animation rules are in tokens.css (.nx-modal[open], ::backdrop,
 * @starting-style) because inline style cannot target [open] or pseudo-elements.
 */

import { useEffect, useRef, useState } from 'react';

export default function ModalDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const mainEl = document.querySelector('main');

    if (isOpen) {
      dialog.showModal();
      // Apply inert to background content — dialog is in top layer,
      // unaffected by inert on its ancestor.
      if (mainEl) mainEl.inert = true;
    } else {
      dialog.close();
      if (mainEl) mainEl.inert = false;
    }

    // Cleanup: if the component unmounts while still open (route change,
    // hot reload, parent remount), always release inert on <main>. Without
    // this, the next screen renders but stays non-interactive.
    return () => {
      if (mainEl) mainEl.inert = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // Sync state when dialog is closed via native Escape (browser default)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onCancel(e: Event) {
      e.preventDefault(); // prevent native close; we handle it ourselves
      setIsOpen(false);
    }
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, []);

  return (
    <>
      <button
        type="button"
        className="nx-button is-primary"
        onClick={() => setIsOpen(true)}
      >
        Open Modal
      </button>

      {/* reason: dialog lives outside <main> in DOM order so inert on main
          does not block the dialog; showModal() moves it to the top layer */}
      <dialog ref={dialogRef} className="nx-modal">
        <div className="nx-modal__header">
          <div className="nx-modal__title">Modal Dialog</div>
          <button
            type="button"
            className="nx-modal__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
          >
            &#x2715;
          </button>
        </div>
        <div className="nx-modal__body">
          <div className="nx-body">
            This modal opens via button click and closes via the close button or{' '}
            <kbd>Escape</kbd>.
          </div>
          <div className="nx-helper">
            Open/close animation uses <code>easing-modal</code> &#8594;{' '}
            <code>--nx-easing-modal</code>. Backdrop uses{' '}
            <code>color-mix(in srgb, var(--nx-bg) 80%, transparent)</code>.
          </div>
          <div>
            <button
              type="button"
              className="nx-button is-primary"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
