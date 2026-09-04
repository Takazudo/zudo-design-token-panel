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
    leading: ({ tier, item, value }) => {
      if (tier.preview === 'bar') {
        const px = lengthToPx(value);
        return (
          <span className="tokenpanel-preview-glyph tokenpanel-preview-glyph--bar" title={px === null ? value : `${px}px`}>
            <span style={{ width: `${Math.max(0, px ?? 0)}px` }} />
          </span>
        );
      }
      if (tier.preview === 'radius') {
        return (
          <span className="tokenpanel-preview-glyph tokenpanel-preview-glyph--radius" title={value}>
            <span style={{ borderRadius: value }} />
          </span>
        );
      }
      if (tier.preview === 'duration') {
        const unit = item.type.kind === 'length' || item.type.kind === 'number' ? item.type.unit : undefined;
        return (
          <span className="tokenpanel-preview-glyph tokenpanel-preview-glyph--duration" title={value}>
            <span className="tokenpanel-preview-glyph-track" />
            <span className="tokenpanel-preview-glyph-dot" style={{ transitionDuration: timeToCss(value, unit) }} />
          </span>
        );
      }
      return null;
    },
  };
}
