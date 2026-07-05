import { describe, expect, it } from 'vitest';
import {
  isIndexMapping,
  isLiteralMapping,
  isPerModeLiteral,
  isRefMapping,
  type SemanticValue,
} from '../tweak-state';

describe('SemanticValue narrowing helpers', () => {
  describe('isIndexMapping', () => {
    it('is true for a palette-index number', () => {
      expect(isIndexMapping(3)).toBe(true);
      expect(isIndexMapping(0)).toBe(true);
    });

    it('is true for the "bg" / "fg" aliases', () => {
      expect(isIndexMapping('bg')).toBe(true);
      expect(isIndexMapping('fg')).toBe(true);
    });

    it('is false for literal and ref variants', () => {
      expect(isIndexMapping({ literal: '#ff0000' })).toBe(false);
      expect(isIndexMapping({ literal: { light: '#fff', dark: '#000' } })).toBe(false);
      expect(isIndexMapping({ ref: { tier: 'ramp', item: 'blue-500' } })).toBe(false);
    });
  });

  describe('isLiteralMapping', () => {
    it('is true for a plain string literal', () => {
      expect(isLiteralMapping({ literal: '#112233' })).toBe(true);
    });

    it('is true for a light/dark literal pair', () => {
      expect(isLiteralMapping({ literal: { light: '#fff', dark: '#000' } })).toBe(true);
    });

    it('is false for index mappings and ref mappings', () => {
      expect(isLiteralMapping(2)).toBe(false);
      expect(isLiteralMapping('bg')).toBe(false);
      expect(isLiteralMapping({ ref: { tier: 'ramp', item: 'blue-500' } })).toBe(false);
    });
  });

  describe('isPerModeLiteral', () => {
    it('is true only for the light/dark literal variant', () => {
      expect(isPerModeLiteral({ literal: { light: '#fff', dark: '#000' } })).toBe(true);
    });

    it('is false for a plain string literal', () => {
      expect(isPerModeLiteral({ literal: '#112233' })).toBe(false);
    });

    it('is false for index mappings and ref mappings', () => {
      expect(isPerModeLiteral(1)).toBe(false);
      expect(isPerModeLiteral({ ref: { tab: 'other', tier: 'ramp', item: 'blue-500' } })).toBe(
        false,
      );
    });
  });

  describe('isRefMapping', () => {
    it('is true for a ramp-item reference, with or without a tab', () => {
      expect(isRefMapping({ ref: { tier: 'ramp', item: 'blue-500' } })).toBe(true);
      expect(isRefMapping({ ref: { tab: 'colors', tier: 'ramp', item: 'blue-500' } })).toBe(true);
    });

    it('is false for index and literal mappings', () => {
      expect(isRefMapping(0)).toBe(false);
      expect(isRefMapping('fg')).toBe(false);
      expect(isRefMapping({ literal: '#112233' })).toBe(false);
    });
  });

  it('every legacy value is still assignable to SemanticValue (widening is additive)', () => {
    const legacyValues: SemanticValue[] = [0, 5, 'bg', 'fg'];
    for (const v of legacyValues) {
      expect(isIndexMapping(v)).toBe(true);
    }
  });
});
