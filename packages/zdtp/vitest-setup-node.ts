// Vitest node-project setup (per-file, runs in each file's environment).
//
// Under jsdom, `HTMLCanvasElement.prototype.getContext('2d')` is unimplemented:
// jsdom emits a "Not implemented" jsdomError to its virtual console, which
// vitest intermittently counts as an unhandled error and fails the run even
// though every test passes. `_canvasCtxSupported` (state/tweak-state.ts) only
// needs a falsy return to correctly skip the canvas colour path under jsdom, so
// stub getContext to return null — the probe stays `false` WITHOUT tripping
// jsdom's not-implemented path.
//
// Guarded on `typeof HTMLCanvasElement` so it no-ops in the pure-node env (node
// test files, where the class is undefined). Test files that manage getContext
// themselves (css-color-to-hex.test.ts save/spy/restore around this baseline)
// keep working: this only replaces the throwing default.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as HTMLCanvasElement['getContext'];
}
