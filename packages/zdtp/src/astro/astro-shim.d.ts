/**
 * Ambient declaration for `*.astro` modules so `tsc -p tsconfig.build.json`
 * accepts the `from './DesignTokenPanelHost.astro'` re-export in `index.ts`.
 *
 * This shim mirrors Astro's own template — the actual component shape is
 * resolved by the consumer's Astro toolchain at build time, not by the
 * package's `tsc` emit. Keeping the declaration permissive here means we
 * avoid pulling Astro itself into devDependencies just for type emission.
 */

declare module '*.astro' {
  const Component: (props: Record<string, unknown>) => unknown;
  export default Component;
}
