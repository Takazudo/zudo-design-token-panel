import { isAbsolute, relative, sep } from 'node:path';
import { sanitizeCssValue } from '../controls/sanitize-css-value';

// ----- Validation patterns ----------------------------------------------------

export const CSS_VAR_NAME_RE = /^--[a-zA-Z0-9_-]+$/;

export function isValidCssVarName(v: unknown): v is string {
  return typeof v === 'string' && CSS_VAR_NAME_RE.test(v);
}

/**
 * A resolved path is safe iff it sits strictly inside the write-root
 * directory AND ends with `.css`. Cross-platform: uses `path.relative` to
 * normalize separators and detect both escape attempts and (on Windows)
 * different-drive resolutions. The naive `startsWith(${writeRoot}/)` check
 * silently fails on Windows where the platform separator is a backslash.
 *
 * Reject conditions:
 *   - resolvedPath does not end with `.css`
 *   - resolvedPath equals writeRoot (relative is empty / `.`)
 *   - relative is absolute (different drive or unrelated root on Windows)
 *   - relative starts with `..` followed by a separator (escape) or is `..`
 *     itself. Note that filenames such as `..hidden.css` directly under
 *     writeRoot remain valid because `..hidden.css` is not `..` and does not
 *     start with a separator.
 */
export function isPathSafe(writeRoot: string, resolvedPath: string): boolean {
  if (!resolvedPath.endsWith('.css')) return false;
  const rel = relative(writeRoot, resolvedPath);
  if (rel === '' || rel === '.') return false;
  if (isAbsolute(rel)) return false;
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith('../')) return false;
  return true;
}

/**
 * Validate the incoming `tokens` map and return a sanitized copy.
 *
 * - Keys must match `CSS_VAR_NAME_RE` (`--[a-zA-Z0-9_-]+`).
 * - Values must be strings. Each value runs through `sanitizeCssValue`.
 *   If sanitization changed the value, we still accept the sanitized form —
 *   rejecting here would surface as a confusing 400 for callers whose color
 *   picker briefly emits a trailing newline.
 *
 * Returns `{ sanitized }` on success, or `{ error }` describing the first
 * offending key.
 */
export function validateAndSanitizeTokens(tokens: Record<string, unknown>): {
  sanitized?: Record<string, string>;
  error?: string;
} {
  const sanitized: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(tokens)) {
    if (!isValidCssVarName(key)) {
      return { error: `Invalid cssVar name: ${JSON.stringify(key)}` };
    }
    if (typeof rawValue !== 'string') {
      return { error: `Value for ${key} must be a string` };
    }
    sanitized[key] = sanitizeCssValue(rawValue);
  }
  return { sanitized };
}
