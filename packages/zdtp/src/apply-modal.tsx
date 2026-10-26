/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, For, getScope, Show, signal, type Child, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { buildApplyOverrides } from './apply/build-apply-overrides';
import { writtenCssVarsFromResponse } from './apply/reconcile-applied';
import { routeTokensToFiles } from './apply/route-tokens-to-files';
import { getPanelConfig, isApplyConfigured, modalClass, resolveApplyRouting, resolveSecondaryColorCluster, type PanelConfig } from './config/panel-config';
import { getActivePrimaryCluster, initSecondaryFromConfig, type ColorTweakState, type TweakState } from './state/tweak-state';
import { serialize } from './utils/design-token-serde';
import { createDialogBackdropClose } from './controls/dialog-backdrop-close';
import { RoleButton } from './controls/role-button';
import { uniqueId } from './utils/unique-id';
import { read, type Reactive } from './zr/live';

const DEBOUNCE_MS = 300;

export interface ApplyModalProps {
  state: TweakState;
  open: boolean;
  onClose: () => void;
  colorDefaults?: ColorTweakState;
  onApplied: (writtenCssVars: string[]) => void;
  /** Read once at mount. */
  instanceConfig?: PanelConfig;
}

interface Hunk { cssVar: string; line: number; before: string; after: string; context?: { before?: string[]; after?: string[] } }
interface FileResult {
  file?: string; blockKind?: string; digest?: string; changed?: string[]; unchanged?: string[];
  unknown?: string[]; unknownOutsideBlock?: string[]; hunks?: Hunk[];
}
interface ApiResponse {
  ok?: boolean; files?: FileResult[]; updated?: FileResult[]; rejected?: string[];
  rejectedReasons?: string[]; unknownCssVars?: string[]; unknownOutsideBlockCssVars?: string[];
  reason?: string; error?: string;
}
type Phase = { kind: 'preview' } | { kind: 'applying' } |
  { kind: 'success'; response: ApiResponse; revertJson: string; written: string[] } |
  { kind: 'error'; message: string };

interface Classes {
  dialog: string; header: string; title: string; close: string; hint: string; heading: string;
  list: string; item: string; actions: string; primary: string; neutral: string;
  warning: string; success: string; error: string; applying: string; spinner: string;
  revertHint: string; json: string;
}

function classes(cfg: PanelConfig): Classes {
  return {
    dialog: `${modalClass(cfg, '')} ${modalClass(cfg, '--apply')}`,
    header: modalClass(cfg, '__header'), title: modalClass(cfg, '__title'), close: modalClass(cfg, '__close-button'),
    hint: modalClass(cfg, '__hint'), heading: modalClass(cfg, '__section-heading'), list: modalClass(cfg, '__list'),
    item: modalClass(cfg, '__list-item'), actions: modalClass(cfg, '__actions'),
    primary: `${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`,
    neutral: modalClass(cfg, '__button'), warning: `${modalClass(cfg, '__status')} ${modalClass(cfg, '__status--warning')}`,
    success: `${modalClass(cfg, '__status')} ${modalClass(cfg, '__status--success')}`,
    error: `${modalClass(cfg, '__status')} ${modalClass(cfg, '__status--error')}`,
    applying: modalClass(cfg, '__applying'), spinner: modalClass(cfg, '__spinner'),
    revertHint: modalClass(cfg, '__revert-hint'), json: modalClass(cfg, '__json'),
  };
}

function baseName(path: string): string { return path.slice(path.lastIndexOf('/') + 1); }

export function flattenApplyOverrides(
  state: TweakState,
  colorDefaults: ColorTweakState | undefined,
  cfg: PanelConfig,
): Record<string, string> {
  const primary = buildApplyOverrides(state, colorDefaults, getActivePrimaryCluster(cfg), cfg.tabs);
  const secondaryCluster = resolveSecondaryColorCluster(cfg);
  const secondaryTab = cfg.tabs.find((tab) => tab.id === 'color-secondary');
  const secondary = secondaryCluster && state.secondary
    ? buildApplyOverrides({ color: state.secondary, spacing: {}, typography: {}, size: {} }, initSecondaryFromConfig(cfg), secondaryCluster, cfg.tabs, secondaryTab)
    : {};
  return { ...primary, ...secondary };
}

export function ApplyModal(props: Reactive<ApplyModalProps, 'onClose' | 'onApplied' | 'instanceConfig'>) {
  const cfg = props.instanceConfig ?? getPanelConfig();
  const cls = classes(cfg);
  const dialogRef: { current: HTMLDialogElement | null } = { current: null };
  const primaryRef: { current: HTMLDivElement | null } = { current: null };
  const titleId = `${cfg.modalClassPrefix}-apply-title-${uniqueId()}`;
  const phase = signal<Phase>({ kind: 'preview' });
  const preview = signal<ApiResponse | null>(null);
  const catalog = signal<ApiResponse | null>(null);
  const notice = signal<string | null>(null);
  const loading = signal(false);
  const selected = signal<Set<string>>(new Set());
  const selectionVersion = signal(0);
  const selectedFile = signal<string | null>(null);
  const copyLabel = signal('Copy pre-apply state to clipboard');
  let requestId = 0;
  let previewResult: ApiResponse | null = null;
  let previewPromise: Promise<ApiResponse | null> | null = null;
  let previewDirty = false;
  let appliedFired = false;

  const overrides = computed(() => flattenApplyOverrides(read(props.state), read(props.colorDefaults), cfg));
  const routing = resolveApplyRouting(cfg);
  const fallback = computed(() => routeTokensToFiles(overrides.value, routing));
  const endpoint = cfg.applyEndpoint;
  const configured = isApplyConfigured(cfg);
  const scope = getScope();

  scope.effect(() => {
    const open = read(props.open);
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      requestAnimationFrame(() => primaryRef.current?.focus());
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }
  });

  scope.effect(() => {
    if (!read(props.open)) return;
    const tokens = overrides.value;
    const routable = fallback.value.groups.flatMap((group) => Object.keys(group.tokens));
    phase.value = { kind: 'preview' }; preview.value = null; previewResult = null; catalog.value = null; notice.value = null; selected.value = new Set(routable);
    selectionVersion.value = 0;
    selectedFile.value = null; copyLabel.value = 'Copy pre-apply state to clipboard';
    requestId++; previewPromise = null; previewDirty = false;
    appliedFired = false;
    if (configured && Object.keys(tokens).length > 0) previewPromise = loadPreview(tokens);
  });

  async function loadPreview(tokens: Record<string, string>, nextNotice?: string): Promise<ApiResponse | null> {
    if (!endpoint || Object.keys(tokens).length === 0) return null;
    const id = ++requestId;
    // This request represents the exact current selection. While it is in
    // flight, Apply may safely await previewPromise; only the debounce gap
    // before this point is unsafe.
    previewDirty = false;
    loading.value = true;
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens, dryRun: true }) });
      const data = await response.json() as ApiResponse;
      if (id !== requestId) return null;
      if (!response.ok) throw new Error(data.error ?? `Preview failed (${response.status})`);
      previewResult = data; preview.value = data; if (nextNotice !== undefined) notice.value = nextNotice;
      catalog.value = catalog.value ?? data;
      const current = selectedFile.value;
      selectedFile.value = current && data.files?.some((file) => file.file === current) ? current : data.files?.[0]?.file ?? null;
      return data;
    } catch {
      if (id !== requestId) return null;
      preview.value = null; notice.value = 'Live diff preview is unavailable; showing the routing-only preview.';
      return null;
    } finally {
      if (id === requestId) {
        previewDirty = false;
        loading.value = false;
      }
    }
  }

  scope.effect(() => {
    if (!read(props.open) || !configured || phase.value.kind !== 'preview' || selectionVersion.value === 0) return;
    const chosen = selected.value;
    const tokens = Object.fromEntries(Object.entries(overrides.value).filter(([cssVar]) => chosen.has(cssVar)));
    if (Object.keys(tokens).length === 0) {
      requestId++;
      previewPromise = null;
      previewResult = null;
      previewDirty = false;
      preview.value = null;
      loading.value = false;
      return;
    }
    const timer = window.setTimeout(() => { previewPromise = loadPreview(tokens); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  function handleClose() {
    const current = phase.value;
    if (current.kind === 'success' && !appliedFired) { appliedFired = true; props.onApplied(current.written); }
    props.onClose();
  }
  function close() {
    if (phase.value.kind === 'applying') return;
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.close === 'function') dialog.close();
    else { dialog?.removeAttribute('open'); handleClose(); }
  }
  const backdrop = createDialogBackdropClose(dialogRef, close);

  async function apply() {
    if (!endpoint || loading.value || previewDirty) return;
    const chosen = selected.value;
    const tokens = Object.fromEntries(Object.entries(overrides.value).filter(([cssVar]) => chosen.has(cssVar)));
    const state = read(props.state);
    const colorDefaults = read(props.colorDefaults);
    phase.value = { kind: 'applying' };
    try {
      const latestPreview = await (previewPromise ?? Promise.resolve(previewResult));
      const expectDigests = Object.fromEntries((latestPreview?.files ?? []).filter((file) => file.file && file.digest).map((file) => [file.file!, file.digest!]));
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens, expectDigests }) });
      const data = await response.json() as ApiResponse;
      if (response.status === 409 && data.reason === 'stale-file') {
        catalog.value = null;
        notice.value = 'Files changed on disk. Review the refreshed preview before writing.';
        phase.value = { kind: 'preview' };
        previewPromise = loadPreview(tokens);
        await previewPromise;
        return;
      }
      if (!response.ok) { phase.value = { kind: 'error', message: data.error ? `Apply failed (${response.status}): ${data.error}` : `Apply failed (${response.status} ${response.statusText || 'error'}).` }; return; }
      const written = writtenCssVarsFromResponse(data);
      const revertJson = JSON.stringify(serialize(state, { colorDefaults }, cfg), null, 2);
      phase.value = { kind: 'success', response: data, revertJson, written };
    } catch (error) { phase.value = { kind: 'error', message: `Network error: ${error instanceof Error ? error.message : String(error)}` }; }
  }

  const files = computed<FileResult[]>(() => (catalog.value?.files ?? preview.value?.files) ?? fallback.value.groups.map((group) => ({ file: group.relativePath, blockKind: group.prefix, changed: Object.keys(group.tokens), hunks: [] })));
  const rejected = computed(() => catalog.value?.rejected ?? preview.value?.rejected ?? fallback.value.rejected);
  const rejectedReasons = computed(() => catalog.value?.rejectedReasons ?? preview.value?.rejectedReasons ?? fallback.value.rejectedReasons);
  const activeFile = computed(() => files.value.find((file) => file.file === selectedFile.value) ?? files.value[0]);
  const selectedFiles = computed(() => files.value.filter((file) => file.changed?.some((cssVar) => selected.value.has(cssVar))).length);
  const disabled = computed(() => !configured || loading.value || selected.value.size === 0 || selectedFiles.value === 0);
  const toggle = (vars: readonly string[], checked: boolean) => {
    // Invalidate the previous subset immediately, before the debounced request
    // starts. Otherwise a rapid re-select + Write can submit a newly included
    // file with the prior subset's (incomplete) digest map.
    requestId++;
    previewPromise = null;
    previewResult = null;
    previewDirty = configured;
    if (configured) loading.value = true;
    const next = new Set(selected.value);
    for (const cssVar of vars) {
      if (checked) next.add(cssVar);
      else next.delete(cssVar);
    }
    selected.value = next;
    selectionVersion.value += 1;
  };
  const is = (kind: Phase['kind']) => computed(() => phase.value.kind === kind);
  const success = computed(() => { const current = phase.value; return current.kind === 'success' ? current : null; });
  const errorMessage = computed(() => { const current = phase.value; return current.kind === 'error' ? current.message : ''; });

  return <dialog ref={dialogRef} class={cls.dialog} data-design-token-panel-modal="" data-design-token-panel-modal-variant="apply"
    aria-labelledby={titleId} on:close={handleClose} on:cancel={(event) => { if (phase.value.kind === 'applying') event.preventDefault(); }}
    on:mousedown={backdrop.onMouseDown} on:click={backdrop.onClick}>
    <div class={cls.header}><div id={titleId} role="heading" aria-level={2} class={cls.title}>Apply design tokens to codebase</div>
      <RoleButton class={cls.close} aria-label="Close apply modal" onClick={close}>×</RoleButton></div>
    <div>
      <Show when={is('preview')}>{() => <Preview cls={cls} configured={configured} overrides={overrides} files={files} activeFile={activeFile}
        selected={selected} rejected={rejected} rejectedReasons={rejectedReasons} notice={notice} loading={loading}
        selectFile={(file) => { selectedFile.value = file; }} toggle={toggle} />}</Show>
      <Show when={is('applying')}>{() => <div class={cls.applying} role="status"><span class={cls.spinner} aria-hidden="true" /><span>Applying changes…</span></div>}</Show>
      <Show when={is('success')}>{() => <Success cls={cls} phase={success} copyLabel={copyLabel} onCopy={() => {
        const revertJson = success.value?.revertJson ?? '';
        void navigator.clipboard?.writeText(revertJson).then(() => { copyLabel.value = 'Copied!'; window.setTimeout(() => { copyLabel.value = 'Copy pre-apply state to clipboard'; }, 2000); });
      }} />}</Show>
      <Show when={is('error')}>{() => <div class={cls.error} role="alert">{errorMessage}</div>}</Show>
    </div>
    <div class={cls.actions}>
      <Show when={is('preview')}>{() => [<ActionButton buttonRef={primaryRef} class={cls.primary} disabled={disabled} onClick={() => void apply()}>{computed(() => `Write ${selectedFiles.value} file${selectedFiles.value === 1 ? '' : 's'} (${selected.value.size} token${selected.value.size === 1 ? '' : 's'})`)}</ActionButton>, <ActionButton class={cls.neutral} onClick={close}>Close</ActionButton>]}</Show>
      <Show when={is('applying')}>{() => <ActionButton class={cls.primary} disabled onClick={() => undefined}>Applying…</ActionButton>}</Show>
      <Show when={is('success')}>{() => <ActionButton class={cls.primary} onClick={close}>Done</ActionButton>}</Show>
      <Show when={is('error')}>{() => [<ActionButton class={cls.primary} onClick={() => { phase.value = { kind: 'preview' }; selectionVersion.value += 1; }}>Retry</ActionButton>, <ActionButton class={cls.neutral} onClick={close}>Close</ActionButton>]}</Show>
    </div>
  </dialog>;
}

// Disabled action buttons leave the tab order (tabindex -1), unlike the
// shared RoleButton which keeps aria-disabled controls focusable.
function ActionButton({ class: className, onClick, children, disabled, label, buttonRef }: {
  class: string; onClick: () => void; children: Child; disabled?: boolean | ReadonlySignal<boolean>;
  label?: string; buttonRef?: { current: HTMLDivElement | null };
}) {
  const isDisabled = () => read(disabled ?? false);
  return <div {...(buttonRef ? { ref: buttonRef } : {})} role="button" tabindex={computed(() => (isDisabled() ? -1 : 0))} class={className}
    aria-disabled={computed(() => (isDisabled() ? true : null))} aria-label={label}
    on:click={() => { if (!isDisabled()) onClick(); }} on:keydown={(event) => {
      if (!isDisabled() && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); }
    }}>{children}</div>;
}

function Preview({ cls, configured, overrides, files, activeFile, selected, rejected, rejectedReasons, notice, loading, selectFile, toggle }: {
  cls: Classes; configured: boolean; overrides: ReadonlySignal<Record<string, string>>; files: ReadonlySignal<FileResult[]>; activeFile: ReadonlySignal<FileResult | undefined>;
  selected: ReadonlySignal<Set<string>>; rejected: ReadonlySignal<string[]>; rejectedReasons: ReadonlySignal<string[]>; notice: ReadonlySignal<string | null>; loading: ReadonlySignal<boolean>;
  selectFile: (file: string | null) => void; toggle: (vars: readonly string[], checked: boolean) => void;
}) {
  const empty = computed(() => Object.keys(overrides.value).length === 0);
  const hunks = computed(() => activeFile.value?.hunks ?? []);
  const unknownOutsideBlock = computed(() => activeFile.value?.unknownOutsideBlock ?? []);
  // Keyed by position: a routing map can list the same file more than once.
  const indexedFiles = computed(() => files.value.map((file, index) => ({ file, index })));
  return <Show when={empty} fallback={() => <div>{!configured && <div class={cls.warning}>The host has not configured an apply endpoint or routing map. The preview is read-only.</div>}
    <Show when={computed(() => notice.value !== null)}>{() => <div class={cls.warning} role="status">{computed(() => notice.value ?? '')}</div>}</Show>
    <div class="tokenpanel-apply-preview"><div class="tokenpanel-apply-preview-files">
      <For each={indexedFiles} by={(entry) => entry.index}>{(entry) => {
        const file = computed(() => entry.value.file);
        const vars = computed(() => file.value.changed ?? []);
        const count = computed(() => vars.value.filter((cssVar) => selected.value.has(cssVar)).length);
        const input: { current: HTMLInputElement | null } = { current: null };
        getScope().effect(() => { const checked = count.value > 0; if (input.current) input.current.checked = checked; });
        const choose = () => selectFile(file.value.file ?? null);
        return <div role="button" tabindex={0} class={computed(() => `tokenpanel-apply-preview-file${activeFile.value === file.value ? ' is-selected' : ''}`)}
          on:click={choose} on:keydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } }}>
          <input ref={input} type="checkbox" aria-label={computed(() => `Include ${file.value.file}`)} on:click={(event) => event.stopPropagation()} on:change={(event) => toggle(vars.value, event.currentTarget.checked)} />
          <span class="tokenpanel-apply-preview-file-name">{computed(() => baseName(file.value.file ?? '(unknown file)'))}</span><span class="tokenpanel-apply-preview-file-meta">{computed(() => `${count.value}/${vars.value.length} · ${file.value.blockKind ?? 'unknown'}`)}</span></div>;
      }}</For>
      <Show when={computed(() => rejected.value.length > 0)}>{() => <div class="tokenpanel-apply-preview-unrouted"><div>Not routed — stays browser-only.</div>
        <For each={rejected} by={(cssVar) => cssVar}>{(cssVar, index) => <div><span class="tokenpanel-code">{cssVar}</span>{computed(() => rejectedReasons.value[index.value] ? ` — ${rejectedReasons.value[index.value]}` : '')}</div>}</For>
        <RoleButton class={cls.neutral} aria-label="Copy unrouted tokens as CSS" onClick={() => void navigator.clipboard?.writeText(rejected.value.map((cssVar) => `${cssVar}: ${overrides.value[cssVar]};`).join('\n'))}>Copy as CSS</RoleButton></div>}</Show>
    </div><div class="tokenpanel-apply-preview-diff"><Show when={loading}>{() => <div class={cls.hint} role="status">Refreshing preview…</div>}</Show>
      <Show when={computed(() => unknownOutsideBlock.value.length > 0)}>{() => <div class={cls.warning}>{computed(() => `Found outside the rewritable block: ${unknownOutsideBlock.value.join(', ')}`)}</div>}</Show>
      <For each={hunks} by={(hunk) => hunk.cssVar}>{(hunk) => {
        const on = computed(() => selected.value.has(hunk.value.cssVar));
        const input: { current: HTMLInputElement | null } = { current: null };
        getScope().effect(() => { const checked = on.value; if (input.current) input.current.checked = checked; });
        const contextBefore = computed(() => numbered(hunk.value.context?.before));
        const contextAfter = computed(() => numbered(hunk.value.context?.after));
        return <div class={computed(() => `tokenpanel-apply-preview-hunk${on.value ? '' : ' is-off'}`)}>
          <label class="tokenpanel-apply-preview-hunk-header"><input ref={input} type="checkbox" on:change={(event) => toggle([hunk.value.cssVar], event.currentTarget.checked)} />{computed(() => ` @@ line ${hunk.value.line} · ${hunk.value.cssVar}`)}</label>
          <For each={contextBefore} by={(line) => line.index}>{(line) => <Line kind="context" number={computed(() => hunk.value.line - contextBefore.value.length + line.value.index)} text={computed(() => line.value.text)} />}</For>
          <Line kind="delete" number={computed(() => hunk.value.line)} text={computed(() => `- ${hunk.value.before}`)} /><Line kind="add" number={computed(() => hunk.value.line)} text={computed(() => `+ ${hunk.value.after}`)} />
          <For each={contextAfter} by={(line) => line.index}>{(line) => <Line kind="context" number={computed(() => hunk.value.line + line.value.index + 1)} text={computed(() => line.value.text)} />}</For>
        </div>;
      }}</For>
      <Show when={computed(() => !loading.value && activeFile.value !== undefined && (activeFile.value.hunks?.length ?? 0) === 0)}>{() => <div class={cls.hint}>Exact line preview unavailable for this file.</div>}</Show>
    </div></div></div>}>{() => <div class={cls.warning}>No overrides to apply — make a change first, then come back.</div>}</Show>;
}

function numbered(lines: string[] | undefined): { index: number; text: string }[] {
  return (lines ?? []).map((text, index) => ({ index, text }));
}

function Line({ kind, number, text }: { kind: string; number: ReadonlySignal<number>; text: ReadonlySignal<string> }) {
  return <div class={`tokenpanel-apply-preview-line is-${kind}`}><span class="tokenpanel-apply-preview-line-number">{number}</span><span>{text}</span></div>;
}

function Success({ cls, phase, copyLabel, onCopy }: { cls: Classes; phase: ReadonlySignal<Extract<Phase, { kind: 'success' }> | null>; copyLabel: ReadonlySignal<string>; onCopy: () => void }) {
  const updated = computed(() => phase.value?.response.updated ?? []);
  return <div><div class={cls.success} role="status">Applied successfully.</div><For each={updated} by={(file) => file.file ?? ''}>{(file) => {
    const changed = computed(() => file.value.changed ?? []);
    return <div>
      <div role="heading" aria-level={3} class={cls.heading}>{computed(() => file.value.file ?? '(unknown file)')}</div><div class={cls.hint}>{computed(() => `changed (${changed.value.length})`)}</div>
      <div class={cls.list}><For each={changed} by={(cssVar) => cssVar}>{(cssVar) => <div class={cls.item}><span class="tokenpanel-code">{cssVar}</span></div>}</For></div></div>;
  }}</For>
    <RoleButton class={cls.neutral} onClick={onCopy}>{copyLabel}</RoleButton><div class={cls.revertHint}>To revert, paste this JSON into Load from JSON… and re-apply.</div><div role="none" class={cls.json}>{computed(() => phase.value?.revertJson ?? '')}</div></div>;
}
