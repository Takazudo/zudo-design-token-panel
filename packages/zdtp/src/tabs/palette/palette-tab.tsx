/**
 * PaletteTab — thin shell for the palette tab.
 *
 * Data-model convention:
 *   - Each group = a TierConfig (its label = group heading).
 *   - Each step = a TierItem with:
 *       cssVar: '--palette-{group}-{n}'
 *       type: { kind: 'color', format: 'oklch' }
 *   - Tab MUST omit `colorExtras` so resolveColorClusterFromTab is not invoked;
 *     multiple kind:'color' tiers are safe in one tab only when colorExtras is absent.
 *
 * Shared helpers:
 *   - flattenPaletteTiers(tab): returns all items across all tiers as flat array
 *   - groupPaletteTiers(tab): returns tiers in declaration order (alias for tab.tiers)
 */

import { useState, useCallback, useEffect } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import PaletteEditView from './palette-edit-view';
import PaletteCheckView from './palette-check-view';
import type { TokenAddress } from '../flat/types';

// ---------------------------------------------------------------------------
// Shared helpers (exported for #394 / #395 view implementations)
// ---------------------------------------------------------------------------

/** Returns tiers in declaration order — the canonical group ordering. */
export function groupPaletteTiers(tab: TabConfig): readonly TierConfig[] {
  return tab.tiers;
}

/** Returns all items across all tiers flattened into a single array. */
export function flattenPaletteTiers(tab: TabConfig): TierItem[] {
  const out: TierItem[] = [];
  for (const tier of tab.tiers) {
    for (const item of tier.items) {
      out.push(item);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mode toggle
// ---------------------------------------------------------------------------

type PaletteMode = 'edit' | 'check';

// ---------------------------------------------------------------------------
// PaletteTab props
// ---------------------------------------------------------------------------

export interface PaletteTabProps {
  tab: TabConfig;
  overrides: TabOverrides;
  /** Single-item write (mode-toggle direct edits + Check-mode handoff). */
  onChange: (tierId: string, itemId: string, next: string) => void;
  /**
   * Batched write for a whole Edit-mode graph drag. Fires ONCE on pointer-up
   * with `{ [itemId]: oklchString }` for every changed step in `tierId`. The
   * panel folds the whole patch into a single `persistTab('palette', …)` so a
   * drag costs one DOM apply + one localStorage write, not one per frame.
   * Optional — Check mode and older callers don't supply it.
   */
  onCommitBatch?: (tierId: string, patch: Record<string, string>) => void;
  /** Header-filter query shared with the active tab. */
  searchQuery?: string;
  /** Transient active-tab Changed-only filter. */
  changedOnly?: boolean;
  /** S2 evaluator callback for palette-step addresses. */
  isChanged?: (address: TokenAddress) => boolean;
  /** Address selected by the command palette. */
  jumpAddress?: TokenAddress | null;
  /** Called after the Edit view has opened and selected the requested step. */
  onJumpAddressHandled?: (address: TokenAddress) => void;
}

// ---------------------------------------------------------------------------
// PaletteTab
// ---------------------------------------------------------------------------

export default function PaletteTab({
  tab,
  overrides,
  onChange,
  onCommitBatch,
  searchQuery = '',
  changedOnly = false,
  isChanged,
  jumpAddress = null,
  onJumpAddressHandled,
}: PaletteTabProps) {
  const [mode, setMode] = useState<PaletteMode>('edit');

  useEffect(() => {
    if (jumpAddress) setMode('edit');
  }, [jumpAddress]);

  const handleSetEdit = useCallback(() => {
    setMode('edit');
  }, []);

  const handleSetCheck = useCallback(() => {
    setMode('check');
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setMode('edit');
    }
  }, []);

  const handleCheckKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setMode('check');
    }
  }, []);

  return (
    <div className="tokenpanel-tab-content tokenpanel-palette-tab" data-testid="palette-tab">
      <div className="tokenpanel-palette-mode-toggle" data-testid="palette-mode-toggle">
        <div
          role="button"
          tabIndex={0}
          className={
            mode === 'edit'
              ? 'tokenpanel-palette-mode-btn is-active'
              : 'tokenpanel-palette-mode-btn'
          }
          aria-pressed={mode === 'edit'}
          onClick={handleSetEdit}
          onKeyDown={handleEditKeyDown}
          data-testid="palette-mode-edit"
        >
          Edit
        </div>
        <div
          role="button"
          tabIndex={0}
          className={
            mode === 'check'
              ? 'tokenpanel-palette-mode-btn is-active'
              : 'tokenpanel-palette-mode-btn'
          }
          aria-pressed={mode === 'check'}
          onClick={handleSetCheck}
          onKeyDown={handleCheckKeyDown}
          data-testid="palette-mode-check"
        >
          Check
        </div>
      </div>

      {mode === 'edit' && (
        <PaletteEditView
          tab={tab}
          overrides={overrides}
          onChange={onChange}
          onCommitBatch={onCommitBatch}
          searchQuery={searchQuery}
          changedOnly={changedOnly}
          isChanged={isChanged}
          jumpAddress={jumpAddress}
          onJumpAddressHandled={onJumpAddressHandled}
        />
      )}
      {mode === 'check' && (
        <PaletteCheckView
          tab={tab}
          overrides={overrides}
          onChange={onChange}
          searchQuery={searchQuery}
          changedOnly={changedOnly}
          isChanged={isChanged}
        />
      )}
    </div>
  );
}
