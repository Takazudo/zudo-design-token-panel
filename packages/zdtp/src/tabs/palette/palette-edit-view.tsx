/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * PaletteEditView — Edit mode: grouped grid navigator + per-group OKLCH curve
 * editor + readout + batched persistence (#395).
 *
 * Layout (matches the agreed design sketch):
 *   - One section per tier (group). The tier `label` is the ONE section heading
 *     (div[role="heading" aria-level={3}] — one-tier-one-heading policy).
 *   - A row of step swatches; clicking a swatch selects that group + step.
 *   - The active group reveals its <PaletteChart> below the swatches, plus a
 *     channel toggle (L/C/H) and a <PaletteReadout> for the selected step.
 *
 * Two write paths:
 *   1. Direct edit — clicking the selected swatch opens a <ColorField> with
 *      valueFormat='oklch'; its onChange writes ONE step via `onChange`
 *      (one change → one persist is fine for a single field).
 *   2. Graph drag — handled by the BATCHED COMMIT path below.
 *
 * ── Batched commit (LOAD-BEARING) ────────────────────────────────────────────
 * A graph drag fires PaletteChart's onChangeStart → many onChange → onChangeEnd.
 * Calling the per-item `onChange` (→ persistTab) on every frame would rewrite the
 * whole tab and re-serialise localStorage on EVERY pointermove. Instead:
 *   • onChangeStart  — begin a transient session (clear the accumulator).
 *   • onChange       — accumulate the changed channel into LOCAL state
 *                      (`transient`) and repaint live; do NOT persist.
 *   • onChangeEnd    — flush the accumulated steps as ONE `onCommitBatch` call
 *                      ({ [itemId]: oklchString } for every changed step), then
 *                      clear the accumulator.
 * The single `onCommitBatch` lands as exactly one `persistTab('palette', …)` in
 * the shell — one DOM apply + one savePersistedState per gesture, not per frame.
 *
 * ── Persist raw OKLCH — never clamp ──────────────────────────────────────────
 * Out-of-gamut steps are PERSISTED with their raw OKLCH value. Gamut clamping
 * happens ONLY at the hex-conversion boundary (`oklchaToHex`) for swatch fills
 * and the readout — the stored token keeps the exact authored color so a later
 * wide-gamut display (or a different clamp strategy) loses nothing.
 */

import { computed, For, getScope, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import { groupPaletteTiers } from './palette-tab';
import {
  staticCssColorToOklcha,
  oklchaToCss,
  oklchaToHex,
  isInSrgbGamut,
  type Oklcha,
} from '../../utils/color-oklch';
import { clampHueForPersist, type Channel } from '../../utils/palette-curve';
import { PaletteChart } from '../../components/palette-chart';
import { ColorField } from '../../components/color-picker/color-field';
import PaletteReadout from './palette-readout';
import type { TokenAddress } from '../flat/types';
import { tokenAddressKey } from '../flat/types';
import { matchesSearchFields } from '../../search/token-search';
import { ModesRow, resolveModeRowSides } from '../modes-row';
import { read, type Reactive } from '../../zr/live';
import { Rebuild } from '../../zr/rebuild';
import type { PanelServices } from '../../zr/panel-services';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PaletteEditViewProps {
  tab: TabConfig;
  overrides: TabOverrides;
  /**
   * Single-item write (direct ColorField edit). One change → one persist.
   */
  onChange: (tierId: string, itemId: string, next: string) => void;
  /**
   * Batched write for a whole drag gesture. Fires ONCE on pointer-up with the
   * full `{ [itemId]: oklchString }` patch for every changed step in `tierId`.
   * The shell merges the whole patch into a single `persistTab` call. Optional
   * so the stub/tests that don't supply it still type-check (falls back to
   * per-item `onChange`).
   */
  onCommitBatch?: (tierId: string, patch: Record<string, string>) => void;
  searchQuery?: string;
  /** Transient active-tab Changed-only filter. */
  changedOnly?: boolean;
  /** S2 evaluator callback for palette-step addresses. */
  isChanged?: (address: TokenAddress) => boolean;
  jumpAddress?: TokenAddress | null;
  onJumpAddressHandled?: (address: TokenAddress) => void;
  services?: PanelServices;
}

export type PaletteEditViewStaticKeys =
  | 'onChange'
  | 'onCommitBatch'
  | 'onJumpAddressHandled'
  | 'services';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Effective CSS value for an item: override if present, else the default. */
function resolveItemValue(item: TierItem, tierId: string, overrides: TabOverrides): string {
  return overrides[tierId]?.[item.id] ?? item.default;
}

interface ColorSlot {
  value: string;
  color: Oklcha | null;
}

function isWritableSlot(item: TierItem | undefined, slot: ColorSlot | undefined): boolean {
  return Boolean(item && !item.readonly && slot?.color);
}

function initialSelectionIndex(tier: TierConfig, overrides: TabOverrides): number {
  const writable = tier.items.findIndex(
    (item) => !item.readonly && Boolean(resolveItemSlot(item, tier.id, overrides).color),
  );
  if (writable >= 0) return writable;
  const inspectable = tier.items.findIndex(
    (item) => Boolean(resolveItemSlot(item, tier.id, overrides).color),
  );
  return inspectable >= 0 ? inspectable : 0;
}

/** Resolve a dense item slot without inventing a color for unsupported CSS. */
function resolveItemSlot(item: TierItem, tierId: string, overrides: TabOverrides): ColorSlot {
  const value = resolveItemValue(item, tierId, overrides);
  // Mode pairs are not ramp colors. Do not let the ordinary fallback/default
  // color turn them into writable chart nodes or a selected-step ColorField
  // target; their two authored sides are edited below the strip via ModesRow.
  return { value, color: item.modes ? null : staticCssColorToOklcha(value) };
}

function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}

type VisibleChannels = { l: boolean; c: boolean; h: boolean };
const CHANNEL_ORDER: readonly Channel[] = ['l', 'c', 'h'] as const;
const NO_COLOR: Oklcha = { l: 0, c: 0, h: 0, a: 100 };

/** Shared state and handlers of one mounted Edit view. */
interface EditContext {
  tabId: ReadonlySignal<string>;
  overrides: ReadonlySignal<TabOverrides>;
  changedOnly: ReadonlySignal<boolean>;
  changedFor: ReadonlySignal<(address: TokenAddress) => boolean>;
  activeTierId: ReadonlySignal<string | null>;
  selectedIndex: ReadonlySignal<number>;
  visibleChannels: ReadonlySignal<VisibleChannels>;
  /** Dense slots for `tier`, overlaying in-flight drag edits on the open group. */
  slotsFor: (tier: TierConfig) => ColorSlot[];
  services?: PanelServices;
  onChange: (tierId: string, itemId: string, next: string) => void;
  toggleGroup: (tierId: string) => void;
  selectStep: (tierId: string, index: number) => void;
  toggleChannel: (channel: Channel) => void;
  changeStart: () => void;
  chartChange: (index: number, channel: Channel, value: number) => void;
  changeEnd: () => void;
  directEdit: (tierId: string, itemId: string, next: string) => void;
}

// ---------------------------------------------------------------------------
// Swatch row
// ---------------------------------------------------------------------------

interface SwatchProps {
  item: TierItem;
  index: number;
  slot: ReadonlySignal<ColorSlot>;
  isSelected: ReadonlySignal<boolean>;
  onSelect: (index: number) => void;
  address?: TokenAddress;
}

function Swatch({ item, index, slot, isSelected, onSelect, address }: SwatchProps) {
  // Clamp only for the fill; the underlying value stays raw.
  const fill = computed(() => {
    const color = slot.value.color;
    return color ? oklchaToHex(color) : null;
  });
  const select = () => onSelect(index);

  return (
    <div
      role="button"
      tabindex={0}
      class={computed(() =>
        `tokenpanel-palette-edit-swatch${isSelected.value ? ' is-selected' : ''}${item.readonly ? ' is-readonly' : ''}`)}
      style={computed(() => (fill.value ? { background: fill.value } : {}))}
      data-out-of-gamut={computed(() => {
        const color = slot.value.color;
        return color && !isInSrgbGamut(color) ? true : null;
      })}
      data-invalid={computed(() => (slot.value.color ? null : true))}
      aria-pressed={isSelected}
      aria-label={computed(() => {
        const current = slot.value;
        return `${item.label}: ${current.value}${current.color ? '' : ' (invalid color, N/A)'}${item.readonly ? ' (locked, read-only)' : ''}`;
      })}
      on:click={select}
      on:keydown={onActivateKey(select)}
      data-testid={`palette-edit-swatch-${item.id}`}
      data-address={address ? tokenAddressKey(address) : null}
    >
      <span class="tokenpanel-palette-edit-swatch-idx" aria-hidden="true">
        {String(index)}
      </span>
      {item.readonly ? (
        <span class="tokenpanel-palette-edit-swatch-lock" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5 7V5a3 3 0 0 1 6 0v2" />
          </svg>
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group preview chips (collapsed-header color affordance)
// ---------------------------------------------------------------------------

/**
 * Decorative color chips in a group's collapsed header. They keep the group's
 * colors visible while its swatch strip is collapsed (the scoped disclosure
 * exception). aria-hidden + pointer-events:none — the real, labelled swatches
 * live inside the open group; these chips carry no accessible info.
 */
function GroupPreviewChips({ slots }: { slots: ReadonlySignal<ColorSlot[]> }) {
  const indexes = computed(() => slots.value.map((_, i) => i));
  return (
    <div class="tokenpanel-palette-edit-group-preview" aria-hidden="true">
      <For each={indexes} by={(i) => i}>
        {(entry) => {
          const i = entry.value;
          const color = computed(() => slots.value[i]?.color ?? null);
          return (
            <div
              class={computed(() => (color.value
                ? 'tokenpanel-palette-edit-preview-chip'
                : 'tokenpanel-palette-edit-preview-chip is-invalid'))}
              style={computed(() => (color.value ? { background: oklchaToHex(color.value) } : {}))}
            />
          );
        }}
      </For>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel toggle (L / C / H)
// ---------------------------------------------------------------------------

interface ChannelToggleProps {
  visible: ReadonlySignal<VisibleChannels>;
  onToggle: (channel: Channel) => void;
}

function ChannelToggle({ visible, onToggle }: ChannelToggleProps) {
  return (
    <div class="tokenpanel-palette-edit-channels" data-testid="palette-edit-channels">
      {CHANNEL_ORDER.map((channel) => {
        const on = computed(() => visible.value[channel]);
        const toggle = () => onToggle(channel);
        return (
          <div
            role="button"
            tabindex={0}
            class={computed(() => (on.value
              ? `tokenpanel-palette-edit-channel is-on tokenpanel-palette-edit-channel--${channel}`
              : `tokenpanel-palette-edit-channel tokenpanel-palette-edit-channel--${channel}`))}
            aria-pressed={on}
            on:click={toggle}
            on:keydown={onActivateKey(toggle)}
            data-testid={`palette-edit-channel-${channel}`}
          >
            {channel.toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaletteEditView
// ---------------------------------------------------------------------------

export default function PaletteEditView(
  props: Reactive<PaletteEditViewProps, PaletteEditViewStaticKeys>,
) {
  const { onChange, onCommitBatch, onJumpAddressHandled, services } = props;
  const tabId = computed(() => read(props.tab).id);
  const allTiers = computed(() => groupPaletteTiers(read(props.tab)));
  const overrides = computed(() => read(props.overrides));
  const changedOnly = computed(() => read(props.changedOnly) ?? false);
  const changedFor = computed(() => {
    const isChanged = read(props.isChanged);
    return (address: TokenAddress) => isChanged?.(address) ?? false;
  });
  const tiers = computed(() => {
    const query = (read(props.searchQuery) ?? '').trim();
    const only = changedOnly.value;
    const isChanged = changedFor.value;
    const id = tabId.value;
    return allTiers.value.filter((tier) => {
      if (query && !matchesSearchFields({
        cssVar: '',
        id: tier.id,
        label: tier.label,
        value: '',
        tierLabel: tier.label,
      }, query)) return false;
      if (only && !tier.items.some((item) => isChanged({
        tabId: id,
        tierId: tier.id,
        itemId: item.id,
      }))) return false;
      return true;
    });
  });

  // Single-open accordion. `null` = every group collapsed (the initial state):
  // the Edit view opens with ALL groups closed so the boxed headers read as
  // equally expandable (#517). This intentionally collapses the swatch strip too
  // — the documented scoped exception to the no-progressive-disclosure policy
  // (see packages/zdtp/CLAUDE.md). Accordion state is transient — never persisted.
  const activeTierId = signal<string | null>(null);
  const selectedIndex = signal(0);
  const visibleChannels = signal<VisibleChannels>({ l: true, c: true, h: true });

  // Transient drag accumulator: the LIVE OKLCH per changed item during a single
  // graph gesture. Empty between gestures. Painting reads this first so the
  // chart + swatches update on every frame WITHOUT persisting. `transientNow`
  // mirrors it so the pointer-up commit reads the final accumulator
  // synchronously.
  const transient = signal<Record<string, Oklcha>>({});
  let transientNow: Record<string, Oklcha> = {};
  let gesture: { tierId: string; itemIds: string[] } | null = null;

  // Editor callbacks can fire after this view unmounts (e.g. a remount for a
  // new tab config); they must not write through the stale config.
  let disposed = false;
  getScope().onActivate(() => () => {
    disposed = true;
  });

  const writeTransient = (next: Record<string, Oklcha>) => {
    transientNow = next;
    transient.value = next;
  };

  const activeTier = computed(() => tiers.value.find((t) => t.id === activeTierId.value) ?? null);

  const slotsFor = (tier: TierConfig): ColorSlot[] => {
    const live = activeTierId.value === tier.id ? transient.value : {};
    const current = overrides.value;
    return tier.items.map((item) => {
      const color = live[item.id];
      if (color && !item.readonly) return { value: oklchaToCss(color), color };
      return resolveItemSlot(item, tier.id, current);
    });
  };

  getScope().effect(() => {
    const jumpAddress = read(props.jumpAddress) ?? null;
    if (!jumpAddress || jumpAddress.tabId !== tabId.value) return;
    const targetTier = allTiers.value.find((tier) => tier.id === jumpAddress.tierId);
    const targetIndex = targetTier?.items.findIndex((item) => item.id === jumpAddress.itemId) ?? -1;
    if (!targetTier || targetIndex < 0) return;
    activeTierId.value = targetTier.id;
    selectedIndex.value = targetIndex;
    gesture = null;
    writeTransient({});
    if (!onJumpAddressHandled) return;
    const frame = window.requestAnimationFrame(() => onJumpAddressHandled(jumpAddress));
    return () => window.cancelAnimationFrame(frame);
  });

  // ── Accordion (single-open groups) ──────────────────────────────────────────

  const toggleGroup = (tierId: string) => {
    // Re-click closes; a different group switches. Opening OR switching resets
    // the selection to step 0 so an index carried over from a longer group can
    // never be out of range in a shorter one.
    const tier = tiers.value.find((candidate) => candidate.id === tierId);
    selectedIndex.value = tier ? initialSelectionIndex(tier, overrides.value) : 0;
    activeTierId.value = activeTierId.value === tierId ? null : tierId;
    gesture = null;
    writeTransient({});
  };

  // ── Batched drag commit ──────────────────────────────────────────────────

  const changeStart = () => {
    // Open a fresh transient session for this gesture.
    const tier = activeTier.value;
    gesture = tier ? { tierId: tier.id, itemIds: tier.items.map((item) => item.id) } : null;
    writeTransient({});
  };

  const chartChange = (index: number, channel: Channel, value: number) => {
    const tier = activeTier.value;
    if (!tier || disposed) return;
    if (gesture?.tierId !== tier.id) return;
    const item = tier.items[index];
    if (!item) return;
    if (gesture.itemIds[index] !== item.id) return;
    const resolved = resolveItemSlot(item, tier.id, overrides.value);
    if (!isWritableSlot(item, resolved)) return;
    // Build on the live value (prior transient OR the resolved base) so a
    // multi-channel gesture composes correctly per step.
    const prev = transientNow;
    const base = prev[item.id] ?? resolved.color!;
    // Cap hue at the commit boundary so a node dragged to the top of the axis
    // (h=360) survives the oklch() round-trip instead of wrapping back to 0.
    const safeValue = channel === 'h' ? clampHueForPersist(value) : value;
    writeTransient({ ...prev, [item.id]: { ...base, [channel]: safeValue } });
  };

  const changeEnd = () => {
    // Snapshot the final accumulator and flush EXACTLY ONE batched commit.
    const acc = transientNow;
    const changedIds = Object.keys(acc);
    const tier = activeTier.value;
    const current = overrides.value;
    const sameIdentityOrder = Boolean(
      !disposed &&
      tier &&
      gesture &&
      tier.id === gesture.tierId &&
      tier.items.length === gesture.itemIds.length &&
      tier.items.every((item, index) => item.id === gesture!.itemIds[index]),
    );
    if (tier && sameIdentityOrder && changedIds.length > 0) {
      const patch: Record<string, string> = {};
      for (const id of changedIds) {
        const item = tier.items.find((candidate) => candidate.id === id);
        if (!isWritableSlot(item, item && resolveItemSlot(item, tier.id, current))) continue;
        // Persist the RAW OKLCH — never gamut-clamped. Clamping is a render
        // concern (oklchaToHex), not a storage concern.
        patch[id] = oklchaToCss(acc[id]);
      }
      if (Object.keys(patch).length === 0) {
        gesture = null;
        writeTransient({});
        return;
      }
      if (onCommitBatch) {
        onCommitBatch(tier.id, patch);
      } else {
        // Fallback when no batch path is wired: emit per-item changes.
        for (const [id, value] of Object.entries(patch)) {
          onChange(tier.id, id, value);
        }
      }
    }
    gesture = null;
    // Clear the accumulator; the committed values now live in `overrides`.
    writeTransient({});
  };

  // ── Direct (ColorField) edit of the selected step ─────────────────────────

  // Direct editor events can outlive the mounted ColorField DOM during a
  // config update, so re-check the current selection/config before writing.
  const directEdit = (expectedTierId: string, expectedItemId: string, next: string) => {
    const currentTier = activeTier.value;
    if (disposed || !currentTier || currentTier.id !== expectedTierId) return;
    const item = currentTier.items[selectedIndex.value];
    if (!item || item.id !== expectedItemId) return;
    if (!isWritableSlot(item, resolveItemSlot(item, currentTier.id, overrides.value))) return;
    onChange(currentTier.id, item.id, next);
  };

  const ctx: EditContext = {
    tabId,
    overrides,
    changedOnly,
    changedFor,
    activeTierId,
    selectedIndex,
    visibleChannels,
    slotsFor,
    services,
    onChange,
    toggleGroup,
    selectStep: (tierId, index) => {
      activeTierId.value = tierId;
      selectedIndex.value = index;
    },
    toggleChannel: (channel) => {
      visibleChannels.value = { ...visibleChannels.value, [channel]: !visibleChannels.value[channel] };
    },
    changeStart,
    chartChange,
    changeEnd,
    directEdit,
  };

  return (
    <div class="tokenpanel-palette-edit-view" data-testid="palette-edit-view">
      <For each={tiers} by={(tier) => tier.id}>
        {(entry) => (
          <Rebuild value={entry}>
            {(tier) => <PaletteGroup tier={tier} ctx={ctx} />}
          </Rebuild>
        )}
      </For>
      <Show when={computed(() => changedOnly.value && tiers.value.length === 0)}>
        {() => (
          <div class="tokenpanel-changed-empty" data-testid="tokenpanel-changed-empty">
            No changed tokens in this tab — everything is at its manifest default.
          </div>
        )}
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group (accordion header + open body)
// ---------------------------------------------------------------------------

function PaletteGroup({ tier, ctx }: { tier: TierConfig; ctx: EditContext }) {
  const isActive = computed(() => ctx.activeTierId.value === tier.id);
  // Chips track live color: the open group overlays in-flight transient edits;
  // collapsed groups resolve straight from overrides.
  const chipSlots = computed(() => ctx.slotsFor(tier));
  const changedCount = computed(() => {
    const isChanged = ctx.changedFor.value;
    const tabId = ctx.tabId.value;
    return tier.items.reduce((count, item) => count + (isChanged({
      tabId,
      tierId: tier.id,
      itemId: item.id,
    }) ? 1 : 0), 0);
  });
  const toggle = () => ctx.toggleGroup(tier.id);
  return (
    <div
      class={computed(() => (isActive.value
        ? 'tokenpanel-palette-edit-group is-active'
        : 'tokenpanel-palette-edit-group'))}
      data-testid={`palette-edit-tier-${tier.id}`}
    >
      <div
        role="button"
        tabindex={0}
        aria-expanded={isActive}
        class="tokenpanel-palette-edit-group-header"
        on:click={toggle}
        on:keydown={onActivateKey(toggle)}
        data-testid={`palette-edit-group-header-${tier.id}`}
      >
        <div
          class={computed(() => (isActive.value
            ? 'tokenpanel-palette-edit-group-chevron is-open'
            : 'tokenpanel-palette-edit-group-chevron'))}
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div role="heading" aria-level={3} class="tokenpanel-palette-edit-group-heading">
          {tier.label}
        </div>
        <GroupPreviewChips slots={chipSlots} />
        <Show when={computed(() => changedCount.value > 0)}>
          {() => (
            <span
              class="tokenpanel-palette-edit-group-changed-count"
              data-testid={`palette-edit-changed-count-${tier.id}`}
              aria-label={computed(() => `${changedCount.value} changed step${changedCount.value === 1 ? '' : 's'}`)}
            >
              {computed(() => String(changedCount.value))}
            </span>
          )}
        </Show>
      </div>

      <Show when={isActive}>
        {() => <GroupBody tier={tier} ctx={ctx} slots={chipSlots} />}
      </Show>
    </div>
  );
}

function GroupBody({ tier, ctx, slots }: {
  tier: TierConfig;
  ctx: EditContext;
  slots: ReadonlySignal<ColorSlot[]>;
}) {
  const addressOf = (item: TierItem): TokenAddress => ({ tabId: ctx.tabId.value, tierId: tier.id, itemId: item.id });
  const shown = (item: TierItem) => !ctx.changedOnly.value || ctx.changedFor.value(addressOf(item));
  const swatchIndexes = computed(() => tier.items.flatMap((item, index) =>
    item.modes === undefined && shown(item) ? [index] : []));
  const modesItems = computed(() => tier.items.filter((item) => item.modes !== undefined && shown(item)));
  return (
    <div class="tokenpanel-palette-edit-group-body">
      <div class="tokenpanel-palette-edit-swatches" data-testid={`palette-edit-swatches-${tier.id}`}>
        <For each={swatchIndexes} by={(index) => index}>
          {(entry) => {
            const index = entry.value;
            const item = tier.items[index];
            return (
              <Swatch
                item={item}
                index={index}
                slot={computed(() => slots.value[index] ?? { value: '', color: null })}
                isSelected={computed(() => ctx.selectedIndex.value === index)}
                onSelect={(i) => ctx.selectStep(tier.id, i)}
                address={addressOf(item)}
              />
            );
          }}
        </For>
      </div>

      <For each={modesItems} by={(item) => item.id}>
        {(entry) => {
          const item = entry.value;
          return (
            <ModesRow
              item={item}
              sides={computed(() => {
                const override = ctx.overrides.value[tier.id]?.[item.id];
                return resolveModeRowSides(item, override, override !== undefined);
              })}
              class="tokenpanel-palette-edit-modes-row"
              dataTestId={`palette-edit-modes-${item.id}`}
              address={addressOf(item)}
              tooltip={ctx.services?.tooltip ?? null}
              onChange={(next) => ctx.onChange(tier.id, item.id, next)}
            />
          );
        }}
      </For>

      <ActiveGroupEditor tier={tier} ctx={ctx} slots={slots} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active group editor (chart + channel toggle + ColorField + readout)
// ---------------------------------------------------------------------------

function ActiveGroupEditor({ tier, ctx, slots }: {
  tier: TierConfig;
  ctx: EditContext;
  slots: ReadonlySignal<ColorSlot[]>;
}) {
  const colors = computed(() => slots.value.map((slot) => slot.color));
  const editable = computed(() => tier.items.map((item, index) => isWritableSlot(item, slots.value[index])));
  const identities = tier.items.map((item) => item.id);
  const hasWritableColor = computed(() => editable.value.some(Boolean));
  const allItemsReadonly = tier.items.length > 0 && tier.items.every((item) => item.readonly);
  const selectedItem = computed(() => tier.items[ctx.selectedIndex.value]);
  const selectedOklcha = computed(() => slots.value[ctx.selectedIndex.value]?.color ?? null);
  const selectedValue = computed(() => {
    const item = selectedItem.value;
    return item ? resolveItemValue(item, tier.id, ctx.overrides.value) : '';
  });
  const selectedReadonly = computed(() => Boolean(selectedItem.value?.readonly));
  const title = computed(() => (hasWritableColor.value
    ? 'Curve editor · drag node = step, drag line = writable ramp steps'
    : allItemsReadonly
      ? 'Static curve · all steps are locked'
      : colors.value.some(Boolean)
        ? 'Static curve · no writable colors'
        : 'Curve unavailable · no supported colors'));
  const directItemId = computed(() => {
    const item = selectedItem.value;
    return item && selectedOklcha.value && !item.readonly ? item.id : null;
  });
  const hint = computed(() => (selectedReadonly.value
    ? 'Locked · read-only inspection'
    : selectedOklcha.value
      ? 'edit selected step exactly'
      : 'N/A · unsupported color is read-only'));
  const readoutKind = computed((): 'valid' | 'invalid' | 'none' => {
    if (!selectedItem.value) return 'none';
    return selectedOklcha.value ? 'valid' : 'invalid';
  });
  const selectedCssVar = computed(() => selectedItem.value?.cssVar ?? '');

  return (
    <div class="tokenpanel-palette-edit-editor" data-testid={`palette-edit-editor-${tier.id}`}>
      <div class="tokenpanel-palette-edit-editor-bar">
        <div class="tokenpanel-palette-edit-editor-title">{title}</div>
        <Show when={hasWritableColor}>
          {() => <ChannelToggle visible={ctx.visibleChannels} onToggle={ctx.toggleChannel} />}
        </Show>
      </div>

      <PaletteChart
        colors={colors}
        editable={editable}
        identities={identities}
        selectedIndex={ctx.selectedIndex}
        visibleChannels={ctx.visibleChannels}
        onChange={ctx.chartChange}
        onSelectIndex={(index) => ctx.selectStep(tier.id, index)}
        onToggleChannel={ctx.toggleChannel}
        onChangeStart={ctx.changeStart}
        onChangeEnd={ctx.changeEnd}
      />

      <div class="tokenpanel-palette-edit-direct" data-testid="palette-edit-direct">
        <Rebuild value={directItemId}>
          {(itemId) => {
            const item = itemId === null ? undefined : tier.items.find((candidate) => candidate.id === itemId);
            if (!item) return null;
            return (
              <ColorField
                value={selectedValue}
                onChange={(next) => ctx.directEdit(tier.id, item.id, next)}
                valueFormat="oklch"
                label={item.label}
                cssVar={item.cssVar}
              />
            );
          }}
        </Rebuild>
        <div class="tokenpanel-palette-edit-direct-hint">{hint}</div>
      </div>

      <Rebuild value={readoutKind}>
        {(kind) => {
          if (kind === 'valid') {
            return (
              <PaletteReadout
                oklcha={computed(() => selectedOklcha.value ?? NO_COLOR)}
                cssVar={selectedCssVar}
                outOfGamut={computed(() => {
                  const color = selectedOklcha.value;
                  return color ? !isInSrgbGamut(color) : false;
                })}
              />
            );
          }
          if (kind === 'invalid') {
            return (
              <div class="tokenpanel-palette-readout is-invalid" data-testid="palette-readout-invalid">
                <div class="tokenpanel-palette-readout-swatch is-invalid" aria-hidden="true" />
                <div class="tokenpanel-palette-readout-rows">
                  <div class="tokenpanel-palette-readout-row" data-testid="palette-readout-token">
                    <span class="tokenpanel-palette-readout-key">token</span>
                    <span class="tokenpanel-palette-readout-val">{selectedCssVar}</span>
                  </div>
                  <div class="tokenpanel-palette-readout-row" data-testid="palette-readout-invalid-value">
                    <span class="tokenpanel-palette-readout-key">value</span>
                    <span class="tokenpanel-palette-readout-val">{selectedValue}</span>
                  </div>
                  <div class="tokenpanel-palette-readout-gamut">N/A · unsupported contextual color</div>
                </div>
              </div>
            );
          }
          return null;
        }}
      </Rebuild>
    </div>
  );
}
