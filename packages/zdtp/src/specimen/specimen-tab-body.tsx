import type { ComponentChildren } from 'preact';
import type { CSSProperties } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import type { SharedRowRenderer } from '../tabs/flat/tier-section';
import type { RowContribution } from '../tabs/flat/types';
import type { SpecimenState } from './specimen-state';
import { findLineHeightBasePx, resolvePreviewLength } from './specimen-values';

interface SpecimenRendererOptions {
  tab: TabConfig;
  state: SpecimenState;
  valueFor: (item: TierItem) => string;
  /** Hide the rendered sample while keeping the editable row controls. */
  onPage?: boolean;
}

function displayPx(px: number | null): string {
  return px === null ? 'unresolved' : `${Number(px.toFixed(2))}px`;
}

/** Resolve the font family/weight applied to every type specimen sample. */
export function specimenFontStyle(
  tab: TabConfig,
  valueFor: (item: TierItem) => string,
): CSSProperties {
  const family = tab.tiers.find((tier) => tier.preview === 'family')?.items[0];
  const weight = tab.tiers.find((tier) => tier.preview === 'weight')?.items[0];
  return {
    ...(family ? { fontFamily: `var(${family.cssVar}, ${valueFor(family)})` } : {}),
    ...(weight ? { fontWeight: `var(${weight.cssVar}, ${valueFor(weight)})` } : {}),
  };
}

export function createSpecimenContribution({ tab, state, valueFor, onPage = false }: SpecimenRendererOptions): RowContribution {
  const fontStyle = specimenFontStyle(tab, valueFor);
  return {
    id: 'font-specimen',
    className: ({ tier }) => {
      const classes = tier.preview === 'size' || tier.preview === 'line-height'
        ? [`tokenpanel-row--specimen-${tier.preview}`]
        : [];
      if (onPage && (tier.preview === 'size' || tier.preview === 'line-height')) {
        classes.push('tokenpanel-row--specimen-compact');
      }
      return classes.length > 0 ? classes.join(' ') : undefined;
    },
    leading: ({ tier, item }) => {
      if (tier.preview === 'size') {
        const resolved = resolvePreviewLength(tab, tier, item, valueFor);
        return (
          <span className="tokenpanel-specimen-size-leading">
            <span className="tokenpanel-specimen-meta">
              <span>{item.cssVar}</span>
              <span>{item.id} · {displayPx(resolved.px)}{resolved.px === null ? ' ◇' : ''}</span>
            </span>
            <span
              className="tokenpanel-specimen-size-text"
              data-testid={`specimen-size-${item.id}`}
              style={{ ...fontStyle, fontSize: `var(${item.cssVar}, ${resolved.value})` }}
              title={displayPx(resolved.px)}
            >
              {state.text || '…'}
            </span>
          </span>
        );
      }
      if (tier.preview === 'line-height') {
        const basePx = findLineHeightBasePx(tab, tier, valueFor);
        const lineHeight = valueFor(item);
        const linePx = basePx * parseFloat(lineHeight);
        const style = {
          ...fontStyle,
          fontSize: `${basePx}px`,
          lineHeight,
          width: `${state.width}px`,
          '--tokenpanel-specimen-line': `${linePx}px`,
        } as CSSProperties;
        return (
          <span className="tokenpanel-specimen-line-height-leading">
            <span className="tokenpanel-specimen-meta">
              <span>{item.cssVar}</span>
              <span>{item.id} · {Number(linePx.toFixed(1))}px line at {Number(basePx.toFixed(1))}px</span>
            </span>
            <span className="tokenpanel-specimen-line-height-text" style={style}>
              {(state.text ? `${state.text} ${state.text}` : '…')}
            </span>
          </span>
        );
      }
      return null;
    },
  };
}

export function renderSpecimenTierBody(
  tier: TierConfig,
  renderRow: SharedRowRenderer,
  options: SpecimenRendererOptions,
): ComponentChildren {
  if (tier.preview !== 'size') return tier.items.map(renderRow);
  return tier.items
    .map((item, index) => ({ item, index, px: resolvePreviewLength(options.tab, tier, item, options.valueFor).px }))
    .sort((a, b) => {
      if (a.px === null && b.px === null) return a.index - b.index;
      if (a.px === null) return 1;
      if (b.px === null) return -1;
      return a.px - b.px || a.index - b.index;
    })
    .map(({ item }) => renderRow(item));
}
