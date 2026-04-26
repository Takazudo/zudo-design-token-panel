import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  CSS_VAR_NAME_RE,
  isPathSafe,
  isValidCssVarName,
  validateAndSanitizeTokens,
} from '../path-safety';

describe('isPathSafe', () => {
  const writeRoot = resolve('/repo/tokens');

  it('accepts a .css file directly under writeRoot', () => {
    expect(isPathSafe(writeRoot, resolve(writeRoot, 'tokens.css'))).toBe(true);
  });

  it('accepts a .css file in a subdirectory under writeRoot', () => {
    expect(isPathSafe(writeRoot, resolve(writeRoot, 'sub/nested.css'))).toBe(true);
  });

  it('accepts a .css file whose name happens to start with two dots', () => {
    expect(isPathSafe(writeRoot, resolve(writeRoot, '..hidden.css'))).toBe(true);
  });

  it('rejects a non-.css file', () => {
    expect(isPathSafe(writeRoot, resolve(writeRoot, 'tokens.json'))).toBe(false);
  });

  it('rejects writeRoot itself (not a file)', () => {
    expect(isPathSafe(writeRoot, writeRoot)).toBe(false);
  });

  it('rejects a sibling-directory escape (tokens-evil/)', () => {
    expect(isPathSafe(writeRoot, resolve('/repo/tokens-evil/tokens.css'))).toBe(false);
  });

  it('rejects a parent-directory escape', () => {
    expect(isPathSafe(writeRoot, resolve('/repo/other.css'))).toBe(false);
  });

  it('rejects an unrelated absolute path', () => {
    expect(isPathSafe(writeRoot, resolve('/etc/passwd.css'))).toBe(false);
  });
});

describe('CSS_VAR_NAME_RE / isValidCssVarName', () => {
  it('accepts well-formed custom properties', () => {
    expect(CSS_VAR_NAME_RE.test('--zd-p5')).toBe(true);
    expect(isValidCssVarName('--secondary_pa-7')).toBe(true);
  });

  it('rejects names without the leading double-dash', () => {
    expect(isValidCssVarName('zd-p5')).toBe(false);
    expect(isValidCssVarName('-zd-p5')).toBe(false);
  });

  it('rejects names with disallowed characters', () => {
    expect(isValidCssVarName('--zd p5')).toBe(false);
    expect(isValidCssVarName('--zd@p5')).toBe(false);
    expect(isValidCssVarName('--')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidCssVarName(undefined)).toBe(false);
    expect(isValidCssVarName(null)).toBe(false);
    expect(isValidCssVarName(42)).toBe(false);
  });
});

describe('validateAndSanitizeTokens', () => {
  it('accepts a well-formed map and returns the sanitized copy', () => {
    const result = validateAndSanitizeTokens({
      '--zd-p5': 'oklch(65% 0.2 45)',
      '--zd-p6': 'oklch(52% 0.01 50)',
    });
    expect(result.error).toBeUndefined();
    expect(result.sanitized).toEqual({
      '--zd-p5': 'oklch(65% 0.2 45)',
      '--zd-p6': 'oklch(52% 0.01 50)',
    });
  });

  it('returns an error for an invalid CSS var name', () => {
    const result = validateAndSanitizeTokens({ 'zd-p5': 'red' });
    expect(result.error).toMatch(/Invalid cssVar name/);
    expect(result.sanitized).toBeUndefined();
  });

  it('returns an error for a non-string value', () => {
    const result = validateAndSanitizeTokens({ '--zd-p5': 42 });
    expect(result.error).toMatch(/must be a string/);
    expect(result.sanitized).toBeUndefined();
  });
});
