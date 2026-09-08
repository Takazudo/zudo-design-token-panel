import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import panelTokens from '../../styles/panel-tokens.css?inline';
import { resolveCssColorInHost } from '../resolve-css-color';

let rootStyle: string | null;
let fixture: HTMLStyleElement;

beforeEach(() => {
  rootStyle = document.documentElement.getAttribute('style');
  document.documentElement.style.colorScheme = 'light';
  fixture = document.createElement('style');
  fixture.textContent = `:root {
    --probe-a: oklch(0.6 0.1 30);
    --probe-b: light-dark(#fff, #000);
    --t: transparent;
    --probe-sentinel: rgb(1, 2, 3);
  }`;
  document.head.append(fixture);
});

afterEach(() => {
  fixture.remove();
  document.body.replaceChildren();
  if (rootStyle === null) document.documentElement.removeAttribute('style');
  else document.documentElement.setAttribute('style', rootStyle);
});

function literalColor(value: string): string {
  const reference = document.createElement('div');
  reference.style.color = value;
  document.body.append(reference);
  const color = getComputedStyle(reference).color;
  reference.remove();
  return color;
}

describe('resolveCssColorInHost in a browser', () => {
  it('returns the browser serialization of a root token', () => {
    expect(resolveCssColorInHost('var(--probe-a)'))
      .toBe(literalColor('oklch(0.6 0.1 30)'));
  });

  it('honors explicit modes and clears the previous mode when omitted', () => {
    expect(resolveCssColorInHost('var(--probe-b)', 'light')).toBe(literalColor('#fff'));
    expect(resolveCssColorInHost('var(--probe-b)', 'dark')).toBe(literalColor('#000'));
    expect(resolveCssColorInHost('var(--probe-b)')).toBe(literalColor('#fff'));
    expect(resolveCssColorInHost('light-dark(#fff, #000)')).toBe(literalColor('#fff'));
  });

  it('rejects missing variables and invalid computed colors', () => {
    fixture.textContent += ':root { --probe-invalid: 10px; }';
    expect(resolveCssColorInHost('var(--nope)')).toBeNull();
    expect(resolveCssColorInHost('var(--probe-invalid)')).toBeNull();
    expect(resolveCssColorInHost('not-a-color')).toBeNull();
  });

  it('preserves transparent tokens and fallbacks', () => {
    const transparent = literalColor('transparent');
    expect(resolveCssColorInHost('var(--nope, transparent)')).toBe(transparent);
    expect(resolveCssColorInHost('var(--t)')).toBe(transparent);
  });

  it('preserves colors equal to the sentinel', () => {
    expect(resolveCssColorInHost('var(--probe-sentinel)')).toBe(literalColor('rgb(1, 2, 3)'));
    expect(resolveCssColorInHost('var(--nope, rgb(1, 2, 3))')).toBe(literalColor('rgb(1, 2, 3)'));
    expect(resolveCssColorInHost('var(--nope)')).toBeNull();
  });

  it('does not inherit panel tokens or the panel chrome color scheme', () => {
    fixture.textContent += panelTokens;
    const panel = document.createElement('div');
    panel.className = 'tokenpanel-shell';
    panel.style.setProperty('--tokentweak-palette-base-0', 'red');
    document.body.append(panel);
    expect(getComputedStyle(panel).colorScheme).toBe('dark');
    expect(resolveCssColorInHost('var(--tokentweak-palette-base-0)')).toBeNull();
    expect(resolveCssColorInHost('var(--probe-b)')).toBe(literalColor('#fff'));
  });

  it('inherits body tokens and reconnects after body cleanup', () => {
    fixture.textContent += 'body { --probe-body: #123456; }';
    const expected = literalColor('#123456');
    expect(resolveCssColorInHost('var(--probe-body)')).toBe(expected);
    document.body.replaceChildren();
    expect(resolveCssColorInHost('var(--probe-body)')).toBe(expected);
    expect(document.body.children).toHaveLength(1);
  });

  it('resists hostile global div styles without changing resolution', () => {
    const expected = literalColor('oklch(0.6 0.1 30)');
    fixture.textContent += `div {
      all: unset !important; color: red !important; color-scheme: dark !important;
      position: fixed !important; width: 100px !important; height: 100px !important;
      visibility: visible !important; pointer-events: auto !important;
      transition: color 100s !important;
    }`;
    expect(resolveCssColorInHost('var(--probe-a)')).toBe(expected);
    expect(resolveCssColorInHost('var(--nope)')).toBeNull();
    expect(resolveCssColorInHost('var(--probe-b)', 'light')).toBe('rgb(255, 255, 255)');
    for (const element of document.body.querySelectorAll('div')) {
      const style = getComputedStyle(element);
      expect(style.visibility).toBe('hidden');
      expect(style.pointerEvents).toBe('none');
      expect(style.width).toBe('0px');
      expect(style.height).toBe('0px');
    }
  });
});
