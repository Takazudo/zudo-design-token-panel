// @vitest-environment jsdom

/**
 * Per-mode literal light-dark() emission + color-scheme routing + defaultMode
 * runtime (S11, #472).
 *
 * Covers:
 *  - The DOM emitter writes `--zd-danger: light-dark(<light>, <dark>)` for a
 *    `{ literal: { light, dark } }` semantic mapping.
 *  - `color-scheme: light dark` is set on the correct root: `documentElement`
 *    for a normal instance, and routed through the sink (never `:root`) for a
 *    sink instance.
 *  - No `color-scheme` is emitted when no per-mode literal is present.
 *  - Single-mode literals emit a plain value (unchanged).
 *  - `defaultMode` (`getClusterDefaultMode` / `resolvePerModeLiteral` /
 *    `resolveSemanticPreviewColor`) selects the documented flat fallback.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyColorState,
  getClusterDefaultMode,
  resolvePerModeLiteral,
  resolveSemanticPreviewColor,
  type ApplySink,
  type ColorClusterDataConfig,
  type ColorTweakState,
} from '../tweak-state';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCluster(
  colorMode: ColorClusterDataConfig['panelSettings']['colorMode'] = false,
): ColorClusterDataConfig {
  return {
    id: 'pm',
    label: 'Per-mode',
    paletteSize: 4,
    baseRoles: {},
    paletteCssVarTemplate: '--pm-p{n}',
    semanticDefaults: { danger: 1 },
    semanticCssNames: { danger: '--zd-danger' },
    baseDefaults: { background: 0, foreground: 3, cursor: 1, selectionBg: 0, selectionFg: 3 },
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode },
  };
}

const BASE_COLOR: ColorTweakState = {
  palette: ['#000000', '#111111', '#222222', '#ffffff'],
  background: 0,
  foreground: 3,
  cursor: 1,
  selectionBg: 0,
  selectionFg: 3,
  semanticMappings: { danger: 1 },
  shikiTheme: 'dracula',
};

const PER_MODE_COLOR: ColorTweakState = {
  ...BASE_COLOR,
  semanticMappings: { danger: { literal: { light: '#ff0000', dark: '#990000' } } },
};

function makeSinkSpy(): ApplySink & { pairs: Array<readonly [string, string]> } {
  const pairs: Array<readonly [string, string]> = [];
  return {
    pairs,
    apply(applied) {
      for (const p of applied) pairs.push(p);
    },
    clear() {},
  };
}

beforeEach(() => {
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  document.documentElement.removeAttribute('style');
});

// ---------------------------------------------------------------------------
// DOM emission + color-scheme (normal instance)
// ---------------------------------------------------------------------------

describe('applyColorState — per-mode literal (normal instance)', () => {
  it('emits light-dark() for the semantic var and sets color-scheme on documentElement', () => {
    applyColorState(PER_MODE_COLOR, makeCluster());

    const style = document.documentElement.style;
    expect(style.getPropertyValue('--zd-danger')).toBe('light-dark(#ff0000, #990000)');
    expect(style.getPropertyValue('color-scheme')).toBe('light dark');
  });

  it('does NOT set color-scheme when no per-mode literal is present', () => {
    applyColorState(BASE_COLOR, makeCluster());

    const style = document.documentElement.style;
    // Legacy index mapping resolves to the palette color, no light-dark().
    expect(style.getPropertyValue('--zd-danger')).toBe('#111111');
    expect(style.getPropertyValue('color-scheme')).toBe('');
  });

  it('single-mode { literal: string } emits a plain value and no color-scheme', () => {
    const single: ColorTweakState = {
      ...BASE_COLOR,
      semanticMappings: { danger: { literal: 'oklch(0.55 0.2 25)' } },
    };
    applyColorState(single, makeCluster());

    const style = document.documentElement.style;
    expect(style.getPropertyValue('--zd-danger')).toBe('oklch(0.55 0.2 25)');
    expect(style.getPropertyValue('color-scheme')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// color-scheme routing (sink instance)
// ---------------------------------------------------------------------------

describe('applyColorState — per-mode literal (sink instance)', () => {
  it('routes color-scheme through the sink and never touches documentElement', () => {
    const sink = makeSinkSpy();
    applyColorState(PER_MODE_COLOR, makeCluster(), sink);

    // color-scheme is in the sink batch, targeting the sink's own root.
    const colorScheme = sink.pairs.find(([name]) => name === 'color-scheme');
    expect(colorScheme).toEqual(['color-scheme', 'light dark']);

    // The semantic var emits light-dark() through the sink too.
    const danger = sink.pairs.find(([name]) => name === '--zd-danger');
    expect(danger?.[1]).toBe('light-dark(#ff0000, #990000)');

    // :root was not touched by the sink path.
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--zd-danger')).toBe('');
  });

  it('does NOT push color-scheme into the sink batch when no per-mode literal exists', () => {
    const sink = makeSinkSpy();
    applyColorState(BASE_COLOR, makeCluster(), sink);
    expect(sink.pairs.some(([name]) => name === 'color-scheme')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// defaultMode runtime (#472)
// ---------------------------------------------------------------------------

describe('defaultMode runtime — getClusterDefaultMode / resolvePerModeLiteral', () => {
  it('getClusterDefaultMode returns the configured defaultMode', () => {
    const cluster = makeCluster({
      defaultMode: 'dark',
      lightScheme: 'L',
      darkScheme: 'D',
    });
    expect(getClusterDefaultMode(cluster)).toBe('dark');
  });

  it('getClusterDefaultMode falls back to "light" when colorMode is false', () => {
    expect(getClusterDefaultMode(makeCluster())).toBe('light');
  });

  it('resolvePerModeLiteral selects the given mode side', () => {
    const value = { literal: { light: '#ff0000', dark: '#990000' } };
    expect(resolvePerModeLiteral(value, 'light')).toBe('#ff0000');
    expect(resolvePerModeLiteral(value, 'dark')).toBe('#990000');
  });
});

describe('resolveSemanticPreviewColor — flat value using defaultMode', () => {
  it('collapses a per-mode literal to the cluster defaultMode side (dark)', () => {
    const cluster = makeCluster({ defaultMode: 'dark', lightScheme: 'L', darkScheme: 'D' });
    const preview = resolveSemanticPreviewColor(
      { literal: { light: '#ff0000', dark: '#990000' } },
      PER_MODE_COLOR,
      cluster,
    );
    expect(preview).toBe('#990000');
  });

  it('collapses to the light side when colorMode is false (defaultMode → light)', () => {
    const preview = resolveSemanticPreviewColor(
      { literal: { light: '#ff0000', dark: '#990000' } },
      PER_MODE_COLOR,
      makeCluster(),
    );
    expect(preview).toBe('#ff0000');
  });

  it('passes through a single-mode literal and an index mapping unchanged', () => {
    const cluster = makeCluster();
    expect(
      resolveSemanticPreviewColor({ literal: 'oklch(0.55 0.2 25)' }, BASE_COLOR, cluster),
    ).toBe('oklch(0.55 0.2 25)');
    // Index 2 → palette[2].
    expect(resolveSemanticPreviewColor(2, BASE_COLOR, cluster)).toBe('#222222');
  });
});
