/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * ColorField — swatch-button that opens a ColorPicker popover.
 *
 * A swatch div (div[role="button"]) + isOpen state + anchorRef pattern,
 * mirroring ColorSwatch in color-tab.tsx.
 *
 * DOM-hygiene compliant: div-button with onClick + onKeyDown (Enter/Space);
 * no banned semantic tags — hostile-host policy (CLAUDE.md).
 */

import { computed, Show, signal, type Ref } from '@takazudo/zfb/zudo-react';
import { read, toSignal, type Reactive } from '../../zr/live';
import { ColorPicker } from './color-picker';
import type { ColorPickerValueFormat } from './color-picker';

export interface ColorFieldProps {
  /** Current color value. Hex string in hex mode; `oklch(...)` string in oklch mode. */
  value: string;
  /** Called with the new color string when the user commits a change. */
  onChange: (next: string) => void;
  /**
   * Output format for `value` / `onChange`. Defaults to 'hex' (back-compatible
   * with the native <input type="color"> path).
   */
  valueFormat?: ColorPickerValueFormat;
  /** Host color scheme used to resolve CSS expressions. */
  resolveMode?: 'light' | 'dark';
  /** Display label shown in the picker header and aria-label. */
  label: string;
  /** Optional CSS custom property name (e.g. `--my-color`). Used for aria-label. */
  cssVar?: string;
  /**
   * When true, the swatch is shown but clicking / Enter / Space does NOT open
   * the picker. Mirrors the `disabled` behavior of the native <input type="color">.
   */
  readonly?: boolean;
}

/**
 * Swatch-button that opens a ColorPicker popover.
 *
 * Readonly items show the swatch but do not open the picker on interaction.
 */
export function ColorField(props: Reactive<ColorFieldProps, 'onChange'>) {
  const { onChange } = props;
  const isOpen = signal(false);
  const buttonRef: Ref<HTMLDivElement> = { current: null };
  const isReadonly = () => read(props.readonly) ?? false;

  const handleClose = () => {
    isOpen.value = false;
  };

  const handleToggle = () => {
    if (isReadonly()) return;
    isOpen.value = !isOpen.value;
  };

  const ariaLabel = computed(() => {
    const label = read(props.label);
    const cssVar = read(props.cssVar);
    return cssVar ? `${label}: ${cssVar}` : label;
  });

  return (
    <div class="tokenpanel-color-field">
      <div
        ref={buttonRef}
        role="button"
        tabindex={0}
        class="tokenpanel-color-field-swatch"
        style={computed(() => ({ 'background-color': read(props.value) }))}
        on:click={handleToggle}
        on:keydown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-label={ariaLabel}
        aria-expanded={computed(() => (isReadonly() ? null : isOpen.value))}
        aria-disabled={computed(() => (isReadonly() ? true : null))}
        data-testid="color-field-swatch"
      />
      <Show when={isOpen}>
        {() => (
          <ColorPicker
            color={toSignal(props.value)}
            onChange={onChange}
            valueFormat={read(props.valueFormat) ?? 'hex'}
            resolveMode={toSignal(props.resolveMode)}
            label={toSignal(props.label)}
            anchorRef={buttonRef}
            onClose={handleClose}
          />
        )}
      </Show>
    </div>
  );
}

export default ColorField;
