import { promises as fs } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { serializeFileWrite } from './serialize-write';
import { isPathSafe, validateAndSanitizeTokens } from './path-safety';
import {
  applyTokenOverridesOrThrow,
  findFirstTopLevelRootBlock,
  findFirstTopLevelThemeBlock,
  NoTokenBlockError,
  replaceOne,
} from '../apply/apply-token-overrides';
import { computeHunks, type ApplyHunk } from '../apply/compute-hunks';
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
  /**
   * Subset of `unknown` (#508): declared somewhere in the file but outside
   * the scanned `:root`/`@theme` blocks — see `ApplyResult.unknownOutsideBlock`
   * in `apply-token-overrides.ts` for the full classification rules.
   */
  unknownOutsideBlock: string[];
}

export interface ApplyRequestBody {
  tokens: Record<string, string>;
  dryRun?: true;
  /** Digests returned by a preceding dry run, keyed by response `file`. */
  expectDigests?: Record<string, string>;
}

export interface ApplyDryRunFileResult extends PerFileResult {
  blockKind: 'root' | 'theme';
  /** SHA-256 of the exact on-disk bytes used to compute this preview. */
  digest: string;
  hunks: ApplyHunk[];
}

export interface ApplyDryRunResponse {
  ok: true;
  dryRun: true;
  files: ApplyDryRunFileResult[];
  rejected: string[];
  rejectedReasons: string[];
}

export interface ApplyWriteResponse {
  ok: true;
  updated: PerFileResult[];
  unknownCssVars: string[];
  unchangedCssVars: string[];
  unknownOutsideBlockCssVars: string[];
}

export interface ApplyStaleFileResponse {
  ok: false;
  reason: 'stale-file';
  files: string[];
}

export type ApplySuccessResponse = ApplyDryRunResponse | ApplyWriteResponse;

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
  unknownOutsideBlock: string[];
  digest: string;
  blockKind: 'root' | 'theme';
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
  const bytes = await fs.readFile(absPath);
  const content = bytes.toString('utf-8');
  const result = applyTokenOverridesOrThrow(content, tokens);
  const rootBlock = findFirstTopLevelRootBlock(content);
  const themeBlock = findFirstTopLevelThemeBlock(content);
  const hasRequestedRootDeclaration =
    rootBlock &&
    Object.entries(tokens).some(
      ([cssVar, value]) =>
        replaceOne(content.slice(rootBlock.contentStart, rootBlock.contentEnd), cssVar, value)
          .status !== 'unknown',
    );
  const hasRequestedThemeDeclaration =
    themeBlock &&
    Object.entries(tokens).some(
      ([cssVar, value]) =>
        replaceOne(content.slice(themeBlock.contentStart, themeBlock.contentEnd), cssVar, value)
          .status !== 'unknown',
    );
  const blockKind = hasRequestedRootDeclaration
    ? 'root'
    : hasRequestedThemeDeclaration
      ? 'theme'
      : rootBlock
        ? 'root'
        : 'theme';
  return {
    absPath,
    relPath,
    original: content,
    updated: result.updated,
    changed: result.changed,
    unchanged: result.unchanged,
    unknown: result.unknown,
    unknownOutsideBlock: result.unknownOutsideBlock,
    digest: createHash('sha256').update(bytes).digest('hex'),
    // applyTokenOverrides uses :root first and @theme as its fallback. Report
    // the block that contains a requested declaration (root wins for a mixed
    // request, matching the rewriter). NoTokenBlockError above guarantees at
    // least one of the two block kinds exists.
    blockKind,
  };
}

function normaliseResponsePath(rootDir: string, relPath: string): string {
  return relPath.startsWith('/') ? relative(rootDir, relPath) : relPath;
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
 * import { createApplyHandler } from '@takazudo/zdtp/server';
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
  // This is an in-memory queue key, not a path we create. Serializing the
  // complete read/compute/stale-check/write transaction closes the gap where
  // two concurrent requests could both validate one preview digest before
  // either request reached the older per-file persistence queue.
  const batchLockKey = `\0zdtp-apply-batch:${resolve(writeRoot)}`;

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

    const { tokens, dryRun, expectDigests } = body as {
      tokens: unknown;
      dryRun?: unknown;
      expectDigests?: unknown;
    };

    if (dryRun !== undefined && dryRun !== true) {
      return jsonResponse({ ok: false, error: 'dryRun, when supplied, must be true' }, 400);
    }
    if (
      expectDigests !== undefined &&
      (typeof expectDigests !== 'object' || expectDigests === null || Array.isArray(expectDigests))
    ) {
      return jsonResponse({ ok: false, error: 'expectDigests must be a JSON object' }, 400);
    }
    if (
      expectDigests !== undefined &&
      Object.entries(expectDigests as Record<string, unknown>).some(
        ([file, digest]) =>
          file.length === 0 || typeof digest !== 'string' || !/^[a-f0-9]{64}$/i.test(digest),
      )
    ) {
      return jsonResponse(
        { ok: false, error: 'expectDigests values must be SHA-256 hex digests' },
        400,
      );
    }

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
    const { groups, rejected, rejectedReasons } = routeTokensToFiles(sanitized, routing);
    if (rejected.length > 0 && dryRun !== true) {
      return jsonResponse(
        { ok: false, error: 'Unsupported cssVar prefix', rejected, rejectedReasons },
        400,
      );
    }
    if (groups.length === 0) {
      if (dryRun === true) {
        return jsonResponse({
          ok: true,
          dryRun: true,
          files: [],
          rejected,
          rejectedReasons,
        });
      }
      // Defensive: validation above should have caught this.
      return jsonResponse({ ok: false, error: 'No routable tokens supplied' }, 400);
    }

    return serializeFileWrite(batchLockKey, async () => {
      // Resolve + path-safety check up-front so we never start a partial apply.
      // Coalesce groups that resolve to the SAME physical file into ONE
      // read→compute→write unit. Two routing prefixes can legitimately map to a
      // single CSS file (e.g. `palette` and `color` both → `tokens/colors.css`);
      // left as separate groups each would be computed from the same pre-write
      // content and the second write would silently clobber the first (#526).
      // Keying on the resolved absPath (not the raw relativePath) also collapses
      // spelling variants like `tokens/x.css` vs `./tokens/x.css` onto one file.
      const resolvedByAbsPath = new Map<
        string,
        { absPath: string; relPath: string; groupTokens: Record<string, string> }
      >();
      for (const group of groups) {
        const absPath = resolve(rootDir, group.relativePath);
        if (!isPathSafe(writeRoot, absPath)) {
          return jsonResponse({ ok: false, error: `Path not allowed: ${group.relativePath}` }, 400);
        }
        const existing = resolvedByAbsPath.get(absPath);
        if (existing) {
          // Each cssVar is classified to exactly one prefix, so token maps merged
          // across same-file groups never collide on a key.
          Object.assign(existing.groupTokens, group.tokens);
        } else {
          resolvedByAbsPath.set(absPath, {
            absPath,
            relPath: group.relativePath,
            groupTokens: { ...group.tokens },
          });
        }
      }
      const resolved = Array.from(resolvedByAbsPath.values());

      // Compute every file's rewrite IN MEMORY first. If any compute step
      // throws (no :root block, IO error, etc.) we return an error before
      // mutating disk so the handler is atomic on the failure path.
      const computed: ComputedRewrite[] = [];
      for (const { absPath, relPath, groupTokens } of resolved) {
        try {
          computed.push(await computeRewrite(absPath, relPath, groupTokens));
        } catch (err) {
          if (err instanceof NoTokenBlockError) {
            console.error('[design-token-panel/server] No :root or @theme block in', relPath);
            return jsonResponse(
              {
                ok: false,
                error: `No top-level :root { ... } or @theme { ... } block in ${relPath}`,
              },
              409,
            );
          }
          console.error(`[design-token-panel/server] Error computing ${relPath}:`, err);
          return jsonResponse({ ok: false, error: 'Failed to read or parse source file' }, 500);
        }
      }

      if (dryRun === true) {
        const files: ApplyDryRunFileResult[] = computed.map((rewrite) => ({
          file: normaliseResponsePath(rootDir, rewrite.relPath),
          blockKind: rewrite.blockKind,
          digest: rewrite.digest,
          changed: rewrite.changed,
          unchanged: rewrite.unchanged,
          unknown: rewrite.unknown,
          unknownOutsideBlock: rewrite.unknownOutsideBlock,
          hunks: computeHunks(rewrite.original, rewrite.updated, rewrite.changed),
        }));
        return jsonResponse({
          ok: true,
          dryRun: true,
          files,
          rejected,
          rejectedReasons,
        });
      }

      // Compare every supplied preview digest only after all reads/computes have
      // succeeded and before the first persistence attempt. A mismatch aborts
      // the complete batch without touching any target file.
      if (expectDigests !== undefined) {
        const expected = expectDigests as Record<string, string>;
        const staleFiles = computed
          .filter((rewrite) => {
            const file = normaliseResponsePath(rootDir, rewrite.relPath);
            return Object.hasOwn(expected, file) && expected[file].toLowerCase() !== rewrite.digest;
          })
          .map((rewrite) => normaliseResponsePath(rootDir, rewrite.relPath));
        if (staleFiles.length > 0) {
          return jsonResponse(
            { ok: false, reason: 'stale-file', files: staleFiles } satisfies ApplyStaleFileResponse,
            409,
          );
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
      // #508: subset of unknownCssVars that IS declared somewhere in its file,
      // just outside the scanned :root/@theme blocks.
      const unknownOutsideBlockCssVars: string[] = computed.flatMap((r) => r.unknownOutsideBlock);

      // Normalise `file` paths in the response to repo-relative form.
      const updated: PerFileResult[] = computed.map((r) => ({
        file: normaliseResponsePath(rootDir, r.relPath),
        changed: r.changed,
        unchanged: r.unchanged,
        unknown: r.unknown,
        unknownOutsideBlock: r.unknownOutsideBlock,
      }));

      return jsonResponse({
        ok: true,
        updated,
        unknownCssVars,
        unchangedCssVars,
        unknownOutsideBlockCssVars,
      });
    });
  };
}
