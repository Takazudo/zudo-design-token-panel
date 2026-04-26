import { describe, expect, it } from 'vitest';
import { TOKEN_SOURCE_FILES, routeTokensToFiles, type RouteResult } from '../route-tokens-to-files';

describe('TOKEN_SOURCE_FILES', () => {
  it('ships an empty default routing map (host MUST configure routing)', () => {
    expect(TOKEN_SOURCE_FILES).toEqual({});
  });
});

const DEMO_ROUTING = {
  brand: 'src/styles/brand.css',
  audio: 'src/styles/audio.css',
};

describe('routeTokensToFiles — single-prefix grouping', () => {
  it('groups all matching cssVars under their configured prefix', () => {
    const result: RouteResult = routeTokensToFiles(
      {
        '--brand-p5': 'oklch(99% 0 0)',
        '--brand-spacing-hgap-sm': '24px',
      },
      DEMO_ROUTING,
    );
    expect(result.rejected).toEqual([]);
    expect(result.groups).toHaveLength(1);
    const [group] = result.groups;
    expect(group.prefix).toBe('brand');
    expect(group.relativePath).toBe(DEMO_ROUTING.brand);
    expect(group.tokens).toEqual({
      '--brand-p5': 'oklch(99% 0 0)',
      '--brand-spacing-hgap-sm': '24px',
    });
  });

  it('preserves insertion order of tokens within a group', () => {
    const result = routeTokensToFiles(
      {
        '--brand-z9': 'z',
        '--brand-a1': 'a',
        '--brand-m5': 'm',
      },
      DEMO_ROUTING,
    );
    expect(Object.keys(result.groups[0].tokens)).toEqual([
      '--brand-z9',
      '--brand-a1',
      '--brand-m5',
    ]);
  });
});

describe('routeTokensToFiles — multi-prefix grouping', () => {
  it('produces one group per prefix, each with its own path', () => {
    const result = routeTokensToFiles(
      {
        '--brand-p5': 'red',
        '--audio-font-md': '15px',
        '--brand-p1': 'blue',
        '--audio-touch-target': '48px',
      },
      DEMO_ROUTING,
    );
    expect(result.rejected).toEqual([]);
    expect(result.groups).toHaveLength(2);

    const brand = result.groups.find((g) => g.prefix === 'brand');
    const audio = result.groups.find((g) => g.prefix === 'audio');
    expect(brand).toBeDefined();
    expect(audio).toBeDefined();
    expect(brand!.relativePath).toBe(DEMO_ROUTING.brand);
    expect(audio!.relativePath).toBe(DEMO_ROUTING.audio);
    expect(brand!.tokens).toEqual({ '--brand-p5': 'red', '--brand-p1': 'blue' });
    expect(audio!.tokens).toEqual({
      '--audio-font-md': '15px',
      '--audio-touch-target': '48px',
    });
  });

  it('preserves insertion order within each group (not across groups)', () => {
    const result = routeTokensToFiles(
      {
        '--brand-z9': 'z',
        '--audio-b2': 'b',
        '--brand-a1': 'a',
        '--audio-a1': 'a',
      },
      DEMO_ROUTING,
    );
    const brand = result.groups.find((g) => g.prefix === 'brand')!;
    const audio = result.groups.find((g) => g.prefix === 'audio')!;
    expect(Object.keys(brand.tokens)).toEqual(['--brand-z9', '--brand-a1']);
    expect(Object.keys(audio.tokens)).toEqual(['--audio-b2', '--audio-a1']);
  });
});

describe('routeTokensToFiles — rejected inputs', () => {
  it('routes unknown double-dash prefixes to rejected', () => {
    const result = routeTokensToFiles(
      {
        '--color-bg': 'pink',
        '--something-not-known': 'value',
      },
      DEMO_ROUTING,
    );
    expect(result.groups).toEqual([]);
    expect(result.rejected).toEqual(['--color-bg', '--something-not-known']);
  });

  it('rejects keys that do not start with --', () => {
    const result = routeTokensToFiles(
      {
        'brand-p5': 'red',
        'not-a-css-var': 'value',
      },
      DEMO_ROUTING,
    );
    expect(result.groups).toEqual([]);
    expect(result.rejected).toEqual(['brand-p5', 'not-a-css-var']);
  });

  it('rejects the bare prefix without a trailing segment', () => {
    const result = routeTokensToFiles(
      {
        '--brand': 'x',
        '--brand-': 'x',
        '--audio': 'y',
        '--audio-': 'y',
      },
      DEMO_ROUTING,
    );
    expect(result.groups).toEqual([]);
    expect(result.rejected).toEqual(['--brand', '--brand-', '--audio', '--audio-']);
  });

  it('splits accepted and rejected entries in a mixed input', () => {
    const result = routeTokensToFiles(
      {
        '--brand-p5': 'red',
        '--unknown-foo': 'x',
        '--audio-font-md': '15px',
        'bare-key': 'nope',
      },
      DEMO_ROUTING,
    );
    expect(result.rejected).toEqual(['--unknown-foo', 'bare-key']);
    expect(result.groups).toHaveLength(2);
    expect(result.groups.find((g) => g.prefix === 'brand')!.tokens).toEqual({ '--brand-p5': 'red' });
    expect(result.groups.find((g) => g.prefix === 'audio')!.tokens).toEqual({
      '--audio-font-md': '15px',
    });
  });
});

describe('routeTokensToFiles — empty input', () => {
  it('returns empty groups and empty rejected list', () => {
    const result = routeTokensToFiles({}, DEMO_ROUTING);
    expect(result.groups).toEqual([]);
    expect(result.rejected).toEqual([]);
  });
});

describe('routeTokensToFiles — host-supplied routing', () => {
  it('uses the supplied routing map when provided', () => {
    const result = routeTokensToFiles(
      { '--demo-pa1': '#ff0000', '--brand-p5': '#00ff00' },
      { demo: 'src/demo.css' },
    );
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toEqual({
      prefix: 'demo',
      relativePath: 'src/demo.css',
      tokens: { '--demo-pa1': '#ff0000' },
    });
    // --brand-p5 is rejected because the host's routing has no `brand` entry.
    expect(result.rejected).toEqual(['--brand-p5']);
  });

  it('emits a non-empty rejectedReasons list with prefix-aware diagnostics', () => {
    const result = routeTokensToFiles(
      { '--unknown-x': '1', 'bare-key': '2' },
      { brand: 'tokens.css' },
    );
    expect(result.rejectedReasons).toHaveLength(2);
    expect(result.rejectedReasons[0]).toMatch(/no route configured.*"brand"/);
    expect(result.rejectedReasons[1]).toMatch(/not a CSS custom property/);
  });

  it('rejects everything when the routing map is empty (apply disabled)', () => {
    const result = routeTokensToFiles({ '--brand-p5': 'red' }, {});
    expect(result.groups).toEqual([]);
    expect(result.rejected).toEqual(['--brand-p5']);
    expect(result.rejectedReasons[0]).toMatch(/no applyRouting configured/);
  });
});
