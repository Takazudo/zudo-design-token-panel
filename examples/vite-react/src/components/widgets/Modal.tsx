/**
 * Modal — button-triggered native <dialog> with open/close animation.
 *
 * DEMO-GRADE ONLY. This component deliberately omits:
 *   - Focus trap / tabindex cycling
 *   - Scroll lock
 *   - ARIA live-region announcements
 *   - Focus restoration on close
 *
 * Token consumption:
 *   .vr-button           → trigger button
 *   .vr-modal            → dialog panel (animation + backdrop defined in
 *                          components.css via [open], @starting-style, ::backdrop)
 *   .vr-modal__header    → flex row: title + close button
 *   .vr-modal__close     → close ✕ button
 *   .vr-section-title    → modal title text
 *   .vr-body / .vr-helper → content paragraphs
 *
 * Open/close animation uses --vr-easing-modal; defined in components.css because
 * @starting-style and ::backdrop cannot be expressed as inline styles.
 */

import { useEffect, useRef, useState } from 'react';

export function Modal() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
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
        className="vr-button is-primary"
        onClick={() => setIsOpen(true)}
      >
        Open Modal
      </button>

      {/* reason: dialog uses showModal() which hoists to the top layer —
          unaffected by any ancestor's inert or z-index */}
      <dialog ref={dialogRef} className="vr-modal">
        <div className="vr-modal__header">
          <div role="heading" aria-level={3} className="vr-section-title" style={{ margin: 0 }}>
            Modal Dialog
          </div>
          <button
            type="button"
            className="vr-modal__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="vr-body" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
          This modal opens via button click and closes via the close button or{' '}
          <kbd>Escape</kbd>.
        </div>
        <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-md)' }}>
          Open/close animation uses{' '}
          <code>easing-modal</code> → <code>--vr-easing-modal</code>. Backdrop
          uses <code>color-mix(in srgb, var(--vr-bg) 80%, transparent)</code>{' '}
          (reason: no overlay token in this wave).
        </div>
        <div>
          <button
            type="button"
            className="vr-button is-primary"
            onClick={() => setIsOpen(false)}
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
