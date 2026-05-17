/**
 * ModalDemo — button-triggered native <dialog> with open/close animation.
 *
 * DEMO-GRADE ONLY. Omits focus trap, scroll lock, ARIA live-region, focus
 * restoration. Uses `inert` on <main> to block background interaction while
 * the dialog is open. showModal() hoists the element to the top layer so it
 * is NOT affected by <main inert>.
 *
 * Token consumption:
 *   astro-button.is-primary → trigger button
 *   astro-modal             → dialog panel (bg-surface, border, radius, padding)
 *   astro-section-title     → modal heading
 *   astro-body              → body text
 *   astro-helper            → muted subtext
 *
 * Backdrop:
 *   color-mix(in srgb, var(--astro-bg) 80%, transparent)
 *   reason: no overlay token available; backdrop is a component-local decision
 *
 * Open/close animation:
 *   Uses --astro-easing-modal via a scoped <style> block.
 *   reason: @starting-style + transition on <dialog> and ::backdrop cannot be
 *   expressed as component-class selectors
 */

import { useEffect, useRef, useState } from 'preact/hooks';

export function ModalDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const mainEl = document.querySelector('main');

    if (isOpen) {
      dialog.showModal();
      if (mainEl) (mainEl as HTMLElement & { inert: boolean }).inert = true;
    } else {
      dialog.close();
      if (mainEl) (mainEl as HTMLElement & { inert: boolean }).inert = false;
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function onCancel(e: Event) {
      e.preventDefault();
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
        cannot be targeted with component-vocabulary classes or inline styles
      */}
      <style>{`
        .astro-modal-demo {
          opacity: 0;
          transform: scale(0.95);
          transition:
            opacity 0.2s var(--astro-easing-modal),
            transform 0.2s var(--astro-easing-modal),
            display 0.2s allow-discrete,
            overlay 0.2s allow-discrete;
        }
        .astro-modal-demo[open] {
          opacity: 1;
          transform: scale(1);
        }
        @starting-style {
          .astro-modal-demo[open] {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        .astro-modal-demo::backdrop {
          background: color-mix(in srgb, var(--astro-bg) 80%, transparent);
          transition:
            background 0.2s var(--astro-easing-modal),
            display 0.2s allow-discrete,
            overlay 0.2s allow-discrete;
        }
      `}</style>

      <div
        role="button"
        tabIndex={0}
        class="astro-button is-primary"
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        Open Modal
      </div>

      {/* reason: dialog lives outside <main> in DOM order so inert on main
          does not block the dialog; showModal() moves it to the top layer */}
      <dialog ref={dialogRef} class="astro-modal astro-modal-demo">
        <div style="display:flex;flex-direction:column;gap:var(--astro-vsp-md)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="astro-section-title">Modal Dialog</div>
            <div
              role="button"
              tabIndex={0}
              class="astro-helper"
              style="cursor:pointer;padding:var(--astro-vsp-xs) var(--astro-hsp-xs)"
              onClick={() => setIsOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
              aria-label="Close modal"
            >
              &#10005;
            </div>
          </div>
          <div class="astro-body">
            This modal opens via button click and closes via the close button or{' '}
            <kbd>Escape</kbd>.
          </div>
          <div class="astro-helper">
            Open/close animation uses <code>easing-modal</code> &#x2192;{' '}
            <code>--astro-easing-modal</code>. Backdrop uses{' '}
            <code>color-mix(in srgb, var(--astro-bg) 80%, transparent)</code>{' '}
            (reason: no overlay token available).
          </div>
          <div>
            <div
              role="button"
              tabIndex={0}
              class="astro-button is-primary"
              onClick={() => setIsOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
            >
              Close
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
