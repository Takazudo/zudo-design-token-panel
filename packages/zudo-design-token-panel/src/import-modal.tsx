/**
 * Import modal — accepts a pasted design-tokens JSON document (default schema:
 * `zudo-design-tokens/v1`; configurable via `panelConfig.schemaId`) and lifts
 * it into a `TweakState` via `deserialize()`. Validation and unknown-token
 * reporting are delegated to serde; this component only renders status
 * feedback and routes the parsed state up to the shell.
 *
 * Ported verbatim from zudo-doc's
 * `src/components/design-token-tweak/import-modal.tsx`. Intentional deltas:
 *  - `deserialize` / `DesignTokenSchemaError` / `getDesignTokenSchema` come
 *    from this package's serde (`./utils/design-token-serde`); the schema
 *    id is read at render time from `panelConfig.schemaId` instead of
 *    being a module-level constant.
 *  - State types import from this package's state envelope.
 *  - Modal class names are derived from `panelConfig.modalClassPrefix` via
 *    `modalClass(...)` so a single config swap re-themes every dialog.
 *
 * Modal lifecycle uses the native `<dialog>` element via `showModal()` /
 * `close()`. Every dismissal path (× button, backdrop click, Escape key, the
 * programmatic "Close" button) routes through `dialog.close()` so the native
 * `close` event — and thus `onClose` — fires exactly once per dismissal.
 */

import { useEffect, useRef, useState } from 'preact/compat';
import {
  DesignTokenSchemaError,
  deserialize,
  getDesignTokenSchema,
} from './utils/design-token-serde';
import type { ColorTweakState, TweakState } from './state/tweak-state';
import { getPanelConfig, modalClass } from './config/panel-config';
import { structuralEqual } from './utils/structural-equal';

export interface ImportModalProps {
  onClose: () => void;
  /** Called with the parsed state when the user hits "Load". The caller is
   *  responsible for applying it to the panel + persisting it. */
  onLoad: (state: TweakState) => void;
  /** Color baseline filled in for fields absent from the payload. */
  colorDefaults: ColorTweakState;
}

interface InlineNote {
  kind: 'error' | 'info';
  text: string;
}

export function ImportModal({ onClose, onLoad, colorDefaults }: ImportModalProps) {
  const [text, setText] = useState('');
  const [note, setNote] = useState<InlineNote | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cfg = getPanelConfig();
  const expectedSchema = getDesignTokenSchema();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Autofocus the textarea so the user can paste immediately.
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
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

  function handleLoad() {
    setNote(null);
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setNote({ kind: 'error', text: 'Paste a JSON blob first.' });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setNote({ kind: 'error', text: `JSON parse error: ${message}` });
      return;
    }

    try {
      const { state, unknownTokens, warnings } = deserialize(parsed, {
        colorDefaults,
      });

      if (unknownTokens.length > 0) {
        // Grouped console.warn so developers can inspect the list without
        // drowning in separate log lines.
        // eslint-disable-next-line no-console
        console.groupCollapsed(
          `[design-token-serde] ${unknownTokens.length} unknown token${
            unknownTokens.length === 1 ? '' : 's'
          } ignored while loading JSON`,
        );
        for (const name of unknownTokens) {
          // eslint-disable-next-line no-console
          console.warn(name);
        }
        // eslint-disable-next-line no-console
        console.groupEnd();
      }

      if (warnings.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[design-token-serde] warnings:', warnings);
      }

      onLoad(state);

      // "Nothing applied" = every spacing/typography/size override landed in
      // unknownTokens (so the payload had data but nothing mapped), AND the
      // color block effectively matches the baseline. Surface a stronger
      // warning so the user isn't left thinking the import silently succeeded.
      //
      // The pre-fix check only verified whether the input HAD a `color` key
      // (presence-based). That suppressed the warning even when an imported
      // color block matched the baseline values exactly — i.e. the import
      // was a no-op the user couldn't see. The fix compares the deserialized
      // `state.color` against `colorDefaults` via structural deep-equal
      // (JSON.stringify is property-order sensitive and would miss
      // equal-but-reordered objects on V8 minor version drift; structural
      // compare is order-independent).
      const appliedCount =
        Object.keys(state.spacing).length +
        Object.keys(state.typography).length +
        Object.keys(state.size).length;
      const colorMatchesBaseline = structuralEqual(state.color, colorDefaults);
      const nothingApplied = appliedCount === 0 && colorMatchesBaseline && unknownTokens.length > 0;

      if (nothingApplied) {
        setNote({
          kind: 'error',
          text: `Nothing applied — all ${unknownTokens.length} token${
            unknownTokens.length === 1 ? '' : 's'
          } in the payload were unknown. See console for the list.`,
        });
      } else if (unknownTokens.length > 0) {
        setNote({
          kind: 'info',
          text: `Loaded. ${unknownTokens.length} unknown token${
            unknownTokens.length === 1 ? '' : 's'
          } ignored — see console for the list.`,
        });
      } else {
        setNote({ kind: 'info', text: 'Loaded.' });
      }
    } catch (err) {
      if (err instanceof DesignTokenSchemaError) {
        if (err.reason === 'schema-mismatch') {
          setNote({
            kind: 'error',
            text: `Schema mismatch: this panel expects "${expectedSchema}".`,
          });
        } else if (err.reason === 'schema-missing') {
          setNote({
            kind: 'error',
            text: `Missing "$schema" key. Expected "${expectedSchema}".`,
          });
        } else {
          setNote({ kind: 'error', text: 'Input is not a JSON object.' });
        }
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      setNote({ kind: 'error', text: `Load failed: ${message}` });
    }
  }

  // Stable id for aria-labelledby. Native <dialog>.showModal() implies
  // aria-modal=true, so we only need to point at the title.
  const titleId = `${cfg.modalClassPrefix}-import-title`;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      className={`${modalClass(cfg, '')} ${modalClass(cfg, '--import')}`}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="import"
    >
      <h2 id={titleId} className={modalClass(cfg, '__title')}>
        Load Design Tokens
      </h2>

      <p className={modalClass(cfg, '__hint')}>
        Paste a <code>{expectedSchema}</code> JSON blob. Unknown tokens are ignored; schema mismatch
        aborts the load.
      </p>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        spellcheck={false}
        className={modalClass(cfg, '__textarea')}
        placeholder={`{ "$schema": "${expectedSchema}", ... }`}
      />

      {note && (
        <p
          role={note.kind === 'error' ? 'alert' : 'status'}
          className={`${modalClass(cfg, '__status')} ${modalClass(cfg, `__status--${note.kind}`)}`}
        >
          {note.text}
        </p>
      )}

      <div className={modalClass(cfg, '__actions')}>
        <button
          type="button"
          onClick={handleLoad}
          className={`${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`}
        >
          Load
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
