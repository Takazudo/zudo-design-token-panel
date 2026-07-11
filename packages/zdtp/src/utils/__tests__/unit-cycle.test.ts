/**
 * Tests for the click-to-cycle unit suffix helpers (#519).
 */
import { describe, expect, it } from 'vitest';
import { splitLengthValue, nextCyclableUnit, deriveCyclableUnit } from '../unit-cycle';

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

  // Leading-dot decimals ("0.5rem" written as ".5rem") are valid CSS and are
  // accepted by parseFloat — this parser must agree, or the suffix-detection
  // parse and the emitted magnitude can disagree on the same input (#519 review).
  it('splits a leading-dot decimal value, matching parseFloat leniency', () => {
    expect(splitLengthValue('.5rem')).toEqual({ magnitude: 0.5, suffix: 'rem' });
    expect(parseFloat('.5rem')).toBe(0.5);
  });

  it('splits a negative leading-dot decimal value', () => {
    expect(splitLengthValue('-.25em')).toEqual({ magnitude: -0.25, suffix: 'em' });
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

// ---------------------------------------------------------------------------
// deriveCyclableUnit
// ---------------------------------------------------------------------------

describe('deriveCyclableUnit', () => {
  const UNITS = ['rem', 'em', 'px'] as const;

  it('is non-cyclable and passes the declared unit through when `units` is omitted', () => {
    expect(deriveCyclableUnit('rem', undefined, '1.5rem')).toEqual({
      cyclableUnits: undefined,
      isCyclableUnit: false,
      effectiveUnit: 'rem',
      parsedMagnitude: null,
    });
  });

  it('is non-cyclable when `units` has fewer than 2 entries (single entry is intentional opt-out)', () => {
    expect(deriveCyclableUnit('rem', ['rem'], '1.5rem')).toEqual({
      cyclableUnits: undefined,
      isCyclableUnit: false,
      effectiveUnit: 'rem',
      parsedMagnitude: null,
    });
  });

  it('is cyclable and shows the actual stored suffix when it matches the declared unit', () => {
    const state = deriveCyclableUnit('rem', UNITS, '1.5rem');
    expect(state.isCyclableUnit).toBe(true);
    expect(state.cyclableUnits).toBe(UNITS);
    expect(state.effectiveUnit).toBe('rem');
    expect(state.parsedMagnitude).toBe(1.5);
  });

  it('shows the ACTUAL stored suffix even when it diverges from the declared units list', () => {
    const state = deriveCyclableUnit('rem', UNITS, '2vw');
    expect(state.effectiveUnit).toBe('vw');
    expect(state.parsedMagnitude).toBe(2);
  });

  it('falls back to units[0] for display when the stored value has no suffix at all (degenerate case)', () => {
    const state = deriveCyclableUnit('rem', UNITS, '1.5');
    expect(state.effectiveUnit).toBe('rem');
    expect(state.parsedMagnitude).toBe(1.5);
  });

  it('falls back to units[0] for display when the stored value does not parse at all', () => {
    const state = deriveCyclableUnit('rem', UNITS, 'clamp(1rem, 2vw, 3rem)');
    expect(state.effectiveUnit).toBe('rem');
    expect(state.parsedMagnitude).toBeNull();
  });

  it('agrees with splitLengthValue on a leading-dot decimal — parse and (future) emit never disagree', () => {
    const state = deriveCyclableUnit('rem', UNITS, '.5px');
    expect(state.effectiveUnit).toBe('px');
    expect(state.parsedMagnitude).toBe(0.5);
  });
});
