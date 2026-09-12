/**
 * Import modal — accepts a pasted design-tokens JSON document and guides the
 * user through paste → analyze → scope → load.
 *
 * `analyzeDesignTokenJson()` is deliberately state-free, so the first step
 * can inspect a document without applying values or touching storage. The
 * selected tabs and mode/merge choices are passed to `deserialize()` only
 * after the user explicitly chooses Load.
 *
 * Modal lifecycle uses the native `<dialog>` element via `showModal()` /
 * `close()`. Every dismissal path routes through `dialog.close()` so the
 * native `close` event — and thus `onClose` — fires exactly once per
 * dismissal.
 */

import { useEffect, useId, useRef, useState } from 'preact/compat';
import { useDialogBackdropClose } from './controls/use-dialog-backdrop-close';
import {
  analyzeDesignTokenJson,
  DesignTokenSchemaError,
  deserialize,
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
} from './utils/design-token-serde';
import type { DeserializeOptions, ImportAnalysis } from './utils/design-token-serde';
import type { ColorTweakState, TweakState } from './state/tweak-state';
import { getPanelConfig, modalClass, type PanelConfig } from './config/panel-config';
import { structuralEqual } from './utils/structural-equal';

export interface ImportModalProps {
  onClose: () => void;
  /** Called with the parsed state when the user hits "Load". The caller is
   * responsible for applying it to the panel + persisting it. */
  onLoad: (state: TweakState) => void;
  /** Color baseline filled in for fields absent from the payload. */
  colorDefaults: ColorTweakState;
  /**
   * The mounted panel instance's live state. It is used by scoped merge and
   * one-side imports to preserve values from the instance being edited.
   * Omitted for backwards-compatible direct renders; serde then falls back to
   * manifest/default values for those options.
   */
  current?: TweakState;
  /**
   * The mounted panel instance's config (multi-instance, #357). When supplied,
   * the modal derives its modal classes + title id and serde lookups from THIS
   * instance rather than the active default instance. Omitted (e.g. a direct
   * test render) → `getPanelConfig()`, preserving the single-panel path.
   */
  instanceConfig?: PanelConfig;
}

interface InlineNote {
  kind: 'error' | 'info';
  text: string;
}

interface AnalysisState {
  parsed: unknown;
  analysis: ImportAnalysis;
}

type ModeSides = NonNullable<DeserializeOptions['modeSides']>;
type ImportStrategy = NonNullable<DeserializeOptions['strategy']>;

const ANALYSIS_DEBOUNCE_MS = 300;

function schemaErrorText(error: DesignTokenSchemaError): string {
  if (error.reason === 'schema-mismatch') {
    return `Schema mismatch: expected "${SCHEMA_V3}", "${SCHEMA_V2}", or "${SCHEMA_V1}".`;
  }
  if (error.reason === 'schema-missing') {
    return `Missing "$schema" key. Expected "${SCHEMA_V3}", "${SCHEMA_V2}", or "${SCHEMA_V1}".`;
  }
  return 'Input is not a JSON object.';
}

export function ImportModal({
  onClose,
  onLoad,
  colorDefaults,
  current,
  instanceConfig,
}: ImportModalProps) {
  const [text, setText] = useState('');
  const [note, setNote] = useState<InlineNote | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [modeSides, setModeSides] = useState<ModeSides>('as-is');
  const [strategy, setStrategy] = useState<ImportStrategy>('replace');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisRevisionRef = useRef(0);
  // Resolve THIS instance's config (multi-instance, #357); a prop-less test
  // render falls back to the active default instance.
  const cfg = instanceConfig ?? getPanelConfig();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Autofocus the textarea so the user can paste immediately.
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => {
      if (analysisTimerRef.current !== null) clearTimeout(analysisTimerRef.current);
      analysisRevisionRef.current += 1;
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

  // Gesture-aware backdrop close (F14): a selection drag that starts inside
  // the dialog (e.g. over the textarea) and ends on the backdrop must NOT
  // dismiss — otherwise the user's unsaved pasted JSON is destroyed.
  const backdropHandlers = useDialogBackdropClose(dialogRef, () => {
    dialogRef.current?.close();
  });

  function resetScope() {
    setAnalysisState(null);
    setSelectedTabs([]);
    setModeSides('as-is');
    setStrategy('replace');
  }

  function runAnalysis(source: string, revision: number): void {
    if (revision !== analysisRevisionRef.current) return;

    const trimmed = source.trim();
    if (trimmed.length === 0) {
      setAnalysisPending(false);
      setNote({ kind: 'error', text: 'Paste a JSON blob first.' });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      if (revision !== analysisRevisionRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      setAnalysisPending(false);
      setNote({ kind: 'error', text: `JSON parse error: ${message}` });
      return;
    }

    try {
      const analysis = analyzeDesignTokenJson(parsed, cfg);
      if (revision !== analysisRevisionRef.current) return;
      setAnalysisState({ parsed, analysis });
      // Foreign tabs are shown for transparency but cannot be selected. Every
      // configured tab in the document starts checked, matching the old
      // all-in import behaviour.
      setSelectedTabs(analysis.tabs.filter((tab) => tab.known).map((tab) => tab.id));
      setModeSides('as-is');
      setStrategy('replace');
      setAnalysisPending(false);
      setNote(null);
    } catch (error) {
      if (revision !== analysisRevisionRef.current) return;
      setAnalysisPending(false);
      if (error instanceof DesignTokenSchemaError) {
        setNote({ kind: 'error', text: schemaErrorText(error) });
      } else {
        const message = error instanceof Error ? error.message : String(error);
        setNote({ kind: 'error', text: `Analysis failed: ${message}` });
      }
    }
  }

  function scheduleAnalysis(source: string): void {
    if (analysisTimerRef.current !== null) clearTimeout(analysisTimerRef.current);
    const revision = ++analysisRevisionRef.current;
    resetScope();
    setNote(null);

    if (source.trim().length === 0) {
      setAnalysisPending(false);
      return;
    }

    setAnalysisPending(true);
    analysisTimerRef.current = setTimeout(() => {
      analysisTimerRef.current = null;
      runAnalysis(source, revision);
    }, ANALYSIS_DEBOUNCE_MS);
  }

  function handleTextInput(source: string): void {
    setText(source);
    scheduleAnalysis(source);
  }

  function handleAnalyze(): void {
    if (analysisTimerRef.current !== null) {
      clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    const revision = ++analysisRevisionRef.current;
    setAnalysisPending(true);
    resetScope();
    setNote(null);
    // Reading the element as well as state keeps the explicit control useful
    // when a host/test updates textarea.value before dispatching its event.
    const source = textareaRef.current?.value ?? text;
    runAnalysis(source, revision);
  }

  function handleTabChange(tabId: string, checked: boolean): void {
    setSelectedTabs((previous) => checked
      ? previous.includes(tabId) ? previous : [...previous, tabId]
      : previous.filter((id) => id !== tabId));
  }

  function handleLoad(): void {
    setNote(null);
    if (!analysisState) {
      setNote({ kind: 'error', text: 'Analyze the JSON before loading.' });
      return;
    }

    try {
      // Thread the mounted instance's config + live state so scoped loading,
      // merge, and one-side mode options all operate on this panel instance.
      const { state, unknownTokens, warnings } = deserialize(
        analysisState.parsed,
        {
          colorDefaults,
          current,
          tabs: selectedTabs,
          modeSides,
          strategy,
        },
        cfg,
      );

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
    } catch (error) {
      if (error instanceof DesignTokenSchemaError) {
        setNote({ kind: 'error', text: schemaErrorText(error) });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      setNote({ kind: 'error', text: `Load failed: ${message}` });
    }
  }

  // Instance-scoped id for aria-labelledby. Using useId() ensures uniqueness
  // when two panels are mounted in the same document.
  const _uid = useId();
  const titleId = `${cfg.modalClassPrefix}-import-title-${_uid}`;
  const selectedTabSet = new Set(selectedTabs);
  const analysis = analysisState?.analysis;
  const perModeEntries = analysis?.tabs.reduce((total, tab) => total + tab.perModeEntries, 0) ?? 0;
  const modeSidesText = analysis && analysis.sides.length > 0 ? analysis.sides.join(', ') : 'none';

  return (
    <dialog
      ref={dialogRef}
      onMouseDown={backdropHandlers.onMouseDown}
      onClick={backdropHandlers.onClick}
      aria-labelledby={titleId}
      className={`${modalClass(cfg, '')} ${modalClass(cfg, '--import')}`}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="import"
    >
      <div id={titleId} role="heading" aria-level={2} className={modalClass(cfg, '__title')}>
        Load Design Tokens
      </div>

      <div className={modalClass(cfg, '__hint')}>
        Paste a design-tokens JSON blob. Analysis runs automatically while you type, or use
        Analyze to inspect the document before loading it.
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onInput={(event) => handleTextInput(event.currentTarget.value)}
        spellcheck={false}
        className={modalClass(cfg, '__textarea')}
        placeholder={`{ "$schema": "${SCHEMA_V2}", ... }`}
        aria-label="Design tokens JSON"
      />

      <div className={modalClass(cfg, '__actions')}>
        <div
          role="button"
          tabIndex={0}
          onClick={handleAnalyze}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleAnalyze();
            }
          }}
          className={modalClass(cfg, '__button')}
        >
          Analyze
        </div>
      </div>

      {analysisPending && (
        <div role="status" className={`${modalClass(cfg, '__status')} ${modalClass(cfg, '__status--info')}`}>
          Analyzing…
        </div>
      )}

      {note && (
        <div
          role={note.kind === 'error' ? 'alert' : 'status'}
          className={`${modalClass(cfg, '__status')} ${modalClass(cfg, `__status--${note.kind}`)}`}
        >
          {note.text}
        </div>
      )}

      {analysis && !analysisPending && (
        <div className={modalClass(cfg, '__analysis')}>
          <div role="heading" aria-level={3} className={modalClass(cfg, '__section-heading')}>
            Import scope
          </div>

          <div className={modalClass(cfg, '__analysis-schema')}>
            Schema: <span className="tokenpanel-code">{analysis.schema}</span>
          </div>

          <fieldset className={modalClass(cfg, '__fieldset')}>
            <legend>Tabs</legend>
            <div className={modalClass(cfg, '__tab-list')}>
              {analysis.tabs.map((tab) => {
                const tabLabel = cfg.tabs.find((configured) => configured.id === tab.id)?.label ?? tab.id;
                return (
                  <label key={tab.id} className={modalClass(cfg, '__tab-option')}>
                    <input
                      type="checkbox"
                      checked={tab.known && selectedTabSet.has(tab.id)}
                      disabled={!tab.known}
                      onChange={(event) => handleTabChange(tab.id, event.currentTarget.checked)}
                    />
                    <span className={modalClass(cfg, '__tab-name')}>{tabLabel}</span>
                    <span className={modalClass(cfg, '__tab-meta')}>
                      {tab.entries} {tab.entries === 1 ? 'entry' : 'entries'}
                    </span>
                    {!tab.known && (
                      <span className={modalClass(cfg, '__tab-disabled')}>not in this panel</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className={modalClass(cfg, '__mode-summary')}>
            Mode sides found: <span className="tokenpanel-code">{modeSidesText}</span>
          </div>

          {perModeEntries > 0 && (
            <fieldset className={modalClass(cfg, '__fieldset')}>
              <legend>Mode sides</legend>
              <div className={modalClass(cfg, '__radio-list')}>
                <label className={modalClass(cfg, '__radio-option')}>
                  <input
                    type="radio"
                    name={`${titleId}-mode-sides`}
                    value="as-is"
                    checked={modeSides === 'as-is'}
                    onChange={() => setModeSides('as-is')}
                  />
                  As-is
                </label>
                <label className={modalClass(cfg, '__radio-option')}>
                  <input
                    type="radio"
                    name={`${titleId}-mode-sides`}
                    value="swap"
                    checked={modeSides === 'swap'}
                    onChange={() => setModeSides('swap')}
                  />
                  Swap light / dark
                </label>
                <label className={modalClass(cfg, '__radio-option')}>
                  <input
                    type="radio"
                    name={`${titleId}-mode-sides`}
                    value="light-only"
                    checked={modeSides === 'light-only'}
                    onChange={() => setModeSides('light-only')}
                  />
                  Light only (preserve dark)
                </label>
                <label className={modalClass(cfg, '__radio-option')}>
                  <input
                    type="radio"
                    name={`${titleId}-mode-sides`}
                    value="dark-only"
                    checked={modeSides === 'dark-only'}
                    onChange={() => setModeSides('dark-only')}
                  />
                  Dark only (preserve light)
                </label>
                <label className={modalClass(cfg, '__radio-option')}>
                  <input
                    type="radio"
                    name={`${titleId}-mode-sides`}
                    value="light-to-both"
                    checked={modeSides === 'light-to-both'}
                    onChange={() => setModeSides('light-to-both')}
                  />
                  Light to both
                </label>
              </div>
            </fieldset>
          )}

          <fieldset className={modalClass(cfg, '__fieldset')}>
            <legend>Import strategy</legend>
            <div className={modalClass(cfg, '__radio-list')}>
              <label className={modalClass(cfg, '__radio-option')}>
                <input
                  type="radio"
                  name={`${titleId}-strategy`}
                  value="replace"
                  checked={strategy === 'replace'}
                  onChange={() => setStrategy('replace')}
                />
                Replace selected tabs
              </label>
              <label className={modalClass(cfg, '__radio-option')}>
                <input
                  type="radio"
                  name={`${titleId}-strategy`}
                  value="merge"
                  checked={strategy === 'merge'}
                  onChange={() => setStrategy('merge')}
                />
                Merge into selected tabs
              </label>
            </div>
          </fieldset>

          {analysis.unknownTokens.length > 0 && (
            <div className={modalClass(cfg, '__unknown')}>
              <div role="heading" aria-level={3} className={modalClass(cfg, '__section-heading')}>
                Unknown tokens (will be skipped)
              </div>
              <div className={modalClass(cfg, '__unknown-list')}>
                {analysis.unknownTokens.map((token) => (
                  <div key={token} className={`${modalClass(cfg, '__list-item')} ${modalClass(cfg, '__unknown-item')}`}>
                    <span className="tokenpanel-code">{token}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={modalClass(cfg, '__actions')}>
        {analysis && !analysisPending && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleLoad}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleLoad();
              }
            }}
            className={`${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`}
          >
            Load
          </div>
        )}
        <div
          role="button"
          tabIndex={0}
          onClick={() => dialogRef.current?.close()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              dialogRef.current?.close();
            }
          }}
          className={modalClass(cfg, '__button')}
        >
          Close
        </div>
      </div>
    </dialog>
  );
}
