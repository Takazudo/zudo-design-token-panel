/**
 * PaletteCheckView — Check mode Left/Right contrast checker (#394).
 *
 * Left column: full palette as selectable base rows (div[role="button"]).
 * Right column: every palette color annotated against the selected base:
 *   - Live "Aa" sample (candidate foreground on base background)
 *   - WCAG ratio (contrastRatio)
 *   - Fail/AA/AAA chip using fixed semantic colors (not theme tokens)
 *
 * WCAG contrast is symmetric; ratio is computed once per candidate pair.
 *
 * Toggles: grouped↔flat listing; normal/large text thresholds.
 */

import { useState, useCallback } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import { groupPaletteTiers, flattenPaletteTiers } from './palette-tab';
import { contrastRatio, contrastScore } from '../../utils/wcag-contrast';
import { cssToOklcha, oklchaToHex } from '../../utils/color-oklch';

// ---------------------------------------------------------------------------
// Fixed semantic colors for WCAG chip backgrounds.
// These are hardcoded per spec (#394) and must NOT come from theme tokens —
// they convey accessibility verdicts and must remain legible in any theme.
// ---------------------------------------------------------------------------
const CHIP_COLOR_AAA = '#1a7a3f';
const CHIP_COLOR_AA = '#8a6200';
const CHIP_COLOR_FAIL = '#b81d1d';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PaletteCheckViewProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the effective CSS value for a palette item:
 * override if present, else the item's default.
 */
function resolveItemValue(
  item: TierItem,
  tierId: string,
  overrides: TabOverrides,
): string {
  return overrides[tierId]?.[item.id] ?? item.default;
}

/**
 * Convert an oklch() CSS value to a hex string for contrast calculation.
 * Falls back to '#000000' if the value is not a valid oklch string.
 */
function oklchCssToHex(cssValue: string): string {
  const oklcha = cssToOklcha(cssValue);
  if (!oklcha) return '#000000';
  return oklchaToHex(oklcha);
}

/** Chip background color for a given score label. */
function chipColor(score: 'Fail' | 'AA' | 'AAA'): string {
  if (score === 'AAA') return CHIP_COLOR_AAA;
  if (score === 'AA') return CHIP_COLOR_AA;
  return CHIP_COLOR_FAIL;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BaseRowProps {
  item: TierItem;
  tierId: string;
  overrides: TabOverrides;
  isSelected: boolean;
  onSelect: (tierId: string, itemId: string) => void;
}

function BaseRow({ item, tierId, overrides, isSelected, onSelect }: BaseRowProps) {
  const cssValue = resolveItemValue(item, tierId, overrides);
  const hexColor = oklchCssToHex(cssValue);

  const handleClick = useCallback(() => {
    onSelect(tierId, item.id);
  }, [tierId, item.id, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(tierId, item.id);
      }
    },
    [tierId, item.id, onSelect],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      className={
        isSelected
          ? 'tokenpanel-palette-check-base-row is-selected'
          : 'tokenpanel-palette-check-base-row'
      }
      aria-pressed={isSelected}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`palette-check-base-row-${item.id}`}
    >
      <div
        className="tokenpanel-palette-check-swatch"
        style={{ background: hexColor }}
        aria-hidden="true"
      />
      <div className="tokenpanel-palette-check-row-name">{item.label}</div>
    </div>
  );
}

interface CandidateRowProps {
  item: TierItem;
  tierId: string;
  overrides: TabOverrides;
  baseHex: string;
  isLarge: boolean;
}

function CandidateRow({ item, tierId, overrides, baseHex, isLarge }: CandidateRowProps) {
  const cssValue = resolveItemValue(item, tierId, overrides);
  const candidateHex = oklchCssToHex(cssValue);
  const ratio = contrastRatio(baseHex, candidateHex);
  const score = contrastScore(ratio, { large: isLarge });
  const bg = chipColor(score);

  return (
    <div
      className="tokenpanel-palette-check-candidate-row"
      data-testid={`palette-check-candidate-row-${item.id}`}
    >
      <div
        className="tokenpanel-palette-check-aa-sample"
        style={{ color: candidateHex, background: baseHex }}
        aria-hidden="true"
      >
        Aa
      </div>
      <div className="tokenpanel-palette-check-row-name">{item.label}</div>
      <div className="tokenpanel-palette-check-ratio">{ratio.toFixed(1)}</div>
      <div
        className="tokenpanel-palette-check-chip"
        style={{ background: bg }}
        data-testid={`palette-check-chip-${item.id}`}
      >
        {score}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped / flat section renderers
// ---------------------------------------------------------------------------

interface LeftSectionProps {
  tier: TierConfig;
  overrides: TabOverrides;
  selectedTierId: string;
  selectedItemId: string;
  onSelect: (tierId: string, itemId: string) => void;
  showHeading: boolean;
}

function LeftSection({
  tier,
  overrides,
  selectedTierId,
  selectedItemId,
  onSelect,
  showHeading,
}: LeftSectionProps) {
  return (
    <div className="tokenpanel-tab-section" data-testid={`palette-check-left-tier-${tier.id}`}>
      {showHeading && (
        <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">
          {tier.label}
        </div>
      )}
      {tier.items.map((item) => (
        <BaseRow
          key={item.id}
          item={item}
          tierId={tier.id}
          overrides={overrides}
          isSelected={selectedTierId === tier.id && selectedItemId === item.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface RightSectionProps {
  tier: TierConfig;
  overrides: TabOverrides;
  baseHex: string;
  isLarge: boolean;
  showHeading: boolean;
}

function RightSection({ tier, overrides, baseHex, isLarge, showHeading }: RightSectionProps) {
  return (
    <div className="tokenpanel-tab-section" data-testid={`palette-check-right-tier-${tier.id}`}>
      {showHeading && (
        <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">
          {tier.label}
        </div>
      )}
      {tier.items.map((item) => (
        <CandidateRow
          key={item.id}
          item={item}
          tierId={tier.id}
          overrides={overrides}
          baseHex={baseHex}
          isLarge={isLarge}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaletteCheckView
// ---------------------------------------------------------------------------

export default function PaletteCheckView({ tab, overrides }: PaletteCheckViewProps) {
  const tiers = groupPaletteTiers(tab);
  const allItems = flattenPaletteTiers(tab);

  // Default selection: first item of the first tier
  const firstTier = tiers[0];
  const firstItem = firstTier?.items[0];

  const [selectedTierId, setSelectedTierId] = useState<string>(firstTier?.id ?? '');
  const [selectedItemId, setSelectedItemId] = useState<string>(firstItem?.id ?? '');
  const [isGrouped, setIsGrouped] = useState(true);
  const [isLarge, setIsLarge] = useState(false);

  const handleSelect = useCallback((tierId: string, itemId: string) => {
    setSelectedTierId(tierId);
    setSelectedItemId(itemId);
  }, []);

  const handleGroupedChange = useCallback((e: Event) => {
    setIsGrouped(!(e.target as HTMLInputElement).checked);
  }, []);

  const handleLargeChange = useCallback((e: Event) => {
    setIsLarge((e.target as HTMLInputElement).checked);
  }, []);

  // Resolve the base hex value for contrast calculations
  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? firstTier;
  const selectedItem =
    selectedTier?.items.find((i) => i.id === selectedItemId) ??
    selectedTier?.items[0];

  const baseHex = selectedItem
    ? oklchCssToHex(resolveItemValue(selectedItem, selectedTier!.id, overrides))
    : '#000000';

  // Footer tally: how many colors pass AA (ratio >= threshold)
  const aaThreshold = isLarge ? 3.0 : 4.5;
  const passCount = allItems.filter((item) => {
    // Find the item's tier to get its tierId for override resolution
    const tier = tiers.find((t) => t.items.some((i) => i.id === item.id));
    if (!tier) return false;
    const hex = oklchCssToHex(resolveItemValue(item, tier.id, overrides));
    return contrastRatio(baseHex, hex) >= aaThreshold;
  }).length;

  const baseLabel = selectedItem?.label ?? '';

  // Build a flat pseudo-tier for flat-mode rendering
  const flatTier: TierConfig = {
    id: '__flat__',
    label: '',
    items: allItems,
  };

  return (
    <div className="tokenpanel-palette-check-view" data-testid="palette-check-view">
      {/* Toolbar: grouped/flat toggle + large text toggle */}
      <div className="tokenpanel-palette-check-toolbar" data-testid="palette-check-toolbar">
        <label className="tokenpanel-palette-check-switch">
          <input
            type="checkbox"
            checked={!isGrouped}
            onChange={handleGroupedChange}
            data-testid="palette-check-flat-toggle"
          />
          Flat list
        </label>
        <label className="tokenpanel-palette-check-switch">
          <input
            type="checkbox"
            checked={isLarge}
            onChange={handleLargeChange}
            data-testid="palette-check-large-toggle"
          />
          Large text
        </label>
      </div>

      {/* Two-column body */}
      <div className="tokenpanel-palette-check-cols">
        {/* Left: Background (base) column */}
        <div className="tokenpanel-palette-check-col" data-testid="palette-check-left-col">
          <div className="tokenpanel-palette-check-col-cap">
            Background (base)
          </div>
          {isGrouped
            ? tiers.map((tier) => (
                <LeftSection
                  key={tier.id}
                  tier={tier}
                  overrides={overrides}
                  selectedTierId={selectedTierId}
                  selectedItemId={selectedItemId}
                  onSelect={handleSelect}
                  showHeading={true}
                />
              ))
            : (
                <LeftSection
                  tier={flatTier}
                  overrides={overrides}
                  selectedTierId={selectedTierId}
                  selectedItemId={selectedItemId}
                  onSelect={handleSelect}
                  showHeading={false}
                />
              )}
        </div>

        {/* Right: Foreground vs base column */}
        <div className="tokenpanel-palette-check-col" data-testid="palette-check-right-col">
          <div className="tokenpanel-palette-check-col-cap">
            Foreground vs base
          </div>
          {isGrouped
            ? tiers.map((tier) => (
                <RightSection
                  key={tier.id}
                  tier={tier}
                  overrides={overrides}
                  baseHex={baseHex}
                  isLarge={isLarge}
                  showHeading={true}
                />
              ))
            : (
                <RightSection
                  tier={flatTier}
                  overrides={overrides}
                  baseHex={baseHex}
                  isLarge={isLarge}
                  showHeading={false}
                />
              )}
        </div>
      </div>

      {/* Footer tally */}
      <div className="tokenpanel-palette-check-footer" data-testid="palette-check-footer">
        <span className="tokenpanel-palette-check-tally-count">{passCount}</span>
        {' of '}
        <span className="tokenpanel-palette-check-tally-total">{allItems.length}</span>
        {' palette colors pass AA as '}
        <span className="tokenpanel-palette-check-tally-mode">
          {isLarge ? 'large' : 'normal'}
        </span>
        {' text on '}
        <span className="tokenpanel-palette-check-tally-base">{baseLabel}</span>
      </div>
    </div>
  );
}
