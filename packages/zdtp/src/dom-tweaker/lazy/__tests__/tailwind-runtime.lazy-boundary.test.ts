import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const srcRoot = path.join(packageRoot, 'src');
const distRoot = path.join(packageRoot, 'dist');
const distCss = path.join(distRoot, 'zdtp.css');
const lazyBoundarySegment = `${path.sep}dom-tweaker${path.sep}lazy${path.sep}`;
const forbiddenDependencyPattern = /@tailwindcss\/browser|tailwind-merge/;

describe('DOM Tweaker Tailwind runtime lazy boundary', () => {
  it('keeps Tailwind runtime dependencies out of eager source modules', () => {
    const offenders = walk(srcRoot)
      .filter((file) => isSourceFile(file))
      .filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`))
      .filter((file) => !file.includes(lazyBoundarySegment))
      .filter((file) => forbiddenDependencyPattern.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(srcRoot, file));

    expect(offenders).toEqual([]);
  });

  it('keeps Tailwind runtime dependency identifiers out of built eager chunks', () => {
    if (!existsSync(distRoot)) {
      return;
    }

    const eagerFiles = collectEagerDistFiles();
    const offenders = eagerFiles
      .filter((file) => forbiddenDependencyPattern.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(distRoot, file));

    expect(offenders).toEqual([]);
  });

  it('keeps DOM Tweaker lazy selectors out of the eager dist stylesheet', () => {
    if (!existsSync(distRoot)) {
      return;
    }

    expect(existsSync(distCss), 'run the package build before the dist boundary proof').toBe(true);
    expect(readFileSync(distCss, 'utf8')).not.toMatch(/tokenpanel-domtweaker/);
  });
});

function isSourceFile(file: string): boolean {
  return (
    (file.endsWith('.ts') || file.endsWith('.tsx')) &&
    !file.endsWith('.test.ts') &&
    !file.endsWith('.test.tsx') &&
    !file.endsWith('.d.ts')
  );
}

function walk(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

function collectEagerDistFiles(): string[] {
  const entries = [
    'index.js',
    'astro/index.js',
    'astro/host-adapter.js',
    'server/index.js',
    'bin/server.js',
    'testing.js',
  ];
  const seen = new Set<string>();
  const queue = entries.map((entry) => path.join(distRoot, entry)).filter((file) => existsSync(file));

  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);

    for (const relImport of staticRelativeJsImports(readFileSync(file, 'utf8'))) {
      const resolved = path.resolve(path.dirname(file), relImport);
      if (resolved.startsWith(distRoot) && existsSync(resolved) && statSync(resolved).isFile()) {
        queue.push(resolved);
      }
    }
  }

  return Array.from(seen).sort();
}

function staticRelativeJsImports(source: string): string[] {
  const imports: string[] = [];
  const importPattern =
    /(?:^|[;\n])\s*(?:import|export)\s*(?:[^'"]*?\s*from\s*)?["'](\.{1,2}\/[^'"]+\.js)["']/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(source)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}
