/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed } from '@takazudo/zfb/zudo-react';
import type { RowContribution } from '../tabs/flat/types';
import { lengthToPx } from './specimen-values';

function timeToCss(value: string, unit: string | undefined): string {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? `${parsed}${unit ?? ''}` : value;
}

export function previewGlyphContribution(): RowContribution {
  return {
    id: 'tier-preview-glyph',
    className: ({ tier }) => tier.preview === 'bar' || tier.preview === 'radius' || tier.preview === 'duration'
      ? `tokenpanel-row--preview-${tier.preview}`
      : undefined,
    leading: (entry) => {
      const { tier, item } = entry.value;
      const value = computed(() => entry.value.value);
      if (tier.preview === 'bar') {
        return (
          <span
            class="tokenpanel-preview-glyph tokenpanel-preview-glyph--bar"
            title={computed(() => {
              const px = lengthToPx(value.value);
              return px === null ? value.value : `${px}px`;
            })}
          >
            <span style={computed(() => ({ width: value.value }))} />
          </span>
        );
      }
      if (tier.preview === 'radius') {
        return (
          <span class="tokenpanel-preview-glyph tokenpanel-preview-glyph--radius" title={value}>
            <span style={computed(() => ({ 'border-radius': value.value }))} />
          </span>
        );
      }
      if (tier.preview === 'duration') {
        const unit = item.type.kind === 'length' || item.type.kind === 'number' ? item.type.unit : undefined;
        return (
          <span class="tokenpanel-preview-glyph tokenpanel-preview-glyph--duration" title={value}>
            <span class="tokenpanel-preview-glyph-track" />
            <span
              class="tokenpanel-preview-glyph-dot"
              style={computed(() => ({ 'transition-duration': timeToCss(value.value, unit) }))}
            />
          </span>
        );
      }
      return null;
    },
  };
}
