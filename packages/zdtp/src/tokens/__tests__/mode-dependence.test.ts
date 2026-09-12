import { describe, expect, it } from 'vitest';
import {
  isModeDependent,
  resolveModeSides,
  splitLightDark,
} from '../mode-dependence';
import type { SemanticValue, TierItem } from '../tier-model';

function item(defaultValue = '#888', extra: Partial<TierItem> = {}): TierItem {
  return {
    id: 'token',
    cssVar: '--token',
    label: 'Token',
    default: defaultValue,
    type: { kind: 'color' },
    ...extra,
  };
}

describe('splitLightDark', () => {
  it('splits a complete top-level call', () => {
    expect(splitLightDark('light-dark(#fff, #000)')).toEqual({ light: '#fff', dark: '#000' });
  });

  it('is whitespace-tolerant and handles nested commas', () => {
    expect(splitLightDark('  light-dark( rgb(0, 0, 0),  #fff )  ')).toEqual({
      light: 'rgb(0, 0, 0)',
      dark: '#fff',
    });
  });

  it('parses a syntactically valid pair without imposing a value-kind check', () => {
    expect(splitLightDark('light-dark(8px, 16px)')).toEqual({ light: '8px', dark: '16px' });
  });

  it('rejects a nested light-dark call', () => {
    expect(splitLightDark('light-dark(light-dark(#fff, #000), #333)')).toBeNull();
  });

  it.each([
    'light-dark(#fff)',
    'light-dark(#fff, #000) extra',
    'light-dark(#fff, #000, #123)',
    'light-dark(, #000)',
    'light-dark(#fff, )',
    'light-dark(#fff #000)',
    'light-dark(#fff, #000',
    '#fff',
  ])('returns null for %s', (value) => {
    expect(splitLightDark(value)).toBeNull();
  });
});

describe('resolveModeSides', () => {
  it('gives an item modes pair precedence over semantic and default values', () => {
    const value = item('light-dark(#111, #222)', {
      modes: { light: '#aaa', dark: '#bbb' },
    });
    const semanticOverride: SemanticValue = { literal: { light: '#ccc', dark: '#ddd' } };
    expect(resolveModeSides(value, semanticOverride)).toEqual({ light: '#aaa', dark: '#bbb' });
  });

  it('uses a per-mode semantic literal before the parsed default', () => {
    const value = item('light-dark(#111, #222)');
    const semanticOverride: SemanticValue = { literal: { light: '#ccc', dark: '#ddd' } };
    expect(resolveModeSides(value, semanticOverride)).toEqual({ light: '#ccc', dark: '#ddd' });
  });

  it('parses a string semantic literal override as a light-dark value', () => {
    const value = item('#111');
    const semanticOverride: SemanticValue = { literal: 'light-dark(#fff, #000)' };
    expect(resolveModeSides(value, semanticOverride)).toEqual({ light: '#fff', dark: '#000' });
  });

  it('parses a mode pair from the item default', () => {
    const value = item('light-dark(rgb(0,0,0), #fff)');
    expect(resolveModeSides(value)).toEqual({ light: 'rgb(0,0,0)', dark: '#fff' });
  });

  it('returns null for an ordinary value and isModeDependent mirrors that result', () => {
    const value = item('#888');
    expect(resolveModeSides(value)).toBeNull();
    expect(isModeDependent(value)).toBe(false);
    expect(isModeDependent(item('light-dark(#fff, #000)'))).toBe(true);
  });
});
