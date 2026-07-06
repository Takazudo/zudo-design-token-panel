import { describe, expect, it } from 'vitest';
import {
  applyTokenOverrides,
  applyTokenOverridesOrThrow,
  hasApplicableTokenBlock,
  hasTopLevelRootBlock,
  NoRootBlockError,
  NoTokenBlockError,
} from '../apply-token-overrides';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function root(declarations: string): string {
  return `:root {\n${declarations}\n}`;
}

function theme(declarations: string): string {
  return `@theme {\n${declarations}\n}`;
}

// ---------------------------------------------------------------------------
// Basic happy-path
// ---------------------------------------------------------------------------

describe('applyTokenOverrides — basic replacement', () => {
  it('rewrites a matching declaration', () => {
    const src = root('  --foo: 10px;\n');
    const { updated, changed, unchanged, unknown } = applyTokenOverrides(src, {
      '--foo': '99px',
    });
    expect(updated).toBe(root('  --foo: 99px;\n'));
    expect(changed).toEqual(['--foo']);
    expect(unchanged).toEqual([]);
    expect(unknown).toEqual([]);
  });

  it('accepts name without leading --', () => {
    const src = root('  --bar: red;\n');
    const { updated, changed } = applyTokenOverrides(src, { bar: 'blue' });
    expect(updated).toContain('--bar: blue;');
    expect(changed).toEqual(['bar']);
  });

  it('reports unchanged when trimmed value already matches', () => {
    const src = root('  --x: 10px;\n');
    const { updated, changed, unchanged } = applyTokenOverrides(src, { '--x': '10px' });
    expect(updated).toBe(src);
    expect(changed).toEqual([]);
    expect(unchanged).toEqual(['--x']);
  });

  it('reports unknown when name is absent from the :root block', () => {
    const src = root('  --exists: 1;\n');
    const { unknown } = applyTokenOverrides(src, { '--missing': '2' });
    expect(unknown).toEqual(['--missing']);
  });

  it('preserves original whitespace between : and value', () => {
    const src = root('  --a:   old;\n');
    const { updated } = applyTokenOverrides(src, { '--a': 'new' });
    expect(updated).toBe(root('  --a:   new;\n'));
  });
});

// ---------------------------------------------------------------------------
// F25: Suffix-collision regression (the primary bug this fix targets)
// ---------------------------------------------------------------------------

describe('F25 suffix-collision — left boundary guard', () => {
  it('does NOT rewrite --x--foo when override targets --foo', () => {
    const src = root('  --x--foo: 10px;\n  --foo: 20px;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--foo': '99px' });
    expect(updated).toContain('--x--foo: 10px;');
    expect(updated).toContain('--foo: 99px;');
    expect(changed).toEqual(['--foo']);
  });

  it('does NOT rewrite --brand-color-primary when override targets --color-primary', () => {
    const src = root('  --brand-color-primary: #aaa;\n  --color-primary: #bbb;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--color-primary': '#fff' });
    expect(updated).toContain('--brand-color-primary: #aaa;');
    expect(updated).toContain('--color-primary: #fff;');
    expect(changed).toEqual(['--color-primary']);
  });

  it('does NOT rewrite ---foo (triple-dash) when override targets --foo', () => {
    const src = root('  ---foo: 1;\n  --foo: 2;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--foo': '9' });
    expect(updated).toContain('---foo: 1;');
    expect(updated).toContain('--foo: 9;');
    expect(changed).toEqual(['--foo']);
  });

  it('correctly rewrites --x--foo when that is the explicit override target', () => {
    const src = root('  --x--foo: 10px;\n  --foo: 20px;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--x--foo': '50px' });
    expect(updated).toContain('--x--foo: 50px;');
    expect(updated).toContain('--foo: 20px;');
    expect(changed).toEqual(['--x--foo']);
  });

  it('handles multiple overrides with suffix relationships correctly', () => {
    const src = root(
      '  --brand-color-primary: #111;\n  --color-primary: #222;\n  --primary: #333;\n',
    );
    const { updated, changed } = applyTokenOverrides(src, {
      '--primary': '#aaa',
      '--color-primary': '#bbb',
    });
    expect(updated).toContain('--brand-color-primary: #111;');
    expect(updated).toContain('--color-primary: #bbb;');
    expect(updated).toContain('--primary: #aaa;');
    expect(changed).toContain('--primary');
    expect(changed).toContain('--color-primary');
  });
});

// ---------------------------------------------------------------------------
// B4 fix: comment masking — commented-out declaration must not shadow live one
// ---------------------------------------------------------------------------

describe('comment masking (B4 fix)', () => {
  it('does not rewrite a declaration inside a block comment', () => {
    const src = root('  /* --foo: commented; */\n  --foo: live;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--foo': 'new' });
    expect(updated).toContain('/* --foo: commented; */');
    expect(updated).toContain('--foo: new;');
    expect(changed).toEqual(['--foo']);
  });

  it('rewrites live declaration even when a commented-out one appears first', () => {
    const src = root('  /* --zd-foo: red; */\n  --zd-foo: blue;\n');
    const { updated } = applyTokenOverrides(src, { '--zd-foo': 'green' });
    expect(updated).toContain('/* --zd-foo: red; */');
    expect(updated).toContain('--zd-foo: green;');
  });
});

// ---------------------------------------------------------------------------
// First-occurrence-only
// ---------------------------------------------------------------------------

describe('first-occurrence-only', () => {
  it('rewrites only the first occurrence when the same cssVar appears twice', () => {
    const src = root('  --dup: first;\n  --dup: second;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--dup': 'new' });
    expect(updated).toBe(root('  --dup: new;\n  --dup: second;\n'));
    expect(changed).toEqual(['--dup']);
  });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe('idempotency', () => {
  it('double-applying the same overrides produces byte-identical output and reports unchanged', () => {
    const src = root('  --a: old;\n  --b: also-old;\n');
    const first = applyTokenOverrides(src, { '--a': 'new', '--b': 'fresh' });
    const second = applyTokenOverrides(first.updated, { '--a': 'new', '--b': 'fresh' });
    expect(second.updated).toBe(first.updated);
    expect(second.changed).toEqual([]);
    expect(second.unchanged).toContain('--a');
    expect(second.unchanged).toContain('--b');
  });
});

// ---------------------------------------------------------------------------
// Missing :root block
// ---------------------------------------------------------------------------

describe('missing :root block', () => {
  it('returns all overrides as unknown when no top-level :root block exists', () => {
    const src = '.some-class { --foo: red; }';
    const { updated, changed, unknown } = applyTokenOverrides(src, {
      '--foo': 'blue',
      '--bar': 'green',
    });
    expect(updated).toBe(src);
    expect(changed).toEqual([]);
    expect(unknown).toContain('--foo');
    expect(unknown).toContain('--bar');
  });

  it('hasTopLevelRootBlock returns false when no :root block exists', () => {
    expect(hasTopLevelRootBlock('.not-root { color: red; }')).toBe(false);
  });

  it('hasTopLevelRootBlock returns true when :root block exists', () => {
    expect(hasTopLevelRootBlock(root('  --x: 1;\n'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NoRootBlockError / applyTokenOverridesOrThrow
// ---------------------------------------------------------------------------

describe('applyTokenOverridesOrThrow', () => {
  it('throws NoRootBlockError when no top-level :root block exists', () => {
    expect(() => applyTokenOverridesOrThrow('.c { --x: 1; }', { '--x': '2' })).toThrow(
      NoRootBlockError,
    );
  });

  it('returns normal ApplyResult when :root block exists', () => {
    const src = root('  --x: 1;\n');
    const result = applyTokenOverridesOrThrow(src, { '--x': '2' });
    expect(result.changed).toEqual(['--x']);
  });
});

// ---------------------------------------------------------------------------
// Nested :root under @media / @layer / @supports — intentionally skipped
// (as documented in the module docstring)
// ---------------------------------------------------------------------------

describe('nested :root skipped', () => {
  it('ignores :root inside @media and rewrites the top-level one', () => {
    const src =
      ':root {\n  --a: 1;\n}\n@media (max-width:600px) {\n  :root {\n    --a: 2;\n  }\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--a': '9' });
    // Top-level :root should be updated
    expect(changed).toEqual(['--a']);
    // The @media nested :root should remain untouched
    expect(updated).toContain('@media (max-width:600px) {\n  :root {\n    --a: 2;\n  }\n}');
    // Top-level value should be the new one
    expect(updated.indexOf('--a: 9;')).toBeGreaterThan(-1);
  });

  it('ignores :root inside @layer', () => {
    const src = ':root {\n  --b: old;\n}\n@layer base {\n  :root {\n    --b: nested;\n  }\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--b': 'new' });
    expect(changed).toEqual(['--b']);
    expect(updated).toContain('@layer base {\n  :root {\n    --b: nested;\n  }\n}');
  });

  it('ignores :root inside @supports', () => {
    const src =
      ':root {\n  --c: old;\n}\n@supports (display: grid) {\n  :root {\n    --c: nested;\n  }\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--c': 'new' });
    expect(changed).toEqual(['--c']);
    expect(updated).toContain(
      '@supports (display: grid) {\n  :root {\n    --c: nested;\n  }\n}',
    );
  });

  it('returns unknown when only a nested :root exists and there is no top-level one', () => {
    const src = '@media screen {\n  :root {\n    --a: 1;\n  }\n}\n';
    const { unknown } = applyTokenOverrides(src, { '--a': '2' });
    expect(unknown).toEqual(['--a']);
  });
});

// ---------------------------------------------------------------------------
// Grouped selector :root, html — NOT matched
// (as documented in the module docstring)
// ---------------------------------------------------------------------------

describe('grouped selector :root, html not matched', () => {
  it('routes override to unknown when only a :root, html block exists', () => {
    const src = ':root, html {\n  --x: 1;\n}\n';
    const { unknown } = applyTokenOverrides(src, { '--x': '2' });
    expect(unknown).toEqual(['--x']);
  });

  it('rewrites the bare :root block and ignores a grouped :root, html block', () => {
    const src = ':root {\n  --x: bare;\n}\n:root, html {\n  --x: grouped;\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--x': 'new' });
    expect(changed).toEqual(['--x']);
    // Bare :root updated
    expect(updated).toContain(':root {\n  --x: new;\n}');
    // Grouped block untouched
    expect(updated).toContain(':root, html {\n  --x: grouped;\n}');
  });
});

// ---------------------------------------------------------------------------
// String/comment containing braces and semicolons
// ---------------------------------------------------------------------------

describe('strings and comments with braces and semicolons', () => {
  it('does not confuse a semicolon inside a block comment with a declaration end', () => {
    // The block comment spans multiple lines and contains semicolons and braces.
    const src = ':root {\n  /* semi; colon } brace */\n  --real: old;\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--real': 'new' });
    expect(changed).toEqual(['--real']);
    expect(updated).toContain('--real: new;');
    expect(updated).toContain('/* semi; colon } brace */');
  });
});

// ===========================================================================
// @theme block support (Tailwind v4) — #507
// ===========================================================================

// ---------------------------------------------------------------------------
// @theme basic happy-path — mirrors the :root basic suite
// ---------------------------------------------------------------------------

describe('@theme — basic replacement', () => {
  it('rewrites a matching declaration inside a @theme block', () => {
    const src = theme('  --foo: 10px;\n');
    const { updated, changed, unchanged, unknown } = applyTokenOverrides(src, {
      '--foo': '99px',
    });
    expect(updated).toBe(theme('  --foo: 99px;\n'));
    expect(changed).toEqual(['--foo']);
    expect(unchanged).toEqual([]);
    expect(unknown).toEqual([]);
  });

  it('accepts name without leading -- (@theme)', () => {
    const src = theme('  --bar: red;\n');
    const { updated, changed } = applyTokenOverrides(src, { bar: 'blue' });
    expect(updated).toContain('--bar: blue;');
    expect(changed).toEqual(['bar']);
  });

  it('reports unchanged when trimmed value already matches (@theme)', () => {
    const src = theme('  --x: 10px;\n');
    const { updated, changed, unchanged } = applyTokenOverrides(src, { '--x': '10px' });
    expect(updated).toBe(src);
    expect(changed).toEqual([]);
    expect(unchanged).toEqual(['--x']);
  });

  it('reports unknown when name is absent from the @theme block', () => {
    const src = theme('  --exists: 1;\n');
    const { unknown } = applyTokenOverrides(src, { '--missing': '2' });
    expect(unknown).toEqual(['--missing']);
  });

  it('preserves original whitespace between : and value (@theme)', () => {
    const src = theme('  --a:   old;\n');
    const { updated } = applyTokenOverrides(src, { '--a': 'new' });
    expect(updated).toBe(theme('  --a:   new;\n'));
  });
});

// ---------------------------------------------------------------------------
// @theme modifier support — bare + one/combined identifier modifier(s)
// ---------------------------------------------------------------------------

describe('@theme modifier support', () => {
  it('matches @theme inline { ... } (the mainstream Tailwind v4 shape)', () => {
    const src = '@theme inline {\n  --spacing-md: 0.5rem;\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--spacing-md': '0.75rem' });
    expect(changed).toEqual(['--spacing-md']);
    expect(updated).toBe('@theme inline {\n  --spacing-md: 0.75rem;\n}\n');
  });

  it('matches @theme static { ... }', () => {
    const src = '@theme static {\n  --a: 1;\n}\n';
    const { changed } = applyTokenOverrides(src, { '--a': '2' });
    expect(changed).toEqual(['--a']);
  });

  it('matches a combined modifier @theme inline reference { ... }', () => {
    const src = '@theme inline reference {\n  --a: 1;\n}\n';
    const { changed } = applyTokenOverrides(src, { '--a': '2' });
    expect(changed).toEqual(['--a']);
  });

  it('matches @theme with a comment between the keyword and the brace', () => {
    const src = '@theme /* opts */ inline {\n  --a: 1;\n}\n';
    const { changed } = applyTokenOverrides(src, { '--a': '2' });
    expect(changed).toEqual(['--a']);
  });

  it('matches @theme{ ... } with no space before the brace', () => {
    const src = '@theme{\n  --a: 1;\n}\n';
    const { changed } = applyTokenOverrides(src, { '--a': '2' });
    expect(changed).toEqual(['--a']);
  });
});

// ---------------------------------------------------------------------------
// grouped / suffix @theme-like non-matches stay unmatched
// ---------------------------------------------------------------------------

describe('grouped @theme-like non-matches stay unmatched', () => {
  it('does not match @theme, html { ... } (comma before the brace)', () => {
    const src = '@theme, html {\n  --x: 1;\n}\n';
    const { updated, changed, unknown } = applyTokenOverrides(src, { '--x': '2' });
    expect(changed).toEqual([]);
    expect(unknown).toEqual(['--x']);
    expect(updated).toBe(src);
  });

  it('does not match @themed { ... } (identifier suffix on the keyword)', () => {
    const src = '@themed {\n  --x: 1;\n}\n';
    const { changed, unknown } = applyTokenOverrides(src, { '--x': '2' });
    expect(changed).toEqual([]);
    expect(unknown).toEqual(['--x']);
  });

  it('does not match @theme.foo { ... } (non-identifier separator)', () => {
    const src = '@theme.foo {\n  --x: 1;\n}\n';
    const { changed, unknown } = applyTokenOverrides(src, { '--x': '2' });
    expect(changed).toEqual([]);
    expect(unknown).toEqual(['--x']);
  });
});

// ---------------------------------------------------------------------------
// @theme suffix-collision — mirrors the :root F25 suite
// ---------------------------------------------------------------------------

describe('@theme F25 suffix-collision — left boundary guard', () => {
  it('does NOT rewrite --x--foo when override targets --foo (@theme)', () => {
    const src = theme('  --x--foo: 10px;\n  --foo: 20px;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--foo': '99px' });
    expect(updated).toContain('--x--foo: 10px;');
    expect(updated).toContain('--foo: 99px;');
    expect(changed).toEqual(['--foo']);
  });
});

// ---------------------------------------------------------------------------
// @theme comment masking — mirrors the :root B4 suite
// ---------------------------------------------------------------------------

describe('@theme comment masking (B4 fix)', () => {
  it('does not rewrite a declaration inside a block comment (@theme)', () => {
    const src = theme('  /* --foo: commented; */\n  --foo: live;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--foo': 'new' });
    expect(updated).toContain('/* --foo: commented; */');
    expect(updated).toContain('--foo: new;');
    expect(changed).toEqual(['--foo']);
  });
});

// ---------------------------------------------------------------------------
// @theme nested under @media / @layer / @supports — intentionally skipped
// ---------------------------------------------------------------------------

describe('nested @theme skipped', () => {
  it('ignores @theme inside @media and rewrites the top-level one', () => {
    const src =
      '@theme {\n  --a: 1;\n}\n@media (max-width:600px) {\n  @theme {\n    --a: 2;\n  }\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--a': '9' });
    expect(changed).toEqual(['--a']);
    expect(updated).toContain('@media (max-width:600px) {\n  @theme {\n    --a: 2;\n  }\n}');
    expect(updated.indexOf('--a: 9;')).toBeGreaterThan(-1);
  });

  it('ignores @theme inside @layer', () => {
    const src = '@theme {\n  --b: old;\n}\n@layer base {\n  @theme {\n    --b: nested;\n  }\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--b': 'new' });
    expect(changed).toEqual(['--b']);
    expect(updated).toContain('@layer base {\n  @theme {\n    --b: nested;\n  }\n}');
  });

  it('ignores @theme inside @supports', () => {
    const src =
      '@theme {\n  --c: old;\n}\n@supports (display: grid) {\n  @theme {\n    --c: nested;\n  }\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--c': 'new' });
    expect(changed).toEqual(['--c']);
    expect(updated).toContain('@supports (display: grid) {\n  @theme {\n    --c: nested;\n  }\n}');
  });

  it('returns unknown when only a nested @theme exists and there is no top-level one', () => {
    const src = '@media screen {\n  @theme {\n    --a: 1;\n  }\n}\n';
    const { unknown } = applyTokenOverrides(src, { '--a': '2' });
    expect(unknown).toEqual(['--a']);
  });
});

// ---------------------------------------------------------------------------
// @theme first-occurrence-only + idempotency
// ---------------------------------------------------------------------------

describe('@theme first-occurrence-only', () => {
  it('rewrites only the first occurrence when the same cssVar appears twice', () => {
    const src = theme('  --dup: first;\n  --dup: second;\n');
    const { updated, changed } = applyTokenOverrides(src, { '--dup': 'new' });
    expect(updated).toBe(theme('  --dup: new;\n  --dup: second;\n'));
    expect(changed).toEqual(['--dup']);
  });
});

describe('@theme idempotency', () => {
  it('double-applying the same overrides on a @theme file is byte-identical', () => {
    const src = theme('  --a: old;\n  --b: also-old;\n');
    const first = applyTokenOverrides(src, { '--a': 'new', '--b': 'fresh' });
    const second = applyTokenOverrides(first.updated, { '--a': 'new', '--b': 'fresh' });
    expect(second.updated).toBe(first.updated);
    expect(second.changed).toEqual([]);
    expect(second.unchanged).toContain('--a');
    expect(second.unchanged).toContain('--b');
  });
});

// ---------------------------------------------------------------------------
// @theme-only file (no :root) — must not throw, must rewrite
// ---------------------------------------------------------------------------

describe('@theme-only file (no :root)', () => {
  it('rewrites without throwing via applyTokenOverridesOrThrow', () => {
    const src = theme('  --spacing-md: 0.5rem;\n');
    const result = applyTokenOverridesOrThrow(src, { '--spacing-md': '0.75rem' });
    expect(result.changed).toEqual(['--spacing-md']);
    expect(result.updated).toContain('--spacing-md: 0.75rem;');
  });

  it('hasApplicableTokenBlock (and its hasTopLevelRootBlock alias) is true for a @theme-only file', () => {
    const src = theme('  --x: 1;\n');
    expect(hasApplicableTokenBlock(src)).toBe(true);
    expect(hasTopLevelRootBlock(src)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mixed :root + @theme file — the #496 repro shape
// ---------------------------------------------------------------------------

describe('mixed :root + @theme file', () => {
  it('rewrites vars in BOTH the :root and @theme blocks (#496 repro)', () => {
    const src =
      ':root {\n  --palette-cool-700: oklch(0.21 0.03 264);\n}\n\n' +
      '@theme {\n  --spacing-md: 0.75rem;\n  --color-ink: black;\n}\n';
    const { updated, changed, unknown } = applyTokenOverrides(src, {
      '--palette-cool-700': 'oklch(0.30 0.03 264)',
      '--spacing-md': '1rem',
      '--color-ink': 'white',
    });
    expect(changed).toContain('--palette-cool-700');
    expect(changed).toContain('--spacing-md');
    expect(changed).toContain('--color-ink');
    expect(unknown).toEqual([]);
    expect(updated).toContain('--palette-cool-700: oklch(0.30 0.03 264);');
    expect(updated).toContain('--spacing-md: 1rem;');
    expect(updated).toContain('--color-ink: white;');
  });

  it('splices both regions correctly even when the :root edit changes length (splice-order proof)', () => {
    // :root is the EARLIER region; @theme is the LATER region. The :root value
    // grows a lot — if regions were spliced in ascending order the @theme
    // offsets would be stale and its edit would land in the wrong place. The
    // exact-output assertion proves the descending-order splice is correct.
    const src = ':root {\n  --a: 1;\n}\n@theme {\n  --b: 2;\n}\n';
    const { updated } = applyTokenOverrides(src, {
      '--a': 'this-is-a-much-longer-value',
      '--b': 'xyz',
    });
    expect(updated).toBe(
      ':root {\n  --a: this-is-a-much-longer-value;\n}\n@theme {\n  --b: xyz;\n}\n',
    );
  });

  it('splices correctly when @theme appears BEFORE :root', () => {
    const src = '@theme {\n  --b: 2;\n}\n:root {\n  --a: 1;\n}\n';
    const { updated } = applyTokenOverrides(src, {
      '--b': 'this-is-a-much-longer-value',
      '--a': 'xyz',
    });
    expect(updated).toBe(
      '@theme {\n  --b: this-is-a-much-longer-value;\n}\n:root {\n  --a: xyz;\n}\n',
    );
  });

  it('is idempotent on a mixed file — double-apply is byte-identical', () => {
    const src = ':root {\n  --a: 1;\n}\n\n@theme {\n  --b: 2;\n}\n';
    const first = applyTokenOverrides(src, { '--a': '10', '--b': '20' });
    const second = applyTokenOverrides(first.updated, { '--a': '10', '--b': '20' });
    expect(first.changed).toContain('--a');
    expect(first.changed).toContain('--b');
    expect(second.updated).toBe(first.updated);
    expect(second.changed).toEqual([]);
    expect(second.unchanged).toContain('--a');
    expect(second.unchanged).toContain('--b');
  });
});

// ---------------------------------------------------------------------------
// :root-first-match-wins — a var present in both blocks
// ---------------------------------------------------------------------------

describe(':root-first-match-wins', () => {
  it('rewrites a var present in BOTH blocks only in :root', () => {
    const src = ':root {\n  --dup: root-val;\n}\n@theme {\n  --dup: theme-val;\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--dup': 'new' });
    expect(changed).toEqual(['--dup']);
    expect(updated).toContain(':root {\n  --dup: new;\n}');
    // The @theme occurrence must be untouched.
    expect(updated).toContain('@theme {\n  --dup: theme-val;\n}');
  });

  it('a var already matching in :root is unchanged and NOT rewritten in @theme', () => {
    const src = ':root {\n  --dup: same;\n}\n@theme {\n  --dup: theme-val;\n}\n';
    const { updated, changed, unchanged } = applyTokenOverrides(src, { '--dup': 'same' });
    expect(changed).toEqual([]);
    expect(unchanged).toEqual(['--dup']);
    expect(updated).toBe(src);
  });

  it('falls back to @theme when the var is absent from :root', () => {
    const src = ':root {\n  --only-root: 1;\n}\n@theme {\n  --only-theme: 2;\n}\n';
    const { updated, changed } = applyTokenOverrides(src, { '--only-theme': '9' });
    expect(changed).toEqual(['--only-theme']);
    expect(updated).toContain('@theme {\n  --only-theme: 9;\n}');
  });
});

// ---------------------------------------------------------------------------
// Neither :root nor @theme block — routes to unknown / throws
// ---------------------------------------------------------------------------

describe('neither :root nor @theme block', () => {
  it('applyTokenOverrides routes all keys to unknown', () => {
    const src = '.some-class { --foo: red; }';
    const { updated, changed, unknown } = applyTokenOverrides(src, {
      '--foo': 'blue',
      '--bar': 'green',
    });
    expect(updated).toBe(src);
    expect(changed).toEqual([]);
    expect(unknown).toContain('--foo');
    expect(unknown).toContain('--bar');
  });

  it('applyTokenOverridesOrThrow throws NoTokenBlockError', () => {
    expect(() => applyTokenOverridesOrThrow('.c { --x: 1; }', { '--x': '2' })).toThrow(
      NoTokenBlockError,
    );
  });

  it('the NoRootBlockError alias still catches the throw', () => {
    expect(() => applyTokenOverridesOrThrow('.c { --x: 1; }', { '--x': '2' })).toThrow(
      NoRootBlockError,
    );
  });

  it('hasApplicableTokenBlock is false when neither block exists', () => {
    expect(hasApplicableTokenBlock('.not-root { color: red; }')).toBe(false);
  });
});
