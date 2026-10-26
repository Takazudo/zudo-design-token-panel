/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, signal, type Ref } from '@takazudo/zfb/zudo-react';
import { createDialogBackdropClose } from '../../controls/use-dialog-backdrop-close';
import {
  getPanelConfig,
  modalClass,
  type PanelConfig,
} from '../../config/panel-config';
import { ensureDomTweakerStyles } from './style-injection';
import { read, type Reactive } from '../../zr/live';

export interface DiffExportModalProps {
  diffText: string;
  onClose: () => void;
  onCopy?: (text: string) => void | Promise<void>;
  onResetAll: () => void;
  instanceConfig?: PanelConfig;
}

export type DiffExportModalStaticKeys = 'onClose' | 'onCopy' | 'onResetAll' | 'instanceConfig';

const COPY_REVERT_MS = 2000;

function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    handler();
  };
}

export function DiffExportModal(props: Reactive<DiffExportModalProps, DiffExportModalStaticKeys>) {
  const { onClose, onCopy, onResetAll } = props;
  const cfg = props.instanceConfig ?? getPanelConfig();
  const diffText = computed(() => read(props.diffText));
  const dialogRef: Ref<HTMLDialogElement> = { current: null };
  const copyButtonRef: Ref<HTMLDivElement> = { current: null };
  const textareaRef: Ref<HTMLTextAreaElement> = { current: null };
  let copyTimer: ReturnType<typeof setTimeout> | null = null;
  let closeNotified = false;
  const copyLabel = signal('Copy');

  function notifyClose(): void {
    if (closeNotified) return;
    closeNotified = true;
    onClose();
  }

  function closeDialog(): void {
    dialogRef.current?.close();
    notifyClose();
  }

  const scope = getScope();
  scope.onActivate(() => {
    ensureDomTweakerStyles();
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (textareaRef.current) textareaRef.current.value = diffText.value;
    dialog.addEventListener('close', notifyClose);
    dialog.showModal();
    window.requestAnimationFrame(() => copyButtonRef.current?.focus());
    return () => {
      dialog.removeEventListener('close', notifyClose);
      if (copyTimer) clearTimeout(copyTimer);
      if (dialog.open) dialog.close();
    };
  });
  scope.effect(() => {
    const text = diffText.value;
    if (textareaRef.current && textareaRef.current.value !== text) textareaRef.current.value = text;
  });

  const backdrop = createDialogBackdropClose(dialogRef, closeDialog);

  async function handleCopy(): Promise<void> {
    let ok = false;
    try {
      if (onCopy) {
        await onCopy(diffText.value);
      } else {
        await navigator.clipboard.writeText(diffText.value);
      }
      ok = true;
    } catch {
      ok = false;
    }

    if (scope.abortSignal.aborted) return;
    copyLabel.value = ok ? 'Copied!' : 'Failed';
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyLabel.value = 'Copy';
    }, COPY_REVERT_MS);
  }

  const titleId = `${cfg.modalClassPrefix}-domtweaker-diff-title`;

  return (
    <dialog
      ref={dialogRef}
      on:mousedown={backdrop.onMouseDown}
      on:click={backdrop.onClick}
      aria-labelledby={titleId}
      class={`${modalClass(cfg, '')} ${modalClass(cfg, '--domtweaker-diff')}`}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="dom-tweaker-diff"
    >
      <div id={titleId} role="heading" aria-level={2} class={modalClass(cfg, '__title')}>
        DOM Tweaker diff
      </div>

      <div class={modalClass(cfg, '__hint')}>
        Copy this className diff for an AI handoff, or reset the current page-load
        session.
      </div>

      <textarea
        ref={textareaRef}
        class="tokenpanel-domtweaker-diff-textarea"
        readonly
        spellcheck="false"
        aria-label="DOM Tweaker session diff"
      />

      <div class={modalClass(cfg, '__actions')}>
        <div
          ref={copyButtonRef}
          role="button"
          tabindex={0}
          on:click={() => void handleCopy()}
          on:keydown={onActivateKey(() => void handleCopy())}
          class={`${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`}
        >
          {copyLabel}
        </div>
        <div
          role="button"
          tabindex={0}
          on:click={onResetAll}
          on:keydown={onActivateKey(onResetAll)}
          class={modalClass(cfg, '__button')}
        >
          Reset all
        </div>
        <div
          role="button"
          tabindex={0}
          on:click={closeDialog}
          on:keydown={onActivateKey(closeDialog)}
          class={modalClass(cfg, '__button')}
        >
          Close
        </div>
      </div>
    </dialog>
  );
}
