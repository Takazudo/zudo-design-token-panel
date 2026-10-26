/** @jsxImportSource @takazudo/zfb/zudo-react */
/** Palette Check mode — contrast is reported only for static, opaque pairs. */
import { computed, For, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import { groupPaletteTiers } from './palette-tab';
import { contrastRatio, contrastScore } from '../../utils/wcag-contrast';
import { oklchaToHex, staticCssColorToOklcha, type Oklcha } from '../../utils/color-oklch';
import { matchesSearchFields } from '../../search/token-search';
import type { TokenAddress } from '../flat/types';
import { tokenAddressKey } from '../flat/types';
import { ModesEditorFields, ModesValuePair, resolveModeRowSides, type ModeSides } from '../modes-row';
import { Checkbox } from '../../zr/form-controls';
import { read, type Reactive } from '../../zr/live';
import { Rebuild } from '../../zr/rebuild';

const CHIP_COLOR_AAA = '#1a7a3f';
const CHIP_COLOR_AA = '#8a6200';
const CHIP_COLOR_FAIL = '#b81d1d';

export interface PaletteCheckViewProps {
  tab: TabConfig;
  overrides: TabOverrides;
  onChange: (tierId: string, itemId: string, next: string) => void;
  searchQuery?: string;
  changedOnly?: boolean;
  isChanged?: (address: TokenAddress) => boolean;
}

export type PaletteCheckViewStaticKeys = 'onChange';

interface PaletteEntry {
  address: TokenAddress;
  tierId: string;
  item: TierItem;
  value: string;
  color: Oklcha | null;
  hex: string | null;
  opaque: boolean;
  modes: ModeSides | null;
}

function resolveEntry(tabId: string, item: TierItem, tierId: string, overrides: TabOverrides): PaletteEntry {
  const override = overrides[tierId]?.[item.id];
  const modes = item.modes
    ? resolveModeRowSides(item, override, override !== undefined)
    : null;
  const value = override ?? (modes ? `light-dark(${modes.light}, ${modes.dark})` : item.default);
  const color = modes ? null : staticCssColorToOklcha(value);
  return {
    address: { tabId, tierId, itemId: item.id },
    item,
    tierId,
    value,
    color,
    hex: color ? oklchaToHex(color) : null,
    opaque: color !== null && color.a >= 100,
    modes,
  };
}

function entryKey(entry: PaletteEntry): string {
  return `${entry.tierId}\u0000${entry.item.id}`;
}

function chipColor(score: 'Fail' | 'AA' | 'AAA'): string {
  if (score === 'AAA') return CHIP_COLOR_AAA;
  if (score === 'AA') return CHIP_COLOR_AA;
  return CHIP_COLOR_FAIL;
}

type EntrySignal = ReadonlySignal<PaletteEntry>;

function EntryName({ entry }: { entry: EntrySignal }) {
  return (
    <div class="tokenpanel-palette-check-row-name">
      <div>{entry.value.item.label}</div>
      <Show when={computed(() => !entry.value.opaque && !entry.value.modes)}>
        {() => (
          <div class="tokenpanel-palette-check-row-value">
            {computed(() => `${entry.value.item.cssVar}: ${entry.value.value}`)}
          </div>
        )}
      </Show>
    </div>
  );
}

function ModesBaseRow({
  entry,
  onChange,
}: {
  entry: EntrySignal;
  onChange: (tierId: string, itemId: string, next: string) => void;
}) {
  const { item, tierId, address } = entry.value;
  const sides = computed(() => entry.value.modes ?? { light: '', dark: '' });
  return (
    <div
      class="tokenpanel-palette-check-base-row tokenpanel-palette-check-row--modes"
      data-testid={`palette-check-base-row-${item.id}`}
      data-address={tokenAddressKey(address)}
      data-na-reason="mode-dependent colors"
    >
      {item.readonly === true ? (
        <ModesValuePair sides={sides} testIdPrefix={`palette-check-base-${item.id}`} />
      ) : (
        <ModesEditorFields
          item={item}
          sides={sides}
          onChange={(next) => onChange(tierId, item.id, next)}
        />
      )}
      <EntryName entry={entry} />
      <div class="tokenpanel-palette-check-na">N/A</div>
    </div>
  );
}

function BaseRow({ entry, isSelected, onSelect }: {
  entry: EntrySignal;
  isSelected: ReadonlySignal<boolean>;
  onSelect: (entry: PaletteEntry) => void;
}) {
  const { item, address } = entry.value;
  const disabled = computed(() => !entry.value.opaque);
  const reason = computed(() => (entry.value.color ? 'transparent colors need compositing' : 'unsupported color'));
  const select = () => {
    if (!disabled.value) onSelect(entry.value);
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!disabled.value && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(entry.value);
    }
  };

  return (
    <div
      role="button"
      tabindex={computed(() => (disabled.value ? -1 : 0))}
      class={computed(() =>
        `tokenpanel-palette-check-base-row${isSelected.value ? ' is-selected' : ''}${disabled.value ? ' is-disabled' : ''}`)}
      aria-pressed={computed(() => (disabled.value ? null : isSelected.value))}
      aria-disabled={computed(() => (disabled.value ? true : null))}
      aria-label={computed(() =>
        `${item.label}: ${entry.value.value}${disabled.value ? ` (N/A: ${reason.value})` : ''}`)}
      on:click={select}
      on:keydown={handleKeyDown}
      data-testid={`palette-check-base-row-${item.id}`}
      data-address={tokenAddressKey(address)}
      data-na-reason={computed(() => (disabled.value ? reason.value : null))}
    >
      <div
        class={computed(() => `tokenpanel-palette-check-swatch${entry.value.color ? '' : ' is-invalid'}`)}
        style={computed(() => (entry.value.hex ? { background: entry.value.hex } : {}))}
        aria-hidden="true"
      />
      <EntryName entry={entry} />
      <Show when={disabled}>
        {() => <div class="tokenpanel-palette-check-na">N/A</div>}
      </Show>
    </div>
  );
}

function CandidateRow({ entry, base, isLarge }: {
  entry: EntrySignal;
  base: ReadonlySignal<PaletteEntry | null>;
  isLarge: ReadonlySignal<boolean>;
}) {
  const { item, address } = entry.value;
  const isModes = entry.value.modes !== null;
  const contrast = computed(() => {
    const current = entry.value;
    const baseEntry = base.value;
    const computable = Boolean(baseEntry?.opaque && baseEntry.hex && current.opaque && current.hex);
    const ratio = computable ? contrastRatio(baseEntry!.hex!, current.hex!) : null;
    const score = ratio === null ? null : contrastScore(ratio, { large: isLarge.value });
    const reason = current.modes ? 'mode-dependent colors' : !baseEntry ? 'no valid opaque base' : !current.color ? 'unsupported color' : !current.opaque ? 'transparent color needs compositing' : null;
    return { computable, ratio, score, reason };
  });
  const score = computed(() => contrast.value.score);
  return (
    <div
      class={computed(() =>
        `tokenpanel-palette-check-candidate-row${contrast.value.computable ? '' : ' is-na'}${isModes ? ' tokenpanel-palette-check-row--modes' : ''}`)}
      data-testid={`palette-check-candidate-row-${item.id}`}
      data-address={tokenAddressKey(address)}
      data-na-reason={computed(() => contrast.value.reason)}
    >
      {isModes ? (
        <ModesValuePair
          sides={computed(() => entry.value.modes ?? { light: '', dark: '' })}
          testIdPrefix={`palette-check-candidate-${item.id}`}
        />
      ) : (
        <div
          class={computed(() => `tokenpanel-palette-check-aa-sample${entry.value.color ? '' : ' is-invalid'}`)}
          style={computed(() => {
            const hex = entry.value.hex;
            const baseHex = base.value?.hex;
            return hex && baseHex ? { color: hex, background: baseHex } : {};
          })}
          aria-hidden="true"
        >
          {computed(() => (entry.value.color ? 'Aa' : 'N/A'))}
        </div>
      )}
      <EntryName entry={entry} />
      <div class="tokenpanel-palette-check-ratio">
        {computed(() => (contrast.value.ratio === null ? 'N/A' : contrast.value.ratio.toFixed(1)))}
      </div>
      <div
        class={computed(() => `tokenpanel-palette-check-chip${score.value ? '' : ' is-na'}`)}
        style={computed(() => (score.value ? { background: chipColor(score.value) } : {}))}
        data-testid={`palette-check-chip-${item.id}`}
      >
        {computed(() => score.value ?? 'N/A')}
      </div>
    </div>
  );
}

interface EntrySectionProps {
  tier: TierConfig;
  entries: ReadonlySignal<PaletteEntry[]>;
  side: 'left' | 'right';
  showHeading: boolean;
  selectedKey: ReadonlySignal<string>;
  onSelect: (entry: PaletteEntry) => void;
  onChange: (tierId: string, itemId: string, next: string) => void;
  base: ReadonlySignal<PaletteEntry | null>;
  isLarge: ReadonlySignal<boolean>;
}

function EntrySection(props: EntrySectionProps) {
  const { tier, entries, side, showHeading } = props;
  return (
    <div class="tokenpanel-tab-section" data-testid={`palette-check-${side}-tier-${tier.id}`}>
      {showHeading ? <div role="heading" aria-level={3} class="tokenpanel-tab-section-heading">{tier.label}</div> : null}
      <For each={entries} by={entryKey}>
        {(entry) => {
          if (side !== 'left') {
            return <CandidateRow entry={entry} base={props.base} isLarge={props.isLarge} />;
          }
          if (entry.value.modes) {
            return <ModesBaseRow entry={entry} onChange={props.onChange} />;
          }
          const key = entryKey(entry.value);
          return (
            <BaseRow
              entry={entry}
              isSelected={computed(() => props.selectedKey.value === key)}
              onSelect={props.onSelect}
            />
          );
        }}
      </For>
    </div>
  );
}

const FLAT_TIER: TierConfig = { id: '__flat__', label: 'Palette', items: [] };

export default function PaletteCheckView(
  props: Reactive<PaletteCheckViewProps, PaletteCheckViewStaticKeys>,
) {
  const { onChange } = props;
  const tabId = computed(() => read(props.tab).id);
  const tiers = computed(() => groupPaletteTiers(read(props.tab)));
  const changedOnly = computed(() => read(props.changedOnly) ?? false);
  const changedFor = computed(() => {
    const isChanged = read(props.isChanged);
    return (address: TokenAddress) => isChanged?.(address) ?? false;
  });
  const visibleTiers = computed(() => {
    const query = (read(props.searchQuery) ?? '').trim();
    const only = changedOnly.value;
    const isChanged = changedFor.value;
    const id = tabId.value;
    const hasChanged = (tier: TierConfig) => tier.items.some((item) => isChanged({
      tabId: id,
      tierId: tier.id,
      itemId: item.id,
    }));
    return tiers.value.filter((tier) => (!query || matchesSearchFields({
      cssVar: '',
      id: tier.id,
      label: tier.label,
      value: '',
      tierLabel: tier.label,
    }, query)) && (!only || hasChanged(tier)));
  });
  const entriesByTier = computed(() => {
    const overrides = read(props.overrides);
    const only = changedOnly.value;
    const isChanged = changedFor.value;
    const id = tabId.value;
    return new Map(visibleTiers.value.map((tier) => [tier.id, tier.items
      .filter((item) => !only || isChanged({ tabId: id, tierId: tier.id, itemId: item.id }))
      .map((item) => resolveEntry(id, item, tier.id, overrides))]));
  });
  const allEntries = computed(() =>
    visibleTiers.value.flatMap((tier) => entriesByTier.value.get(tier.id) ?? []));
  const firstOpaque = computed(() => allEntries.value.find((entry) => entry.opaque) ?? null);
  const initialBase = firstOpaque.value;
  const selectedKey = signal(initialBase ? entryKey(initialBase) : '');
  const isGrouped = signal(true);
  const isLarge = signal(false);
  const selectedBase = computed(() =>
    allEntries.value.find((entry) => entry.opaque && entryKey(entry) === selectedKey.value) ?? firstOpaque.value);
  const effectiveSelectedKey = computed(() => (selectedBase.value ? entryKey(selectedBase.value) : ''));

  const handleSelect = (entry: PaletteEntry) => {
    if (entry.opaque) selectedKey.value = entryKey(entry);
  };

  const computableEntries = computed(() => (selectedBase.value
    ? allEntries.value.filter((entry) => entry.opaque && entry.hex)
    : []));
  const passCount = computed(() => {
    const base = selectedBase.value;
    const threshold = isLarge.value ? 3 : 4.5;
    return computableEntries.value.filter((entry) => contrastRatio(base!.hex!, entry.hex!) >= threshold).length;
  });

  const renderSections = (side: 'left' | 'right') => {
    const shared = {
      side,
      selectedKey: effectiveSelectedKey,
      onSelect: handleSelect,
      onChange,
      base: selectedBase,
      isLarge,
    };
    return (
      <Rebuild value={isGrouped}>
        {(grouped) => (grouped ? (
          <For each={visibleTiers} by={(tier) => tier.id}>
            {(entry) => (
              <Rebuild value={entry}>
                {(tier) => (
                  <EntrySection
                    {...shared}
                    tier={tier}
                    entries={computed(() => entriesByTier.value.get(tier.id) ?? [])}
                    showHeading={true}
                  />
                )}
              </Rebuild>
            )}
          </For>
        ) : (
          <EntrySection {...shared} tier={FLAT_TIER} entries={allEntries} showHeading={false} />
        ))}
      </Rebuild>
    );
  };

  return (
    <div class="tokenpanel-palette-check-view" data-testid="palette-check-view">
      <div class="tokenpanel-palette-check-toolbar" data-testid="palette-check-toolbar">
        <label class="tokenpanel-palette-check-switch">
          <Checkbox
            checked={computed(() => !isGrouped.value)}
            onChange={(checked) => {
              isGrouped.value = !checked;
            }}
            data-testid="palette-check-flat-toggle"
          />
          Flat list
        </label>
        <label class="tokenpanel-palette-check-switch">
          <Checkbox
            checked={isLarge}
            onChange={(checked) => {
              isLarge.value = checked;
            }}
            data-testid="palette-check-large-toggle"
          />
          Large text
        </label>
      </div>
      <div class="tokenpanel-palette-check-cols">
        <div class="tokenpanel-palette-check-col" data-testid="palette-check-left-col">
          <div class="tokenpanel-palette-check-col-cap">Background (base)</div>
          {renderSections('left')}
        </div>
        <div class="tokenpanel-palette-check-col" data-testid="palette-check-right-col">
          <div class="tokenpanel-palette-check-col-cap">Foreground vs base</div>
          {renderSections('right')}
        </div>
      </div>
      <Show when={computed(() => changedOnly.value && allEntries.value.length === 0)}>
        {() => (
          <div class="tokenpanel-changed-empty" data-testid="tokenpanel-changed-empty">
            No changed tokens in this tab — everything is at its manifest default.
          </div>
        )}
      </Show>
      <div class="tokenpanel-palette-check-footer" data-testid="palette-check-footer">
        <Show
          when={computed(() => computableEntries.value.length === 0)}
          fallback={() => [
            <span class="tokenpanel-palette-check-tally-count">{computed(() => String(passCount.value))}</span>,
            ' of ',
            <span class="tokenpanel-palette-check-tally-total">{computed(() => String(computableEntries.value.length))}</span>,
            ' computable palette colors pass AA as ',
            <span class="tokenpanel-palette-check-tally-mode">{computed(() => (isLarge.value ? 'large' : 'normal'))}</span>,
            ' text on ',
            <span class="tokenpanel-palette-check-tally-base">{computed(() => selectedBase.value?.item.label ?? '')}</span>,
          ]}
        >
          {() => (
            <span data-testid="palette-check-all-na">
              All palette contrasts are N/A · no valid opaque base/candidates
            </span>
          )}
        </Show>
      </div>
    </div>
  );
}
