/**
 * Panel structural invariants.
 *
 * Static analysis on the panel package's own source — no example manifests
 * are read from this test (those moved out of the monorepo in epic #202
 * Wave 2; the example-side invariants are exercised in each external
 * example repo's CI on a panel SHA bump).
 *
 * Invariants under test:
 *   D. All panel TSX source files (panel.tsx, apply/export/import modals,
 *      tabs/, components/, controls/, element-path/, highlight/) contain no
 *      blocked semantic elements from the full list in packages/zdtp/CLAUDE.md
 *      (h1–h6, p, blockquote, pre, code, em, strong, address, ul, ol, li,
 *      table, thead, tbody, tr, th, td, a, article, aside, main, nav, header,
 *      footer, section, figure, figcaption, hr, details, summary, button).
 *      Enforces the hostile-host policy in packages/zdtp/CLAUDE.md.
 *   F. The panel CSS sources do NOT read host `--color-*` or `--font-mono`
 *      — the panel ships a self-contained dark palette in panel-tokens.css
 *      and host theme changes must not bleed into the panel chrome.
 *   G. The panel's two CSS delivery paths (the `dist/zdtp.css` / `./styles`
 *      export and the self-injected `<style>` string) cannot diverge: all
 *      eager component CSS flows through a single `panel.css` `@import`
 *      aggregate. DOM Tweaker's explicitly lazy stylesheet is delivered by
 *      its lazy JS boundary instead (guards #413 and #537).
 *   H. The ramp-native Tier-2 color editor's example manifest
 *      (`_example-ramp-native-tier2.ts`, #459/#475) is a real, valid
 *      `PanelConfig` — `semantic: true`, `referencesRamps`, and every
 *      `SemanticValue` variant (index-free `{ ref }`, `{ literal }`, and a
 *      runtime-built `{ literal: { light, dark } }`) resolve and emit
 *      correctly through `configurePanel` / `resolveColorClusterFromTab` /
 *      `buildApplyOverrides`. The new grouped ref-or-literal picker and
 *      per-mode editor components (`controls/tier-ref-selector.tsx`,
 *      `tabs/color-tab.tsx`) are already covered by Invariant D above (it
 *      walks all of `src/**\/*.tsx`, not just the historical `tabs/` +
 *      `components/color-picker/` set) — no separate DOM-hygiene invariant
 *      is needed here.
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
 * packages/zdtp/CLAUDE.md. For the ramp-native Tier-2 editor specifically,
 * the actual visual cascade (grouped `<optgroup>` picker rendering, the
 * "Per-mode" checkbox expanding into two swatches, `light-dark()` resolving
 * against a real browser's `color-scheme`) can only be confirmed once the
 * five external example repos and zudo-doc pick up this change via a panel
 * SHA bump — that verification pass happens in those repos' own CI /
 * `/verify-ui`, not here.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetPanelConfigForTests,
  assertValidPanelConfig,
  configurePanel,
} from '../config/panel-config';
import { resolveColorClusterFromTab } from '../config/cluster-config';
import { buildApplyOverrides } from '../apply/build-apply-overrides';
import { getActivePrimaryCluster, initColorFromScheme, type ColorTweakState, type TweakState } from '../state/tweak-state';
import {
  EXAMPLE_COLOR_TAB,
  EXAMPLE_DANGER_DARK,
  EXAMPLE_DANGER_LIGHT,
  EXAMPLE_PALETTE_TAB,
  EXAMPLE_PANEL_CONFIG,
  EXAMPLE_TABS,
} from './_example-ramp-native-tier2';

// ---------------------------------------------------------------------------
// D. Panel source — no blocked semantic elements across ALL panel TSX files
//    (panel.tsx, apply/export/import modals, tabs/, components/, controls/,
//    element-path/, highlight/). The hostile-host policy in packages/zdtp/CLAUDE.md
//    forbids these tags anywhere the panel renders into the host DOM.
//
//    The previous implementation only walked tabs/ + components/color-picker/;
//    the known regression site (export/apply modals with <pre>) was unscanned.
//    This version walks all of src/**/*.tsx except __tests__/, astro/, server/,
//    bin/ and strips TSX comments before grepping so comment-only occurrences
//    do not produce false positives.
// ---------------------------------------------------------------------------

describe('Invariant D — panel source has no blocked semantic elements', () => {
  const SRC_DIR = path.resolve(__dirname, '..');
  /** Directories that do NOT render into the host DOM (exclude from scan). */
  const SKIP_DIRS = new Set(['__tests__', 'astro', 'server', 'bin']);

  /** Strip single-line and block comments so comment-only occurrences are not flagged. */
  function stripTsxComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments (incl. JSDoc + JSX {/* */})
      .replace(/\/\/.*$/gm, '');         // single-line comments
  }

  /** Recursively collect all .tsx source files under `dir`, skipping SKIP_DIRS and test files. */
  function findPanelSources(): Array<{ file: string; content: string }> {
    const results: Array<{ file: string; content: string }> = [];

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          walk(path.join(dir, entry.name));
        } else if (
          entry.isFile() &&
          entry.name.endsWith('.tsx') &&
          !entry.name.includes('.test.')
        ) {
          const fullPath = path.join(dir, entry.name);
          results.push({
            file: path.relative(SRC_DIR, fullPath),
            content: stripTsxComments(fs.readFileSync(fullPath, 'utf8')),
          });
        }
      }
    }

    walk(SRC_DIR);
    return results;
  }

  // Full blocked-element list from packages/zdtp/CLAUDE.md § "Blocked elements".
  // These tags are subject to aggressive global resets in host CSS and must
  // never appear in panel markup. The loop below generates one it() per tag,
  // mirroring the BANNED_TAGS pattern in palette-tab.browser.test.tsx.
  const BLOCKED_TAGS = [
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Text / prose
    'p', 'blockquote', 'pre', 'code', 'em', 'strong', 'address',
    // Lists
    'ul', 'ol', 'li',
    // Tabular
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Links
    'a',
    // Sectioning
    'article', 'aside', 'main', 'nav', 'header', 'footer', 'section', 'figure', 'figcaption',
    // Misc
    'hr', 'details', 'summary',
    // Interactive — Chrome-button policy: use div[role="button"] instead
    'button',
  ] as const;

  for (const tag of BLOCKED_TAGS) {
    it(`no <${tag} element in any panel source`, () => {
      const sources = findPanelSources();
      for (const { file, content } of sources) {
        expect(content, `Found <${tag} in ${file}`).not.toMatch(
          new RegExp(`<${tag}[\\s/>]`),
        );
      }
    });
  }
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

// ---------------------------------------------------------------------------
// G. The two CSS delivery paths cannot diverge.
//
//    The package ships its CSS two ways from ONE source (src/index.tsx):
//      - `import './styles/panel.css'`        → aggregated into dist/zdtp.css
//                                                (the `./styles` export)
//      - `import css from './styles/panel.css?inline'` → the string the panel
//                                                self-injects as a <style> at
//                                                runtime (the lazy, no-import
//                                                delivery path since #219)
//    Both read the SAME panel.css, so a rule is in both paths IFF it is part of
//    panel.css's `@import` graph. A component that side-effect-imports its own
//    `.css` (e.g. `import './foo.css'` in foo.tsx) lands ONLY in dist/zdtp.css
//    — Vite aggregates side-effect CSS into the emitted stylesheet but does NOT
//    add it to the `?inline` string of panel.css. That is exactly the #413 bug:
//    palette-edit-view.css / palette-chart.css rendered for `./styles` consumers
//    but were missing from the self-injected stylesheet.
//
//    DOM Tweaker is the deliberate lazy exception: style-injection.ts imports
//    dom-tweaker.css?inline from inside the lazy boundary, and dist/zdtp.css
//    must not contain those selectors. Two static guards keep the eager paths
//    in sync while preserving that boundary:
//      G1 — no source file except index.tsx and the named lazy injector may
//           import a `.css` (side-effect or `?inline`).
//      G2 — panel.css must `@import` every eager `.css` file under src/.
// ---------------------------------------------------------------------------

describe('Invariant G — CSS self-inject and ./styles paths stay in sync', () => {
  const SRC_DIR = path.resolve(__dirname, '..');
  const STYLES_DIR = path.resolve(SRC_DIR, 'styles');
  const PANEL_CSS = path.join(STYLES_DIR, 'panel.css');
  const DOM_TWEAKER_LAZY_CSS = path.join(
    SRC_DIR,
    'dom-tweaker',
    'lazy',
    'dom-tweaker.css',
  );
  const ALLOWED_CSS_IMPORTERS = new Set([
    'index.tsx',
    path.join('dom-tweaker', 'lazy', 'style-injection.ts'),
  ]);

  /** Recursively collect files under `dir` matching `pred`, skipping __tests__. */
  function walk(dir: string, pred: (name: string) => boolean): string[] {
    const out: string[] = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === '__tests__') continue;
        out.push(...walk(path.join(dir, e.name), pred));
      } else if (e.isFile() && pred(e.name)) {
        out.push(path.join(dir, e.name));
      }
    }
    return out;
  }

  const isSource = (name: string) =>
    (name.endsWith('.ts') || name.endsWith('.tsx')) &&
    !name.endsWith('.test.ts') &&
    !name.endsWith('.test.tsx') &&
    !name.endsWith('.d.ts');

  // Matches JS imports, but not Tailwind input strings such as
  // `@import "tailwindcss/theme.css"`.
  const CSS_IMPORT =
    /(?:^|\n)\s*import(?:\s*\(\s*|\s+(?:[^'"\n]*\s+from\s+)?)["'][^"']+\.css(?:\?[^"']*)?["']/;

  it('allows CSS imports only from the eager entry and named lazy injector', () => {
    const offenders = walk(SRC_DIR, isSource)
      .filter((file) => CSS_IMPORT.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_DIR, file))
      .filter((rel) => !ALLOWED_CSS_IMPORTERS.has(rel));
    expect(offenders).toEqual([]);
  });

  it('panel.css @imports every eager .css file under src/ (complete aggregate)', () => {
    const panelCss = fs.readFileSync(PANEL_CSS, 'utf8');
    const importTargets = [...panelCss.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((m) =>
      path.resolve(STYLES_DIR, m[1]),
    );
    const everyOtherCss = walk(SRC_DIR, (name) => name.endsWith('.css')).filter(
      (file) => file !== PANEL_CSS && file !== DOM_TWEAKER_LAZY_CSS,
    );
    const missing = everyOtherCss
      .filter((file) => !importTargets.includes(file))
      .map((file) => path.relative(SRC_DIR, file));
    expect(missing).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// H. Ramp-native Tier-2 example manifest (semantic + referencesRamps +
//    every SemanticValue shape, #459/#475). See `_example-ramp-native-tier2.ts`
//    for the fixture and its doc-page cross-reference.
// ---------------------------------------------------------------------------

describe('Invariant H — ramp-native Tier-2 example manifest is valid and exercises the new tier-model fields', () => {
  afterEach(() => {
    __resetPanelConfigForTests();
  });

  it('assertValidPanelConfig accepts the example manifest (host-adapter trust boundary)', () => {
    expect(() => assertValidPanelConfig(EXAMPLE_PANEL_CONFIG)).not.toThrow();
  });

  it('configurePanel accepts the example manifest', () => {
    __resetPanelConfigForTests();
    expect(() => configurePanel(EXAMPLE_PANEL_CONFIG)).not.toThrow();
  });

  it('resolveColorClusterFromTab resolves the bare-id ref ("surface": "base-2") against the FIRST declared ramp source', () => {
    const cluster = resolveColorClusterFromTab(EXAMPLE_COLOR_TAB, EXAMPLE_TABS)!;
    expect(cluster).toBeDefined();
    expect(cluster.semanticDefaults['surface']).toEqual({
      ref: { tab: 'palette', tier: 'base', item: 'base-2' },
    });
  });

  it('resolveColorClusterFromTab resolves the "tierId:itemId" ref ("brand": "accent:accent-1") against the NAMED ramp source', () => {
    const cluster = resolveColorClusterFromTab(EXAMPLE_COLOR_TAB, EXAMPLE_TABS)!;
    expect(cluster.semanticDefaults['brand']).toEqual({
      ref: { tab: 'palette', tier: 'accent', item: 'accent-1' },
    });
  });

  it('resolveColorClusterFromTab resolves the standalone literal ("info") to a { literal } SemanticValue', () => {
    const cluster = resolveColorClusterFromTab(EXAMPLE_COLOR_TAB, EXAMPLE_TABS)!;
    expect(cluster.semanticDefaults['info']).toEqual({ literal: 'oklch(0.6 0.1 230)' });
  });

  it('resolveColorClusterFromTab resolves the manifest-default literal ("danger") to a single-mode { literal }', () => {
    const cluster = resolveColorClusterFromTab(EXAMPLE_COLOR_TAB, EXAMPLE_TABS)!;
    expect(cluster.semanticDefaults['danger']).toEqual({ literal: EXAMPLE_DANGER_LIGHT });
  });

  it('paletteSize is 0 — the lone semantic:true tier has no palette tier of its own', () => {
    const cluster = resolveColorClusterFromTab(EXAMPLE_COLOR_TAB, EXAMPLE_TABS)!;
    expect(cluster.paletteSize).toBe(0);
  });

  it('buildApplyOverrides emits var(...) for both ref rows and the literal verbatim for "info"', () => {
    __resetPanelConfigForTests();
    configurePanel(EXAMPLE_PANEL_CONFIG);
    const cluster = getActivePrimaryCluster();
    const colorState = initColorFromScheme(cluster);
    const fullState: TweakState = { color: colorState, spacing: {}, typography: {}, size: {} };

    const out = buildApplyOverrides(fullState, undefined, cluster, EXAMPLE_TABS);

    expect(out['--zd-surface']).toBe('var(--palette-base-2)');
    expect(out['--zd-brand']).toBe('var(--palette-accent-1)');
    expect(out['--zd-info']).toBe('oklch(0.6 0.1 230)');
  });

  it('buildApplyOverrides emits light-dark(<light>, <dark>) once "danger" carries a runtime per-mode literal override', () => {
    // TierItem.default is always a plain string, so the { literal: { light,
    // dark } } shape never appears as a manifest default (see the fixture's
    // file header) — it is layered on top of the manifest-seeded state here,
    // exactly as the panel's own "Per-mode" editor checkbox would produce it.
    __resetPanelConfigForTests();
    configurePanel(EXAMPLE_PANEL_CONFIG);
    const cluster = getActivePrimaryCluster();
    const baseState = initColorFromScheme(cluster);
    const perModeState: ColorTweakState = {
      ...baseState,
      semanticMappings: {
        ...baseState.semanticMappings,
        danger: { literal: { light: EXAMPLE_DANGER_LIGHT, dark: EXAMPLE_DANGER_DARK } },
      },
    };
    const fullState: TweakState = { color: perModeState, spacing: {}, typography: {}, size: {} };

    const out = buildApplyOverrides(fullState, undefined, cluster, EXAMPLE_TABS);

    expect(out['--zd-danger']).toBe(`light-dark(${EXAMPLE_DANGER_LIGHT}, ${EXAMPLE_DANGER_DARK})`);
    // Sibling rows are unaffected by the per-mode override on "danger".
    expect(out['--zd-surface']).toBe('var(--palette-base-2)');
    expect(out['--zd-brand']).toBe('var(--palette-accent-1)');
  });

  it('EXAMPLE_PALETTE_TAB carries no palette-tier defaults that collide with EXAMPLE_COLOR_TAB\'s cssVars (sanity)', () => {
    const paletteVars = new Set(
      EXAMPLE_PALETTE_TAB.tiers.flatMap((t) => t.items.map((i) => i.cssVar)),
    );
    const colorVars = EXAMPLE_COLOR_TAB.tiers.flatMap((t) => t.items.map((i) => i.cssVar));
    for (const v of colorVars) {
      expect(paletteVars.has(v)).toBe(false);
    }
  });
});
