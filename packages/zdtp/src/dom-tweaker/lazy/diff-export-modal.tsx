import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { useDialogBackdropClose } from '../../controls/use-dialog-backdrop-close';
import {
  getPanelConfig,
  modalClass,
  type PanelConfig,
} from '../../config/panel-config';
import { ensureDomTweakerStyles } from './style-injection';

export interface DiffExportModalProps {
  diffText: string;
  onClose: () => void;
  onCopy?: (text: string) => void | Promise<void>;
  onResetAll: () => void;
  instanceConfig?: PanelConfig;
}

const COPY_REVERT_MS = 2000;

export function DiffExportModal({
  diffText,
  onClose,
  onCopy,
  onResetAll,
  instanceConfig,
}: DiffExportModalProps): JSX.Element {
  const cfg = instanceConfig ?? getPanelConfig();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const copyButtonRef = useRef<HTMLDivElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeNotifiedRef = useRef(false);
  const [copyLabel, setCopyLabel] = useState('Copy');

  useEffect(() => {
    ensureDomTweakerStyles();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    window.requestAnimationFrame(() => copyButtonRef.current?.focus());
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function handleClose(): void {
      notifyClose();
    }
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  function notifyClose(): void {
    if (closeNotifiedRef.current) return;
    closeNotifiedRef.current = true;
    onClose();
  }

  function closeDialog(): void {
    dialogRef.current?.close();
    notifyClose();
  }

  const backdropHandlers = useDialogBackdropClose(dialogRef, closeDialog);

  async function handleCopy(): Promise<void> {
    let ok = false;
    try {
      if (onCopy) {
        await onCopy(diffText);
      } else {
        await navigator.clipboard.writeText(diffText);
      }
      ok = true;
    } catch {
      ok = false;
    }

    setCopyLabel(ok ? 'Copied!' : 'Failed');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyLabel('Copy'), COPY_REVERT_MS);
  }

  function handleButtonKeyDown(e: KeyboardEvent, fn: () => void): void {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    fn();
  }

  const titleId = `${cfg.modalClassPrefix}-domtweaker-diff-title`;

  return (
    <dialog
      ref={dialogRef}
      onMouseDown={backdropHandlers.onMouseDown}
      onClick={backdropHandlers.onClick}
      aria-labelledby={titleId}
      className={`${modalClass(cfg, '')} ${modalClass(cfg, '--domtweaker-diff')}`}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="dom-tweaker-diff"
    >
      <div id={titleId} role="heading" aria-level={2} className={modalClass(cfg, '__title')}>
        DOM Tweaker diff
      </div>

      <div className={modalClass(cfg, '__hint')}>
        Copy this className diff for an AI handoff, or reset the current page-load
        session.
      </div>

      <textarea
        className="tokenpanel-domtweaker-diff-textarea"
        readOnly
        spellcheck={false}
        value={diffText}
        aria-label="DOM Tweaker session diff"
      />

      <div className={modalClass(cfg, '__actions')}>
        <div
          ref={copyButtonRef}
          role="button"
          tabIndex={0}
          onClick={() => void handleCopy()}
          onKeyDown={(e) => handleButtonKeyDown(e, () => void handleCopy())}
          className={`${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`}
        >
          {copyLabel}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={onResetAll}
          onKeyDown={(e) => handleButtonKeyDown(e, onResetAll)}
          className={modalClass(cfg, '__button')}
        >
          Reset all
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={closeDialog}
          onKeyDown={(e) =>
            handleButtonKeyDown(e, closeDialog)
          }
          className={modalClass(cfg, '__button')}
        >
          Close
        </div>
      </div>
    </dialog>
  );
}
