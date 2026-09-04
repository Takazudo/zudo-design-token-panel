/** Palette Check mode — contrast is reported only for static, opaque pairs. */
import { useCallback, useMemo, useState } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import { groupPaletteTiers } from './palette-tab';
import { contrastRatio, contrastScore } from '../../utils/wcag-contrast';
import { oklchaToHex, staticCssColorToOklcha, type Oklcha } from '../../utils/color-oklch';
import { matchesSearchFields } from '../../search/token-search';
import type { TokenAddress } from '../flat/types';
import { tokenAddressKey } from '../flat/types';

const CHIP_COLOR_AAA = '#1a7a3f';
const CHIP_COLOR_AA = '#8a6200';
const CHIP_COLOR_FAIL = '#b81d1d';

export interface PaletteCheckViewProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string) => void;
  searchQuery?: string;
}

interface PaletteEntry {
  address: TokenAddress;
  tierId: string;
  item: TierItem;
  value: string;
  color: Oklcha | null;
  hex: string | null;
  opaque: boolean;
}

function resolveEntry(tabId: string, item: TierItem, tierId: string, overrides: TabOverrides): PaletteEntry {
  const value = overrides[tierId]?.[item.id] ?? item.default;
  const color = staticCssColorToOklcha(value);
  return { address: { tabId, tierId, itemId: item.id }, item, tierId, value, color, hex: color ? oklchaToHex(color) : null, opaque: color !== null && color.a >= 100 };
}

function entryKey(entry: PaletteEntry): string {
  return `${entry.tierId}\u0000${entry.item.id}`;
}

function chipColor(score: 'Fail' | 'AA' | 'AAA'): string {
  if (score === 'AAA') return CHIP_COLOR_AAA;
  if (score === 'AA') return CHIP_COLOR_AA;
  return CHIP_COLOR_FAIL;
}

function EntryName({ entry }: { entry: PaletteEntry }) {
  return (
    <div className="tokenpanel-palette-check-row-name">
      <div>{entry.item.label}</div>
      {!entry.opaque && <div className="tokenpanel-palette-check-row-value">{entry.item.cssVar}: {entry.value}</div>}
    </div>
  );
}

function BaseRow({ entry, isSelected, onSelect }: { entry: PaletteEntry; isSelected: boolean; onSelect: (entry: PaletteEntry) => void }) {
  const disabled = !entry.opaque;
  const reason = entry.color ? 'transparent colors need compositing' : 'unsupported color';
  const handleClick = useCallback(() => {
    if (!disabled) onSelect(entry);
  }, [disabled, entry, onSelect]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(entry);
    }
  }, [disabled, entry, onSelect]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={`tokenpanel-palette-check-base-row${isSelected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
      aria-pressed={disabled ? undefined : isSelected}
      aria-disabled={disabled || undefined}
      aria-label={`${entry.item.label}: ${entry.value}${disabled ? ` (N/A: ${reason})` : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`palette-check-base-row-${entry.item.id}`}
      data-address={tokenAddressKey(entry.address)}
      data-na-reason={disabled ? reason : undefined}
    >
      <div className={`tokenpanel-palette-check-swatch${entry.color ? '' : ' is-invalid'}`} style={entry.hex ? { background: entry.hex } : undefined} aria-hidden="true" />
      <EntryName entry={entry} />
      {disabled && <div className="tokenpanel-palette-check-na">N/A</div>}
    </div>
  );
}

function CandidateRow({ entry, base, isLarge }: { entry: PaletteEntry; base: PaletteEntry | null; isLarge: boolean }) {
  const computable = Boolean(base?.opaque && base.hex && entry.opaque && entry.hex);
  const ratio = computable ? contrastRatio(base!.hex!, entry.hex!) : null;
  const score = ratio === null ? null : contrastScore(ratio, { large: isLarge });
  const reason = !base ? 'no valid opaque base' : !entry.color ? 'unsupported color' : !entry.opaque ? 'transparent color needs compositing' : null;
  return (
    <div className={`tokenpanel-palette-check-candidate-row${computable ? '' : ' is-na'}`} data-testid={`palette-check-candidate-row-${entry.item.id}`} data-address={tokenAddressKey(entry.address)} data-na-reason={reason ?? undefined}>
      <div className={`tokenpanel-palette-check-aa-sample${entry.color ? '' : ' is-invalid'}`} style={entry.hex && base?.hex ? { color: entry.hex, background: base.hex } : undefined} aria-hidden="true">{entry.color ? 'Aa' : 'N/A'}</div>
      <EntryName entry={entry} />
      <div className="tokenpanel-palette-check-ratio">{ratio === null ? 'N/A' : ratio.toFixed(1)}</div>
      <div className={`tokenpanel-palette-check-chip${score ? '' : ' is-na'}`} style={score ? { background: chipColor(score) } : undefined} data-testid={`palette-check-chip-${entry.item.id}`}>{score ?? 'N/A'}</div>
    </div>
  );
}

interface EntrySectionProps {
  tier: TierConfig;
  entries: PaletteEntry[];
  side: 'left' | 'right';
  showHeading: boolean;
  selectedKey?: string;
  onSelect?: (entry: PaletteEntry) => void;
  base?: PaletteEntry | null;
  isLarge?: boolean;
}

function EntrySection(props: EntrySectionProps) {
  const { tier, entries, side, showHeading } = props;
  return (
    <div className="tokenpanel-tab-section" data-testid={`palette-check-${side}-tier-${tier.id}`}>
      {showHeading && <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">{tier.label}</div>}
      {entries.map((entry) => side === 'left' ? (
        <BaseRow key={entryKey(entry)} entry={entry} isSelected={props.selectedKey === entryKey(entry)} onSelect={props.onSelect!} />
      ) : (
        <CandidateRow key={entryKey(entry)} entry={entry} base={props.base ?? null} isLarge={Boolean(props.isLarge)} />
      ))}
    </div>
  );
}

export default function PaletteCheckView({ tab, overrides, searchQuery = '' }: PaletteCheckViewProps) {
  const tiers = groupPaletteTiers(tab);
  const query = searchQuery.trim();
  const visibleTiers = useMemo(
    () => query
      ? tiers.filter((tier) => matchesSearchFields({
          cssVar: '',
          id: tier.id,
          label: tier.label,
          value: '',
          tierLabel: tier.label,
        }, query))
      : tiers,
    [query, tiers],
  );
  const entriesByTier = useMemo(() => new Map(visibleTiers.map((tier) => [tier.id, tier.items.map((item) => resolveEntry(tab.id, item, tier.id, overrides))])), [overrides, tab.id, visibleTiers]);
  const allEntries = visibleTiers.flatMap((tier) => entriesByTier.get(tier.id) ?? []);
  const firstOpaque = allEntries.find((entry) => entry.opaque) ?? null;
  const [selectedKey, setSelectedKey] = useState(() => firstOpaque ? entryKey(firstOpaque) : '');
  const [isGrouped, setIsGrouped] = useState(true);
  const [isLarge, setIsLarge] = useState(false);
  const selectedBase = allEntries.find((entry) => entry.opaque && entryKey(entry) === selectedKey) ?? firstOpaque;
  const effectiveSelectedKey = selectedBase ? entryKey(selectedBase) : '';

  const handleSelect = useCallback((entry: PaletteEntry) => {
    if (entry.opaque) setSelectedKey(entryKey(entry));
  }, []);
  const handleGroupedChange = useCallback((e: Event) => setIsGrouped(!(e.target as HTMLInputElement).checked), []);
  const handleLargeChange = useCallback((e: Event) => setIsLarge((e.target as HTMLInputElement).checked), []);

  const aaThreshold = isLarge ? 3 : 4.5;
  const computableEntries = selectedBase ? allEntries.filter((entry) => entry.opaque && entry.hex) : [];
  const passCount = computableEntries.filter((entry) => contrastRatio(selectedBase!.hex!, entry.hex!) >= aaThreshold).length;
  const flatTier: TierConfig = { id: '__flat__', label: 'Palette', items: [] };
  const renderSections = (side: 'left' | 'right') => isGrouped ? visibleTiers.map((tier) => (
    <EntrySection key={`${side}-${tier.id}`} tier={tier} entries={entriesByTier.get(tier.id) ?? []} side={side} showHeading={true} selectedKey={effectiveSelectedKey} onSelect={handleSelect} base={selectedBase} isLarge={isLarge} />
  )) : (
    <EntrySection tier={flatTier} entries={allEntries} side={side} showHeading={false} selectedKey={effectiveSelectedKey} onSelect={handleSelect} base={selectedBase} isLarge={isLarge} />
  );

  return (
    <div className="tokenpanel-palette-check-view" data-testid="palette-check-view">
      <div className="tokenpanel-palette-check-toolbar" data-testid="palette-check-toolbar">
        <label className="tokenpanel-palette-check-switch"><input type="checkbox" checked={!isGrouped} onChange={handleGroupedChange} data-testid="palette-check-flat-toggle" />Flat list</label>
        <label className="tokenpanel-palette-check-switch"><input type="checkbox" checked={isLarge} onChange={handleLargeChange} data-testid="palette-check-large-toggle" />Large text</label>
      </div>
      <div className="tokenpanel-palette-check-cols">
        <div className="tokenpanel-palette-check-col" data-testid="palette-check-left-col"><div className="tokenpanel-palette-check-col-cap">Background (base)</div>{renderSections('left')}</div>
        <div className="tokenpanel-palette-check-col" data-testid="palette-check-right-col"><div className="tokenpanel-palette-check-col-cap">Foreground vs base</div>{renderSections('right')}</div>
      </div>
      <div className="tokenpanel-palette-check-footer" data-testid="palette-check-footer">
        {computableEntries.length === 0 ? <span data-testid="palette-check-all-na">All palette contrasts are N/A · no valid opaque base/candidates</span> : <>
          <span className="tokenpanel-palette-check-tally-count">{passCount}</span>{' of '}<span className="tokenpanel-palette-check-tally-total">{computableEntries.length}</span>{' computable palette colors pass AA as '}<span className="tokenpanel-palette-check-tally-mode">{isLarge ? 'large' : 'normal'}</span>{' text on '}<span className="tokenpanel-palette-check-tally-base">{selectedBase?.item.label}</span>
        </>}
      </div>
    </div>
  );
}
