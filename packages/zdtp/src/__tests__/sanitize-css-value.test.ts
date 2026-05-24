import { describe, it, expect } from 'vitest';
import { sanitizeCssValue } from '../controls/sanitize-css-value';

/**
 * Guards the character-class stripping that keeps free-form font-family values
 * from breaking out of a CSS property-value context (and keeps the exported
 * CSS snippet tidy).
 *
 * Ported verbatim from zudo-doc's upstream test — the sanitizer's character
 * class (`[\r\n\\;]`) is identical across the two projects, so the same
 * fixtures lock the same behaviour.
 */
describe('sanitizeCssValue', () => {
  it('passes through common font-family strings untouched', () => {
    expect(sanitizeCssValue('"Inter", system-ui, sans-serif')).toBe(
      '"Inter", system-ui, sans-serif',
    );
    expect(sanitizeCssValue('ui-monospace, monospace')).toBe('ui-monospace, monospace');
    expect(sanitizeCssValue("'Noto Sans JP', sans-serif")).toBe("'Noto Sans JP', sans-serif");
  });

  it('strips newlines', () => {
    expect(sanitizeCssValue('Inter,\nsystem-ui')).toBe('Inter,system-ui');
    expect(sanitizeCssValue('Inter\r\nFallback')).toBe('InterFallback');
  });

  it('strips backslashes', () => {
    expect(sanitizeCssValue('"Esc\\aped", sans-serif')).toBe('"Escaped", sans-serif');
  });

  it('strips semicolons so exported CSS snippets stay well-formed', () => {
    expect(sanitizeCssValue('Inter; color: red')).toBe('Inter color: red');
  });

  it('strips braces so a pasted "}" cannot close the surrounding :root block', () => {
    expect(sanitizeCssValue('Inter} color:red {')).toBe('Inter color:red ');
    expect(sanitizeCssValue('{"weird"}')).toBe('"weird"');
  });

  it('leaves the empty string empty', () => {
    expect(sanitizeCssValue('')).toBe('');
  });
});
