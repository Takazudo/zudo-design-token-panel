import { promises as fs } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { serializeFileWrite } from './serialize-write';
import { isPathSafe, validateAndSanitizeTokens } from './path-safety';
import { applyTokenOverridesOrThrow, NoRootBlockError } from '../apply/apply-token-overrides';
import { routeTokensToFiles } from '../apply/route-tokens-to-files';
import type { ApplyRoutingMap } from '../config/panel-config';

// ----- Types ------------------------------------------------------------------

export interface ApplyHandlerOptions {
  /**
   * Absolute path to the repository root. Used as the CWD reference when
   * resolving `routing` paths and normalising `file` values in the response.
   */
  rootDir: string;
  /**
   * Absolute path to the directory that is allowed to contain CSS token files.
   * Paths resolved from `routing` must sit strictly inside this directory
   * (enforced by `isPathSafe`).
   */
  writeRoot: string;
  /**
   * Prefix → repo-relative CSS file path map. Matches the shape of
   * `PanelConfig.applyRouting` (e.g. `{ zd: 'tokens/tokens.css' }`).
   */
  routing: ApplyRoutingMap;
}

export interface PerFileResult {
  file: string;
  changed: string[];
  unchanged: string[];
  unknown: string[];
}

// ----- Helpers ----------------------------------------------------------------

interface ComputedRewrite {
  absPath: string;
  relPath: string;
  /** Original on-disk contents — kept for rollback after a partial write. */
  original: string;
  /** Post-rewrite contents to be written iff `changed.length > 0`. */
  updated: string;
  changed: string[];
  unchanged: string[];
  unknown: string[];
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function computeRewrite(
  absPath: string,
  relPath: string,
  tokens: Record<string, string>,
): Promise<ComputedRewrite> {
  const content = await fs.readFile(absPath, 'utf-8');
  const result = applyTokenOverridesOrThrow(content, tokens);
  return {
    absPath,
    relPath,
    original: content,
    updated: result.updated,
    changed: result.changed,
    unchanged: result.unchanged,
    unknown: result.unknown,
  };
}

async function persistRewrite(rewrite: ComputedRewrite): Promise<void> {
  if (rewrite.changed.length === 0) return;
  return serializeFileWrite(rewrite.absPath, async () => {
    const dir = dirname(rewrite.absPath);
    const tmpPath = join(dir, `.tmp-${randomBytes(8).toString('hex')}.css`);
    try {
      await fs.writeFile(tmpPath, rewrite.updated, 'utf-8');
      await fs.rename(tmpPath, rewrite.absPath);
    } catch (err) {
      try {
        await fs.unlink(tmpPath);
      } catch {
        // ignore cleanup failure
      }
      throw err;
    }
  });
}

async function restoreOriginal(
  rewrite: ComputedRewrite,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  return serializeFileWrite(rewrite.absPath, async () => {
    const dir = dirname(rewrite.absPath);
    const tmpPath = join(dir, `.tmp-${randomBytes(8).toString('hex')}.css`);
    try {
      await fs.writeFile(tmpPath, rewrite.original, 'utf-8');
      await fs.rename(tmpPath, rewrite.absPath);
      return { ok: true } as const;
    } catch (err) {
      console.error('[design-token-panel/server] Restore failed for', rewrite.relPath, err);
      try {
        await fs.unlink(tmpPath);
      } catch {
        // ignore cleanup failure
      }
      return { ok: false, error: err } as const;
    }
  });
}

// ----- Factory ----------------------------------------------------------------

/**
 * Create a framework-agnostic Fetch API handler for the design-token apply
 * endpoint.
 *
 * The returned function accepts a standard `Request` and returns a
 * `Promise<Response>`. No Astro, Express, http, or Vite dependencies.
 *
 * @example
 * ```ts
 * import { createApplyHandler } from '@takazudo/zudo-design-token-panel/server';
 *
 * const handler = createApplyHandler({
 *   rootDir: process.cwd(),
 *   writeRoot: resolve(process.cwd(), 'tokens'),
 *   routing: { zd: 'tokens/tokens.css' },
 * });
 *
 * // Vite / Astro / any Fetch-compatible router:
 * export const POST = ({ request }: { request: Request }) => handler(request);
 * ```
 */
export function createApplyHandler(
  options: ApplyHandlerOptions,
): (req: Request) => Promise<Response> {
  const { rootDir, writeRoot, routing } = options;

  return async function handleApply(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON in request body' }, 400);
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return jsonResponse({ ok: false, error: 'Request body must be a JSON object' }, 400);
    }

    const { tokens } = body as { tokens: unknown };

    if (typeof tokens !== 'object' || tokens === null || Array.isArray(tokens)) {
      return jsonResponse({ ok: false, error: 'tokens must be a JSON object' }, 400);
    }

    const entries = Object.entries(tokens as Record<string, unknown>);
    if (entries.length === 0) {
      return jsonResponse({ ok: false, error: 'tokens must contain at least one entry' }, 400);
    }

    const { sanitized, error } = validateAndSanitizeTokens(tokens as Record<string, unknown>);
    if (error || !sanitized) {
      return jsonResponse({ ok: false, error: error ?? 'Invalid tokens' }, 400);
    }

    // Prefix-based routing: unknown prefixes land in `rejected`.
    const { groups, rejected } = routeTokensToFiles(sanitized, routing);
    if (rejected.length > 0) {
      return jsonResponse({ ok: false, error: 'Unsupported cssVar prefix', rejected }, 400);
    }
    if (groups.length === 0) {
      // Defensive: validation above should have caught this.
      return jsonResponse({ ok: false, error: 'No routable tokens supplied' }, 400);
    }

    // Resolve + path-safety check up-front so we never start a partial apply.
    const resolved: Array<{
      absPath: string;
      relPath: string;
      groupTokens: Record<string, string>;
    }> = [];
    for (const group of groups) {
      const absPath = resolve(rootDir, group.relativePath);
      if (!isPathSafe(writeRoot, absPath)) {
        return jsonResponse({ ok: false, error: `Path not allowed: ${group.relativePath}` }, 400);
      }
      resolved.push({ absPath, relPath: group.relativePath, groupTokens: group.tokens });
    }

    // Compute every file's rewrite IN MEMORY first. If any compute step
    // throws (no :root block, IO error, etc.) we return an error before
    // mutating disk so the handler is atomic on the failure path.
    const computed: ComputedRewrite[] = [];
    for (const { absPath, relPath, groupTokens } of resolved) {
      try {
        computed.push(await computeRewrite(absPath, relPath, groupTokens));
      } catch (err) {
        if (err instanceof NoRootBlockError) {
          console.error('[design-token-panel/server] No :root block in', relPath);
          return jsonResponse(
            {
              ok: false,
              error: `No top-level :root { ... } block in ${relPath}`,
            },
            409,
          );
        }
        console.error(`[design-token-panel/server] Error computing ${relPath}:`, err);
        return jsonResponse({ ok: false, error: 'Failed to read or parse source file' }, 500);
      }
    }

    // Write phase — persist each computed rewrite. On any failure, roll back
    // every previously-written file from the in-memory `original` snapshot.
    const persisted: ComputedRewrite[] = [];
    for (const rewrite of computed) {
      try {
        await persistRewrite(rewrite);
        persisted.push(rewrite);
      } catch (err) {
        console.error(`[design-token-panel/server] Write failed for ${rewrite.relPath}:`, err);
        // Roll back already-persisted files in reverse order. Collect any
        // restore failures so the response truthfully reports partial state
        // instead of falsely claiming a clean rollback.
        const restoreFailures: string[] = [];
        for (let i = persisted.length - 1; i >= 0; i--) {
          const result = await restoreOriginal(persisted[i]);
          if (!result.ok) restoreFailures.push(persisted[i].relPath);
        }
        if (restoreFailures.length > 0) {
          return jsonResponse(
            {
              ok: false,
              error: `Failed to write file ${rewrite.relPath}; rollback also failed for ${restoreFailures.length} file(s) — disk state is inconsistent. Inspect the listed files manually.`,
              failedFile: rewrite.relPath,
              restoreFailures,
            },
            500,
          );
        }
        return jsonResponse(
          {
            ok: false,
            error: `Failed to write file ${rewrite.relPath}; previously-written files were restored.`,
            failedFile: rewrite.relPath,
          },
          500,
        );
      }
    }

    const unknownCssVars: string[] = computed.flatMap((r) => r.unknown);
    const unchangedCssVars: string[] = computed.flatMap((r) => r.unchanged);

    // Normalise `file` paths in the response to repo-relative form.
    const updated: PerFileResult[] = computed.map((r) => ({
      file: r.relPath.startsWith('/') ? relative(rootDir, r.relPath) : r.relPath,
      changed: r.changed,
      unchanged: r.unchanged,
      unknown: r.unknown,
    }));

    return jsonResponse({
      ok: true,
      updated,
      unknownCssVars,
      unchangedCssVars,
    });
  };
}
