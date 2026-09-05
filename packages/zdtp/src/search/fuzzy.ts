/** Small dependency-free fuzzy matcher used by the command palette. */

/**
 * Return true when every character in `query` occurs in `value` in order.
 * Matching is case-insensitive and intentionally does not score or reorder
 * results; the manifest's declaration order remains the stable ordering.
 */
export function fuzzySubsequence(query: string, value: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) return true;

  const haystack = value.toLocaleLowerCase();
  let queryIndex = 0;
  for (let valueIndex = 0; valueIndex < haystack.length; valueIndex++) {
    if (haystack[valueIndex] !== needle[queryIndex]) continue;
    queryIndex += 1;
    if (queryIndex === needle.length) return true;
  }
  return false;
}

/** Friendly aliases for callers that describe this operation as a match. */
export const fuzzyMatch = fuzzySubsequence;
export const isSubsequence = fuzzySubsequence;
