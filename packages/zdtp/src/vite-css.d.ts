/**
 * Ambient declaration for Vite `?inline` CSS imports so
 * `tsc -p tsconfig.build.json` accepts `import css from './x.css?inline'`.
 *
 * Vite resolves the `?inline` query at build time to the fully-bundled CSS
 * as a JS string. Unlike a bare `import './x.css'` side-effect import — which
 * Vite library mode strips from the emitted JS — an `?inline` import survives
 * bundling as a string constant. `src/index.tsx` uses this to self-inject the
 * panel stylesheet at runtime.
 */
declare module '*.css?inline' {
  const css: string;
  export default css;
}
