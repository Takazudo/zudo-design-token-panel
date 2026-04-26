import { readFileSync } from 'node:fs';

/**
 * CSS-var prefix family → host-relative CSS file path.
 *
 * Shape: `{ "<prefix>": "<host-relative-css-path>", ... }`.
 * Both the panel UI (`PanelConfig.applyRouting`) and the bin (`--routing` flag)
 * share this type so the two readers stay in sync.
 *
 * Same logical shape as `ApplyRoutingMap` in `config/panel-config.ts`
 * (which is `Record<string, string>`). Exported from the server entry so
 * bin code and consumer tooling can import it from `./server` without
 * pulling in the full panel client bundle.
 */
export type ApplyRoutingMap = Record<string, string>;

/**
 * Read a routing JSON file from disk, validate its shape, and return the map.
 *
 * Throws a descriptive `Error` for any of:
 *   - file does not exist / is unreadable
 *   - invalid JSON syntax
 *   - root value is not a plain object (null, array, primitive, etc.)
 *   - any value in the map is not a non-empty string
 *   - the map itself is empty (at least one prefix entry is required)
 *
 * Intended for Node.js / Vite plugin / bin contexts only — not for
 * browser-side code (uses `node:fs`).
 *
 * @param absPath - Absolute path to the JSON file.
 * @returns The validated routing map.
 *
 * @example
 * ```ts
 * import { loadRoutingFromFile } from '@takazudo/zudo-design-token-panel/server';
 *
 * const routing = loadRoutingFromFile('/abs/path/to/my.routing.json');
 * // → { zd: 'tokens/tokens.css', ... }
 * ```
 */
export function loadRoutingFromFile(absPath: string): ApplyRoutingMap {
  let raw: string;
  try {
    raw = readFileSync(absPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `[design-token-panel] loadRoutingFromFile: cannot read file at ${absPath}\n` +
        `  Cause: ${(err as NodeJS.ErrnoException).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[design-token-panel] loadRoutingFromFile: invalid JSON in ${absPath}\n` +
        `  Cause: ${(err as SyntaxError).message}`,
    );
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `[design-token-panel] loadRoutingFromFile: root value must be a plain object, ` +
        `got ${parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed} ` +
        `(in ${absPath})`,
    );
  }

  const map = parsed as Record<string, unknown>;
  const keys = Object.keys(map);

  if (keys.length === 0) {
    throw new Error(
      `[design-token-panel] loadRoutingFromFile: routing map must not be empty (in ${absPath})`,
    );
  }

  for (const key of keys) {
    const value = map[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `[design-token-panel] loadRoutingFromFile: every value must be a non-empty string, ` +
          `but key "${key}" has value ${JSON.stringify(value)} (in ${absPath})`,
      );
    }
  }

  return map as ApplyRoutingMap;
}
