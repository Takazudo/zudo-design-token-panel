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

import { useCallback, useMemo, useRef, useState } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import { groupPaletteTiers } from './palette-tab';
import {
  cssToOklcha,
  oklchaToCss,
  oklchaToHex,
  isInSrgbGamut,
  type Oklcha,
} from '../../utils/color-oklch';
import { clampHueForPersist, type Channel } from '../../utils/palette-curve';
import { PaletteChart } from '../../components/palette-chart';
import { ColorField } from '../../components/color-picker/color-field';
import PaletteReadout from './palette-readout';

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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Effective CSS value for an item: override if present, else the default. */
function resolveItemValue(item: TierItem, tierId: string, overrides: TabOverrides): string {
  return overrides[tierId]?.[item.id] ?? item.default;
}

/** Parse an item's effective value to Oklcha, falling back to black on junk. */
function resolveItemOklcha(item: TierItem, tierId: string, overrides: TabOverrides): Oklcha {
  return cssToOklcha(resolveItemValue(item, tierId, overrides)) ?? { l: 0, c: 0, h: 0, a: 100 };
}

type VisibleChannels = { l: boolean; c: boolean; h: boolean };
const CHANNEL_ORDER: readonly Channel[] = ['l', 'c', 'h'] as const;

// ---------------------------------------------------------------------------
// Swatch row
// ---------------------------------------------------------------------------

interface SwatchProps {
  item: TierItem;
  index: number;
  oklcha: Oklcha;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

function Swatch({ item, index, oklcha, isSelected, onSelect }: SwatchProps) {
  // Clamp only for the fill; the underlying value stays raw.
  const fill = oklchaToHex(oklcha);
  const outOfGamut = !isInSrgbGamut(oklcha);

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
        isSelected
          ? 'tokenpanel-palette-edit-swatch is-selected'
          : 'tokenpanel-palette-edit-swatch'
      }
      style={{ background: fill }}
      data-out-of-gamut={outOfGamut || undefined}
      aria-pressed={isSelected}
      aria-label={`${item.label}: ${item.cssVar}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`palette-edit-swatch-${item.id}`}
    >
      <span className="tokenpanel-palette-edit-swatch-idx" aria-hidden="true">
        {index}
      </span>
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

export default function PaletteEditView({ tab, overrides, onChange, onCommitBatch }: PaletteEditViewProps) {
  const tiers = groupPaletteTiers(tab);
  const firstTier = tiers[0];

  const [activeTierId, setActiveTierId] = useState<string>(firstTier?.id ?? '');
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

  const writeTransient = useCallback((next: Record<string, Oklcha>) => {
    transientRef.current = next;
    setTransient(next);
  }, []);

  const handleToggleChannel = useCallback((channel: Channel) => {
    setVisibleChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  }, []);

  const activeTier = tiers.find((t) => t.id === activeTierId) ?? firstTier;

  // Resolve the active group's colors, overlaying any in-flight transient edits.
  const activeColors: Oklcha[] = useMemo(() => {
    if (!activeTier) return [];
    return activeTier.items.map((item) => {
      const live = transient[item.id];
      if (live) return live;
      return resolveItemOklcha(item, activeTier.id, overrides);
    });
    // overrides + transient + activeTier are the full inputs.
  }, [activeTier, overrides, transient]);

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
    writeTransient({});
  }, [writeTransient]);

  const handleChartChange = useCallback(
    (index: number, channel: Channel, value: number) => {
      if (!activeTier) return;
      const item = activeTier.items[index];
      if (!item) return;
      // Build on the live value (prior transient OR the resolved base) so a
      // multi-channel gesture composes correctly per step. Read the ref so the
      // accumulator is always current within the gesture.
      const prev = transientRef.current;
      const base = prev[item.id] ?? resolveItemOklcha(item, activeTier.id, overrides);
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
    if (activeTier && changedIds.length > 0) {
      const patch: Record<string, string> = {};
      for (const id of changedIds) {
        // Persist the RAW OKLCH — never gamut-clamped. Clamping is a render
        // concern (oklchaToHex), not a storage concern.
        patch[id] = oklchaToCss(acc[id]);
      }
      if (onCommitBatch) {
        onCommitBatch(activeTier.id, patch);
      } else {
        // Fallback when no batch path is wired: emit per-item changes.
        for (const id of changedIds) onChange(activeTier.id, id, patch[id]);
      }
    }
    // Clear the accumulator; the committed values now live in `overrides`.
    writeTransient({});
  }, [activeTier, onChange, onCommitBatch, writeTransient]);

  // ── Direct (ColorField) edit of the selected step ─────────────────────────

  const handleDirectEdit = useCallback(
    (next: string) => {
      if (!activeTier) return;
      const item = activeTier.items[selectedIndex];
      if (!item) return;
      onChange(activeTier.id, item.id, next);
    },
    [activeTier, selectedIndex, onChange],
  );

  // Selected step's raw value for the readout + the ColorField.
  const selectedItem = activeTier?.items[selectedIndex];
  const selectedOklcha = activeColors[selectedIndex];
  const selectedValue = selectedItem
    ? resolveItemValue(selectedItem, activeTier!.id, overrides)
    : '';

  return (
    <div className="tokenpanel-palette-edit-view" data-testid="palette-edit-view">
      {tiers.map((tier) => {
        const isActive = tier.id === activeTierId;
        return (
          <div
            key={tier.id}
            className={
              isActive
                ? 'tokenpanel-tab-section tokenpanel-palette-edit-group is-active'
                : 'tokenpanel-tab-section tokenpanel-palette-edit-group'
            }
            data-testid={`palette-edit-tier-${tier.id}`}
          >
            <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">
              {tier.label}
            </div>

            <div className="tokenpanel-palette-edit-swatches" data-testid={`palette-edit-swatches-${tier.id}`}>
              {tier.items.map((item, index) => {
                // Active group uses live (transient-aware) colors; inactive
                // groups resolve straight from overrides.
                const oklcha = isActive
                  ? activeColors[index]
                  : resolveItemOklcha(item, tier.id, overrides);
                return (
                  <Swatch
                    key={item.id}
                    item={item}
                    index={index}
                    oklcha={oklcha}
                    isSelected={isActive && index === selectedIndex}
                    onSelect={(i) => handleSelectGroup(tier.id, i)}
                  />
                );
              })}
            </div>

            {isActive && (
              <ActiveGroupEditor
                tier={tier}
                colors={activeColors}
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
  colors: Oklcha[];
  selectedIndex: number;
  visibleChannels: VisibleChannels;
  selectedItem: TierItem | undefined;
  selectedOklcha: Oklcha | undefined;
  selectedValue: string;
  onChartChange: (index: number, channel: Channel, value: number) => void;
  onChartSelectIndex: (index: number) => void;
  onToggleChannel: (channel: Channel) => void;
  onChangeStart: () => void;
  onChangeEnd: () => void;
  onDirectEdit: (next: string) => void;
}

function ActiveGroupEditor({
  tier,
  colors,
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
  const fallback: Oklcha = { l: 0, c: 0, h: 0, a: 100 };
  const readoutOklcha = selectedOklcha ?? fallback;

  return (
    <div className="tokenpanel-palette-edit-editor" data-testid={`palette-edit-editor-${tier.id}`}>
      <div className="tokenpanel-palette-edit-editor-bar">
        <div className="tokenpanel-palette-edit-editor-title">
          Curve editor · drag node = step, drag line = whole ramp
        </div>
        <ChannelToggle visible={visibleChannels} onToggle={onToggleChannel} />
      </div>

      <PaletteChart
        colors={colors}
        selectedIndex={selectedIndex}
        visibleChannels={visibleChannels}
        onChange={onChartChange}
        onSelectIndex={onChartSelectIndex}
        onToggleChannel={onToggleChannel}
        onChangeStart={onChangeStart}
        onChangeEnd={onChangeEnd}
      />

      <div className="tokenpanel-palette-edit-direct" data-testid="palette-edit-direct">
        {selectedItem && (
          <ColorField
            value={selectedValue}
            onChange={onDirectEdit}
            valueFormat="oklch"
            label={selectedItem.label}
            cssVar={selectedItem.cssVar}
          />
        )}
        <div className="tokenpanel-palette-edit-direct-hint" aria-hidden="true">
          edit selected step exactly
        </div>
      </div>

      {selectedItem && (
        <PaletteReadout
          oklcha={readoutOklcha}
          cssVar={selectedItem.cssVar}
          outOfGamut={!isInSrgbGamut(readoutOklcha)}
        />
      )}
    </div>
  );
}
