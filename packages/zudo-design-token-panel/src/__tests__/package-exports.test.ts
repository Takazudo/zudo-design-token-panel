import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Package-exports pin test.
 *
 * Mechanical pin so an accidental edit to the exports map (or a build
 * refactor that renames a dist artifact) fails fast in unit-test land.
 *
 * The `dist/`-existence assertions only fire when the dist directory
 * actually exists — i.e. after a `pnpm build` run. CI runs build before
 * tests; local quick `pnpm test` runs without a fresh build skip the
 * existence check rather than fail.
 */

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const packageJsonPath = `${packageRoot}/package.json`;

interface ExportConditional {
  types?: string;
  import?: string;
}

interface PackageJsonShape {
  name?: string;
  exports?: Record<string, string | ExportConditional>;
}

function readPackageJson(): PackageJsonShape {
  const raw = readFileSync(packageJsonPath, 'utf8');
  return JSON.parse(raw) as PackageJsonShape;
}

describe('package.json — name and exports map shape', () => {
  it('package name is @takazudo/zudo-design-token-panel', () => {
    const pkg = readPackageJson();
    expect(pkg.name).toBe('@takazudo/zudo-design-token-panel');
  });

  it('exports map declares the documented entry points', () => {
    const pkg = readPackageJson();
    expect(pkg.exports).toBeDefined();
    const exportsMap = pkg.exports!;
    expect(exportsMap['.']).toBeDefined();
    expect(exportsMap['./astro']).toBeDefined();
    expect(exportsMap['./astro/host-adapter']).toBeDefined();
    expect(exportsMap['./astro/DesignTokenPanelHost.astro']).toBeDefined();
    expect(exportsMap['./styles']).toBeDefined();
    expect(exportsMap['./styles.css']).toBeDefined();
  });
});

describe('package.json exports — ./astro/host-adapter sub-export', () => {
  it('declares the ./astro/host-adapter entry in the exports map', () => {
    const pkg = readPackageJson();
    expect(
      pkg.exports?.['./astro/host-adapter'],
      'exports["./astro/host-adapter"] must be present so consumers can import the host-adapter side-effect chunk',
    ).toBeDefined();
  });

  it('points the import target at ./dist/astro/host-adapter.js', () => {
    const pkg = readPackageJson();
    const entry = pkg.exports?.['./astro/host-adapter'];
    expect(entry, 'exports["./astro/host-adapter"] must be a conditional object').toBeTypeOf(
      'object',
    );
    if (typeof entry === 'object' && entry !== null) {
      expect(entry.import).toBe('./dist/astro/host-adapter.js');
      // Skip existence assertion when dist/ has not been built yet.
      const resolvedJs = `${packageRoot}/dist/astro/host-adapter.js`;
      const distExists = existsSync(`${packageRoot}/dist`);
      if (distExists) {
        expect(
          existsSync(resolvedJs),
          `${resolvedJs} must exist on disk — run pnpm --filter @takazudo/zudo-design-token-panel build first`,
        ).toBe(true);
      }
    }
  });

  it('points the types target at ./dist/astro/host-adapter.d.ts', () => {
    const pkg = readPackageJson();
    const entry = pkg.exports?.['./astro/host-adapter'];
    if (typeof entry === 'object' && entry !== null) {
      expect(entry.types).toBe('./dist/astro/host-adapter.d.ts');
      const resolvedDts = `${packageRoot}/dist/astro/host-adapter.d.ts`;
      const distExists = existsSync(`${packageRoot}/dist`);
      if (distExists) {
        expect(
          existsSync(resolvedDts),
          `${resolvedDts} must exist on disk — run the package build to refresh tsc output`,
        ).toBe(true);
      }
    }
  });
});
