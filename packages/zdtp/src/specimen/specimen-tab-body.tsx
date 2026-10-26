/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed } from '@takazudo/zfb/zudo-react';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import type { RowContribution } from '../tabs/flat/types';
import { read, type MaybeSignal } from '../zr/live';
import type { SpecimenState } from './specimen-state';
import { findLineHeightBasePx, resolvePreviewLength, resolvePreviewValue } from './specimen-values';

export type ValueFor = (item: TierItem) => string;

interface SpecimenRendererOptions {
  tab: TabConfig;
  state: MaybeSignal<SpecimenState>;
  valueFor: MaybeSignal<ValueFor>;
  /** Hide the rendered sample while keeping the editable row controls. */
  onPage?: MaybeSignal<boolean>;
}

function displayPx(px: number | null): string {
  return px === null ? 'unresolved' : `${Number(px.toFixed(2))}px`;
}

/** Use instance values: host CSS variables may belong to a different panel. */
export function specimenFontStyle(
  tab: TabConfig,
  valueFor: ValueFor,
): Record<string, string> {
  const familyTier = tab.tiers.find((tier) => tier.preview === 'family');
  const family = familyTier?.items[0];
  const weightTier = tab.tiers.find((tier) => tier.preview === 'weight');
  const weight = weightTier?.items[0];
  return {
    ...(familyTier && family ? { 'font-family': resolvePreviewValue(tab, familyTier, family, valueFor) } : {}),
    ...(weightTier && weight ? { 'font-weight': resolvePreviewValue(tab, weightTier, weight, valueFor) } : {}),
  };
}

export function createSpecimenContribution({ tab, state, valueFor, onPage = false }: SpecimenRendererOptions): RowContribution {
  const fontStyle = computed(() => specimenFontStyle(tab, read(valueFor)));
  return {
    id: 'font-specimen',
    className: ({ tier }) => {
      const classes = tier.preview === 'size' || tier.preview === 'line-height'
        ? [`tokenpanel-row--specimen-${tier.preview}`]
        : [];
      if (read(onPage) && (tier.preview === 'size' || tier.preview === 'line-height')) {
        classes.push('tokenpanel-row--specimen-compact');
      }
      return classes.length > 0 ? classes.join(' ') : undefined;
    },
    leading: (entry) => {
      const { tier, item } = entry.value;
      if (tier.preview === 'size') {
        const resolved = computed(() => {
          // Track the row's own value as well as the shared valueFor.
          void entry.value.value;
          return resolvePreviewLength(tab, tier, item, read(valueFor));
        });
        return (
          <span class="tokenpanel-specimen-size-leading">
            <span class="tokenpanel-specimen-meta">
              <span>{item.cssVar}</span>
              <span>{computed(() => `${item.id} · ${displayPx(resolved.value.px)}${resolved.value.px === null ? ' ◇' : ''}`)}</span>
            </span>
            <span
              class="tokenpanel-specimen-size-text"
              data-testid={`specimen-size-${item.id}`}
              style={computed(() => ({ ...fontStyle.value, 'font-size': resolved.value.value }))}
              title={computed(() => displayPx(resolved.value.px))}
            >
              {computed(() => read(state).text || '…')}
            </span>
          </span>
        );
      }
      if (tier.preview === 'line-height') {
        const metrics = computed(() => {
          const fn = read(valueFor);
          const basePx = findLineHeightBasePx(tab, tier, fn);
          const lineHeight = entry.value.value;
          return { basePx, lineHeight, linePx: basePx * parseFloat(lineHeight) };
        });
        return (
          <span class="tokenpanel-specimen-line-height-leading">
            <span class="tokenpanel-specimen-meta">
              <span>{item.cssVar}</span>
              <span>{computed(() => `${item.id} · ${Number(metrics.value.linePx.toFixed(1))}px line at ${Number(metrics.value.basePx.toFixed(1))}px`)}</span>
            </span>
            <span
              class="tokenpanel-specimen-line-height-text"
              style={computed(() => ({
                ...fontStyle.value,
                'font-size': `${metrics.value.basePx}px`,
                'line-height': metrics.value.lineHeight,
                width: `min(${read(state).width}px, 100%)`,
                '--tokenpanel-specimen-line': `${metrics.value.linePx}px`,
              }))}
            >
              {computed(() => {
                const text = read(state).text;
                return text ? `${text} ${text}` : '…';
              })}
            </span>
          </span>
        );
      }
      return null;
    },
  };
}

/** Size tiers list their rows smallest-first; other tiers keep manifest order. */
export function orderSpecimenTierItems(
  tab: TabConfig,
  tier: TierConfig,
  valueFor: ValueFor,
): readonly TierItem[] {
  if (tier.preview !== 'size') return tier.items;
  return tier.items
    .map((item, index) => ({ item, index, px: resolvePreviewLength(tab, tier, item, valueFor).px }))
    .sort((a, b) => {
      if (a.px === null && b.px === null) return a.index - b.index;
      if (a.px === null) return 1;
      if (b.px === null) return -1;
      return a.px - b.px || a.index - b.index;
    })
    .map(({ item }) => item);
}
