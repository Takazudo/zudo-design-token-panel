/**
 * Export modal — renders the current `TweakState` as a design-tokens JSON
 * document (default schema: `zudo-design-tokens/v1`; configurable via
 * `panelConfig.schemaId`) with a diff-only toggle and a copy-to-clipboard
 * button.
 *
 * Ported verbatim from zudo-doc's
 * `src/components/design-token-tweak/export-modal.tsx`. Intentional deltas:
 *  - `serialize` is imported from the zmod2 serde (`./utils/design-token-serde`).
 *  - `colorSchemes` / `initColorFromSchemeData` come from the zmod2 config.
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

import { useState, useEffect, useMemo, useRef } from 'preact/compat';
import { serialize } from './utils/design-token-serde';
import {
  type ColorTweakState,
  type TweakState,
  initColorFromSchemeData,
} from './state/tweak-state';
import { colorSchemes } from './config/color-schemes';
import { exportFilename, getPanelConfig, modalClass } from './config/panel-config';

export interface ExportModalProps {
  onClose: () => void;
  /** Full unified tweak state — the modal serializes all four categories. */
  state: TweakState;
  /** Color baseline used for diff-only output. Optional: callers without DOM
   *  access (tests) can omit and we'll treat the entire color block as changed. */
  colorDefaults?: ColorTweakState;
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

export function ExportModal({ onClose, state, colorDefaults }: ExportModalProps) {
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [includeDefaults, setIncludeDefaults] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cfg = getPanelConfig();
  const exportFilenameHint = exportFilename(cfg);

  // Memo the serialized JSON so flipping the toggle doesn't rebuild on every
  // re-render; `exportedAt` intentionally refreshes when the toggle flips so
  // the displayed timestamp reflects "when you clicked copy".
  const code = useMemo(() => {
    const baseline = resolveColorDefaults(state.color, colorDefaults);
    const json = serialize(state, {
      includeDefaults,
      colorDefaults: baseline,
    });
    return JSON.stringify(json, null, 2);
  }, [state, colorDefaults, includeDefaults]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Focus the primary action so keyboard users land on the most likely
    // target on open. Native <dialog>.close() restores focus to the trigger
    // automatically (PR #1440 review item Q2).
    window.requestAnimationFrame(() => {
      copyButtonRef.current?.focus();
    });
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function handleClose() {
      onClose();
    }
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      dialog.close();
    }
  }

  async function handleCopy() {
    let ok = false;
    // Primary: navigator.clipboard.writeText. The pre-fix code used the
    // deprecated `document.execCommand('copy')` as the primary path and
    // only fell back to the modern Clipboard API on textarea failure.
    // Reorder so modern is first; legacy execCommand is the fallback for
    // browsers that reject `clipboard.writeText` (insecure context, denied
    // permission, focus issues inside Safari's <dialog> focus trap, etc.).
    // PR #1440 review item Q5.
    try {
      await navigator.clipboard.writeText(code);
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
          textarea.value = code;
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
    setCopyLabel(ok ? 'Copied!' : 'Failed');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyLabel('Copy'), 2000);
  }

  // Stable id for aria-labelledby (PR #1440 review item Q1). Native
  // <dialog>.showModal() implies aria-modal=true, so only the title pointer
  // is needed.
  const titleId = `${cfg.modalClassPrefix}-export-title`;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      className={`${modalClass(cfg, '')} ${modalClass(cfg, '--export')}`}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="export"
    >
      <h2 id={titleId} className={modalClass(cfg, '__title')}>
        Export Design Tokens
      </h2>

      <p className={modalClass(cfg, '__hint')}>
        Save as <code>{exportFilenameHint}</code> to feed this blob back into the panel (or hand to
        an AI assistant).
      </p>

      <label className={modalClass(cfg, '__toggle')}>
        <input
          type="checkbox"
          checked={includeDefaults}
          onChange={(e) => setIncludeDefaults(e.currentTarget.checked)}
        />
        Show defaults too
      </label>

      <pre className={modalClass(cfg, '__json')}>
        <code>{code}</code>
      </pre>

      <div className={modalClass(cfg, '__actions')}>
        <button
          ref={copyButtonRef}
          type="button"
          onClick={handleCopy}
          className={`${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`}
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className={modalClass(cfg, '__button')}
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
