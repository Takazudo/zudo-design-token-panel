/**
 * Panel structural invariants.
 *
 * Static analysis on the panel package's own source — no example manifests
 * are read from this test (those moved out of the monorepo in epic #202
 * Wave 2; the example-side invariants are exercised in each external
 * example repo's CI on a panel SHA bump).
 *
 * Invariants under test:
 *   D. The panel source (tabs/ + components/color-picker/) contains no
 *      `<h4`, `<details`, `<summary`, `<button`, or `<table` elements.
 *      Enforces the hostile-host policy in
 *      packages/zudo-design-token-panel/CLAUDE.md.
 *   F. The panel CSS sources do NOT read host `--color-*` or `--font-mono`
 *      — the panel ships a self-contained dark palette in panel-tokens.css
 *      and host theme changes must not bleed into the panel chrome.
 *
 * Historical Invariants A, B (no `group:` / `advancedTiers:` in example
 * manifests) are now enforced by TypeScript at panel-package compile time
 * (`TierItem.group` and `TabConfig.advancedTiers` were removed from the
 * source types in #148; any consumer trying to write those keys gets a
 * type error). Invariants C, E (zfb-tailwind Spacing tab tier count and
 * global.css cascade) were tied to example source files that moved to the
 * external `zudo-design-token-panel-example-zfb-tailwind` repo and are
 * exercised in that repo's CI.
 *
 * Browser-based cascade testing is deferred — see procedure in
 * packages/zudo-design-token-panel/CLAUDE.md.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// D. Panel source — no <h4, <details, <summary, <button, or <table elements
//    in tabs/ or components/color-picker/. The hostile-host policy in the
//    package CLAUDE.md forbids these tags anywhere the panel renders into
//    the host DOM.
// ---------------------------------------------------------------------------

describe('Invariant D — panel source has no blocked semantic elements', () => {
  const TABS_DIR = path.resolve(__dirname, '../tabs');
  const COLOR_PICKER_DIR = path.resolve(__dirname, '../components/color-picker');

  /**
   * Collect source files from a directory, excluding test files and __tests__ subdirs.
   * Filters .tsx / .ts files at the top level only — recursion is not needed since
   * the directories under test are flat (apart from __tests__).
   */
  function readPanelSources(dir: string): string[] {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(
        (e) =>
          e.isFile() &&
          (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) &&
          !e.name.startsWith('__'),
      )
      .map((e) => fs.readFileSync(path.join(dir, e.name), 'utf8'));
  }

  function findPanelSources(): string[] {
    return [...readPanelSources(TABS_DIR), ...readPanelSources(COLOR_PICKER_DIR)];
  }

  it('no <h4 element in any panel source', () => {
    for (const source of findPanelSources()) {
      expect(source).not.toMatch(/<h4[\s/>]/);
    }
  });

  it('no <details element in any panel source', () => {
    for (const source of findPanelSources()) {
      expect(source).not.toMatch(/<details[\s/>]/);
    }
  });

  it('no <summary element in any panel source', () => {
    for (const source of findPanelSources()) {
      expect(source).not.toMatch(/<summary[\s/>]/);
    }
  });

  it('no <button element in any panel source (hostile-host policy)', () => {
    for (const source of findPanelSources()) {
      expect(source).not.toMatch(/<button[\s/>]/);
    }
  });

  it('no <table element in any panel source (hostile-host policy)', () => {
    for (const source of findPanelSources()) {
      expect(source).not.toMatch(/<table[\s/>]/);
    }
  });
});

// ---------------------------------------------------------------------------
// F. Panel CSS sources do NOT read host --color-* / --font-mono
//
//    Rationale: the panel is a dev tool that ships inside a host page. If the
//    panel inherited the host's --color-* tokens, any host theme tweak —
//    including theme tweaks driven through this very panel in a demo — would
//    recolor the panel chrome along with the host surface. The contract
//    documented in PORTABLE-CONTRACT.md §7.4 and doc/reference/panel-css-tokens
//    pins this: panel-tokens.css and panel.css must use only the
//    --tokentweak-* private namespace.
// ---------------------------------------------------------------------------

describe('Invariant F — panel CSS does not read host theme vars', () => {
  const STYLES_DIR = path.resolve(__dirname, '../styles');
  const panelTokens = fs.readFileSync(path.join(STYLES_DIR, 'panel-tokens.css'), 'utf8');
  const panelChrome = fs.readFileSync(path.join(STYLES_DIR, 'panel.css'), 'utf8');

  function stripCssComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  it('panel-tokens.css contains no var(--color-*) read', () => {
    expect(stripCssComments(panelTokens)).not.toMatch(/var\(\s*--color-/);
  });

  it('panel-tokens.css contains no var(--font-mono) read', () => {
    expect(stripCssComments(panelTokens)).not.toMatch(/var\(\s*--font-mono/);
  });

  it('panel.css contains no var(--color-*) read', () => {
    expect(stripCssComments(panelChrome)).not.toMatch(/var\(\s*--color-/);
  });

  it('panel.css contains no var(--font-mono) read', () => {
    expect(stripCssComments(panelChrome)).not.toMatch(/var\(\s*--font-mono/);
  });

  it('panel-tokens.css declares the baked-in dark --tokentweak-color-bg', () => {
    expect(panelTokens).toMatch(/--tokentweak-color-bg\s*:\s*#181818/);
  });

  it('panel-tokens.css declares the baked-in dark --tokentweak-color-fg', () => {
    expect(panelTokens).toMatch(/--tokentweak-color-fg\s*:\s*#b8b8b8/);
  });
});
