/**
 * CSS isolation static invariants (Node test — no browser needed).
 *
 * Invariant H: zero raw z-index literals in panel CSS and TSX.
 *   - panel.css and color-picker.css must use var(--tokentweak-z-*) only
 *   - TSX files must not contain inline numeric z-index literals
 *
 * Invariant I: panel-tokens.css sizing values are px-only (no rem).
 *   Ensures host root font-size cannot warp panel geometry (F18).
 *
 * Invariant J: panel-tokens.css declares color-scheme: dark (F21).
 *
 * Invariant K: panel CSS declares the scoped box-sizing reset (F17).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');
const STYLES = path.join(SRC, 'styles');
const COLOR_PICKER_CSS = path.join(SRC, 'components/color-picker/color-picker.css');

// ---------------------------------------------------------------------------
// Invariant H — no raw z-index literals in panel CSS or TSX
// ---------------------------------------------------------------------------

describe('Invariant H — no raw z-index literals in panel CSS or TSX', () => {
  // Matches `z-index: <integer>` in CSS (not `var(...)` and not `auto`)
  const CSS_RAW_Z = /z-index\s*:\s*\d+/;

  it('panel.css has no raw z-index integer', () => {
    const css = fs.readFileSync(path.join(STYLES, 'panel.css'), 'utf8');
    // Strip comments before checking
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(CSS_RAW_Z);
  });

  it('color-picker.css has no raw z-index integer', () => {
    const css = fs.readFileSync(COLOR_PICKER_CSS, 'utf8');
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(CSS_RAW_Z);
  });

  // In TSX: matches a standalone `zIndex: <number>` (not inside a string,
  // not prefixed by Z. which is the allowed token reference)
  // We allow Z.<name> (the token constant) but not bare integers like zIndex: 70
  const TSX_RAW_Z = /zIndex\s*:\s*\d+/;

  function collectTsxSources(): string[] {
    const dirs = [
      path.join(SRC, 'tabs'),
      path.join(SRC, 'highlight'),
      path.join(SRC, 'element-path'),
      path.join(SRC, 'components/color-picker'),
    ];
    const sources: string[] = [];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (
          entry.isFile() &&
          (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
          !entry.name.includes('.test.')
        ) {
          sources.push(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
        }
      }
    }
    return sources;
  }

  it('no raw numeric zIndex literals in panel TSX files', () => {
    for (const src of collectTsxSources()) {
      // Strip string literals and comments to avoid false positives
      const stripped = src
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/'[^']*'/g, "''")
        .replace(/"[^"]*"/g, '""')
        .replace(/`[^`]*`/g, '``');
      expect(stripped).not.toMatch(TSX_RAW_Z);
    }
  });
});

// ---------------------------------------------------------------------------
// Invariant I — panel-tokens.css sizing values are px-only (no rem)
// ---------------------------------------------------------------------------

describe('Invariant I — panel-tokens.css sizing tokens are px-based (not rem)', () => {
  const panelTokens = fs.readFileSync(path.join(STYLES, 'panel-tokens.css'), 'utf8');

  function stripCssComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  it('--tokentweak-pad-* tokens use px, not rem', () => {
    // Match all --tokentweak-pad-* declarations and check their values
    const padRem = /--tokentweak-pad-[^:]+:\s*[\d.]+rem/;
    expect(stripCssComments(panelTokens)).not.toMatch(padRem);
  });

  it('--tokentweak-gap-* tokens use px, not rem', () => {
    const gapRem = /--tokentweak-gap-[^:]+:\s*[\d.]+rem/;
    expect(stripCssComments(panelTokens)).not.toMatch(gapRem);
  });

  it('--tokentweak-text-* tokens use px, not rem', () => {
    const textRem = /--tokentweak-text-[^:]+:\s*[\d.]+rem/;
    expect(stripCssComments(panelTokens)).not.toMatch(textRem);
  });

  it('--radius-tokentweak uses px, not rem', () => {
    expect(stripCssComments(panelTokens)).not.toMatch(/--radius-tokentweak\s*:\s*[\d.]+rem/);
  });
});

// ---------------------------------------------------------------------------
// Invariant J — color-scheme: dark declared in panel-tokens.css
// ---------------------------------------------------------------------------

describe('Invariant J — panel-tokens.css declares color-scheme: dark', () => {
  const panelTokens = fs.readFileSync(path.join(STYLES, 'panel-tokens.css'), 'utf8');

  it('declares color-scheme: dark', () => {
    expect(panelTokens).toMatch(/color-scheme\s*:\s*dark/);
  });
});

// ---------------------------------------------------------------------------
// Invariant K — panel.css declares the scoped box-sizing reset
// ---------------------------------------------------------------------------

describe('Invariant K — panel.css has scoped box-sizing: border-box reset', () => {
  const panelCss = fs.readFileSync(path.join(STYLES, 'panel.css'), 'utf8');

  it('declares box-sizing: border-box on panel root selectors', () => {
    expect(panelCss).toMatch(/box-sizing\s*:\s*border-box/);
  });

  it('includes tokenpanel-shell in the box-sizing scope', () => {
    // The box-sizing reset must cover .tokenpanel-shell
    const boxSizingBlock = panelCss.match(
      /(?::where\([^)]*tokenpanel-shell[^)]*\)|\.tokenpanel-shell)[^{]*\{[^}]*box-sizing\s*:\s*border-box/,
    );
    expect(boxSizingBlock).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Invariant L — z-index CSS custom properties declared in panel-tokens.css
// ---------------------------------------------------------------------------

describe('Invariant L — z-index tokens declared in panel-tokens.css', () => {
  const panelTokens = fs.readFileSync(path.join(STYLES, 'panel-tokens.css'), 'utf8');

  const expectedVars = [
    '--tokentweak-z-overlay',
    '--tokentweak-z-shell',
    '--tokentweak-z-settings-popover',
    '--tokentweak-z-color-picker',
    '--tokentweak-z-tooltip',
    '--tokentweak-z-inspector-box',
    '--tokentweak-z-toast',
  ];

  for (const varName of expectedVars) {
    it(`declares ${varName}`, () => {
      expect(panelTokens).toMatch(new RegExp(varName + '\\s*:'));
    });
  }
});
