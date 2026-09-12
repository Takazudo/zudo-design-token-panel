import type { ComponentChildren } from 'preact';
import type { TierItem } from '../tokens/tier-model';
import TokenLabel from '../controls/token-label';
import { splitLightDark } from '../tokens/mode-dependence';
import type { TokenAddress } from './flat/types';
import { tokenAddressKey } from './flat/types';

export interface ModeSides {
  light: string;
  dark: string;
}

/**
 * Resolve the pair shown by a mode row. A stored override is an effective
 * value, so a complete light-dark() override is split for display and a
 * plain override is shown on both sides. With no override the manifest pair
 * is authoritative; this keeps the presentation independent of the ordinary
 * `default` fallback used by generic consumers.
 */
export function resolveModeRowSides(
  item: TierItem,
  value?: string,
  preferValue = false,
): ModeSides {
  if (preferValue && typeof value === 'string' && value.trim().length > 0) {
    return splitLightDark(value) ?? { light: value, dark: value };
  }
  if (item.modes) return { ...item.modes };
  const parsed = typeof value === 'string' ? splitLightDark(value) : null;
  if (parsed) return parsed;
  const fallback = value ?? item.default;
  return { light: fallback, dark: fallback };
}

export interface ModesValuePairProps {
  sides: ModeSides;
  /** Prefix used for stable test and automation selectors. */
  testIdPrefix?: string;
}

/** Render the two authored values with mode-labelled swatches. */
export function ModesValuePair({ sides, testIdPrefix = 'tokenpanel-modes' }: ModesValuePairProps) {
  return (
    <div className="tokenpanel-modes-values" data-testid={`${testIdPrefix}-values`}>
      {(['light', 'dark'] as const).map((mode) => (
        <div
          key={mode}
          className={`tokenpanel-modes-value tokenpanel-modes-value--${mode}`}
          data-mode={mode}
          data-testid={`${testIdPrefix}-${mode}`}
          data-value={sides[mode]}
        >
          <span className="tokenpanel-modes-side">{mode === 'light' ? 'Light' : 'Dark'}</span>
          <span
            className="tokenpanel-modes-chip"
            style={{ backgroundColor: sides[mode] }}
            aria-hidden="true"
          />
          <span className="tokenpanel-modes-value-text">{sides[mode]}</span>
        </div>
      ))}
    </div>
  );
}

export interface ModesRowProps {
  item: TierItem;
  sides?: ModeSides;
  className?: string;
  dataTestId?: string;
  address?: TokenAddress;
  leading?: ComponentChildren;
  trailing?: ComponentChildren;
  tail?: ComponentChildren;
}

/**
 * Display-only row for a manifest `modes` item. It deliberately carries an
 * editor-disabled state class while retaining ordinary row actions such as
 * highlighting and token-chain navigation. The pair itself contains no
 * input, select, picker, or other editing affordance.
 */
export function ModesRow({
  item,
  sides = resolveModeRowSides(item),
  className = '',
  dataTestId = `tier-item-${item.id}`,
  address,
  leading,
  trailing,
  tail,
}: ModesRowProps) {
  const rowClass = [
    'tokenpanel-row',
    'tokenpanel-modes-row',
    'tokenpanel-row--modes',
    'tokenpanel-row--editor-disabled',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rowClass}
      data-testid={dataTestId}
      data-css-var={item.cssVar}
      {...(address ? { 'data-address': tokenAddressKey(address) } : {})}
    >
      <div className="tokenpanel-card-label">
        {leading}
        <TokenLabel cssVar={item.cssVar} label={item.label} />
      </div>
      <div className="tokenpanel-card-editor">
        <ModesValuePair sides={sides} testIdPrefix={`${dataTestId}-modes`} />
      </div>
      <div className="tokenpanel-card-actions">{trailing}</div>
      {tail}
    </div>
  );
}
