/**
 * Token-to-file routing — pure grouping module.
 *
 * Given a map of cssVar overrides (e.g. from the tweak state's serialized
 * form), split the entries by target source file so the dev-API handler can
 * call the rewriter once per file. The prefix → file map is supplied by the
 * caller (typically read from `panelConfig.applyRouting`) — the package
 * ships zero baked-in routing defaults; hosts MUST configure their own.
 *
 * Anything that does NOT look like a `--<prefix>-...` cssVar, OR whose prefix
 * has no entry in the supplied routing map, lands in `rejected`. The caller
 * surfaces those (e.g. as a non-empty `rejected[]` field on the apply
 * response) so silent drops become visible.
 *
 * No IO, no DOM, no Node-specific imports — safe to bundle for the browser.
 */

import type { ApplyRoutingMap } from '../config/panel-config';

/**
 * Prefix-family identifier. Plain string — the routing map is host-supplied.
 */
export type TokenPrefix = string;

export interface RouteGroup {
  /** Which prefix family these tokens belong to. */
  prefix: string;
  /** Repo-relative path of the source CSS file the rewriter should edit. */
  relativePath: string;
  /** Ordered map of cssVar → value. Insertion order follows the input. */
  tokens: Record<string, string>;
}

export interface RouteResult {
  /** At most one group per prefix. Empty when every entry was rejected. */
  groups: RouteGroup[];
  /** cssVar names whose prefix is not supported. */
  rejected: string[];
  /**
   * Diagnostic messages explaining each rejection. Same length as `rejected`,
   * indexed in lockstep. Hosts surface these in the UI so silent drops
   * become visible (PR #1440 review item P0-2).
   */
  rejectedReasons: string[];
}

/**
 * Empty default routing — the package ships no baked-in prefix → file map.
 * Hosts MUST supply `panelConfig.applyRouting` (or pass an explicit map to
 * `routeTokensToFiles`) for the apply pipeline to do anything; without it,
 * every entry lands in `rejected` with a clear diagnostic.
 */
export const TOKEN_SOURCE_FILES: Readonly<ApplyRoutingMap> = Object.freeze({});

/**
 * Return the prefix family for a cssVar, or `null` if the name does not match
 * any prefix in the supplied routing map. A cssVar must look like
 * `--<prefix>-<rest>` — the bare `--<prefix>` / `--<prefix>-` forms are not
 * accepted because there is nothing to rewrite.
 */
function classify(cssVar: string, routing: ApplyRoutingMap): string | null {
  if (!cssVar.startsWith('--')) return null;
  // Walk routing keys in declaration order so a host that lists a
  // longer-prefix entry first (e.g. `zd-special` before `zd`) wins.
  for (const prefix of Object.keys(routing)) {
    const needle = `--${prefix}-`;
    if (cssVar.startsWith(needle) && cssVar.length > needle.length) {
      return prefix;
    }
  }
  return null;
}

/**
 * Split `overrides` into per-file groups plus a rejected list.
 *
 * - Groups are emitted in `Object.keys(routing)` order.
 * - Tokens within a group preserve the input's insertion order.
 * - A group is only emitted when it has at least one token.
 * - `rejected` preserves the input's insertion order, with a parallel
 *   `rejectedReasons` array describing why each entry failed.
 *
 * @param overrides - Flat cssVar → value map.
 * @param routing - Prefix → repo-relative path map (typically from
 *   `panelConfig.applyRouting`). When omitted or empty, every entry lands in
 *   `rejected` so callers surface a clear "apply not configured" error
 *   instead of silently no-oping.
 */
export function routeTokensToFiles(
  overrides: Record<string, string>,
  routing: ApplyRoutingMap = TOKEN_SOURCE_FILES,
): RouteResult {
  const prefixOrder = Object.keys(routing);
  const buckets: Record<string, Record<string, string>> = {};
  for (const prefix of prefixOrder) buckets[prefix] = {};
  const rejected: string[] = [];
  const rejectedReasons: string[] = [];

  for (const [cssVar, value] of Object.entries(overrides)) {
    const prefix = classify(cssVar, routing);
    if (prefix === null) {
      rejected.push(cssVar);
      if (!cssVar.startsWith('--')) {
        rejectedReasons.push(`${cssVar}: not a CSS custom property (must start with "--")`);
      } else if (prefixOrder.length === 0) {
        rejectedReasons.push(
          `${cssVar}: no applyRouting configured on PanelConfig (host has not enabled disk-rewrite)`,
        );
      } else {
        rejectedReasons.push(
          `${cssVar}: no route configured for prefix family (known prefixes: ${prefixOrder
            .map((p) => `"${p}"`)
            .join(', ')})`,
        );
      }
      continue;
    }
    buckets[prefix][cssVar] = value;
  }

  const groups: RouteGroup[] = [];
  for (const prefix of prefixOrder) {
    const tokens = buckets[prefix];
    if (Object.keys(tokens).length === 0) continue;
    groups.push({
      prefix,
      relativePath: routing[prefix],
      tokens,
    });
  }

  return { groups, rejected, rejectedReasons };
}
