/**
 * Liveness probes for the global `document`.
 *
 * Why these exist (zudolab/zudo-doc#3344): the panel's deferred surfaces —
 * dynamic-import continuations in the Astro host adapter, host code calling
 * the public API right after `await import('@takazudo/zdtp')` resolves, and
 * Preact's rAF/setTimeout effect flush — can resume AFTER the environment
 * that scheduled them is gone. Under vitest, the jsdom environment is torn
 * down (or swapped for the next test file) while such a continuation is
 * still in flight; the global `document` then either disappears or is
 * replaced by a non-Document stub, and a late `document.getElementById(...)`
 * throws `TypeError: document.getElementById is not a function` — surfacing
 * as an unhandled rejection in the downstream test run.
 *
 * In a real browser the page's document outlives every continuation
 * scheduled from it, so both probes are inert there (always true): the
 * guards only change behavior in torn-down / swapped-environment states
 * where the alternative is a crash.
 */

/**
 * True when the global `document` exists and behaves like a live Document.
 * `getElementById` doubles as the canary: it is the first DOM call the
 * panel's mount/lookup paths make, and the exact method the downstream
 * teardown crash reported missing.
 */
export function isDocumentUsable(): boolean {
  return typeof document !== 'undefined' && typeof document.getElementById === 'function';
}

/**
 * Null-safe snapshot of the global `document` for later identity comparison.
 * A bare `const doc = document` would throw a ReferenceError when the global
 * has already been deleted (teardown completed before the async surface was
 * even entered) — and inside an async function that ReferenceError becomes
 * the very unhandled rejection these helpers exist to prevent.
 */
export function captureDocument(): Document | null {
  return typeof document === 'undefined' ? null : document;
}

/**
 * True when the global `document` is still the SAME live document captured
 * when an async surface was entered. Checked after `await` boundaries: a
 * mismatch means the environment was torn down or swapped mid-flight, and
 * the continuation must cancel itself instead of driving a document it does
 * not own — even a fully-functional replacement document belongs to someone
 * else (the next test file's environment, a new page).
 */
export function isSameUsableDocument(owningDoc: Document | null): boolean {
  return owningDoc !== null && isDocumentUsable() && document === owningDoc;
}
