/**
 * Apply modal — previews the diff between the current `TweakState` and the
 * scheme defaults, then POSTs the diff to the dev-only
 * `/api/dev/design-tokens-apply` endpoint so the tweaks are written back into
 * `tokens.css` / `zaudio-tokens.css` on disk.
 *
 * Wiring summary (Sub 14)
 * -----------------------
 * - Diff building is delegated to `./apply/build-apply-overrides`, which
 *   consumes the new `ColorTweakState` shape (palette + semanticMappings) and
 *   emits the flat `{ cssVar: value }` map using Sub 2's `SEMANTIC_CSS_NAMES`.
 * - Per-file grouping (for the preview and for the success view) uses
 *   `./apply/route-tokens-to-files` — the exact same routing the dev-API
 *   handler runs server-side, so the preview matches the server's view of the
 *   world byte-for-byte.
 * - Styling uses bundled BEM classes derived from `panelConfig.modalClassPrefix`
 *   via `modalClass(...)` (Sub 5b, #1556). The matching CSS lives in
 *   `styles/panel.css` keyed on the default prefix `zmod-design-token-panel-modal*`;
 *   consumers that override the prefix opt out of bundled CSS and ship their
 *   own. No Tailwind classes remain.
 *
 * Dialog lifecycle (unchanged)
 * ----------------------------
 * Uses the native `<dialog>` element. Every dismissal path (× / backdrop /
 * Escape / programmatic close) routes through `dialog.close()`, which fires
 * the native `close` event exactly once; `onClose` then fires exactly once
 * per dismissal regardless of the path taken.
 */

import { useEffect, useMemo, useRef, useState } from 'preact/compat';
import { buildApplyOverrides } from './apply/build-apply-overrides';
import { routeTokensToFiles, type RouteGroup } from './apply/route-tokens-to-files';
import {
  getPanelConfig,
  modalClass,
  resolveApplyRouting,
  resolveSecondaryColorCluster,
} from './config/panel-config';
import { type ColorTweakState, type TweakState } from './state/tweak-state';
import { serialize } from './utils/design-token-serde';

const COPY_REVERT_MS = 2000;

export interface ApplyModalProps {
  state: TweakState;
  open: boolean;
  onClose: () => void;
  /**
   * Scheme baseline used to diff the current `state.color` against when
   * computing the flat cssVar overrides. When absent, the entire color block
   * is treated as changed — useful for tests, but real callers (the panel
   * itself) always pass the active scheme's initial `ColorTweakState`.
   */
  colorDefaults?: ColorTweakState;
  /**
   * Fired exactly once after the user confirms a successful apply by clicking
   * "Done". The parent is expected to clear the persisted state envelope,
   * clear any inline-applied styles, and reset in-memory state to empty.
   */
  onApplied: () => void;
}

/**
 * Shape of a per-file result block in the API response.
 *
 * The handler ships `{ ok, updated: [...], unknownCssVars, unchangedCssVars }`;
 * each `updated` entry matches this shape. We keep every field optional so a
 * response that predates the latest handler still renders cleanly.
 */
interface ApplyFileResult {
  file?: string;
  changed?: string[];
  unknown?: string[];
  unchanged?: string[];
}

interface ApplyResponse {
  ok?: boolean;
  updated?: ApplyFileResult[];
  unknownCssVars?: string[];
  unchangedCssVars?: string[];
  error?: string;
  /** Legacy / fallback shape: results keyed by file name. */
  [file: string]: unknown;
}

type Phase =
  | { kind: 'preview' }
  | { kind: 'applying' }
  | { kind: 'success'; response: ApplyResponse; previewJson: string }
  | { kind: 'error'; message: string };

const INITIAL_PHASE: Phase = { kind: 'preview' };

type CopyLabel = 'Copy pre-apply state to clipboard' | 'Copied!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pretty-print the pre-apply diff JSON so the success view can offer it as a
 * revert blob. The user pastes this back into Import → Apply to roll the
 * change back.
 */
function buildPreviewJson(state: TweakState, colorDefaults: ColorTweakState | undefined): string {
  return JSON.stringify(serialize(state, { colorDefaults }), null, 2);
}

/**
 * Normalize whatever shape the dev-API returned into a uniform list. Accepts
 * all three historical shapes:
 *
 *   - `{ updated: [...] }`   — current handler (post Sub 1454)
 *   - `{ results: [...] }`   — intermediate shape
 *   - `{ "tokens.css": {...} }` — very early shape
 */
function normalizeResults(response: ApplyResponse): ApplyFileResult[] {
  if (Array.isArray(response.updated)) return response.updated;
  const legacyResults = (response as { results?: unknown }).results;
  if (Array.isArray(legacyResults)) return legacyResults as ApplyFileResult[];

  const out: ApplyFileResult[] = [];
  for (const [key, value] of Object.entries(response)) {
    if (
      key === 'updated' ||
      key === 'results' ||
      key === 'ok' ||
      key === 'unknownCssVars' ||
      key === 'unchangedCssVars' ||
      key === 'error' ||
      value === null ||
      typeof value !== 'object'
    ) {
      continue;
    }
    const entry = value as Record<string, unknown>;
    const changed = Array.isArray(entry.changed) ? (entry.changed as string[]) : undefined;
    const unknown = Array.isArray(entry.unknown) ? (entry.unknown as string[]) : undefined;
    const unchanged = Array.isArray(entry.unchanged) ? (entry.unchanged as string[]) : undefined;
    if (changed || unknown || unchanged) {
      out.push({ file: key, changed, unknown, unchanged });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// BEM modal classes — derived at render time from `panelConfig.modalClassPrefix`
// ---------------------------------------------------------------------------
//
// CSS rules backing these classes live in `styles/panel.css` under the
// default prefix `zmod-design-token-panel-modal*`. Consumers that override
// `modalClassPrefix` opt out of bundled CSS and ship their own — see the
// "Modal layer" header in panel.css for the full rationale.
//
// `buildClasses(cfg)` is pure, so we memo it per-cfg-object inside the
// component and pass the result down to body subviews as a single bag.

interface ModalClasses {
  dialog: string;
  header: string;
  title: string;
  closeButton: string;
  hint: string;
  sectionHeading: string;
  list: string;
  listItem: string;
  actions: string;
  primaryButton: string;
  neutralButton: string;
  statusWarning: string;
  statusSuccess: string;
  statusError: string;
  applying: string;
  spinner: string;
  revertHint: string;
  jsonBlock: string;
}

function buildClasses(cfg: ReturnType<typeof getPanelConfig>): ModalClasses {
  return {
    dialog: `${modalClass(cfg, '')} ${modalClass(cfg, '--apply')}`,
    header: modalClass(cfg, '__header'),
    title: modalClass(cfg, '__title'),
    closeButton: modalClass(cfg, '__close-button'),
    hint: modalClass(cfg, '__hint'),
    sectionHeading: modalClass(cfg, '__section-heading'),
    list: modalClass(cfg, '__list'),
    listItem: modalClass(cfg, '__list-item'),
    actions: modalClass(cfg, '__actions'),
    primaryButton: `${modalClass(cfg, '__button')} ${modalClass(cfg, '__button--primary')}`,
    neutralButton: modalClass(cfg, '__button'),
    statusWarning: `${modalClass(cfg, '__status')} ${modalClass(cfg, '__status--warning')}`,
    statusSuccess: `${modalClass(cfg, '__status')} ${modalClass(cfg, '__status--success')}`,
    statusError: `${modalClass(cfg, '__status')} ${modalClass(cfg, '__status--error')}`,
    applying: modalClass(cfg, '__applying'),
    spinner: modalClass(cfg, '__spinner'),
    revertHint: modalClass(cfg, '__revert-hint'),
    jsonBlock: modalClass(cfg, '__json'),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplyModal(props: ApplyModalProps) {
  const { state, open, onClose, colorDefaults, onApplied } = props;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const cfg = getPanelConfig();
  const cls = useMemo(() => buildClasses(cfg), [cfg]);

  // Stable id for aria-labelledby (PR #1440 review item Q1). Native
  // <dialog>.showModal() implies aria-modal=true, so only the title pointer
  // is needed.
  const titleId = `${cfg.modalClassPrefix}-apply-title`;

  const [phase, setPhase] = useState<Phase>(INITIAL_PHASE);
  const [copyLabel, setCopyLabel] = useState<CopyLabel>('Copy pre-apply state to clipboard');

  // Drive the native dialog from the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const isOpen = dialog.open;
    if (open && !isOpen) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      // Focus the primary action on open. Native <dialog>.close() restores
      // focus to the trigger automatically (PR #1440 review item Q2).
      window.requestAnimationFrame(() => {
        primaryButtonRef.current?.focus();
      });
    } else if (!open && isOpen) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  // Reset transient UI every time the modal re-opens.
  useEffect(() => {
    if (!open) return;
    setPhase(INITIAL_PHASE);
    setCopyLabel('Copy pre-apply state to clipboard');
  }, [open]);

  // Revert the copy label after COPY_REVERT_MS.
  useEffect(() => {
    if (copyLabel !== 'Copied!') return;
    const id = window.setTimeout(
      () => setCopyLabel('Copy pre-apply state to clipboard'),
      COPY_REVERT_MS,
    );
    return () => window.clearTimeout(id);
  }, [copyLabel]);

  const flattenedOverrides = useMemo(() => {
    // Primary zd cluster — diffed against the scheme baseline.
    const zdOverrides = buildApplyOverrides(state, colorDefaults);
    // Optional secondary cluster (Sub S5b, #1589). Three short-circuits:
    //
    //   1. Host opted out (`secondaryColorCluster: null`) — `secondaryCluster`
    //      is null → emit no secondary keys.
    //   2. Host kept the default but the persist envelope has no secondary
    //      slice yet — `state.secondary` undefined → skip.
    //   3. Otherwise — diff against `undefined` (no scheme baseline yet)
    //      and merge into the flat overrides. The shallow
    //      `{ ...state, color: state.secondary }` swap lets
    //      `buildApplyOverrides` reuse its existing logic without
    //      signature changes.
    const secondaryCluster = resolveSecondaryColorCluster(cfg);
    const secondaryOverrides =
      secondaryCluster && state.secondary
        ? buildApplyOverrides({ ...state, color: state.secondary }, undefined, secondaryCluster)
        : {};
    return { ...zdOverrides, ...secondaryOverrides };
  }, [state, colorDefaults, cfg]);
  const applyRouting = useMemo(() => resolveApplyRouting(cfg), [cfg]);
  const { groups, rejected, rejectedReasons } = useMemo(
    () => routeTokensToFiles(flattenedOverrides, applyRouting),
    [flattenedOverrides, applyRouting],
  );
  const totalCount = useMemo(() => Object.keys(flattenedOverrides).length, [flattenedOverrides]);
  const isEmpty = totalCount === 0;
  const hasRoutableEntries = groups.length > 0;
  // PR #1440 review item P0-3 — Apply button is gated on the host having
  // configured both an endpoint AND a non-empty routing map. Either one
  // missing means the modal still renders (so the user can preview the
  // diff), but the primary action is disabled with a tooltip explaining
  // why. Non-zmod hosts that only want export/import opt out of apply by
  // omitting these fields entirely.
  const applyEndpoint = cfg.applyEndpoint;
  const applyConfigured = Boolean(applyEndpoint) && Object.keys(applyRouting).length > 0;

  async function runApply() {
    if (!applyEndpoint) {
      // Defensive — runApply should never be reachable when applyEndpoint is
      // missing (the primary button is disabled). Surface a clear error
      // instead of POSTing to undefined.
      setPhase({
        kind: 'error',
        message: 'Apply is not configured: PanelConfig.applyEndpoint is missing.',
      });
      return;
    }
    // Snapshot the pre-apply JSON now so the success view can still show it
    // after the parent clears persisted state in `onApplied`.
    const previewJson = buildPreviewJson(state, colorDefaults);
    setPhase({ kind: 'applying' });

    try {
      const response = await fetch(applyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: flattenedOverrides }),
      });

      if (!response.ok) {
        let serverMessage = '';
        try {
          const text = await response.text();
          if (text) {
            try {
              const parsed = JSON.parse(text) as { error?: string; message?: string };
              serverMessage = parsed.error ?? parsed.message ?? text;
            } catch {
              serverMessage = text;
            }
          }
        } catch {
          // Response.text() is unlikely to throw, but keep the failure path
          // robust either way.
        }
        const message = serverMessage
          ? `Apply failed (${response.status}): ${serverMessage}`
          : `Apply failed (${response.status} ${response.statusText || 'error'}).`;
        setPhase({ kind: 'error', message });
        return;
      }

      let data: ApplyResponse = {};
      try {
        data = (await response.json()) as ApplyResponse;
      } catch {
        // Non-JSON success — treat as an empty success envelope.
        data = {};
      }

      setPhase({ kind: 'success', response: data, previewJson });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ kind: 'error', message: `Network error: ${message}` });
    }
  }

  function handleCopyPreApplyState(json: string) {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) return;
    clipboard.writeText(json).then(
      () => setCopyLabel('Copied!'),
      () => {
        // Browser denied clipboard access — swallow silently so we don't
        // clobber the "Copied!" affordance.
      },
    );
  }

  function handleDone() {
    onApplied();
    requestClose();
  }

  function handleRetry() {
    setPhase(INITIAL_PHASE);
  }

  function handleClose() {
    onClose();
  }

  function requestClose() {
    const dialog = dialogRef.current;
    if (!dialog) {
      onClose();
      return;
    }
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      onClose();
    }
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      requestClose();
    }
  }

  // Primary-button label changes to reflect what files the apply will edit
  // (when host-configured) or that apply is unavailable. Falling back to the
  // legacy zmod-flavoured label only when the routing matches zmod's path.
  const routingFiles = useMemo(
    () =>
      Object.values(applyRouting)
        .map((p) => {
          const slash = p.lastIndexOf('/');
          return slash >= 0 ? p.slice(slash + 1) : p;
        })
        .join(' / '),
    [applyRouting],
  );
  const primaryLabel =
    phase.kind === 'applying'
      ? 'Applying…'
      : applyConfigured
        ? `Apply to ${routingFiles}`
        : 'Apply (host not configured)';

  return (
    <dialog
      ref={dialogRef}
      className={cls.dialog}
      data-design-token-panel-modal=""
      data-design-token-panel-modal-variant="apply"
      aria-labelledby={titleId}
      onClose={handleClose}
      onClick={handleBackdropClick}
    >
      <header className={cls.header}>
        <h2 id={titleId} className={cls.title}>
          Apply design tokens to codebase
        </h2>
        <button
          className={cls.closeButton}
          type="button"
          aria-label="Close apply modal"
          onClick={requestClose}
        >
          ×
        </button>
      </header>

      <div>
        {phase.kind === 'preview' && (
          <PreviewBody
            cls={cls}
            groups={groups}
            rejected={rejected}
            rejectedReasons={rejectedReasons}
            totalCount={totalCount}
            isEmpty={isEmpty}
            applyConfigured={applyConfigured}
          />
        )}
        {phase.kind === 'applying' && <ApplyingBody cls={cls} />}
        {phase.kind === 'success' && (
          <SuccessBody
            cls={cls}
            results={normalizeResults(phase.response)}
            unknownCssVars={
              Array.isArray(phase.response.unknownCssVars)
                ? (phase.response.unknownCssVars as string[])
                : []
            }
            previewJson={phase.previewJson}
            copyLabel={copyLabel}
            onCopy={() => handleCopyPreApplyState(phase.previewJson)}
          />
        )}
        {phase.kind === 'error' && <ErrorBody cls={cls} message={phase.message} />}
      </div>

      <div className={cls.actions}>
        {phase.kind === 'preview' && (
          <>
            <button
              ref={primaryButtonRef}
              className={cls.primaryButton}
              type="button"
              disabled={isEmpty || !hasRoutableEntries || !applyConfigured}
              onClick={runApply}
              title={
                !applyConfigured
                  ? 'Host has not configured an apply endpoint or routing map. The Apply modal can preview the diff but cannot rewrite source files.'
                  : undefined
              }
            >
              {primaryLabel}
            </button>
            <button className={cls.neutralButton} type="button" onClick={requestClose}>
              Close
            </button>
          </>
        )}

        {phase.kind === 'applying' && (
          <button className={cls.primaryButton} type="button" disabled>
            {primaryLabel}
          </button>
        )}

        {phase.kind === 'success' && (
          <button className={cls.primaryButton} type="button" onClick={handleDone}>
            Done
          </button>
        )}

        {phase.kind === 'error' && (
          <>
            <button className={cls.primaryButton} type="button" onClick={handleRetry}>
              Retry
            </button>
            <button className={cls.neutralButton} type="button" onClick={requestClose}>
              Close
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Body subviews
// ---------------------------------------------------------------------------

interface PreviewBodyProps {
  cls: ModalClasses;
  groups: RouteGroup[];
  rejected: string[];
  rejectedReasons: string[];
  totalCount: number;
  isEmpty: boolean;
  applyConfigured: boolean;
}

function PreviewBody({
  cls,
  groups,
  rejected,
  rejectedReasons,
  totalCount,
  isEmpty,
  applyConfigured,
}: PreviewBodyProps) {
  if (isEmpty) {
    return (
      <p className={cls.statusWarning}>
        No overrides to apply — make a change first, then come back.
      </p>
    );
  }

  const routableCount = groups.reduce((sum, g) => sum + Object.keys(g.tokens).length, 0);

  return (
    <>
      {!applyConfigured && (
        <p className={cls.statusWarning}>
          The host has not configured an apply endpoint or routing map. The diff below is read-only
          — the Apply button will stay disabled.
        </p>
      )}
      <p className={cls.hint}>
        {routableCount} override{routableCount === 1 ? '' : 's'} will be written to disk.
        {routableCount !== totalCount && (
          <>
            {' '}
            {totalCount - routableCount} entr
            {totalCount - routableCount === 1 ? 'y' : 'ies'} were skipped (no route configured).
          </>
        )}
      </p>
      {groups.map((group) => (
        <div key={group.prefix}>
          <h3 className={cls.sectionHeading}>
            {fileLabelForPath(group.relativePath)} ({Object.keys(group.tokens).length})
          </h3>
          <ul className={cls.list}>
            {Object.entries(group.tokens).map(([cssVar, value]) => (
              <li className={cls.listItem} key={cssVar}>
                <code>{cssVar}</code>: <code>{value}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {rejected.length > 0 && (
        <div>
          <h3 className={cls.sectionHeading}>Skipped — no route configured ({rejected.length})</h3>
          <ul className={cls.list}>
            {rejected.map((cssVar, i) => (
              <li className={cls.listItem} key={cssVar}>
                <code>{cssVar}</code>
                {rejectedReasons[i] ? (
                  <>
                    {' '}
                    — <span>{rejectedReasons[i]}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ApplyingBody({ cls }: { cls: ModalClasses }) {
  return (
    <div className={cls.applying} role="status" aria-live="polite">
      <span className={cls.spinner} aria-hidden="true" />
      <span>Applying changes…</span>
    </div>
  );
}

interface SuccessBodyProps {
  cls: ModalClasses;
  results: ApplyFileResult[];
  unknownCssVars: string[];
  previewJson: string;
  copyLabel: CopyLabel;
  onCopy: () => void;
}

function SuccessBody({
  cls,
  results,
  unknownCssVars,
  previewJson,
  copyLabel,
  onCopy,
}: SuccessBodyProps) {
  return (
    <div>
      <p className={cls.statusSuccess} role="status">
        Applied successfully.
      </p>

      {results.length === 0 ? (
        <p className={cls.hint}>The server returned no per-file details.</p>
      ) : (
        results.map((result) => (
          <div key={result.file ?? 'unknown-file'}>
            <h3 className={cls.sectionHeading}>{result.file ?? '(unknown file)'}</h3>
            <FileResultList cls={cls} label="changed" values={result.changed} />
            <FileResultList cls={cls} label="unknown" values={result.unknown} />
            <FileResultList cls={cls} label="unchanged" values={result.unchanged} />
          </div>
        ))
      )}

      {unknownCssVars.length > 0 && (
        <p className={cls.statusWarning}>
          {unknownCssVars.length} cssVar{unknownCssVars.length === 1 ? '' : 's'} did not match any
          entry in the target file(s). Check the list above.
        </p>
      )}

      <button className={cls.neutralButton} type="button" onClick={onCopy} aria-live="polite">
        {copyLabel}
      </button>
      <p className={cls.revertHint}>
        To revert, paste this JSON into Load from JSON… and re-apply.
      </p>
      <pre className={cls.jsonBlock}>{previewJson}</pre>
    </div>
  );
}

interface FileResultListProps {
  cls: ModalClasses;
  label: string;
  values: string[] | undefined;
}

function FileResultList({ cls, label, values }: FileResultListProps) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className={cls.hint}>
        {label} ({values.length})
      </p>
      <ul className={cls.list}>
        {values.map((cssVar) => (
          <li className={cls.listItem} key={cssVar}>
            <code>{cssVar}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ErrorBodyProps {
  cls: ModalClasses;
  message: string;
}

function ErrorBody({ cls, message }: ErrorBodyProps) {
  return (
    <div>
      <p className={cls.statusError} role="alert">
        {message}
      </p>
      <p className={cls.hint}>
        Your edits are still intact — click Retry to send the same diff again, or Close to keep
        editing.
      </p>
    </div>
  );
}

/**
 * Render a routing path as a basename — the panel cares about the file name,
 * not the full repo-relative path.
 */
function fileLabelForPath(full: string): string {
  if (!full) return '(unknown file)';
  const slash = full.lastIndexOf('/');
  return slash >= 0 ? full.slice(slash + 1) : full;
}
