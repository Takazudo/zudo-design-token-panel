/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, type Child, type Ref } from '@takazudo/zfb/zudo-react';
import { RoleButton } from '../controls/role-button';
import { read, type MaybeSignal } from '../zr/live';

/** Slots intentionally stay small so changed-state and history features can
 * add their own controls without making the dock-mode shell depend on them. */
export interface MiniPillProps {
  rootRef?: Ref<HTMLDivElement>;
  onApply: () => void;
  applyDisabled?: boolean;
  applyDisabledReason?: string;
  onExpand: () => void;
  changedCount?: MaybeSignal<number | undefined>;
  undo?: Child;
}

/**
 * Compact replacement for the full panel shell in `dockMode === 'mini'`.
 *
 * The changed-count and undo regions are extension slots for later panel
 * features. Keeping the wrappers in this component gives those features a
 * stable place to contribute while the mini dock mode itself remains usable
 * on the foundation branch.
 */
export function MiniPill({
  rootRef,
  onApply,
  applyDisabled,
  applyDisabledReason,
  onExpand,
  changedCount,
  undo,
}: MiniPillProps) {
  const count = computed(() => read(changedCount) ?? 0);

  return (
    <div
      {...(rootRef ? { ref: rootRef } : {})}
      class="tokenpanel-mini-pill"
      data-testid="tokenpanel-mini-pill"
    >
      <span class="tokenpanel-mini-pill-brand">zdtp</span>
      <span
        class="tokenpanel-mini-pill-changed-count"
        data-mini-pill-slot="changed-count"
        aria-label="Changed token count"
      >
        {computed(() => String(count.value))}
      </span>
      <span class="tokenpanel-mini-pill-changes">
        {computed(() => ` ${count.value === 1 ? 'change' : 'changes'}`)}
      </span>
      <span class="tokenpanel-mini-pill-divider" aria-hidden="true" />
      <span class="tokenpanel-mini-pill-undo" data-mini-pill-slot="undo">
        {undo ?? null}
      </span>
      <RoleButton
        class="tokenpanel-mini-pill-apply"
        onClick={() => onApply()}
        aria-disabled={applyDisabled ?? null}
        aria-label="Apply changes"
        title={applyDisabledReason ?? null}
      >
        Apply
      </RoleButton>
      <span class="tokenpanel-mini-pill-divider" aria-hidden="true" />
      <RoleButton
        class="tokenpanel-mini-pill-expand"
        onClick={() => onExpand()}
        aria-label="Expand panel"
        title="Expand panel"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="9" y="8" width="9" height="8" rx="1" />
        </svg>
      </RoleButton>
    </div>
  );
}
