import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';

const constantsSource = fileURLToPath(new URL('./src/constants.ts', import.meta.url));

function normalizeModuleId(id: string): string {
  return id.split('?')[0];
}

/**
 * Keep the public constants entry a true leaf. Rollup's `chunk.modules` is
 * the source-of-truth here: checking output filenames alone would miss panel
 * code moved into a shared chunk with an unrelated name.
 */
function assertConstantsEntryIsolation(): Plugin {
  return {
    name: 'zdtp-constants-entry-isolation',
    apply: 'build' as const,
    moduleParsed(moduleInfo: { id: string; importedIds: readonly string[] }) {
      if (
        normalizeModuleId(moduleInfo.id) === constantsSource &&
        moduleInfo.importedIds.length > 0
      ) {
        this.error(
          `src/constants.ts must remain import-free; found: ${moduleInfo.importedIds.join(', ')}`,
        );
      }
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(
        (output): output is Extract<(typeof bundle)[string], { type: 'chunk' }> =>
          output.type === 'chunk',
      );
      const entry = chunks.find((chunk) => chunk.isEntry && chunk.name === 'constants');
      if (!entry) {
        this.error('Could not find the constants entry chunk during the package build.');
        return;
      }

      const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
      const reachableModules = new Set<string>();
      const visitedChunks = new Set<string>();
      const pending = [entry];
      while (pending.length > 0) {
        const chunk = pending.pop();
        if (!chunk || visitedChunks.has(chunk.fileName)) continue;
        visitedChunks.add(chunk.fileName);
        for (const moduleId of Object.keys(chunk.modules)) {
          reachableModules.add(normalizeModuleId(moduleId));
        }
        for (const importedFile of [...chunk.imports, ...chunk.dynamicImports]) {
          const importedChunk = byFileName.get(importedFile);
          if (importedChunk) pending.push(importedChunk);
        }
      }

      const unexpectedModules = [...reachableModules].filter(
        (moduleId) => moduleId !== constantsSource,
      );
      if (unexpectedModules.length > 0) {
        this.error(
          'The ./constants entry must contain only src/constants.ts; reachable source modules:\n' +
            unexpectedModules.map((moduleId) => `- ${moduleId}`).join('\n'),
        );
      }
    },
  };
}

/**
 * Vite config for `@takazudo/zdtp`.
 *
 * Three responsibilities:
 *
 * 1. **Lib bundle** — `vite build` emits `dist/index.js`, `dist/astro/index.js`,
 *    `dist/astro/host-adapter.js`, `dist/server/index.js`, and the standalone
 *    bin entry `dist/bin/server.js` (ESM, multi-entry) with Preact externalised
 *    so consumers contribute their own copy via the peerDependency. The CSS
 *    side-effect import in `src/index.tsx` lands as a co-emitted chunk under
 *    `dist/`. Type emission is handled separately by `tsc -p tsconfig.build.json`
 *    (vite-plugin-dts intentionally avoided — explicit tsc gives single-source-
 *    of-truth control over the .d.ts shape).
 *
 *    The `dist/bin/server.js` chunk is the executable invoked via the
 *    `zdtp-server` bin field. It receives a
 *    `#!/usr/bin/env node` shebang via Rollup's `output.banner` (only that
 *    chunk; the panel/astro/server entries stay shebang-free). `pnpm build`
 *    follows up with `chmod +x dist/bin/server.js` so the file is directly
 *    executable.
 *
 * 2. **resolve.alias for vitest** — kept so `pnpm test` resolves the
 *    alias-smoke test's intentional `from 'react'` import against
 *    preact/compat. Source files no longer rely on this alias —
 *    they import from `'preact/compat'` directly so emitted `.d.ts` files
 *    stay react-free (vite's resolve.alias is a runtime concept; tsc ignores
 *    it).
 *
 * 3. **esbuild jsx config** — `automatic` runtime + `jsxImportSource: 'preact'`
 *    so .tsx files compile against `preact/jsx-runtime` (matches
 *    tsconfig.json). Vite does not auto-pick this up from tsconfig in lib
 *    mode when there is no React-flavoured plugin installed, so we set it
 *    explicitly here.
 */
export default defineConfig({
  plugins: [assertConstantsEntryIsolation()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
    },
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    lib: {
      entry: {
        index: 'src/index.tsx',
        // Astro sub-export entry plus the host adapter as a stand-alone chunk.
        // The adapter is consumed only by the Astro toolchain on the consumer
        // side (via `<script>` import in `DesignTokenPanelHost.astro`), not by
        // `index.ts`, so it would not be discovered without an explicit entry.
        'astro/index': 'src/astro/index.ts',
        'astro/host-adapter': 'src/astro/host-adapter.ts',
        // Server-side apply pipeline entry (Node-only). Exposed via the
        // `./server` export.
        'server/index': 'src/server/index.ts',
        // Standalone CLI bin entry. Receives a `#!/usr/bin/env node` shebang
        // banner only on this chunk (see `output.banner` below) and
        // `chmod +x` in the package build script.
        'bin/server': 'src/bin/server.ts',
        // Test-utility sub-export. Re-exports symbols consumers need for
        // storage-key continuity tests (configurePanel, storageKey_*, etc.)
        // without exposing the full internal source tree.
        testing: 'src/testing.ts',
        // Leaf constants entry. This must stay independent from the panel
        // runtime so consumers can use storage/event contracts without
        // pulling in Preact, panel config, or CSS.
        constants: 'src/constants.ts',
      },
      formats: ['es'],
      // Explicit cssFileName so the exports map contract ("./styles": "./dist/zdtp.css")
      // is stated here rather than relying on Vite's implicit scope-stripping of the
      // package name. A future rename or Vite default change won't silently diverge.
      cssFileName: 'zdtp',
    },
    rollupOptions: {
      external: [
        'preact',
        'preact/compat',
        'preact/hooks',
        'preact/jsx-runtime',
        // Defensive: never let Vite try to compile a `.astro` file into the
        // lib bundle. The JS `astro/index.js` entry no longer imports the
        // `.astro` component (zdtp#308 — a static `.astro` import crashed
        // real npm consumers at prerender). The host component now ships only
        // via the `./astro/DesignTokenPanelHost.astro` subexport, placed in
        // dist by `scripts/copy-astro-assets.mjs`, and consumers import it
        // directly so their own Astro toolchain compiles it.
        /\.astro$/,
        // Package self-reference for the host adapter's lazy
        // dynamic import. Stays as a runtime resolution against the
        // consumer's `node_modules/.../dist/index.js` so the panel module
        // shares the `config/panel-config` chunk (and its singleton) with
        // the adapter.
        '@takazudo/zdtp',
        // Node built-ins used by the server entry. Mark both the
        // `node:` protocol form and the bare specifier form as external so
        // Rollup leaves them as-is in the emitted ESM bundle.
        /^node:/,
        'fs',
        'path',
        'fs/promises',
        'crypto',
        'os',
        'http',
        'url',
      ],
      output: {
        // Inject the `#!/usr/bin/env node` shebang ONLY for the bin entry.
        // The other chunks (panel UI, astro adapter, server library) are
        // imported as ESM modules and must NOT carry a shebang.
        banner: (chunk) => (chunk.fileName === 'bin/server.js' ? '#!/usr/bin/env node' : ''),
      },
    },
  },
});
