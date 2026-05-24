import { describe, expect, it } from 'vitest';
import { HELP_TEXT, parseArgs } from '../parse-args';

describe('parseArgs', () => {
  it('throws when --write-root is missing', () => {
    expect(() => parseArgs(['--routing', './r.json'])).toThrow(/write-root/i);
  });

  it('throws when --routing is missing', () => {
    expect(() => parseArgs(['--write-root', './w'])).toThrow(/routing/i);
  });

  it('accumulates repeated --allow-origin into allowOrigins', () => {
    const args = parseArgs([
      '--write-root',
      './w',
      '--routing',
      './r.json',
      '--allow-origin',
      'http://localhost:34434',
      '--allow-origin',
      'http://example.com',
    ]);
    expect(args.allowOrigins).toEqual(['http://localhost:34434', 'http://example.com']);
  });

  it('defaults --port to 24681', () => {
    const args = parseArgs(['--write-root', './w', '--routing', './r.json']);
    expect(args.port).toBe(24681);
  });

  it('defaults --host to 127.0.0.1', () => {
    const args = parseArgs(['--write-root', './w', '--routing', './r.json']);
    expect(args.host).toBe('127.0.0.1');
  });

  it('returns help: true and HELP_TEXT is non-empty when --help is passed', () => {
    const args = parseArgs(['--help']);
    expect(args.help).toBe(true);
    expect(typeof HELP_TEXT).toBe('string');
    expect(HELP_TEXT.length).toBeGreaterThan(0);
  });

  it('sets quiet: true when --quiet is passed', () => {
    const args = parseArgs(['--write-root', './w', '--routing', './r.json', '--quiet']);
    expect(args.quiet).toBe(true);
  });

  it('throws when --port value is non-numeric', () => {
    expect(() =>
      parseArgs(['--write-root', './w', '--routing', './r.json', '--port', 'abc']),
    ).toThrow(/port/i);
  });

  it('accepts a numeric --port', () => {
    const args = parseArgs(['--write-root', './w', '--routing', './r.json', '--port', '12345']);
    expect(args.port).toBe(12345);
  });

  it('accepts --host', () => {
    const args = parseArgs(['--write-root', './w', '--routing', './r.json', '--host', '0.0.0.0']);
    expect(args.host).toBe('0.0.0.0');
  });

  it('accepts --root', () => {
    const args = parseArgs(['--root', '/abs/repo', '--write-root', './w', '--routing', './r.json']);
    expect(args.root).toBe('/abs/repo');
  });

  it('throws on unknown options', () => {
    expect(() => parseArgs(['--write-root', './w', '--routing', './r.json', '--bogus'])).toThrow(
      /unknown option/i,
    );
  });

  it('throws when a flag is missing its value', () => {
    expect(() => parseArgs(['--write-root'])).toThrow(/write-root/i);
  });

  it('throws when --port is out of range', () => {
    expect(() =>
      parseArgs(['--write-root', './w', '--routing', './r.json', '--port', '-1']),
    ).toThrow(/port/i);
    expect(() =>
      parseArgs(['--write-root', './w', '--routing', './r.json', '--port', '70000']),
    ).toThrow(/port/i);
  });

  it('accepts --port 0 as an "OS-assigned port" sentinel', () => {
    // 0 means "let the kernel pick a free port"; the bin's startup
    // log line surfaces the actual port for callers (e.g. integration tests).
    const args = parseArgs(['--write-root', './w', '--routing', './r.json', '--port', '0']);
    expect(args.port).toBe(0);
  });
});
