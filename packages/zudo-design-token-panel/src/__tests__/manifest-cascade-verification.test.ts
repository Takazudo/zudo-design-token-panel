/**
 * Cross-example manifest cascade verification.
 *
 * Validates that the post-#147/#148/#153 panel-hardening changes cascade
 * correctly across all five example apps by performing static analysis on each
 * example's default-manifest.ts source file.
 *
 * Why text-based analysis instead of dynamic import?
 * The example manifests import from '@takazudo/zudo-design-token-panel/astro' (or
 * the package root), which resolves via the package's own exports map → ./dist/...
 * Importing example manifests from inside the package's own vitest would create a
 * circular self-reference through the dist artifact, making the test fragile and
 * build-order-dependent. Text-level analysis is both more robust and sufficient
 * for the structural invariants we need to verify.
 *
 * Invariants under test:
 *   A. No manifest contains a `group:` object-key (TierItem.group was removed in #148).
 *   B. No manifest contains an `advancedTiers:` object-key (TabConfig.advancedTiers was removed in #148).
 *   C. The zfb-tailwind Spacing tab declares exactly 2 tiers: hsp-scale, vsp-scale (#161 removed spacing-scale).
 *   D. The panel source (tabs/) contains no <h4 or <details elements.
 *
 * Cascade test note:
 *   The zfb-tailwind global.css re-exports --zfbtw-hsp-*, --zfbtw-vsp-* as Tailwind theme
 *   tokens (--spacing-hsp-*, --spacing-vsp-*). The --zfbtw-spacing-* raw tier and its
 *   --spacing-spacing-* re-exports were removed in #161. This is asserted below by confirming
 *   global.css references all 12 remaining hsp/vsp CSS variables.
 *
 * Browser-based cascade testing is deferred — see procedure in packages/zudo-design-token-panel/CLAUDE.md.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

// Resolves to the worktree root: __tests__ -> src -> zudo-design-token-panel -> packages -> worktree-root
const REPO_ROOT = path.resolve(__dirname, '../../../..');

function exampleManifestPath(example: string): string {
  // zfb and zfb-tailwind keep their config at the package root level.
  // next, vite-react, and astro keep their config under src/.
  const flat = path.join(REPO_ROOT, 'examples', example, 'config', 'default-manifest.ts');
  const nested = path.join(REPO_ROOT, 'examples', example, 'src', 'config', 'default-manifest.ts');
  return fs.existsSync(flat) ? flat : nested;
}

function readManifest(example: string): string {
  const p = exampleManifestPath(example);
  return fs.readFileSync(p, 'utf8');
}

/**
 * Strip TypeScript block comments (/* ... *\/) and line comments (// ...)
 * before applying structural regex assertions. Prevents docblock mentions
 * like "group: ..." from triggering false positives.
 */
function stripComments(source: string): string {
  // Block comments first, then line comments.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const ALL_EXAMPLES = ['zfb', 'zfb-tailwind', 'next', 'vite-react', 'astro'];

// ---------------------------------------------------------------------------
// A. No `group:` object-key in any manifest (TierItem.group removed in #148)
// ---------------------------------------------------------------------------

describe('Invariant A — no group: field in any manifest', () => {
  for (const example of ALL_EXAMPLES) {
    it(`${example}: no group: object key in manifest source`, () => {
      const stripped = stripComments(readManifest(example));
      // Match `group:` as an object-literal key (not a substring of another identifier like `groupId:`).
      // Negative lookahead prevents false positives on `groupId:`, `groupName:`, etc.
      expect(stripped).not.toMatch(/\bgroup\s*:/);
    });
  }
});

// ---------------------------------------------------------------------------
// B. No `advancedTiers:` object-key in any manifest (TabConfig.advancedTiers removed in #148)
// ---------------------------------------------------------------------------

describe('Invariant B — no advancedTiers: field in any manifest', () => {
  for (const example of ALL_EXAMPLES) {
    it(`${example}: no advancedTiers: object key in manifest source`, () => {
      const stripped = stripComments(readManifest(example));
      expect(stripped).not.toMatch(/\badvancedTiers\s*:/);
    });
  }
});

// ---------------------------------------------------------------------------
// C. zfb-tailwind Spacing tab has exactly 2 tiers: hsp-scale, vsp-scale
//    (per #161 — spacing-scale tier removed)
// ---------------------------------------------------------------------------

describe('Invariant C — zfb-tailwind Spacing tab has 2 tiers', () => {
  const source = readManifest('zfb-tailwind');

  it('does NOT contain spacing-scale tier id (removed in #161)', () => {
    expect(source).not.toContain("id: 'spacing-scale'");
  });

  it('contains hsp-scale tier id', () => {
    expect(source).toContain("id: 'hsp-scale'");
  });

  it('contains vsp-scale tier id', () => {
    expect(source).toContain("id: 'vsp-scale'");
  });

  it('hsp-scale has 5 items (xs..xl)', () => {
    const matches = source.match(/cssVar:\s*'--zfbtw-hsp-/g) ?? [];
    expect(matches.length).toBe(5);
  });

  it('vsp-scale has 7 items (2xs..2xl)', () => {
    const matches = source.match(/cssVar:\s*'--zfbtw-vsp-/g) ?? [];
    expect(matches.length).toBe(7);
  });

  it('total spacing tier items is 12', () => {
    const hsp = source.match(/cssVar:\s*'--zfbtw-hsp-/g)?.length ?? 0;
    const vsp = source.match(/cssVar:\s*'--zfbtw-vsp-/g)?.length ?? 0;
    expect(hsp + vsp).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// D. Panel source — no <h4 or <details elements in tabs/
// ---------------------------------------------------------------------------

describe('Invariant D — panel tabs source has no blocked semantic elements', () => {
  const TABS_DIR = path.resolve(__dirname, '../tabs');

  function findTabSources(): string[] {
    return fs
      .readdirSync(TABS_DIR)
      .filter((f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.startsWith('__'))
      .map((f) => fs.readFileSync(path.join(TABS_DIR, f), 'utf8'));
  }

  it('no <h4 element in any tab source', () => {
    for (const source of findTabSources()) {
      expect(source).not.toMatch(/<h4[\s/>]/);
    }
  });

  it('no <details element in any tab source', () => {
    for (const source of findTabSources()) {
      expect(source).not.toMatch(/<details[\s/>]/);
    }
  });

  it('no <summary element in any tab source', () => {
    for (const source of findTabSources()) {
      expect(source).not.toMatch(/<summary[\s/>]/);
    }
  });
});

// ---------------------------------------------------------------------------
// E. zfb-tailwind cascade — global.css still re-exports all hsp/vsp variables
//    (confirms #161 spacing-scale removal did not disrupt the hsp/vsp consumer chain)
// ---------------------------------------------------------------------------

describe('Invariant E — zfb-tailwind global.css cascade is intact', () => {
  const globalCss = fs.readFileSync(
    path.join(REPO_ROOT, 'examples', 'zfb-tailwind', 'styles', 'global.css'),
    'utf8',
  );

  // --zfbtw-spacing-* raw vars were removed in #161 — confirm they are gone.
  it('does NOT declare --zfbtw-spacing-xs (removed in #161)', () => {
    expect(globalCss).not.toContain('--zfbtw-spacing-xs');
  });
  it('does NOT re-export --spacing-spacing-xs (removed in #161)', () => {
    expect(globalCss).not.toContain('--spacing-spacing-xs');
  });

  const hspVars = ['--zfbtw-hsp-xs', '--zfbtw-hsp-sm', '--zfbtw-hsp-md', '--zfbtw-hsp-lg', '--zfbtw-hsp-xl'];
  for (const v of hspVars) {
    it(`declares ${v}`, () => {
      expect(globalCss).toContain(v);
    });
  }

  const vspVars = [
    '--zfbtw-vsp-2xs', '--zfbtw-vsp-xs', '--zfbtw-vsp-sm', '--zfbtw-vsp-md',
    '--zfbtw-vsp-lg', '--zfbtw-vsp-xl', '--zfbtw-vsp-2xl',
  ];
  for (const v of vspVars) {
    it(`declares ${v}`, () => {
      expect(globalCss).toContain(v);
    });
  }

  // Tailwind consumer bridge (--spacing-* re-exports) should be intact.
  it('re-exports --spacing-hsp-md: var(--zfbtw-hsp-md)', () => {
    expect(globalCss).toContain('--spacing-hsp-md');
    expect(globalCss).toContain('var(--zfbtw-hsp-md)');
  });

  it('re-exports --spacing-vsp-md: var(--zfbtw-vsp-md)', () => {
    expect(globalCss).toContain('--spacing-vsp-md');
    expect(globalCss).toContain('var(--zfbtw-vsp-md)');
  });
});
