import { defineConfig } from 'vite';

/**
 * Vite config for `@takazudo/zudo-design-token-panel`.
 *
 * Three responsibilities:
 *
 * 1. **Lib bundle** — `vite build` emits `dist/index.js` plus `dist/astro/index.js`,
 *    `dist/astro/host-adapter.js`, and `dist/server/index.js` (ESM, multi-entry)
 *    with Preact externalised so consumers contribute their own copy via the
 *    peerDependency. The CSS side-effect import in `src/index.tsx` lands as a
 *    co-emitted chunk under `dist/`. Type emission is handled separately by
 *    `tsc -p tsconfig.build.json` (vite-plugin-dts intentionally avoided —
 *    explicit tsc gives single-source-of-truth control over the .d.ts shape).
 *
 *    Note: the `bin/server` entry from the upstream zmod port is intentionally
 *    deferred to a follow-up epic — this package currently ships the panel UI,
 *    Astro adapter, and server Apply API, but not the standalone CLI bin.
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
        // NOTE: the upstream zmod port also emitted a `server/index` entry
        // for the apply-pipeline server modules. That tree is deferred to a
        // follow-up epic; this package currently ships only the panel UI
        // and Astro adapter.
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'preact',
        'preact/compat',
        'preact/hooks',
        'preact/jsx-runtime',
        // Leave `from './DesignTokenPanelHost.astro'` literal in the
        // emitted `astro/index.js` so the consumer's Astro toolchain
        // resolves the .astro file. Vite lib mode does not compile .astro;
        // a postbuild copy script (`scripts/copy-astro-assets.mjs`) places
        // the raw file alongside the emitted JS.
        /\.astro$/,
        // Package self-reference for the host adapter's lazy
        // dynamic import. Stays as a runtime resolution against the
        // consumer's `node_modules/.../dist/index.js` so the panel module
        // shares the `config/panel-config` chunk (and its singleton) with
        // the adapter.
        '@takazudo/zudo-design-token-panel',
        // Node built-ins used by the server entry. Mark both the
        // `node:` protocol form and the bare specifier form as external so
        // Rollup leaves them as-is in the emitted ESM bundle.
        /^node:/,
        'fs',
        'path',
        'fs/promises',
        'crypto',
        'os',
      ],
    },
  },
});
