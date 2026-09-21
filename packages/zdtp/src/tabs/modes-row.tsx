import type { ComponentChildren } from 'preact';
import ColorField from '../components/color-picker/color-field';
import TokenLabel from '../controls/token-label';
import type { TierItem } from '../tokens/tier-model';
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

/**
 * Commit one side of a mode pair as `light-dark(light, dark)`. The untouched
 * side is copied byte-for-byte so a mixed-format pair such as
 * `light-dark(rgb(10, 20, 30), oklch(0.8 0.1 240))` keeps the other side's
 * authored syntax.
 */
export function commitModePair(
  sides: ModeSides,
  side: keyof ModeSides,
  next: string,
): string {
  const light = side === 'light' ? next : sides.light;
  const dark = side === 'dark' ? next : sides.dark;
  return `light-dark(${light}, ${dark})`;
}

function modeValueFormat(item: TierItem): 'oklch' | 'hex' {
  return item.type.kind === 'color' && item.type.format === 'oklch' ? 'oklch' : 'hex';
}

export interface ModesEditorFieldsProps {
  item: TierItem;
  sides: ModeSides;
  onChange: (next: string) => void;
}

/**
 * Compact light/dark ColorField pair for a manifest `modes` row. Palette Check
 * reuses this without ModesRow chrome. Manifest `modes` is always a pair — no
 * SemanticLiteralRow "Per-mode" checkbox.
 */
export function ModesEditorFields({ item, sides, onChange }: ModesEditorFieldsProps) {
  // Manifest `modes` is always a color pair, so ColorFields are used even when
  // type.kind is not 'color' (generic mode-text / palette text-kind rows).
  const valueFormat = modeValueFormat(item);

  return (
    <div className="tokenpanel-per-mode-fields">
      {(['light', 'dark'] as const).map((mode) => {
        const sideLabel = mode === 'light' ? 'Light' : 'Dark';
        return (
          <div key={mode} className="tokenpanel-per-mode-field" data-mode={mode}>
            <span className="tokenpanel-per-mode-label">{sideLabel}</span>
            <ColorField
              value={sides[mode]}
              onChange={(next) => onChange(commitModePair(sides, mode, next))}
              valueFormat={valueFormat}
              resolveMode={mode}
              label={`${item.label} (${sideLabel})`}
              cssVar={item.cssVar}
            />
          </div>
        );
      })}
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
  /** Parents close over address/ids. Absent or a readonly item keeps chips. */
  onChange?: (next: string) => void;
}

/**
 * Row for a manifest `modes` item. With `onChange` (and not readonly) the pair
 * is edited via `ModesEditorFields`; otherwise chips stay and the row keeps
 * `tokenpanel-row--editor-disabled` while retaining ordinary row actions.
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
  onChange,
}: ModesRowProps) {
  const editor = onChange !== undefined && item.readonly !== true ? onChange : undefined;
  const rowClass = [
    'tokenpanel-row',
    'tokenpanel-modes-row',
    'tokenpanel-row--modes',
    editor ? '' : 'tokenpanel-row--editor-disabled',
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
        {editor ? (
          <ModesEditorFields item={item} sides={sides} onChange={editor} />
        ) : (
          <ModesValuePair sides={sides} testIdPrefix={`${dataTestId}-modes`} />
        )}
      </div>
      <div className="tokenpanel-card-actions">{trailing}</div>
      {tail}
    </div>
  );
}
