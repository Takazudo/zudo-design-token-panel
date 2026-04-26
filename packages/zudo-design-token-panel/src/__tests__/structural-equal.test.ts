import { describe, expect, it } from 'vitest';
import { structuralEqual } from '../utils/structural-equal';

/**
 * Unit tests for the structural-equal utility. The pre-fix `configurePanel`
 * re-init guard used referential shallow-equality, which broke Astro
 * view-transition reruns of the host-adapter (every `JSON.parse` produced
 * a new object that was byte-identical but referentially distinct). The
 * replacement compares by deep structure so the second
 * `configurePanel(parsedConfig)` call passes silently when the payload
 * hasn't changed.
 */

describe('structuralEqual', () => {
  it('returns true for identical primitives', () => {
    expect(structuralEqual('a', 'a')).toBe(true);
    expect(structuralEqual(42, 42)).toBe(true);
    expect(structuralEqual(true, true)).toBe(true);
    expect(structuralEqual(null, null)).toBe(true);
    expect(structuralEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for primitives of different types or values', () => {
    expect(structuralEqual('1', 1)).toBe(false);
    expect(structuralEqual(true, 1)).toBe(false);
    expect(structuralEqual(null, undefined)).toBe(false);
    expect(structuralEqual(0, false)).toBe(false);
  });

  it('treats NaN as equal to itself (Object.is semantics)', () => {
    expect(structuralEqual(Number.NaN, Number.NaN)).toBe(true);
  });

  it('compares plain objects by value, not by reference', () => {
    const a = { storagePrefix: 'foo', tokens: { spacing: [1, 2, 3] } };
    const b = { storagePrefix: 'foo', tokens: { spacing: [1, 2, 3] } };
    expect(a).not.toBe(b);
    expect(structuralEqual(a, b)).toBe(true);
  });

  it('returns false on key-set mismatch', () => {
    expect(structuralEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(structuralEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('returns false on value mismatch', () => {
    expect(structuralEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('compares arrays element-wise (length-first short-circuit)', () => {
    expect(structuralEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(structuralEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(structuralEqual([1, 2, 3], [1, 3, 2])).toBe(false);
  });

  it('descends into nested arrays / objects', () => {
    const a = { palette: ['#000', '#fff'], baseRoles: { background: 'bg' } };
    const b = { palette: ['#000', '#fff'], baseRoles: { background: 'bg' } };
    expect(structuralEqual(a, b)).toBe(true);
  });

  it('does not confuse arrays with objects of numeric keys', () => {
    expect(structuralEqual([1, 2, 3], { 0: 1, 1: 2, 2: 3 })).toBe(false);
  });

  it('handles property order independently', () => {
    // the import-modal "nothing applied"
    // detector relied on JSON.stringify equality, which is V8 property-order
    // sensitive. structuralEqual is order-independent.
    const a = { foreground: 1, background: 0, palette: ['#000'] };
    const b = { background: 0, palette: ['#000'], foreground: 1 };
    expect(structuralEqual(a, b)).toBe(true);
  });
});
