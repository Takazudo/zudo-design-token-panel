import type { ComponentChildren, JSX, RefObject } from 'preact';
import { RoleButton } from '../controls/role-button';

/** Slots intentionally stay small so changed-state and history features can
 * add their own controls without making the dock-mode shell depend on them. */
export interface MiniPillProps {
  rootRef?: RefObject<HTMLDivElement>;
  onApply: () => void;
  onExpand: () => void;
  changedCount?: number | undefined;
  undo?: ComponentChildren;
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
  onExpand,
  changedCount,
  undo,
}: MiniPillProps): JSX.Element {
  const count = changedCount ?? 0;

  return (
    <div ref={rootRef} className="tokenpanel-mini-pill" data-testid="tokenpanel-mini-pill">
      <span className="tokenpanel-mini-pill-brand">zdtp</span>
      <span
        className="tokenpanel-mini-pill-changed-count"
        data-mini-pill-slot="changed-count"
        aria-label="Changed token count"
      >
        {count}
      </span>
      <span className="tokenpanel-mini-pill-changes">
        {' '}{count === 1 ? 'change' : 'changes'}
      </span>
      <span className="tokenpanel-mini-pill-divider" aria-hidden="true" />
      <span className="tokenpanel-mini-pill-undo" data-mini-pill-slot="undo">
        {undo}
      </span>
      <RoleButton
        className="tokenpanel-mini-pill-apply"
        onClick={() => onApply()}
        aria-label="Apply changes"
      >
        Apply
      </RoleButton>
      <span className="tokenpanel-mini-pill-divider" aria-hidden="true" />
      <RoleButton
        className="tokenpanel-mini-pill-expand"
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
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="9" y="8" width="9" height="8" rx="1" />
        </svg>
      </RoleButton>
    </div>
  );
}
