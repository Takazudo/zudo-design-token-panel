import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/compat';
import type { JSX } from 'preact';
import { RoleButton } from '../controls/role-button';
import type { PanelConfig } from '../config/panel-config';
import type { ColorBaseline } from '../utils/token-diff';
import { changedEntries, formatCssDeclarations } from '../utils/token-diff';
import type { TweakState } from '../state/tweak-state';
import type { TokenIndex } from '../utils/token-index';
import { copyToClipboard } from '../utils/copy-to-clipboard';

export const COPY_REVERT_MS = 2000;

export interface ChangedFooterContentProps {
  index: TokenIndex;
  state: TweakState;
  baseline: ColorBaseline;
  cfg: PanelConfig;
  onRevertAll: () => void;
}

/** Footer summary + evaluator-backed Copy diff / Revert all actions. */
export function ChangedFooterContent({
  index,
  state,
  baseline,
  cfg,
  onRevertAll,
}: ChangedFooterContentProps): JSX.Element {
  const entries = useMemo(
    () => changedEntries(index.entries, state, baseline, cfg),
    [baseline, cfg, index.entries, state],
  );
  const total = entries.length;
  const tabCount = useMemo(
    () => new Set(entries.map((entry) => entry.address.tabId)).size,
    [entries],
  );
  const [copyLabel, setCopyLabel] = useState('Copy diff');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    const css = formatCssDeclarations(entries, state, cfg);
    const ok = await copyToClipboard(css);
    setCopyLabel(ok ? 'Copied!' : 'Failed');
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyLabel('Copy diff'), COPY_REVERT_MS);
  }, [cfg, entries, state]);

  return (
    <div className="tokenpanel-changed-footer-content">
      <span className="tokenpanel-changed-summary" data-testid="tokenpanel-changed-summary" role="status" aria-live="polite">
        {total > 0
          ? <><span className="tokenpanel-changed-summary-count">{total}</span> token{total === 1 ? '' : 's'} changed across <span className="tokenpanel-changed-summary-count">{tabCount}</span> tab{tabCount === 1 ? '' : 's'}</>
          : 'No changes — page is at manifest defaults'}
      </span>
      <span className="tokenpanel-changed-footer-spacer" />
      <RoleButton
        className="tokenpanel-action-link tokenpanel-changed-copy"
        aria-label="Copy changed token diff"
        aria-disabled={total === 0}
        onClick={() => void handleCopy()}
      >
        {copyLabel}
      </RoleButton>
      <RoleButton
        className="tokenpanel-action-link tokenpanel-changed-revert-all"
        aria-label="Revert all changed tokens"
        aria-disabled={total === 0}
        onClick={onRevertAll}
      >
        Revert all
      </RoleButton>
    </div>
  );
}

export const ChangedFooter = ChangedFooterContent;
