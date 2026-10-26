/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * Export modal — renders the current `TweakState` as a design-tokens JSON
 * document (`serialize()` emits `SCHEMA_V2` or opportunistically `SCHEMA_V3`
 * — see `./utils/design-token-serde`; `panelConfig.schemaId` is not read
 * here or anywhere else in this package — it is a UI-label-only field on
 * `PanelConfig` that hosts may read via `getDesignTokenSchema()`, #498) with
 * a diff-only toggle and a copy-to-clipboard button.
 *
 * Ported verbatim from zudo-doc's
 * `src/components/design-token-tweak/export-modal.tsx`. Intentional deltas:
 *  - `serialize` is imported from this package's serde
 *    (`./utils/design-token-serde`).
 *  - `colorSchemes` / `initColorFromSchemeData` come from this package's
 *    config.
 *  - The filename hint is derived from `panelConfig.exportFilenameBase` via
 *    `exportFilename(...)` (default `zudo-design-tokens.json`).
 *  - Modal class names are derived from `panelConfig.modalClassPrefix` via
 *    `modalClass(...)` so a single config swap re-themes every dialog.
 *
 * Modal lifecycle uses the native `<dialog>` element via `showModal()` /
 * `close()`. Every dismissal path (× button, backdrop click, Escape key, the
 * programmatic "Close" button) routes through `dialog.close()` so the native
 * `close` event — and thus `onClose` — fires exactly once per dismissal.
 */

import { computed, getScope, signal } from '@takazudo/zfb/zudo-react';
import { createDialogBackdropClose } from './controls/dialog-backdrop-close';
import { RoleButton } from './controls/role-button';
import { serialize } from './utils/design-token-serde';
import { uniqueId } from './utils/unique-id';
import { read, type Reactive } from './zr/live';
import {
  type ColorTweakState,
  type TweakState,
  initColorFromSchemeData,
} from './state/tweak-state';
import { colorSchemes } from './config/color-schemes';
import {
  exportFilename,
  getPanelConfig,
  modalClass,
  type PanelConfig,
} from './config/panel-config';

export interface ExportModalProps {
  onClose: () => void;
  /** Full unified tweak state — the modal serializes all four categories. */
  state: TweakState;
  /** Color baseline used for diff-only output. Optional: callers without DOM
   *  access (tests) can omit and we'll treat the entire color block as changed. */
  colorDefaults?: ColorTweakState;
  /**
   * The mounted panel instance's config (multi-instance, #357). When supplied,
   * the modal derives its filename hint + modal classes + title id from THIS
   * instance rather than the active default instance. Omitted (e.g. a direct
   * test render) → `getPanelConfig()`, preserving the single-panel path.
   * Read once at mount.
   */
  instanceConfig?: PanelConfig;
}

/** Resolve a color baseline for diff-only serialization. */
function resolveColorDefaults(
  fallback: ColorTweakState,
  explicit?: ColorTweakState,
): ColorTweakState {
  if (explicit) return explicit;
  // No explicit defaults → pick the first scheme so we still produce a
  // sensible baseline shape. This path is only hit in edge cases; the panel
  // always passes explicit defaults.
  const firstScheme = Object.values(colorSchemes)[0];
  if (firstScheme) return initColorFromSchemeData(firstScheme);
  return fallback;
}

export function ExportModal(props: Reactive<ExportModalProps, 'onClose' | 'instanceConfig'>) {
  const copyLabel = signal('Copy');
  const includeDefaults = signal(false);
  const dialogRef: { current: HTMLDialogElement | null } = { current: null };
  const copyButtonRef: { current: HTMLDivElement | null } = { current: null };
  let copyTimer: ReturnType<typeof setTimeout> | null = null;
  // Resolve THIS instance's config (multi-instance, #357); a prop-less test
  // render falls back to the active default instance.
  const cfg = props.instanceConfig ?? getPanelConfig();
  const exportFilenameHint = exportFilename(cfg);

  const code = computed(() => {
    const state = read(props.state);
    const baseline = resolveColorDefaults(state.color, read(props.colorDefaults));
    // Thread THIS instance's config (multi-instance, #361) so the export JSON
    // is built from the mounted panel's OWN tab manifest + color cluster, not
    // the active default instance's.
    const json = serialize(
      state,
      {
        includeDefaults: includeDefaults.value,
        colorDefaults: baseline,
      },
      cfg,
    );
    return JSON.stringify(json, null, 2);
  });

  const scope = getScope();
  scope.onActivate(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => props.onClose();
    dialog.addEventListener('close', handleClose);
    dialog.showModal();
    // Focus the primary action so keyboard users land on the most likely
    // target on open. Native <dialog>.close() restores focus to the trigger
    // automatically.
    window.requestAnimationFrame(() => {
      copyButtonRef.current?.focus();
    });
    return () => {
      dialog.removeEventListener('close', handleClose);
      if (copyTimer) clearTimeout(copyTimer);
      if (dialog.open) dialog.close();
    };
  });

  // Gesture-aware backdrop close (F14): only a press+release that BOTH land on
  // the backdrop dismiss the modal, so selecting the exported JSON with a drag
  // that ends outside the dialog no longer closes it.
  const backdrop = createDialogBackdropClose(dialogRef, () => {
    dialogRef.current?.close();
  });

  async function handleCopy() {
    const text = code.value;
    let ok = false;
    // Primary: navigator.clipboard.writeText. The pre-fix code used the
    // deprecated `document.execCommand('copy')` as the primary path and
    // only fell back to the modern Clipboard API on textarea failure.
    // Reorder so modern is first; legacy execCommand is the fallback for
    // browsers that reject `clipboard.writeText` (insecure context, denied
    // permission, focus issues inside Safari's <dialog> focus trap, etc.).
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (err: unknown) {
      // Swallow — `err` is captured but unused. Common rejection reasons:
      // not in a secure context, clipboard permission denied, no focus on
      // the document. Any of these mean we should try the legacy path.
      void err;
    }
    if (!ok) {
      // Fallback: dialog-scoped offscreen textarea + execCommand. Lives
      // inside the modal so Safari's focus trap doesn't block the select().
      // tabindex=-1 + aria-hidden=true keep the textarea out of the
      // keyboard tab order and assistive-tech tree while it's mounted.
      const dialog = dialogRef.current;
      if (dialog) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.cssText = 'position:fixed;opacity:0;left:-9999px';
          textarea.tabIndex = -1;
          textarea.setAttribute('aria-hidden', 'true');
          dialog.appendChild(textarea);
          textarea.focus();
          textarea.select();
          ok = document.execCommand('copy');
          dialog.removeChild(textarea);
        } catch {
          /* ignore — both paths failed; UI shows "Failed" below */
        }
      }
    }
    if (scope.abortSignal.aborted) return;
    copyLabel.value = ok ? 'Copied!' : 'Failed';
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyLabel.value = 'Copy';
    }, 2000);
  }

  // Instance-scoped id for aria-labelledby, unique when two panels are
  // mounted in the same document. Native <dialog>.showModal() implies
  // aria-modal=true, so only the title pointer is needed.
  const titleId = `${cfg.modalClassPrefix}-export-title-${uniqueId()}`;

  return (
    <dialog
      ref={dialogRef}
      on:mousedown={backdrop.onMouseDown}
      on:click={backdrop.onClick}
      aria-labelledby={titleId}
      class={`${modalClass(cfg, '')} ${modalClass(cfg, '--export')}`}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="export"
    >
      <div id={titleId} role="heading" aria-level={2} class={modalClass(cfg, '__title')}>
        Export Design Tokens
      </div>

      <div class={modalClass(cfg, '__hint')}>
        Save as <span class="tokenpanel-code">{exportFilenameHint}</span> to feed this blob
        back into the panel (or hand to an AI assistant).
      </div>

      <label class={modalClass(cfg, '__toggle')}>
        <input type="checkbox" modelChecked={includeDefaults} />
        Show defaults too
      </label>

      <div role="none" class={modalClass(cfg, '__json')}>{code}</div>

      <div class={modalClass(cfg, '__actions')}>
        <RoleButton
          ref={copyButtonRef}
          onClick={() => void handleCopy()}
          class={`${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`}
        >
          {copyLabel}
        </RoleButton>
        <RoleButton onClick={() => dialogRef.current?.close()} class={modalClass(cfg, '__button')}>
          Close
        </RoleButton>
      </div>
    </dialog>
  );
}
