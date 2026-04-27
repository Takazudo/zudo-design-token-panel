import { describe, expect, it } from 'vitest';
import { buildCorsHeaders, isOriginAllowed } from '../cors';

describe('isOriginAllowed', () => {
  it('returns true for an exact match in the allow list', () => {
    expect(isOriginAllowed('http://localhost:34434', ['http://localhost:34434'])).toBe(true);
  });

  it('returns false when the origin is not in the allow list', () => {
    expect(isOriginAllowed('http://evil.com', ['http://localhost:34434'])).toBe(false);
  });

  it('treats scheme casing as case-sensitive (HTTP vs http differ)', () => {
    expect(isOriginAllowed('HTTP://x.com', ['http://x.com'])).toBe(false);
  });

  it('treats port as case-sensitive — different ports are different origins', () => {
    expect(isOriginAllowed('http://x.com:3000', ['http://x.com:3001'])).toBe(false);
  });

  it('returns false for a null origin', () => {
    expect(isOriginAllowed(null, ['http://x.com'])).toBe(false);
  });

  it('returns false for an undefined origin', () => {
    expect(isOriginAllowed(undefined, ['http://x.com'])).toBe(false);
  });

  it('returns false for an empty origin string', () => {
    expect(isOriginAllowed('', ['http://x.com'])).toBe(false);
  });

  it('returns false when the allow list is empty', () => {
    expect(isOriginAllowed('http://x.com', [])).toBe(false);
  });

  it('returns true when the origin is one of multiple entries', () => {
    expect(isOriginAllowed('http://b.com', ['http://a.com', 'http://b.com', 'http://c.com'])).toBe(
      true,
    );
  });
});

describe('buildCorsHeaders', () => {
  it('returns the four ACA-* headers with the echoed origin', () => {
    const headers = buildCorsHeaders('http://localhost:34434');
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:34434');
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toBe('content-type');
    expect(headers['Access-Control-Max-Age']).toBe('600');
  });

  it('echoes whichever origin is passed in (caller is responsible for gating)', () => {
    const headers = buildCorsHeaders('http://other.example');
    expect(headers['Access-Control-Allow-Origin']).toBe('http://other.example');
  });

  it('returns exactly the four ACA-* keys (no extras)', () => {
    const headers = buildCorsHeaders('http://x.com');
    expect(Object.keys(headers).sort()).toEqual([
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Origin',
      'Access-Control-Max-Age',
    ]);
  });
});
