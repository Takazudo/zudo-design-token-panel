/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { RoleButton } from '../controls/role-button';
import type { PanelConfig } from '../config/panel-config';
import type { ColorBaseline } from '../utils/token-diff';
import { changedEntries, formatCssDeclarations } from '../utils/token-diff';
import type { TweakState } from '../state/tweak-state';
import type { TokenIndex } from '../utils/token-index';
import { copyToClipboard } from '../utils/copy-to-clipboard';
import { Rebuild } from '../zr/rebuild';

export const COPY_REVERT_MS = 2000;

export interface ChangedFooterContentProps {
  index: TokenIndex;
  state: ReadonlySignal<TweakState>;
  baseline: ReadonlySignal<ColorBaseline>;
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
}: ChangedFooterContentProps) {
  const entries = computed(() => changedEntries(index.entries, state.value, baseline.value, cfg));
  const summary = computed(() => {
    const list = entries.value;
    return `${list.length}|${new Set(list.map((entry) => entry.address.tabId)).size}`;
  });
  const total = computed(() => entries.value.length);
  const copyLabel = signal('Copy diff');
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  getScope().onCleanup(() => {
    if (copyTimer !== null) clearTimeout(copyTimer);
  });

  const handleCopy = async () => {
    const css = formatCssDeclarations(entries.value, state.value, cfg);
    const ok = await copyToClipboard(css);
    copyLabel.value = ok ? 'Copied!' : 'Failed';
    if (copyTimer !== null) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyLabel.value = 'Copy diff';
    }, COPY_REVERT_MS);
  };

  return (
    <div class="tokenpanel-changed-footer-content">
      <span class="tokenpanel-changed-summary" data-testid="tokenpanel-changed-summary" role="status" aria-live="polite">
        <Rebuild value={summary}>
          {(key) => {
            const [count, tabs] = key.split('|').map(Number);
            return count > 0
              ? [
                  <span class="tokenpanel-changed-summary-count">{String(count)}</span>,
                  ` token${count === 1 ? '' : 's'} changed across `,
                  <span class="tokenpanel-changed-summary-count">{String(tabs)}</span>,
                  ` tab${tabs === 1 ? '' : 's'}`,
                ]
              : 'No changes — page is at manifest defaults';
          }}
        </Rebuild>
      </span>
      <span class="tokenpanel-changed-footer-spacer" />
      <RoleButton
        class="tokenpanel-action-link tokenpanel-changed-copy"
        aria-label="Copy changed token diff"
        aria-disabled={computed(() => total.value === 0)}
        onClick={() => void handleCopy()}
      >
        {copyLabel}
      </RoleButton>
      <RoleButton
        class="tokenpanel-action-link tokenpanel-changed-revert-all"
        aria-label="Revert all changed tokens"
        aria-disabled={computed(() => total.value === 0)}
        onClick={onRevertAll}
      >
        Revert all
      </RoleButton>
    </div>
  );
}

export const ChangedFooter = ChangedFooterContent;
