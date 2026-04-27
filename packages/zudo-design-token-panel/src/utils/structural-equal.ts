/**
 * Structural deep-equality for plain JSON-shaped values.
 *
 * Used by `configurePanel`'s re-init guard so a
 * second `configurePanel(parsedConfig)` call from Astro view-transition reruns
 * — which produces a freshly-parsed object that is byte-for-byte identical to
 * the previous one but referentially distinct — does not throw.
 *
 * Scope:
 *  - Primitives compared with `Object.is` (so `NaN === NaN` and `+0 !== -0`,
 *    matching the JSON serialization round-trip behaviour we care about).
 *  - Arrays compared element-wise (length-first short-circuit).
 *  - Plain objects compared key-set-then-value (own enumerable string keys).
 *  - Functions, class instances, Maps, Sets, Symbols are NOT supported. The
 *    panel config contract (PORTABLE-CONTRACT.md §1, §4.2) bans these from
 *    `PanelConfig`, so a structural compare that bails on them is fine.
 *
 * Returns `false` for any value that is `null` vs. non-null or whose typeof
 * differs (string vs. number etc.).
 */
export function structuralEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!structuralEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  // Use a Set for O(1) lookups so 100-key payloads stay cheap on the
  // view-transition hot path.
  const bKeySet = new Set(bKeys);
  for (const k of aKeys) {
    if (!bKeySet.has(k)) return false;
    if (!structuralEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
      return false;
    }
  }
  return true;
}
