/**
 * Pure CORS helpers for the `design-token-panel-server` bin.
 *
 * Origin matching is **case-sensitive on the entire scheme + host + port**
 * string — wildcards and pattern matching are intentionally not supported.
 * The browser sends the origin verbatim; the bin operator declares the exact
 * allowed origins via repeated `--allow-origin` flags.
 */

/**
 * @param origin    The `Origin` header from the incoming request, or
 *                  null/undefined if the header was absent.
 * @param allowList The exact-match allow-list configured at bin startup.
 * @returns true iff `origin` is a non-empty string present in `allowList`.
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowList: readonly string[],
): boolean {
  if (typeof origin !== 'string' || origin.length === 0) return false;
  if (allowList.length === 0) return false;
  return allowList.includes(origin);
}

/**
 * Build the four `Access-Control-Allow-*` headers for a successful CORS
 * response (preflight 204 OR the wrapped POST /apply response). The caller
 * is responsible for only calling this when `isOriginAllowed` returned true,
 * so the echoed origin value is always one the operator has explicitly
 * permitted.
 */
export function buildCorsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '600',
  };
}
