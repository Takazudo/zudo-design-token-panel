import { describe, it, expect } from 'vitest';
import {
  isColorKind,
  isLengthKind,
  isNumberKind,
  isSelectKind,
  isTextKind,
  type TierValueKind,
} from '../tier-model';

describe('isLengthKind', () => {
  it('returns true for a length kind', () => {
    const v: TierValueKind = { kind: 'length', min: 0, max: 10, step: 0.5, unit: 'rem' };
    expect(isLengthKind(v)).toBe(true);
  });

  it('returns false for non-length kinds', () => {
    const cases: TierValueKind[] = [
      { kind: 'number', min: 0, max: 10, step: 1 },
      { kind: 'select', options: ['a'] },
      { kind: 'text' },
      { kind: 'color' },
    ];
    for (const v of cases) {
      expect(isLengthKind(v)).toBe(false);
    }
  });

  it('narrows the type so unit is accessible without error', () => {
    const v: TierValueKind = { kind: 'length', min: 0, max: 10, step: 0.5, unit: 'px' };
    if (isLengthKind(v)) {
      expect(v.unit).toBe('px');
    }
  });
});

describe('isNumberKind', () => {
  it('returns true for a number kind', () => {
    const v: TierValueKind = { kind: 'number', min: 1, max: 100, step: 1 };
    expect(isNumberKind(v)).toBe(true);
  });

  it('returns false for non-number kinds', () => {
    const cases: TierValueKind[] = [
      { kind: 'length', min: 0, max: 10, step: 0.5, unit: 'rem' },
      { kind: 'select', options: ['a'] },
      { kind: 'text' },
      { kind: 'color' },
    ];
    for (const v of cases) {
      expect(isNumberKind(v)).toBe(false);
    }
  });

  it('narrows the type so step is accessible without error', () => {
    const v: TierValueKind = { kind: 'number', min: 0, max: 10, step: 2 };
    if (isNumberKind(v)) {
      expect(v.step).toBe(2);
    }
  });
});

describe('isSelectKind', () => {
  it('returns true for a select kind', () => {
    const v: TierValueKind = { kind: 'select', options: ['bold', 'normal'] };
    expect(isSelectKind(v)).toBe(true);
  });

  it('returns false for non-select kinds', () => {
    const cases: TierValueKind[] = [
      { kind: 'length', min: 0, max: 10, step: 0.5, unit: 'rem' },
      { kind: 'number', min: 0, max: 10, step: 1 },
      { kind: 'text' },
      { kind: 'color' },
    ];
    for (const v of cases) {
      expect(isSelectKind(v)).toBe(false);
    }
  });

  it('narrows the type so options is accessible without error', () => {
    const v: TierValueKind = { kind: 'select', options: ['a', 'b'] };
    if (isSelectKind(v)) {
      expect(v.options).toEqual(['a', 'b']);
    }
  });
});

describe('isTextKind', () => {
  it('returns true for a text kind', () => {
    const v: TierValueKind = { kind: 'text' };
    expect(isTextKind(v)).toBe(true);
  });

  it('returns false for non-text kinds', () => {
    const cases: TierValueKind[] = [
      { kind: 'length', min: 0, max: 10, step: 0.5, unit: 'rem' },
      { kind: 'number', min: 0, max: 10, step: 1 },
      { kind: 'select', options: ['a'] },
      { kind: 'color' },
    ];
    for (const v of cases) {
      expect(isTextKind(v)).toBe(false);
    }
  });
});

describe('isColorKind', () => {
  it('returns true for a color kind', () => {
    const v: TierValueKind = { kind: 'color' };
    expect(isColorKind(v)).toBe(true);
  });

  it('returns false for non-color kinds', () => {
    const cases: TierValueKind[] = [
      { kind: 'length', min: 0, max: 10, step: 0.5, unit: 'rem' },
      { kind: 'number', min: 0, max: 10, step: 1 },
      { kind: 'select', options: ['a'] },
      { kind: 'text' },
    ];
    for (const v of cases) {
      expect(isColorKind(v)).toBe(false);
    }
  });
});
