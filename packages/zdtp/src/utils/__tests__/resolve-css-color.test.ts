// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCssExpression, resolveCssColorInHost } from '../resolve-css-color';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('isCssExpression', () => {
  it.each([
    ['#abc', false], ['#12345678', false],
    ['oklch(0.6 0.1 30)', false], ['rgb(1, 2, 3)', false],
    ['hsl(120 50% 50%)', false], ['red', false], ['transparent', false],
    ['', false], ['not-a-color', false],
    ['var(--x)', true], ['light-dark(#fff,#000)', true],
    ['color-mix(in oklch, red, blue)', true], ['env(color)', true],
    ['calc(1 + 2)', true], ['rgb(from red r g b)', true],
    ['unknown(1)', true], ['  VAR(--x)  ', true],
    [' OKLCH(0.6 0.1 30) ', false],
  ])('%s → %s', (value, expected) => {
    expect(isCssExpression(value)).toBe(expected);
  });
});

describe('resolveCssColorInHost', () => {
  it('returns null during SSR', () => {
    vi.stubGlobal('document', undefined);
    expect(resolveCssColorInHost('var(--x)')).toBeNull();
  });

  it('rejects invalid syntax without reusing a previous color', () => {
    expect(resolveCssColorInHost('red')).toBe('rgb(255, 0, 0)');
    expect(resolveCssColorInHost('not-a-color')).toBeNull();
    expect(resolveCssColorInHost('')).toBeNull();
  });

  it('preserves literal colors matching either sentinel', () => {
    expect(resolveCssColorInHost('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
    expect(resolveCssColorInHost('rgb(4, 5, 6)')).toBe('rgb(4, 5, 6)');
  });

  it('reconnects after body cleanup and reuses a single wrapper', () => {
    resolveCssColorInHost('red');
    document.body.replaceChildren();
    expect(resolveCssColorInHost('blue')).toBe('rgb(0, 0, 255)');
    resolveCssColorInHost('red');
    expect(document.body.children).toHaveLength(1);
    expect(document.body.firstElementChild?.children).toHaveLength(1);
  });
});
