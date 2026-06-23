/**
 * ColorField — swatch-button that opens a ColorPicker popover.
 *
 * A swatch div (div[role="button"]) + isOpen state + anchorRef pattern,
 * mirroring ColorSwatch in color-tab.tsx.
 *
 * DOM-hygiene compliant: div-button with onClick + onKeyDown (Enter/Space);
 * no banned semantic tags — hostile-host policy (CLAUDE.md).
 */

import { useCallback, useRef, useState } from 'preact/compat';
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
export function ColorField({
  value,
  onChange,
  valueFormat = 'hex',
  label,
  cssVar,
  readonly: isReadonly = false,
}: ColorFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleToggle = useCallback(() => {
    if (isReadonly) return;
    setIsOpen((prev) => !prev);
  }, [isReadonly]);

  const ariaLabel = cssVar ? `${label}: ${cssVar}` : label;

  return (
    <div className="tokenpanel-color-field">
      <div
        ref={buttonRef}
        role="button"
        tabIndex={0}
        className="tokenpanel-color-field-swatch"
        style={{ backgroundColor: value }}
        onClick={handleToggle}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-label={ariaLabel}
        aria-expanded={isReadonly ? undefined : isOpen}
        aria-disabled={isReadonly || undefined}
        data-testid="color-field-swatch"
      />
      {isOpen && (
        <ColorPicker
          color={value}
          onChange={onChange}
          valueFormat={valueFormat}
          label={label}
          anchorRef={buttonRef}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

export default ColorField;
