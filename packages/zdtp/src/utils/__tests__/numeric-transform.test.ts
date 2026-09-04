import { describe, expect, it } from 'vitest';
import {
  add,
  formatNumericTransformValue,
  multiply,
  parseNumericTransformValue,
  roundToStep,
  setTo,
  type NumericValue,
} from '../numeric-transform';

const value: NumericValue = { magnitude: 1.25, unit: 'rem' };

describe('numeric-transform', () => {
  it('parses a magnitude and preserves the stored unit', () => {
    expect(parseNumericTransformValue('1.5rem')).toEqual({ magnitude: 1.5, unit: 'rem' });
    expect(parseNumericTransformValue('.5', 'px')).toEqual({ magnitude: 0.5, unit: 'px' });
    expect(parseNumericTransformValue('clamp(1rem, 2vw, 3rem)', 'rem')).toBeNull();
  });

  it('multiplies without changing the unit', () => {
    expect(multiply(value, 0.9)).toEqual({ magnitude: 1.125, unit: 'rem' });
    expect(multiply(2)(value)).toEqual({ magnitude: 2.5, unit: 'rem' });
  });

  it('adds without changing the unit', () => {
    expect(add(value, 0.25)).toEqual({ magnitude: 1.5, unit: 'rem' });
    expect(add(-0.25)(value)).toEqual({ magnitude: 1, unit: 'rem' });
  });

  it('rounds to a positive step and leaves invalid steps unchanged', () => {
    expect(roundToStep({ magnitude: 1.19, unit: 'rem' }, 0.125)).toEqual({
      magnitude: 1.25,
      unit: 'rem',
    });
    expect(roundToStep({ magnitude: 1.19, unit: 'rem' }, 0)).toEqual({
      magnitude: 1.19,
      unit: 'rem',
    });
  });

  it('sets only the magnitude and formats through the token helper', () => {
    expect(setTo(value, 2)).toEqual({ magnitude: 2, unit: 'rem' });
    expect(formatNumericTransformValue(setTo(2)(value))).toBe('2rem');
  });
});
