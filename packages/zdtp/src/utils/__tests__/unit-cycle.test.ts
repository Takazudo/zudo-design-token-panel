/**
 * Tests for the click-to-cycle unit suffix helpers (#519).
 */
import { describe, expect, it } from 'vitest';
import { splitLengthValue, nextCyclableUnit } from '../unit-cycle';

// ---------------------------------------------------------------------------
// splitLengthValue
// ---------------------------------------------------------------------------

describe('splitLengthValue', () => {
  it('splits a simple rem value', () => {
    expect(splitLengthValue('1.5rem')).toEqual({ magnitude: 1.5, suffix: 'rem' });
  });

  it('splits an integer px value', () => {
    expect(splitLengthValue('40px')).toEqual({ magnitude: 40, suffix: 'px' });
  });

  it('splits a negative value', () => {
    expect(splitLengthValue('-2em')).toEqual({ magnitude: -2, suffix: 'em' });
  });

  it('returns an empty suffix for a unitless value', () => {
    expect(splitLengthValue('1.25')).toEqual({ magnitude: 1.25, suffix: '' });
  });

  it('trims whitespace around the suffix', () => {
    expect(splitLengthValue('10 px')).toEqual({ magnitude: 10, suffix: 'px' });
  });

  it('returns null for a value with no leading number (e.g. clamp())', () => {
    expect(splitLengthValue('clamp(1rem, 2vw, 3rem)')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(splitLengthValue('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// nextCyclableUnit
// ---------------------------------------------------------------------------

describe('nextCyclableUnit', () => {
  const UNITS = ['rem', 'em', 'px'] as const;

  it('advances to the next unit in the list', () => {
    expect(nextCyclableUnit(UNITS, 'rem')).toBe('em');
    expect(nextCyclableUnit(UNITS, 'em')).toBe('px');
  });

  it('wraps from the last unit back to the first', () => {
    expect(nextCyclableUnit(UNITS, 'px')).toBe('rem');
  });

  it('lands on units[0] when the current unit is not in the declared list (divergence case)', () => {
    expect(nextCyclableUnit(UNITS, 'vw')).toBe('rem');
  });

  it('lands on units[0] for an empty current unit not in the list', () => {
    expect(nextCyclableUnit(UNITS, '')).toBe('rem');
  });
});
