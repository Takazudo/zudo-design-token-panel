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

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/compat';
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
  jumpAddress?: TokenAddress | null;
  onJumpAddressHandled?: (address: TokenAddress) => void;
}

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
  return { value, color: staticCssColorToOklcha(value) };
}

type VisibleChannels = { l: boolean; c: boolean; h: boolean };
const CHANNEL_ORDER: readonly Channel[] = ['l', 'c', 'h'] as const;

// ---------------------------------------------------------------------------
// Swatch row
// ---------------------------------------------------------------------------

interface SwatchProps {
  item: TierItem;
  index: number;
  slot: ColorSlot;
  isSelected: boolean;
  onSelect: (index: number) => void;
  address?: TokenAddress;
}

function Swatch({ item, index, slot, isSelected, onSelect, address }: SwatchProps) {
  // Clamp only for the fill; the underlying value stays raw.
  const fill = slot.color ? oklchaToHex(slot.color) : undefined;
  const outOfGamut = slot.color ? !isInSrgbGamut(slot.color) : false;

  const handleClick = useCallback(() => onSelect(index), [index, onSelect]);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(index);
      }
    },
    [index, onSelect],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={
        `tokenpanel-palette-edit-swatch${isSelected ? ' is-selected' : ''}${item.readonly ? ' is-readonly' : ''}`
      }
      style={fill ? { background: fill } : undefined}
      data-out-of-gamut={outOfGamut || undefined}
      data-invalid={slot.color ? undefined : true}
      aria-pressed={isSelected}
      aria-label={`${item.label}: ${slot.value}${slot.color ? '' : ' (invalid color, N/A)'}${item.readonly ? ' (locked, read-only)' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`palette-edit-swatch-${item.id}`}
      {...(address ? { 'data-address': tokenAddressKey(address) } : {})}
    >
      <span className="tokenpanel-palette-edit-swatch-idx" aria-hidden="true">
        {index}
      </span>
      {item.readonly && (
        <span className="tokenpanel-palette-edit-swatch-lock" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5 7V5a3 3 0 0 1 6 0v2" />
          </svg>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group preview chips (collapsed-header color affordance)
// ---------------------------------------------------------------------------

interface GroupPreviewChipsProps {
  /** Effective (override + transient) dense slots for the group's steps. */
  slots: ColorSlot[];
}

/**
 * Decorative color chips in a group's collapsed header. They keep the group's
 * colors visible while its swatch strip is collapsed (the scoped disclosure
 * exception). aria-hidden + pointer-events:none — the real, labelled swatches
 * live inside the open group; these chips carry no accessible info.
 */
function GroupPreviewChips({ slots }: GroupPreviewChipsProps) {
  return (
    <div className="tokenpanel-palette-edit-group-preview" aria-hidden="true">
      {slots.map((slot, i) => (
        <div
          key={i}
          className={slot.color
            ? 'tokenpanel-palette-edit-preview-chip'
            : 'tokenpanel-palette-edit-preview-chip is-invalid'}
          style={slot.color ? { background: oklchaToHex(slot.color) } : undefined}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Channel toggle (L / C / H)
// ---------------------------------------------------------------------------

interface ChannelToggleProps {
  visible: VisibleChannels;
  onToggle: (channel: Channel) => void;
}

function ChannelToggle({ visible, onToggle }: ChannelToggleProps) {
  return (
    <div className="tokenpanel-palette-edit-channels" data-testid="palette-edit-channels">
      {CHANNEL_ORDER.map((channel) => {
        const on = visible[channel];
        const handleClick = () => onToggle(channel);
        return (
          <div
            key={channel}
            role="button"
            tabIndex={0}
            className={
              on
                ? `tokenpanel-palette-edit-channel is-on tokenpanel-palette-edit-channel--${channel}`
                : `tokenpanel-palette-edit-channel tokenpanel-palette-edit-channel--${channel}`
            }
            aria-pressed={on}
            onClick={handleClick}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }}
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

export default function PaletteEditView({
  tab,
  overrides,
  onChange,
  onCommitBatch,
  searchQuery = '',
  jumpAddress = null,
  onJumpAddressHandled,
}: PaletteEditViewProps) {
  const allTiers = groupPaletteTiers(tab);
  const query = searchQuery.trim();
  const tiers = useMemo(
    () => query
      ? allTiers.filter((tier) => matchesSearchFields({
          cssVar: '',
          id: tier.id,
          label: tier.label,
          value: '',
          tierLabel: tier.label,
        }, query))
      : allTiers,
    [allTiers, query],
  );

  // Single-open accordion. `null` = every group collapsed (the initial state):
  // the Edit view opens with ALL groups closed so the boxed headers read as
  // equally expandable (#517). This intentionally collapses the swatch strip too
  // — the documented scoped exception to the no-progressive-disclosure policy
  // (see packages/zdtp/CLAUDE.md). Accordion state is transient — never persisted.
  const [activeTierId, setActiveTierId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [visibleChannels, setVisibleChannels] = useState<VisibleChannels>({
    l: true,
    c: true,
    h: true,
  });

  // Transient drag accumulator: the LIVE OKLCH per changed item during a single
  // graph gesture. Empty between gestures. Painting reads this first so the
  // chart + swatches update on every frame WITHOUT persisting.
  //
  // Mirrored in a ref so the pointer-up commit reads the final accumulator
  // synchronously — the single `onCommitBatch` side-effect lives OUTSIDE any
  // setState updater (updaters must stay pure; a double-invoked updater would
  // otherwise fire two persists).
  const [transient, setTransient] = useState<Record<string, Oklcha>>({});
  const transientRef = useRef<Record<string, Oklcha>>({});
  const gestureRef = useRef<{ tierId: string; itemIds: string[] } | null>(null);

  const writeTransient = useCallback((next: Record<string, Oklcha>) => {
    transientRef.current = next;
    setTransient(next);
  }, []);

  const handleToggleChannel = useCallback((channel: Channel) => {
    setVisibleChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  }, []);

  const activeTier = tiers.find((t) => t.id === activeTierId) ?? null;

  useEffect(() => {
    if (!jumpAddress || jumpAddress.tabId !== tab.id) return;
    const targetTier = allTiers.find((tier) => tier.id === jumpAddress.tierId);
    const targetIndex = targetTier?.items.findIndex((item) => item.id === jumpAddress.itemId) ?? -1;
    if (!targetTier || targetIndex < 0) return;
    setActiveTierId(targetTier.id);
    setSelectedIndex(targetIndex);
    gestureRef.current = null;
    writeTransient({});
    if (!onJumpAddressHandled) return;
    const frame = window.requestAnimationFrame(() => onJumpAddressHandled(jumpAddress));
    return () => window.cancelAnimationFrame(frame);
  }, [allTiers, jumpAddress, onJumpAddressHandled, tab.id, writeTransient]);
  // Direct editor events can outlive the mounted ColorField DOM during a
  // config update. Read current selection/config through refs so even a stale
  // event closure cannot write an item that has since become readonly.
  const activeTierRef = useRef<TierConfig | null>(activeTier);
  activeTierRef.current = activeTier;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;

  // Resolve the active group's colors, overlaying any in-flight transient edits.
  const activeSlots: ColorSlot[] = useMemo(() => {
    if (!activeTier) return [];
    return activeTier.items.map((item) => {
      const live = transient[item.id];
      if (live && !item.readonly) return { value: oklchaToCss(live), color: live };
      return resolveItemSlot(item, activeTier.id, overrides);
    });
    // overrides + transient + activeTier are the full inputs.
  }, [activeTier, overrides, transient]);

  // ── Accordion (single-open groups) ──────────────────────────────────────────

  const handleToggleGroup = useCallback((tierId: string) => {
    // Re-click closes; a different group switches. Opening OR switching resets
    // the selection to step 0 so an index carried over from a longer group can
    // never be out of range in a shorter one.
    setActiveTierId((prev) => (prev === tierId ? null : tierId));
    const tier = tiers.find((candidate) => candidate.id === tierId);
    setSelectedIndex(tier ? initialSelectionIndex(tier, overrides) : 0);
    gestureRef.current = null;
    writeTransient({});
  }, [overrides, tiers, writeTransient]);

  // ── Selection ──────────────────────────────────────────────────────────────

  const handleSelectGroup = useCallback((tierId: string, index: number) => {
    setActiveTierId(tierId);
    setSelectedIndex(index);
  }, []);

  const handleChartSelectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // ── Batched drag commit ──────────────────────────────────────────────────

  const handleChangeStart = useCallback(() => {
    // Open a fresh transient session for this gesture.
    gestureRef.current = activeTier
      ? { tierId: activeTier.id, itemIds: activeTier.items.map((item) => item.id) }
      : null;
    writeTransient({});
  }, [activeTier, writeTransient]);

  const handleChartChange = useCallback(
    (index: number, channel: Channel, value: number) => {
      if (!activeTier) return;
      const gesture = gestureRef.current;
      if (gesture?.tierId !== activeTier.id) return;
      const item = activeTier.items[index];
      if (!item) return;
      if (gesture.itemIds[index] !== item.id) return;
      const resolved = resolveItemSlot(item, activeTier.id, overrides);
      if (!isWritableSlot(item, resolved)) return;
      // Build on the live value (prior transient OR the resolved base) so a
      // multi-channel gesture composes correctly per step. Read the ref so the
      // accumulator is always current within the gesture.
      const prev = transientRef.current;
      const base = prev[item.id] ?? resolved.color;
      // Cap hue at the commit boundary so a node dragged to the top of the axis
      // (h=360) survives the oklch() round-trip instead of wrapping back to 0.
      const safeValue = channel === 'h' ? clampHueForPersist(value) : value;
      writeTransient({ ...prev, [item.id]: { ...base, [channel]: safeValue } });
    },
    [activeTier, overrides, writeTransient],
  );

  const handleChangeEnd = useCallback(() => {
    // Snapshot the final accumulator from the ref and flush EXACTLY ONE batched
    // commit — entirely outside any setState updater.
    const acc = transientRef.current;
    const changedIds = Object.keys(acc);
    const gesture = gestureRef.current;
    const sameIdentityOrder = Boolean(
      activeTier &&
      gesture &&
      activeTier.id === gesture.tierId &&
      activeTier.items.length === gesture.itemIds.length &&
      activeTier.items.every((item, index) => item.id === gesture.itemIds[index]),
    );
    if (activeTier && sameIdentityOrder && changedIds.length > 0) {
      const patch: Record<string, string> = {};
      for (const id of changedIds) {
        const item = activeTier.items.find((candidate) => candidate.id === id);
        if (!isWritableSlot(item, item && resolveItemSlot(item, activeTier.id, overrides))) continue;
        // Persist the RAW OKLCH — never gamut-clamped. Clamping is a render
        // concern (oklchaToHex), not a storage concern.
        patch[id] = oklchaToCss(acc[id]);
      }
      if (Object.keys(patch).length === 0) {
        gestureRef.current = null;
        writeTransient({});
        return;
      }
      if (onCommitBatch) {
        onCommitBatch(activeTier.id, patch);
      } else {
        // Fallback when no batch path is wired: emit per-item changes.
        for (const [id, value] of Object.entries(patch)) {
          onChange(activeTier.id, id, value);
        }
      }
    }
    gestureRef.current = null;
    // Clear the accumulator; the committed values now live in `overrides`.
    writeTransient({});
  }, [activeTier, onChange, onCommitBatch, overrides, writeTransient]);

  // ── Direct (ColorField) edit of the selected step ─────────────────────────

  const handleDirectEdit = useCallback(
    (expectedTierId: string, expectedItemId: string, next: string) => {
      const currentTier = activeTierRef.current;
      if (!currentTier || currentTier.id !== expectedTierId) return;
      const item = currentTier.items[selectedIndexRef.current];
      if (!item || item.id !== expectedItemId) return;
      if (!isWritableSlot(item, resolveItemSlot(item, currentTier.id, overridesRef.current))) return;
      onChange(currentTier.id, item.id, next);
    },
    [onChange],
  );

  // Selected step's raw value for the readout + the ColorField.
  const selectedItem = activeTier?.items[selectedIndex];
  const selectedOklcha = activeSlots[selectedIndex]?.color ?? null;
  const selectedValue = selectedItem
    ? resolveItemValue(selectedItem, activeTier!.id, overrides)
    : '';

  return (
    <div className="tokenpanel-palette-edit-view" data-testid="palette-edit-view">
      {tiers.map((tier) => {
        const isActive = tier.id === activeTierId;
        // Chips track live color: the open group overlays in-flight transient
        // edits; collapsed groups resolve straight from overrides.
        const chipSlots = isActive
          ? activeSlots
          : tier.items.map((item) => resolveItemSlot(item, tier.id, overrides));
        return (
          <div
            key={tier.id}
            className={
              isActive
                ? 'tokenpanel-palette-edit-group is-active'
                : 'tokenpanel-palette-edit-group'
            }
            data-testid={`palette-edit-tier-${tier.id}`}
          >
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isActive}
              className="tokenpanel-palette-edit-group-header"
              onClick={() => handleToggleGroup(tier.id)}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleGroup(tier.id);
                }
              }}
              data-testid={`palette-edit-group-header-${tier.id}`}
            >
              <div
                className={
                  isActive
                    ? 'tokenpanel-palette-edit-group-chevron is-open'
                    : 'tokenpanel-palette-edit-group-chevron'
                }
                aria-hidden="true"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              <div role="heading" aria-level={3} className="tokenpanel-palette-edit-group-heading">
                {tier.label}
              </div>
              <GroupPreviewChips slots={chipSlots} />
            </div>

            {isActive && (
              <div className="tokenpanel-palette-edit-group-body">
                <div
                  className="tokenpanel-palette-edit-swatches"
                  data-testid={`palette-edit-swatches-${tier.id}`}
                >
                  {tier.items.map((item, index) => (
                    <Swatch
                      key={item.id}
                      item={item}
                      index={index}
                    slot={activeSlots[index]}
                    isSelected={index === selectedIndex}
                    onSelect={(i) => handleSelectGroup(tier.id, i)}
                    address={{ tabId: tab.id, tierId: tier.id, itemId: item.id }}
                  />
                  ))}
                </div>

                <ActiveGroupEditor
                  tier={tier}
                  colors={activeSlots.map((slot) => slot.color)}
                  editable={tier.items.map((item, index) =>
                    isWritableSlot(item, activeSlots[index]),
                  )}
                  identities={tier.items.map((item) => item.id)}
                  selectedIndex={selectedIndex}
                  visibleChannels={visibleChannels}
                  selectedItem={selectedItem}
                  selectedOklcha={selectedOklcha}
                  selectedValue={selectedValue}
                  onChartChange={handleChartChange}
                  onChartSelectIndex={handleChartSelectIndex}
                  onToggleChannel={handleToggleChannel}
                  onChangeStart={handleChangeStart}
                  onChangeEnd={handleChangeEnd}
                  onDirectEdit={handleDirectEdit}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active group editor (chart + channel toggle + ColorField + readout)
// ---------------------------------------------------------------------------

interface ActiveGroupEditorProps {
  tier: TierConfig;
  colors: Array<Oklcha | null>;
  editable: boolean[];
  identities: string[];
  selectedIndex: number;
  visibleChannels: VisibleChannels;
  selectedItem: TierItem | undefined;
  selectedOklcha: Oklcha | null;
  selectedValue: string;
  onChartChange: (index: number, channel: Channel, value: number) => void;
  onChartSelectIndex: (index: number) => void;
  onToggleChannel: (channel: Channel) => void;
  onChangeStart: () => void;
  onChangeEnd: () => void;
  onDirectEdit: (tierId: string, itemId: string, next: string) => void;
}

function ActiveGroupEditor({
  tier,
  colors,
  editable,
  identities,
  selectedIndex,
  visibleChannels,
  selectedItem,
  selectedOklcha,
  selectedValue,
  onChartChange,
  onChartSelectIndex,
  onToggleChannel,
  onChangeStart,
  onChangeEnd,
  onDirectEdit,
}: ActiveGroupEditorProps) {
  const hasWritableColor = editable.some(Boolean);
  const hasValidColor = colors.some(Boolean);
  const allItemsReadonly = tier.items.length > 0 && tier.items.every((item) => item.readonly);
  const selectedReadonly = Boolean(selectedItem?.readonly);
  return (
    <div className="tokenpanel-palette-edit-editor" data-testid={`palette-edit-editor-${tier.id}`}>
      <div className="tokenpanel-palette-edit-editor-bar">
        <div className="tokenpanel-palette-edit-editor-title">
          {hasWritableColor
            ? 'Curve editor · drag node = step, drag line = writable ramp steps'
            : allItemsReadonly
              ? 'Static curve · all steps are locked'
              : hasValidColor
                ? 'Static curve · no writable colors'
                : 'Curve unavailable · no supported colors'}
        </div>
        {hasWritableColor && (
          <ChannelToggle visible={visibleChannels} onToggle={onToggleChannel} />
        )}
      </div>

      <PaletteChart
        colors={colors}
        editable={editable}
        identities={identities}
        selectedIndex={selectedIndex}
        visibleChannels={visibleChannels}
        onChange={onChartChange}
        onSelectIndex={onChartSelectIndex}
        onToggleChannel={onToggleChannel}
        onChangeStart={onChangeStart}
        onChangeEnd={onChangeEnd}
      />

      <div className="tokenpanel-palette-edit-direct" data-testid="palette-edit-direct">
        {selectedItem && selectedOklcha && !selectedReadonly && (
          <ColorField
            key={`${tier.id}:${selectedItem.id}`}
            value={selectedValue}
            onChange={(next) => onDirectEdit(tier.id, selectedItem.id, next)}
            valueFormat="oklch"
            label={selectedItem.label}
            cssVar={selectedItem.cssVar}
          />
        )}
        <div className="tokenpanel-palette-edit-direct-hint">
          {selectedReadonly
            ? 'Locked · read-only inspection'
            : selectedOklcha
              ? 'edit selected step exactly'
              : 'N/A · unsupported color is read-only'}
        </div>
      </div>

      {selectedItem && selectedOklcha ? (
        <PaletteReadout
          oklcha={selectedOklcha}
          cssVar={selectedItem.cssVar}
          outOfGamut={!isInSrgbGamut(selectedOklcha)}
        />
      ) : selectedItem ? (
        <div className="tokenpanel-palette-readout is-invalid" data-testid="palette-readout-invalid">
          <div className="tokenpanel-palette-readout-swatch is-invalid" aria-hidden="true" />
          <div className="tokenpanel-palette-readout-rows">
            <div className="tokenpanel-palette-readout-row" data-testid="palette-readout-token">
              <span className="tokenpanel-palette-readout-key">token</span>
              <span className="tokenpanel-palette-readout-val">{selectedItem.cssVar}</span>
            </div>
            <div className="tokenpanel-palette-readout-row" data-testid="palette-readout-invalid-value">
              <span className="tokenpanel-palette-readout-key">value</span>
              <span className="tokenpanel-palette-readout-val">{selectedValue}</span>
            </div>
            <div className="tokenpanel-palette-readout-gamut">N/A · unsupported contextual color</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
