/**
 * `design-token-panel-server` bin entry.
 *
 * The `#!/usr/bin/env node` shebang is intentionally NOT in this source file —
 * Vite/Rollup re-injects it via `output.banner` (see vite.config.ts) onto the
 * emitted `dist/bin/server.js`. That keeps the bundled file as the single
 * source of truth for the executable header and avoids esbuild rejecting a
 * double-shebang in the build output.
 *
 * Wraps the framework-agnostic `createApplyHandler` from `../server` in a tiny
 * Node `http` server that:
 *
 *   - parses argv via `parseArgs`
 *   - resolves --root / --write-root / --routing
 *   - loads the routing JSON via `loadRoutingFromFile`
 *   - serves OPTIONS/POST /apply with CORS gating, plus GET /healthz, plus
 *     404/405 for everything else
 *   - logs apply outcomes (unless --quiet)
 *   - exits 1 with a friendly stderr message on EADDRINUSE
 *   - shuts down gracefully on SIGINT/SIGTERM
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { createApplyHandler, loadRoutingFromFile } from '../server';
import { buildCorsHeaders, isOriginAllowed } from './cors';
import { HELP_TEXT, parseArgs, type ParsedArgs } from './parse-args';

const APPLY_PATH = '/apply';
const HEALTHZ_PATH = '/healthz';

interface RuntimeConfig {
  rootDir: string;
  writeRoot: string;
  routingPath: string;
  port: number;
  host: string;
  allowOrigins: string[];
  quiet: boolean;
}

function buildRuntimeConfig(parsed: ParsedArgs): RuntimeConfig {
  // Defaults that depend on process state are resolved here, not in the
  // parser, so `parseArgs` stays a pure function.
  const rootDir = resolve(parsed.root ?? process.cwd());
  // writeRoot / routing are required → parseArgs already enforced non-null.
  const writeRoot = resolve(rootDir, parsed.writeRoot as string);
  const routingPath = resolve(rootDir, parsed.routing as string);
  return {
    rootDir,
    writeRoot,
    routingPath,
    port: parsed.port,
    host: parsed.host,
    allowOrigins: parsed.allowOrigins,
    quiet: parsed.quiet,
  };
}

function jsonReply(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(payload).toString());
  res.end(payload);
}

/** Soft body-size limit shared with the Next.js dev-forwarder route. */
const MAX_BODY_BYTES = 1_048_576; // 1 MiB

function readBody(req: IncomingMessage): Promise<string | 413> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let received = 0;
    req.on('data', (chunk: Buffer) => {
      received += chunk.byteLength;
      if (received > MAX_BODY_BYTES) {
        resolveBody(413);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', rejectBody);
  });
}

function buildFetchHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (typeof value === 'string') {
      headers.set(key, value);
    }
  }
  return headers;
}

async function pipeFetchResponse(
  res: ServerResponse,
  fetchResponse: Response,
  extraHeaders: Record<string, string>,
): Promise<void> {
  res.statusCode = fetchResponse.status;
  fetchResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  const text = await fetchResponse.text();
  res.end(text);
}

function logApplyOutcome(quiet: boolean, payload: string): void {
  if (quiet) return;
  try {
    const parsed = JSON.parse(payload) as {
      ok?: boolean;
      updated?: Array<{ file: string; changed?: string[] }>;
    };
    if (!parsed.ok || !Array.isArray(parsed.updated)) return;
    const totalTokens = parsed.updated.reduce(
      (sum, entry) => sum + (Array.isArray(entry.changed) ? entry.changed.length : 0),
      0,
    );
    const fileCount = parsed.updated.length;
    const changedFiles = parsed.updated
      .filter((entry) => Array.isArray(entry.changed) && entry.changed.length > 0)
      .map((entry) => entry.file);
    console.log(
      `[design-token-panel] applied ${totalTokens} tokens to ${fileCount} files ` +
        `(changed: ${changedFiles.length > 0 ? changedFiles.join(', ') : 'none'})`,
    );
  } catch {
    // Non-JSON or malformed apply response — skip the friendly summary log.
  }
}

interface Deps {
  applyHandler: (req: Request) => Promise<Response>;
  config: RuntimeConfig;
}

function buildRequestListener(deps: Deps) {
  const { applyHandler, config } = deps;
  return async function requestListener(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    const method = (req.method ?? 'GET').toUpperCase();
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : null;

    try {
      // ----- /healthz -----
      if (url === HEALTHZ_PATH && method === 'GET') {
        jsonReply(res, 200, {
          ok: true,
          writeRoot: config.writeRoot,
          routing: config.routingPath,
          port: config.port,
        });
        return;
      }

      // ----- /apply -----
      if (url === APPLY_PATH) {
        if (method === 'OPTIONS') {
          if (!isOriginAllowed(origin, config.allowOrigins)) {
            jsonReply(res, 403, { ok: false, error: 'Origin not allowed' });
            return;
          }
          const corsHeaders = buildCorsHeaders(origin as string);
          for (const [key, value] of Object.entries(corsHeaders)) {
            res.setHeader(key, value);
          }
          res.statusCode = 204;
          res.end();
          return;
        }

        if (method !== 'POST') {
          res.setHeader('Allow', 'POST, OPTIONS');
          jsonReply(res, 405, { ok: false, error: 'Method not allowed' });
          return;
        }

        // POST /apply
        const contentType = req.headers['content-type'];
        if (
          typeof contentType !== 'string' ||
          !contentType.toLowerCase().includes('application/json')
        ) {
          jsonReply(res, 415, { ok: false, error: 'Content-Type must be application/json' });
          return;
        }

        if (!isOriginAllowed(origin, config.allowOrigins)) {
          jsonReply(res, 403, { ok: false, error: 'Origin not allowed' });
          return;
        }

        const bodyResult = await readBody(req);
        if (bodyResult === 413) {
          jsonReply(res, 413, {
            ok: false,
            error: 'Payload Too Large',
            limit: MAX_BODY_BYTES,
          });
          return;
        }
        const bodyText = bodyResult;
        const fetchRequest = new Request(`http://localhost${APPLY_PATH}`, {
          method: 'POST',
          headers: buildFetchHeaders(req),
          body: bodyText,
        });

        const fetchResponse = await applyHandler(fetchRequest);
        const responseBody = await fetchResponse.clone().text();
        const corsHeaders = buildCorsHeaders(origin as string);
        await pipeFetchResponse(res, fetchResponse, corsHeaders);
        logApplyOutcome(config.quiet, responseBody);
        return;
      }

      // ----- /apply with other methods is handled above; fall through -----

      // 404 for any other path
      jsonReply(res, 404, { ok: false, error: 'Not found' });
    } catch (err) {
      console.error('[design-token-panel] Unhandled error:', err);
      if (!res.headersSent) {
        jsonReply(res, 500, { ok: false, error: 'Internal server error' });
      } else {
        res.end();
      }
    }
  };
}

function attachLifecycle(server: Server, port: number): void {
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[design-token-panel] port ${port} already in use`);
      process.exit(1);
    }
    console.error('[design-token-panel] Server error:', err);
    process.exit(1);
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    server.close(() => {
      // Bare `process.exit(0)` here is intentional — once the http server
      // has closed all sockets, there is nothing left for Node to do.
      process.exit(0);
    });
    // Belt + suspenders: if `close` hangs (lingering keep-alive socket etc.)
    // give it a generous window then force-exit so SIGINT/SIGTERM stays
    // responsive in noisy dev environments.
    setTimeout(() => {
      console.error(`[design-token-panel] force-exiting after ${signal}`);
      process.exit(0);
    }, 5000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function main(): void {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[design-token-panel] ${(err as Error).message}`);
    console.error('');
    console.error('Run --help for usage.');
    process.exit(1);
  }

  if (parsed.help) {
    process.stdout.write(HELP_TEXT);
    process.exit(0);
  }

  const config = buildRuntimeConfig(parsed);

  let routing;
  try {
    routing = loadRoutingFromFile(config.routingPath);
  } catch (err) {
    console.error(`[design-token-panel] Failed to load routing: ${(err as Error).message}`);
    process.exit(1);
  }

  const applyHandler = createApplyHandler({
    rootDir: config.rootDir,
    writeRoot: config.writeRoot,
    routing,
  });

  const server = createServer(buildRequestListener({ applyHandler, config }));
  attachLifecycle(server, config.port);

  server.listen(config.port, config.host, () => {
    if (!config.quiet) {
      // Resolve the actual bound port from the server's address. When the user
      // passes --port 0, the kernel assigns a free port and `config.port`
      // (the requested value) stays at 0 — printing that here would be a lie.
      // We surface the live port instead so --port 0 callers can read the
      // assigned port from this line.
      const addr = server.address();
      const livePort = typeof addr === 'object' && addr ? addr.port : config.port;
      console.log(
        `[design-token-panel] listening on http://${config.host}:${livePort} ` +
          `(writeRoot: ${config.writeRoot})`,
      );
      if (config.allowOrigins.length === 0) {
        console.log(
          '[design-token-panel] WARNING: no --allow-origin set; browser POST /apply will be rejected.',
        );
      }
    }
  });
}

// Only run when executed directly (preserves importability for tests).
const invokedDirectly = (() => {
  if (typeof process.argv[1] !== 'string') return false;
  try {
    // Node ESM doesn't expose `require.main === module`; compare resolved URLs.
    const argvUrl = new URL(`file://${resolve(process.argv[1])}`).href;
    const metaUrl = import.meta.url;
    return argvUrl === metaUrl;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main();
}
