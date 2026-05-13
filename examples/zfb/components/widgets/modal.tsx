"use client";

/**
 * ModalDemo — button-triggered native <dialog> with open/close animation.
 *
 * Plain CSS mirror of zfb-tailwind/components/widgets/modal.tsx.
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
 * Token consumption (via global.css .zfb-modal* classes):
 *   .zfb-modal__trigger → color-primary (bg), bg (text), spacing-sm, radius
 *   .zfb-modal          → color-surface (bg), fg (text), spacing-lg (padding), radius
 *                                easing-modal (open/close transition)
 *   .zfb-modal::backdrop → color-mix overlay (G4 row 6)
 *
 * Open/close animation rules live in global.css — no scoped <style> needed.
 */

import { useEffect, useRef } from 'preact/hooks';
import { useState } from 'preact/hooks';
import { Island, type IslandProps } from '@takazudo/zfb';

function ModalInner() {
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
        class="zfb-modal__trigger"
        onClick={() => setIsOpen(true)}
      >
        Open Modal
      </button>

      {/* reason: dialog lives outside <main> in DOM order so inert on main
          does not block the dialog; showModal() moves it to the top layer */}
      <dialog ref={dialogRef} class="zfb-modal">
        <div class="zfb-modal__panel-inner">
          <div class="zfb-modal__header">
            <h2 class="zfb-section-h3">Modal Dialog</h2>
            <button
              type="button"
              class="zfb-modal__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          <p class="zfb-body-text">
            This modal opens via button click and closes via the close button or{' '}
            <kbd>Escape</kbd>.
          </p>
          <p class="zfb-muted-text">
            Open/close animation uses{' '}
            <code>easing-modal</code> →{' '}
            <code>--zfb-easing-modal</code>. Backdrop uses{' '}
            <code>color-mix(in oklch, var(--zfb-bg) 80%, transparent)</code>{' '}
            (reason: no overlay token in this wave).
          </p>
          <div>
            <button
              type="button"
              class="zfb-modal__trigger"
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

export function ModalDemo() {
  return (
    <Island when="visible" ssrFallback={null}>
      {(<ModalInner />) as unknown as IslandProps['children']}
    </Island>
  );
}
