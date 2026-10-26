/** @jsxImportSource @takazudo/zfb/zudo-react */
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

import { computed, getScope, signal } from '@takazudo/zfb/zudo-react';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import PaletteEditView from './palette-edit-view';
import PaletteCheckView from './palette-check-view';
import type { TokenAddress } from '../flat/types';
import { read, type Reactive } from '../../zr/live';
import { Rebuild } from '../../zr/rebuild';
import type { PanelServices } from '../../zr/panel-services';

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
  services?: PanelServices;
}

export type PaletteTabStaticKeys =
  | 'onChange'
  | 'onCommitBatch'
  | 'onJumpAddressHandled'
  | 'services';

// ---------------------------------------------------------------------------
// PaletteTab
// ---------------------------------------------------------------------------

export default function PaletteTab(props: Reactive<PaletteTabProps, PaletteTabStaticKeys>) {
  const { onChange, onCommitBatch, onJumpAddressHandled, services } = props;
  const mode = signal<PaletteMode>('edit');

  getScope().effect(() => {
    if (read(props.jumpAddress)) mode.value = 'edit';
  });

  const modeButton = (target: PaletteMode, label: string) => {
    const active = computed(() => mode.value === target);
    const select = () => {
      mode.value = target;
    };
    return (
      <div
        role="button"
        tabindex={0}
        class={computed(() => (active.value
          ? 'tokenpanel-palette-mode-btn is-active'
          : 'tokenpanel-palette-mode-btn'))}
        aria-pressed={active}
        on:click={select}
        on:keydown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            select();
          }
        }}
        data-testid={`palette-mode-${target}`}
      >
        {label}
      </div>
    );
  };

  return (
    <div class="tokenpanel-tab-content tokenpanel-palette-tab" data-testid="palette-tab">
      <div class="tokenpanel-palette-mode-toggle" data-testid="palette-mode-toggle">
        {modeButton('edit', 'Edit')}
        {modeButton('check', 'Check')}
      </div>

      <Rebuild value={mode}>
        {(current) => (current === 'edit' ? (
          <PaletteEditView
            tab={props.tab}
            overrides={props.overrides}
            onChange={onChange}
            onCommitBatch={onCommitBatch}
            searchQuery={props.searchQuery ?? ''}
            changedOnly={props.changedOnly ?? false}
            isChanged={props.isChanged}
            jumpAddress={props.jumpAddress ?? null}
            onJumpAddressHandled={onJumpAddressHandled}
            services={services}
          />
        ) : (
          <PaletteCheckView
            tab={props.tab}
            overrides={props.overrides}
            onChange={onChange}
            searchQuery={props.searchQuery ?? ''}
            changedOnly={props.changedOnly ?? false}
            isChanged={props.isChanged}
          />
        ))}
      </Rebuild>
    </div>
  );
}
