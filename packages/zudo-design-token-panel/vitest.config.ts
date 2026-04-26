import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/**
 * Vitest config — inherits the Preact compat alias from vite.config so that
 * test files importing `from "react"` resolve against `preact/compat`.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  }),
);
