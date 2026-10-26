/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, type Child } from '@takazudo/zfb/zudo-react';
import { ColorField } from '../components/color-picker/color-field';
import TokenLabel from '../controls/token-label';
import type { TooltipController } from '../controls/tooltip-controller';
import type { TierItem } from '../tokens/tier-model';
import { read, type MaybeSignal } from '../zr/live';
import type { TokenAddress } from './flat/types';
import { tokenAddressKey } from './flat/types';
import { commitModePair, modeValueFormat, resolveModeRowSides, type ModeSides } from './mode-sides';

export { commitModePair, resolveModeRowSides, type ModeSides } from './mode-sides';

export interface ModesValuePairProps {
  sides: MaybeSignal<ModeSides>;
  /** Prefix used for stable test and automation selectors. */
  testIdPrefix?: string;
}

/** Render the two authored values with mode-labelled swatches. */
export function ModesValuePair(props: ModesValuePairProps) {
  const testIdPrefix = props.testIdPrefix ?? 'tokenpanel-modes';
  return (
    <div class="tokenpanel-modes-values" data-testid={`${testIdPrefix}-values`}>
      {(['light', 'dark'] as const).map((mode) => {
        const value = computed(() => read(props.sides)[mode]);
        return (
          <div
            class={`tokenpanel-modes-value tokenpanel-modes-value--${mode}`}
            data-mode={mode}
            data-testid={`${testIdPrefix}-${mode}`}
            data-value={value}
          >
            <span class="tokenpanel-modes-side">{mode === 'light' ? 'Light' : 'Dark'}</span>
            <span
              class="tokenpanel-modes-chip"
              style={computed(() => ({ 'background-color': value.value }))}
              aria-hidden="true"
            />
            <span class="tokenpanel-modes-value-text">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export interface ModesEditorFieldsProps {
  item: TierItem;
  sides: MaybeSignal<ModeSides>;
  onChange: (next: string) => void;
}

/**
 * Compact light/dark ColorField pair for a manifest `modes` row. Palette Check
 * reuses this without ModesRow chrome. Manifest `modes` is always a pair — no
 * SemanticLiteralRow "Per-mode" checkbox.
 */
export function ModesEditorFields(props: ModesEditorFieldsProps) {
  const { item, onChange } = props;
  // Manifest `modes` is always a color pair, so ColorFields are used even when
  // type.kind is not 'color' (generic mode-text / palette text-kind rows).
  const valueFormat = modeValueFormat(item);

  return (
    <div class="tokenpanel-per-mode-fields">
      {(['light', 'dark'] as const).map((mode) => {
        const sideLabel = mode === 'light' ? 'Light' : 'Dark';
        return (
          <div class="tokenpanel-per-mode-field" data-mode={mode}>
            <span class="tokenpanel-per-mode-label">{sideLabel}</span>
            <ColorField
              value={computed(() => read(props.sides)[mode])}
              onChange={(next) => onChange(commitModePair(read(props.sides), mode, next))}
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
  sides?: MaybeSignal<ModeSides>;
  class?: MaybeSignal<string>;
  dataTestId?: string;
  address?: TokenAddress;
  leading?: Child;
  trailing?: Child;
  tail?: Child;
  tooltip: TooltipController | null;
  /** Parents close over address/ids. Absent or a readonly item keeps chips. */
  onChange?: (next: string) => void;
}

/**
 * Row for a manifest `modes` item. With `onChange` (and not readonly) the pair
 * is edited via `ModesEditorFields`; otherwise chips stay and the row keeps
 * `tokenpanel-row--editor-disabled` while retaining ordinary row actions.
 */
export function ModesRow(props: ModesRowProps) {
  const { item, address, onChange } = props;
  const sides = props.sides ?? resolveModeRowSides(item);
  const dataTestId = props.dataTestId ?? `tier-item-${item.id}`;
  const editor = onChange !== undefined && item.readonly !== true ? onChange : undefined;
  const rowClass = computed(() => [
    'tokenpanel-row',
    'tokenpanel-modes-row',
    'tokenpanel-row--modes',
    editor ? '' : 'tokenpanel-row--editor-disabled',
    read(props.class) ?? '',
  ].filter(Boolean).join(' '));

  return (
    <div
      class={rowClass}
      data-testid={dataTestId}
      data-css-var={item.cssVar}
      data-address={address ? tokenAddressKey(address) : null}
    >
      <div class="tokenpanel-card-label">
        {props.leading}
        <TokenLabel cssVar={item.cssVar} label={item.label} tooltip={props.tooltip} />
      </div>
      <div class="tokenpanel-card-editor">
        {editor ? (
          <ModesEditorFields item={item} sides={sides} onChange={editor} />
        ) : (
          <ModesValuePair sides={sides} testIdPrefix={`${dataTestId}-modes`} />
        )}
      </div>
      <div class="tokenpanel-card-actions">{props.trailing}</div>
      {props.tail}
    </div>
  );
}
