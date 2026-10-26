/** @jsxImportSource @takazudo/zfb/zudo-react */
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

import { computed, For, getScope, Show, signal } from '@takazudo/zfb/zudo-react';
import { createDialogBackdropClose } from './controls/use-dialog-backdrop-close';
import { RoleButton } from './controls/role-button';
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
import { uniqueId } from './utils/unique-id';
import { read, type Reactive } from './zr/live';

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
   * Read once at mount.
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

const MODE_SIDE_OPTIONS: ReadonlyArray<readonly [ModeSides, string]> = [
  ['as-is', 'As-is'],
  ['swap', 'Swap light / dark'],
  ['light-only', 'Light only (preserve dark)'],
  ['dark-only', 'Dark only (preserve light)'],
  ['light-to-both', 'Light to both'],
];

const STRATEGY_OPTIONS: ReadonlyArray<readonly [ImportStrategy, string]> = [
  ['replace', 'Replace selected tabs'],
  ['merge', 'Merge into selected tabs'],
];

export function ImportModal(
  props: Reactive<ImportModalProps, 'onClose' | 'onLoad' | 'instanceConfig'>,
) {
  const text = signal('');
  const note = signal<InlineNote | null>(null);
  const analysisState = signal<AnalysisState | null>(null);
  const analysisPending = signal(false);
  const selectedTabs = signal<string[]>([]);
  const modeSides = signal<string | null>('as-is');
  const strategy = signal<string | null>('replace');
  const dialogRef: { current: HTMLDialogElement | null } = { current: null };
  const textareaRef: { current: HTMLTextAreaElement | null } = { current: null };
  let analysisTimer: ReturnType<typeof setTimeout> | null = null;
  let analysisRevision = 0;
  // Resolve THIS instance's config (multi-instance, #357); a prop-less test
  // render falls back to the active default instance.
  const cfg = props.instanceConfig ?? getPanelConfig();

  getScope().onActivate(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => props.onClose();
    dialog.addEventListener('close', handleClose);
    dialog.showModal();
    // Autofocus the textarea so the user can paste immediately.
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => {
      dialog.removeEventListener('close', handleClose);
      if (analysisTimer !== null) clearTimeout(analysisTimer);
      analysisRevision += 1;
      if (dialog.open) dialog.close();
    };
  });

  // Gesture-aware backdrop close (F14): a selection drag that starts inside
  // the dialog (e.g. over the textarea) and ends on the backdrop must NOT
  // dismiss — otherwise the user's unsaved pasted JSON is destroyed.
  const backdrop = createDialogBackdropClose(dialogRef, () => {
    dialogRef.current?.close();
  });

  function resetScope() {
    analysisState.value = null;
    selectedTabs.value = [];
    modeSides.value = 'as-is';
    strategy.value = 'replace';
  }

  function runAnalysis(source: string, revision: number): void {
    if (revision !== analysisRevision) return;

    const trimmed = source.trim();
    if (trimmed.length === 0) {
      analysisPending.value = false;
      note.value = { kind: 'error', text: 'Paste a JSON blob first.' };
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      if (revision !== analysisRevision) return;
      const message = error instanceof Error ? error.message : String(error);
      analysisPending.value = false;
      note.value = { kind: 'error', text: `JSON parse error: ${message}` };
      return;
    }

    try {
      const analysis = analyzeDesignTokenJson(parsed, cfg);
      if (revision !== analysisRevision) return;
      analysisState.value = { parsed, analysis };
      // Foreign tabs are shown for transparency but cannot be selected. Every
      // configured tab in the document starts checked, matching the old
      // all-in import behaviour.
      selectedTabs.value = analysis.tabs.filter((tab) => tab.known).map((tab) => tab.id);
      modeSides.value = 'as-is';
      strategy.value = 'replace';
      analysisPending.value = false;
      note.value = null;
    } catch (error) {
      if (revision !== analysisRevision) return;
      analysisPending.value = false;
      if (error instanceof DesignTokenSchemaError) {
        note.value = { kind: 'error', text: schemaErrorText(error) };
      } else {
        const message = error instanceof Error ? error.message : String(error);
        note.value = { kind: 'error', text: `Analysis failed: ${message}` };
      }
    }
  }

  function scheduleAnalysis(source: string): void {
    if (analysisTimer !== null) clearTimeout(analysisTimer);
    const revision = ++analysisRevision;
    resetScope();
    note.value = null;

    if (source.trim().length === 0) {
      analysisPending.value = false;
      return;
    }

    analysisPending.value = true;
    analysisTimer = setTimeout(() => {
      analysisTimer = null;
      runAnalysis(source, revision);
    }, ANALYSIS_DEBOUNCE_MS);
  }

  function handleAnalyze(): void {
    if (analysisTimer !== null) {
      clearTimeout(analysisTimer);
      analysisTimer = null;
    }
    const revision = ++analysisRevision;
    analysisPending.value = true;
    resetScope();
    note.value = null;
    // Reading the element as well as state keeps the explicit control useful
    // when a host/test updates textarea.value before dispatching its event.
    const source = textareaRef.current?.value ?? text.value;
    runAnalysis(source, revision);
  }

  function handleTabChange(tabId: string, checked: boolean): void {
    const previous = selectedTabs.value;
    selectedTabs.value = checked
      ? previous.includes(tabId) ? previous : [...previous, tabId]
      : previous.filter((id) => id !== tabId);
  }

  function handleLoad(): void {
    note.value = null;
    const current = analysisState.value;
    if (!current) {
      note.value = { kind: 'error', text: 'Analyze the JSON before loading.' };
      return;
    }

    const colorDefaults = read(props.colorDefaults);
    try {
      // Thread the mounted instance's config + live state so scoped loading,
      // merge, and one-side mode options all operate on this panel instance.
      const { state, unknownTokens, warnings } = deserialize(
        current.parsed,
        {
          colorDefaults,
          current: read(props.current),
          tabs: selectedTabs.value,
          modeSides: modeSides.value as ModeSides,
          strategy: strategy.value as ImportStrategy,
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

      props.onLoad(state);

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
        note.value = {
          kind: 'error',
          text: `Nothing applied — all ${unknownTokens.length} token${
            unknownTokens.length === 1 ? '' : 's'
          } in the payload were unknown. See console for the list.`,
        };
      } else if (unknownTokens.length > 0) {
        note.value = {
          kind: 'info',
          text: `Loaded. ${unknownTokens.length} unknown token${
            unknownTokens.length === 1 ? '' : 's'
          } ignored — see console for the list.`,
        };
      } else {
        note.value = { kind: 'info', text: 'Loaded.' };
      }
    } catch (error) {
      if (error instanceof DesignTokenSchemaError) {
        note.value = { kind: 'error', text: schemaErrorText(error) };
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      note.value = { kind: 'error', text: `Load failed: ${message}` };
    }
  }

  // Instance-scoped id for aria-labelledby, unique when two panels are
  // mounted in the same document.
  const titleId = `${cfg.modalClassPrefix}-import-title-${uniqueId()}`;
  const analysis = computed(() => analysisState.value?.analysis ?? null);
  const showAnalysis = computed(() => analysis.value !== null && !analysisPending.value);
  const analysisTabs = computed(() => analysis.value?.tabs ?? []);
  const unknownTokens = computed(() => analysis.value?.unknownTokens ?? []);
  const perModeEntries = computed(
    () => analysis.value?.tabs.reduce((total, tab) => total + tab.perModeEntries, 0) ?? 0,
  );
  const modeSidesText = computed(() => {
    const sides = analysis.value?.sides ?? [];
    return sides.length > 0 ? sides.join(', ') : 'none';
  });
  const statusClass = (kind: InlineNote['kind'] | 'info') =>
    `${modalClass(cfg, '__status')} ${modalClass(cfg, `__status--${kind}`)}`;

  function RadioGroup(group: {
    legend: string;
    name: string;
    model: typeof modeSides;
    options: ReadonlyArray<readonly [string, string]>;
  }) {
    return (
      <fieldset class={modalClass(cfg, '__fieldset')}>
        <legend>{group.legend}</legend>
        <div class={modalClass(cfg, '__radio-list')}>
          {group.options.map(([value, label]) => (
            <label class={modalClass(cfg, '__radio-option')}>
              <input type="radio" name={group.name} value={value} modelValue={group.model} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      on:mousedown={backdrop.onMouseDown}
      on:click={backdrop.onClick}
      aria-labelledby={titleId}
      class={`${modalClass(cfg, '')} ${modalClass(cfg, '--import')}`}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="import"
    >
      <div id={titleId} role="heading" aria-level={2} class={modalClass(cfg, '__title')}>
        Load Design Tokens
      </div>

      <div class={modalClass(cfg, '__hint')}>
        Paste a design-tokens JSON blob. Analysis runs automatically while you type, or use
        Analyze to inspect the document before loading it.
      </div>

      <textarea
        ref={textareaRef}
        modelValue={text}
        on:input={(event) => scheduleAnalysis(event.currentTarget.value)}
        spellcheck={false}
        class={modalClass(cfg, '__textarea')}
        placeholder={`{ "$schema": "${SCHEMA_V2}", ... }`}
        aria-label="Design tokens JSON"
      />

      <div class={modalClass(cfg, '__actions')}>
        <RoleButton onClick={handleAnalyze} class={modalClass(cfg, '__button')}>
          Analyze
        </RoleButton>
      </div>

      <Show when={analysisPending}>
        {() => (
          <div role="status" class={statusClass('info')}>
            Analyzing…
          </div>
        )}
      </Show>

      <Show when={computed(() => note.value !== null)}>
        {() => (
          <div
            role={computed(() => (note.value?.kind === 'error' ? 'alert' : 'status'))}
            class={computed(() => statusClass(note.value?.kind ?? 'info'))}
          >
            {computed(() => note.value?.text ?? '')}
          </div>
        )}
      </Show>

      <Show when={showAnalysis}>
        {() => (
          <div class={modalClass(cfg, '__analysis')}>
            <div role="heading" aria-level={3} class={modalClass(cfg, '__section-heading')}>
              Import scope
            </div>

            <div class={modalClass(cfg, '__analysis-schema')}>
              Schema: <span class="tokenpanel-code">{computed(() => analysis.value?.schema ?? '')}</span>
            </div>

            <fieldset class={modalClass(cfg, '__fieldset')}>
              <legend>Tabs</legend>
              <div class={modalClass(cfg, '__tab-list')}>
                <For each={analysisTabs} by={(tab) => tab.id}>
                  {(tab) => {
                    const input: { current: HTMLInputElement | null } = { current: null };
                    const tabLabel = computed(
                      () =>
                        cfg.tabs.find((configured) => configured.id === tab.value.id)?.label ??
                        tab.value.id,
                    );
                    getScope().effect(() => {
                      const checked = tab.value.known && selectedTabs.value.includes(tab.value.id);
                      if (input.current) input.current.checked = checked;
                    });
                    return (
                      <label class={modalClass(cfg, '__tab-option')}>
                        <input
                          ref={input}
                          type="checkbox"
                          disabled={computed(() => !tab.value.known)}
                          on:change={(event) =>
                            handleTabChange(tab.value.id, event.currentTarget.checked)
                          }
                        />
                        <span class={modalClass(cfg, '__tab-name')}>{tabLabel}</span>
                        <span class={modalClass(cfg, '__tab-meta')}>
                          {computed(
                            () =>
                              `${tab.value.entries} ${tab.value.entries === 1 ? 'entry' : 'entries'}`,
                          )}
                        </span>
                        <Show when={computed(() => !tab.value.known)}>
                          {() => (
                            <span class={modalClass(cfg, '__tab-disabled')}>not in this panel</span>
                          )}
                        </Show>
                      </label>
                    );
                  }}
                </For>
              </div>
            </fieldset>

            <div class={modalClass(cfg, '__mode-summary')}>
              Mode sides found: <span class="tokenpanel-code">{modeSidesText}</span>
            </div>

            <Show when={computed(() => perModeEntries.value > 0)}>
              {() => (
                <RadioGroup
                  legend="Mode sides"
                  name={`${titleId}-mode-sides`}
                  model={modeSides}
                  options={MODE_SIDE_OPTIONS}
                />
              )}
            </Show>

            <RadioGroup
              legend="Import strategy"
              name={`${titleId}-strategy`}
              model={strategy}
              options={STRATEGY_OPTIONS}
            />

            <Show when={computed(() => unknownTokens.value.length > 0)}>
              {() => (
                <div class={modalClass(cfg, '__unknown')}>
                  <div role="heading" aria-level={3} class={modalClass(cfg, '__section-heading')}>
                    Unknown tokens (will be skipped)
                  </div>
                  <div class={modalClass(cfg, '__unknown-list')}>
                    <For each={unknownTokens} by={(token) => token}>
                      {(token) => (
                        <div
                          class={`${modalClass(cfg, '__list-item')} ${modalClass(cfg, '__unknown-item')}`}
                        >
                          <span class="tokenpanel-code">{token}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </Show>
          </div>
        )}
      </Show>

      <div class={modalClass(cfg, '__actions')}>
        <Show when={showAnalysis}>
          {() => (
            <RoleButton
              onClick={handleLoad}
              class={`${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`}
            >
              Load
            </RoleButton>
          )}
        </Show>
        <RoleButton onClick={() => dialogRef.current?.close()} class={modalClass(cfg, '__button')}>
          Close
        </RoleButton>
      </div>
    </dialog>
  );
}
