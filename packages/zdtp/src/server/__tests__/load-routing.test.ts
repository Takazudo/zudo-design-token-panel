import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadRoutingFromFile, type ApplyRoutingMap } from '../load-routing';

/**
 * Temporary directory used by every test in this suite.
 * Created before each test, removed after.
 */
let tmpDir: string;

beforeEach(() => {
  tmpDir = join(
    tmpdir(),
    `dtp-load-routing-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeTmp(filename: string, content: string): string {
  const p = join(tmpDir, filename);
  writeFileSync(p, content, 'utf-8');
  return p;
}

describe('loadRoutingFromFile', () => {
  describe('valid JSON', () => {
    it('parses a single-entry routing map', () => {
      const path = writeTmp(
        'valid.json',
        JSON.stringify({ zd: 'tokens/tokens.css' }),
      );
      const result = loadRoutingFromFile(path);
      expect(result).toEqual<ApplyRoutingMap>({ zd: 'tokens/tokens.css' });
    });

    it('parses a multi-entry routing map', () => {
      const path = writeTmp(
        'multi.json',
        JSON.stringify({
          zd: 'tokens/tokens.css',
          secondary: 'tokens/secondary-tokens.css',
        }),
      );
      const result = loadRoutingFromFile(path);
      expect(result).toEqual<ApplyRoutingMap>({
        zd: 'tokens/tokens.css',
        secondary: 'tokens/secondary-tokens.css',
      });
    });
  });

  describe('malformed JSON', () => {
    it('throws a descriptive error for invalid JSON syntax', () => {
      const path = writeTmp('bad.json', '{ "zd": ');
      expect(() => loadRoutingFromFile(path)).toThrowError(/invalid JSON/i);
    });

    it('includes the file path in the error message for invalid JSON', () => {
      const path = writeTmp('bad2.json', 'not-json-at-all');
      expect(() => loadRoutingFromFile(path)).toThrowError(path);
    });
  });

  describe('non-object root', () => {
    it('throws when root is an array', () => {
      const path = writeTmp('array.json', JSON.stringify(['zd', 'tokens.css']));
      expect(() => loadRoutingFromFile(path)).toThrowError(/array/);
    });

    it('throws when root is null', () => {
      const path = writeTmp('null.json', 'null');
      expect(() => loadRoutingFromFile(path)).toThrowError(/null/);
    });

    it('throws when root is a string', () => {
      const path = writeTmp('string.json', '"just a string"');
      expect(() => loadRoutingFromFile(path)).toThrowError(/string/);
    });

    it('throws when root is a number', () => {
      const path = writeTmp('number.json', '42');
      expect(() => loadRoutingFromFile(path)).toThrowError(/number/);
    });
  });

  describe('non-string values', () => {
    it('throws when a value is a number', () => {
      const path = writeTmp('num-val.json', JSON.stringify({ zd: 42 }));
      expect(() => loadRoutingFromFile(path)).toThrowError(/key "zd"/);
    });

    it('throws when a value is null', () => {
      const path = writeTmp('null-val.json', JSON.stringify({ zd: null }));
      expect(() => loadRoutingFromFile(path)).toThrowError(/key "zd"/);
    });

    it('throws when a value is an object', () => {
      const path = writeTmp('obj-val.json', JSON.stringify({ zd: { nested: true } }));
      expect(() => loadRoutingFromFile(path)).toThrowError(/key "zd"/);
    });

    it('throws when a value is an empty string', () => {
      const path = writeTmp('empty-str-val.json', JSON.stringify({ zd: '' }));
      expect(() => loadRoutingFromFile(path)).toThrowError(/key "zd"/);
    });

    it('throws when a value is a whitespace-only string', () => {
      const path = writeTmp('ws-val.json', JSON.stringify({ zd: '   ' }));
      expect(() => loadRoutingFromFile(path)).toThrowError(/key "zd"/);
    });
  });

  describe('empty map', () => {
    it('throws for an empty object', () => {
      const path = writeTmp('empty.json', '{}');
      expect(() => loadRoutingFromFile(path)).toThrowError(/must not be empty/);
    });
  });

  describe('non-existent file', () => {
    it('throws when the file does not exist', () => {
      const path = join(tmpDir, 'does-not-exist.json');
      expect(() => loadRoutingFromFile(path)).toThrowError(/cannot read file/);
    });

    it('includes the file path in the error message', () => {
      const path = join(tmpDir, 'missing.json');
      expect(() => loadRoutingFromFile(path)).toThrowError(path);
    });
  });
});
