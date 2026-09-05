import { useEffect, useId, useMemo, useRef, useState } from 'preact/compat';
import type { ComponentChildren, Ref } from 'preact';
import { buildApplyOverrides } from './apply/build-apply-overrides';
import { writtenCssVarsFromResponse } from './apply/reconcile-applied';
import { routeTokensToFiles } from './apply/route-tokens-to-files';
import { getPanelConfig, modalClass, resolveApplyRouting, resolveSecondaryColorCluster, type PanelConfig } from './config/panel-config';
import { getActivePrimaryCluster, type ColorTweakState, type TweakState } from './state/tweak-state';
import { serialize } from './utils/design-token-serde';
import { useDialogBackdropClose } from './controls/use-dialog-backdrop-close';

const DEBOUNCE_MS = 300;

export interface ApplyModalProps {
  state: TweakState;
  open: boolean;
  onClose: () => void;
  colorDefaults?: ColorTweakState;
  onApplied: (writtenCssVars: string[]) => void;
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

function RoleButton({ className, onClick, children, disabled, label, buttonRef }: {
  className: string; onClick: () => void; children: ComponentChildren; disabled?: boolean;
  label?: string; buttonRef?: Ref<HTMLDivElement>;
}) {
  return <div ref={buttonRef} role="button" tabIndex={disabled ? -1 : 0} className={className}
    aria-disabled={disabled || undefined} aria-label={label}
    onClick={() => { if (!disabled) onClick(); }} onKeyDown={(event) => {
      if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); }
    }}>{children}</div>;
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
    ? buildApplyOverrides({ color: state.secondary, spacing: {}, typography: {}, size: {} }, undefined, secondaryCluster, cfg.tabs, secondaryTab)
    : {};
  return { ...primary, ...secondary };
}

export function ApplyModal(props: ApplyModalProps) {
  const { state, open, onClose, colorDefaults, onApplied } = props;
  const cfg = props.instanceConfig ?? getPanelConfig();
  const cls = useMemo(() => classes(cfg), [cfg]);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const primaryRef = useRef<HTMLDivElement | null>(null);
  const titleId = `${cfg.modalClassPrefix}-apply-title-${useId()}`;
  const [phase, setPhase] = useState<Phase>({ kind: 'preview' });
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const [preview, setPreview] = useState<ApiResponse | null>(null);
  const [catalog, setCatalog] = useState<ApiResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy pre-apply state to clipboard');
  const requestId = useRef(0);
  const previewRef = useRef<ApiResponse | null>(null);
  const previewPromiseRef = useRef<Promise<ApiResponse | null> | null>(null);
  const previewDirtyRef = useRef(false);
  const appliedFired = useRef(false);

  const overrides = useMemo(() => flattenApplyOverrides(state, colorDefaults, cfg), [state, colorDefaults, cfg]);
  const routing = useMemo(() => resolveApplyRouting(cfg), [cfg]);
  const fallback = useMemo(() => routeTokensToFiles(overrides, routing), [overrides, routing]);
  const endpoint = cfg.applyEndpoint;
  const configured = Boolean(endpoint) && Object.keys(routing).length > 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      requestAnimationFrame(() => primaryRef.current?.focus());
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const routable = fallback.groups.flatMap((group) => Object.keys(group.tokens));
    setPhase({ kind: 'preview' }); setPreview(null); previewRef.current = null; setCatalog(null); setNotice(null); setSelected(new Set(routable));
    setSelectionVersion(0);
    setSelectedFile(null); setCopyLabel('Copy pre-apply state to clipboard');
    requestId.current++; previewPromiseRef.current = null; previewDirtyRef.current = false;
    appliedFired.current = false;
    if (configured && Object.keys(overrides).length > 0) previewPromiseRef.current = loadPreview(overrides);
  }, [open, overrides, fallback]);

  async function loadPreview(tokens: Record<string, string>, nextNotice?: string): Promise<ApiResponse | null> {
    if (!endpoint || Object.keys(tokens).length === 0) return null;
    const id = ++requestId.current;
    // This request represents the exact current selection. While it is in
    // flight, Apply may safely await previewPromiseRef; only the debounce gap
    // before this point is unsafe.
    previewDirtyRef.current = false;
    setLoading(true);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens, dryRun: true }) });
      const data = await response.json() as ApiResponse;
      if (id !== requestId.current) return null;
      if (!response.ok) throw new Error(data.error ?? `Preview failed (${response.status})`);
      previewRef.current = data; setPreview(data); if (nextNotice !== undefined) setNotice(nextNotice);
      setCatalog((current) => current ?? data);
      setSelectedFile((current) => current && data.files?.some((file) => file.file === current) ? current : data.files?.[0]?.file ?? null);
      return data;
    } catch {
      if (id !== requestId.current) return null;
      setPreview(null); setNotice('Live diff preview is unavailable; showing the routing-only preview.');
      return null;
    } finally {
      if (id === requestId.current) {
        previewDirtyRef.current = false;
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!open || !configured || phase.kind !== 'preview' || selectionVersion === 0) return;
    const tokens = Object.fromEntries(Object.entries(overrides).filter(([cssVar]) => selected.has(cssVar)));
    if (Object.keys(tokens).length === 0) {
      requestId.current++;
      previewPromiseRef.current = null;
      previewRef.current = null;
      previewDirtyRef.current = false;
      setPreview(null);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => { previewPromiseRef.current = loadPreview(tokens); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, configured, phase.kind, overrides, selected, selectionVersion]);

  function handleClose() {
    const current = phaseRef.current;
    if (current.kind === 'success' && !appliedFired.current) { appliedFired.current = true; onApplied(current.written); }
    onClose();
  }
  function close() {
    if (phaseRef.current.kind === 'applying') return;
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.close === 'function') dialog.close();
    else { dialog?.removeAttribute('open'); handleClose(); }
  }
  const backdrop = useDialogBackdropClose(dialogRef, close);

  async function apply() {
    if (!endpoint || loading || previewDirtyRef.current) return;
    const tokens = Object.fromEntries(Object.entries(overrides).filter(([cssVar]) => selected.has(cssVar)));
    setPhase({ kind: 'applying' });
    try {
      const latestPreview = await (previewPromiseRef.current ?? Promise.resolve(previewRef.current));
      const expectDigests = Object.fromEntries((latestPreview?.files ?? []).filter((file) => file.file && file.digest).map((file) => [file.file!, file.digest!]));
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens, expectDigests }) });
      const data = await response.json() as ApiResponse;
      if (response.status === 409 && data.reason === 'stale-file') {
        setCatalog(null);
        setNotice('Files changed on disk. Review the refreshed preview before writing.');
        setPhase({ kind: 'preview' });
        previewPromiseRef.current = loadPreview(tokens);
        await previewPromiseRef.current;
        return;
      }
      if (!response.ok) { setPhase({ kind: 'error', message: data.error ? `Apply failed (${response.status}): ${data.error}` : `Apply failed (${response.status} ${response.statusText || 'error'}).` }); return; }
      const written = writtenCssVarsFromResponse(data);
      const revertJson = JSON.stringify(serialize(state, { colorDefaults }, cfg), null, 2);
      setPhase({ kind: 'success', response: data, revertJson, written });
    } catch (error) { setPhase({ kind: 'error', message: `Network error: ${error instanceof Error ? error.message : String(error)}` }); }
  }

  const files: FileResult[] = (catalog?.files ?? preview?.files) ?? fallback.groups.map((group) => ({ file: group.relativePath, blockKind: group.prefix, changed: Object.keys(group.tokens), hunks: [] }));
  const rejected = catalog?.rejected ?? preview?.rejected ?? fallback.rejected;
  const rejectedReasons = catalog?.rejectedReasons ?? preview?.rejectedReasons ?? fallback.rejectedReasons;
  const activeFile = files.find((file) => file.file === selectedFile) ?? files[0];
  const selectedFiles = files.filter((file) => file.changed?.some((cssVar) => selected.has(cssVar))).length;
  const disabled = !configured || loading || selected.size === 0 || selectedFiles === 0;
  const toggle = (vars: readonly string[], checked: boolean) => {
    // Invalidate the previous subset immediately, before the debounced request
    // starts. Otherwise a rapid re-select + Write can submit a newly included
    // file with the prior subset's (incomplete) digest map.
    requestId.current++;
    previewPromiseRef.current = null;
    previewRef.current = null;
    previewDirtyRef.current = configured;
    if (configured) setLoading(true);
    setSelected((old) => {
      const next = new Set(old);
      for (const cssVar of vars) {
        if (checked) next.add(cssVar);
        else next.delete(cssVar);
      }
      return next;
    });
    setSelectionVersion((version) => version + 1);
  };

  return <dialog ref={dialogRef} className={cls.dialog} data-design-token-panel-modal="" data-design-token-panel-modal-variant="apply"
    aria-labelledby={titleId} onClose={handleClose} onCancel={(event) => { if (phaseRef.current.kind === 'applying') event.preventDefault(); }}
    onMouseDown={backdrop.onMouseDown} onClick={backdrop.onClick}>
    <div className={cls.header}><div id={titleId} role="heading" aria-level={2} className={cls.title}>Apply design tokens to codebase</div>
      <RoleButton className={cls.close} label="Close apply modal" onClick={close}>×</RoleButton></div>
    <div>
      {phase.kind === 'preview' && <Preview cls={cls} configured={configured} overrides={overrides} files={files} activeFile={activeFile}
        selected={selected} rejected={rejected} rejectedReasons={rejectedReasons} notice={notice} loading={loading}
        selectFile={setSelectedFile} toggle={toggle} />}
      {phase.kind === 'applying' && <div className={cls.applying} role="status"><span className={cls.spinner} aria-hidden="true" /><span>Applying changes…</span></div>}
      {phase.kind === 'success' && <Success cls={cls} phase={phase} copyLabel={copyLabel} onCopy={() => {
        void navigator.clipboard?.writeText(phase.revertJson).then(() => { setCopyLabel('Copied!'); window.setTimeout(() => setCopyLabel('Copy pre-apply state to clipboard'), 2000); });
      }} />}
      {phase.kind === 'error' && <div className={cls.error} role="alert">{phase.message}</div>}
    </div>
    <div className={cls.actions}>
      {phase.kind === 'preview' && <><RoleButton buttonRef={primaryRef} className={cls.primary} disabled={disabled} onClick={() => void apply()}>Write {selectedFiles} file{selectedFiles === 1 ? '' : 's'} ({selected.size} tokens)</RoleButton><RoleButton className={cls.neutral} onClick={close}>Close</RoleButton></>}
      {phase.kind === 'applying' && <RoleButton className={cls.primary} disabled onClick={() => undefined}>Applying…</RoleButton>}
      {phase.kind === 'success' && <RoleButton className={cls.primary} onClick={close}>Done</RoleButton>}
      {phase.kind === 'error' && <><RoleButton className={cls.primary} onClick={() => { setPhase({ kind: 'preview' }); setSelectionVersion((version) => version + 1); }}>Retry</RoleButton><RoleButton className={cls.neutral} onClick={close}>Close</RoleButton></>}
    </div>
  </dialog>;
}

function Preview({ cls, configured, overrides, files, activeFile, selected, rejected, rejectedReasons, notice, loading, selectFile, toggle }: {
  cls: Classes; configured: boolean; overrides: Record<string, string>; files: FileResult[]; activeFile?: FileResult;
  selected: Set<string>; rejected: string[]; rejectedReasons: string[]; notice: string | null; loading: boolean;
  selectFile: (file: string | null) => void; toggle: (vars: readonly string[], checked: boolean) => void;
}) {
  if (Object.keys(overrides).length === 0) return <div className={cls.warning}>No overrides to apply — make a change first, then come back.</div>;
  return <div>{!configured && <div className={cls.warning}>The host has not configured an apply endpoint or routing map. The preview is read-only.</div>}
    {notice && <div className={cls.warning} role="status">{notice}</div>}
    <div className="tokenpanel-apply-preview"><div className="tokenpanel-apply-preview-files">
      {files.map((file) => { const vars = file.changed ?? []; const count = vars.filter((cssVar) => selected.has(cssVar)).length; return <div key={file.file}
        role="button" tabIndex={0} className={`tokenpanel-apply-preview-file${activeFile === file ? ' is-selected' : ''}`}
        onClick={() => selectFile(file.file ?? null)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectFile(file.file ?? null); } }}>
        <input type="checkbox" checked={count > 0} aria-label={`Include ${file.file}`} onClick={(event) => event.stopPropagation()} onChange={(event) => toggle(vars, event.currentTarget.checked)} />
        <span className="tokenpanel-apply-preview-file-name">{baseName(file.file ?? '(unknown file)')}</span><span className="tokenpanel-apply-preview-file-meta">{count}/{vars.length} · {file.blockKind ?? 'unknown'}</span></div>; })}
      {rejected.length > 0 && <div className="tokenpanel-apply-preview-unrouted"><div>Not routed — stays browser-only.</div>
        {rejected.map((cssVar, index) => <div key={cssVar}><span className="tokenpanel-code">{cssVar}</span>{rejectedReasons[index] ? ` — ${rejectedReasons[index]}` : ''}</div>)}
        <RoleButton className={cls.neutral} label="Copy unrouted tokens as CSS" onClick={() => void navigator.clipboard?.writeText(rejected.map((cssVar) => `${cssVar}: ${overrides[cssVar]};`).join('\n'))}>Copy as CSS</RoleButton></div>}
    </div><div className="tokenpanel-apply-preview-diff">{loading && <div className={cls.hint} role="status">Refreshing preview…</div>}
      {activeFile?.unknownOutsideBlock?.length ? <div className={cls.warning}>Found outside the rewritable block: {activeFile.unknownOutsideBlock.join(', ')}</div> : null}
      {(activeFile?.hunks ?? []).map((hunk) => <div key={hunk.cssVar} className={`tokenpanel-apply-preview-hunk${selected.has(hunk.cssVar) ? '' : ' is-off'}`}>
        <label className="tokenpanel-apply-preview-hunk-header"><input type="checkbox" checked={selected.has(hunk.cssVar)} onChange={(event) => toggle([hunk.cssVar], event.currentTarget.checked)} /> @@ line {hunk.line} · {hunk.cssVar}</label>
        {hunk.context?.before?.map((text, index) => <Line key={`b${index}`} kind="context" number={hunk.line - (hunk.context?.before?.length ?? 0) + index} text={text} />)}
        <Line kind="delete" number={hunk.line} text={`- ${hunk.before}`} /><Line kind="add" number={hunk.line} text={`+ ${hunk.after}`} />
        {hunk.context?.after?.map((text, index) => <Line key={`a${index}`} kind="context" number={hunk.line + index + 1} text={text} />)}
      </div>)}
      {!loading && activeFile && (activeFile.hunks?.length ?? 0) === 0 && <div className={cls.hint}>Exact line preview unavailable for this file.</div>}
    </div></div></div>;
}

function Line({ kind, number, text }: { kind: string; number: number; text: string }) {
  return <div className={`tokenpanel-apply-preview-line is-${kind}`}><span className="tokenpanel-apply-preview-line-number">{number}</span><span>{text}</span></div>;
}

function Success({ cls, phase, copyLabel, onCopy }: { cls: Classes; phase: Extract<Phase, { kind: 'success' }>; copyLabel: string; onCopy: () => void }) {
  return <div><div className={cls.success} role="status">Applied successfully.</div>{(phase.response.updated ?? []).map((file) => <div key={file.file}>
    <div role="heading" aria-level={3} className={cls.heading}>{file.file ?? '(unknown file)'}</div><div className={cls.hint}>changed ({file.changed?.length ?? 0})</div>
    <div className={cls.list}>{file.changed?.map((cssVar) => <div className={cls.item} key={cssVar}><span className="tokenpanel-code">{cssVar}</span></div>)}</div></div>)}
    <RoleButton className={cls.neutral} onClick={onCopy}>{copyLabel}</RoleButton><div className={cls.revertHint}>To revert, paste this JSON into Load from JSON… and re-apply.</div><div role="none" className={cls.json}>{phase.revertJson}</div></div>;
}
