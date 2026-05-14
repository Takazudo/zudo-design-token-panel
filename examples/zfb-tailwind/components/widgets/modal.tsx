"use client";

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
 * Token consumption:
 *   bg-primary text-bg px-hsp-sm py-vsp-sm rounded-md  → trigger button
 *   bg-surface text-fg px-hsp-lg py-vsp-lg rounded-md max-w-[40rem] w-full  → modal panel
 *   max-w-[40rem] → arbitrary; reason: modal width is page-local
 *
 * Backdrop:
 *   color-mix(in srgb, var(--zfbtw-bg) 80%, transparent)
 *   reason: no overlay token in this wave (spec §133.3 exception G4 row 6)
 *
 * Open/close animation:
 *   Uses --zfbtw-easing-modal via a scoped <style> block.
 *   reason: @starting-style + transition on <dialog> cannot be expressed
 *   as a Tailwind utility; inline style cannot target [open] state or
 *   ::backdrop pseudo-element
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
      {/*
        Scoped animation rules for the modal dialog.
        reason: @starting-style, [open] transition, and ::backdrop pseudo-element
        cannot be targeted with inline styles or Tailwind utilities
      */}
      <style>{`
        .widgets-modal {
          opacity: 0;
          transform: scale(0.95);
          transition:
            opacity 0.2s var(--zfbtw-easing-modal),
            transform 0.2s var(--zfbtw-easing-modal),
            display 0.2s allow-discrete,
            overlay 0.2s allow-discrete;
        }
        .widgets-modal[open] {
          opacity: 1;
          transform: scale(1);
        }
        @starting-style {
          .widgets-modal[open] {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        .widgets-modal::backdrop {
          background: color-mix(in srgb, var(--zfbtw-bg) 80%, transparent);
          transition:
            background 0.2s var(--zfbtw-easing-modal),
            display 0.2s allow-discrete,
            overlay 0.2s allow-discrete;
        }
      `}</style>

      <button
        type="button"
        class="bg-primary text-bg px-hsp-sm py-vsp-sm rounded-md border-none cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        Open Modal
      </button>

      {/* reason: dialog lives outside <main> in DOM order so inert on main
          does not block the dialog; showModal() moves it to the top layer */}
      <dialog
        ref={dialogRef}
        class="widgets-modal bg-surface text-fg px-hsp-lg py-vsp-lg rounded-md max-w-[40rem] w-full border border-muted"
      >
        <div class="flex flex-col gap-vsp-md">
          <div class="flex items-center justify-between">
            <h2 class="text-section-title text-fg font-semibold">Modal Dialog</h2>
            <button
              type="button"
              class="text-muted text-body hover:text-fg cursor-pointer border-none bg-transparent px-hsp-xs py-vsp-xs"
              onClick={() => setIsOpen(false)}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          <p class="text-body text-fg">
            This modal opens via button click and closes via the close button or{' '}
            <kbd>Escape</kbd>.
          </p>
          <p class="text-helper text-muted">
            Open/close animation uses{' '}
            <code>easing-modal</code> →{' '}
            <code>--zfbtw-easing-modal</code>. Backdrop uses{' '}
            <code>color-mix(in srgb, var(--zfbtw-bg) 80%, transparent)</code>{' '}
            (reason: no overlay token in this wave).
          </p>
          <div>
            <button
              type="button"
              class="bg-primary text-bg px-hsp-sm py-vsp-sm rounded-md border-none cursor-pointer"
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
