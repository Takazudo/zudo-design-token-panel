import { bridgeToPreact } from '../../zr/preact-bridge';
import { ColorField as ColorFieldZr, type ColorFieldProps } from './color-field';
import { ColorPicker as ColorPickerZr, type ColorPickerProps } from './color-picker';

// Preact adapters for the zudo-react color controls, used by the Preact tabs
// and overlays until they move to zudo-react (epic #1075).

export const ColorPicker = bridgeToPreact<
  ColorPickerProps,
  'onChange' | 'onClose' | 'anchorRef' | 'valueFormat' | 'defaultMode'
>(ColorPickerZr, {
  signals: ['color', 'resolveMode', 'label'],
  callbacks: ['onChange', 'onClose'],
  statics: ['anchorRef', 'valueFormat', 'defaultMode'],
});

export const ColorField = bridgeToPreact<ColorFieldProps, 'onChange'>(ColorFieldZr, {
  signals: ['value', 'valueFormat', 'resolveMode', 'label', 'cssVar', 'readonly'],
  callbacks: ['onChange'],
});

export default ColorField;
