// @vitest-environment node
/**
 * Child-process integration test for the bin entry.
 *
 * Spawns the BUILT `dist/bin/server.js` (NOT the TS source) so we exercise
 * the full build wiring: shebang banner, chmod +x, and Vite's bundled output.
 * If you change anything in `src/bin/`, run
 * `pnpm --filter @takazudo/zudo-design-token-panel build` BEFORE re-running
 * this file — the test refuses to run if the bin output is missing.
 *
 * The tests prefer `--port 0` and parse the OS-assigned port from the bin's
 * startup log, except for the EADDRINUSE case where we deliberately reuse a
 * fixed port to provoke the collision.
 */
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN_PATH = resolve(HERE, '../../../dist/bin/server.js');
const STARTUP_LINE_RE = /listening on https?:\/\/[^:]+:(\d+)/;

/**
 * The bin is always spawned with `stdio: ['ignore', 'pipe', 'pipe']`, so its
 * stdin is null and stdout/stderr are readable streams. That matches the
 * `ChildProcessByStdio<null, Readable, Readable>` overload from `node:child_process`.
 */
type BinChild = ChildProcessByStdio<null, Readable, Readable>;

interface SpawnedBin {
  child: BinChild;
  port: number;
  stdout: string[];
  stderr: string[];
}

/**
 * Pick a random high port unlikely to clash with anything in the dev env.
 * We deliberately avoid the OS ephemeral range (49152-65535 on macOS) and
 * common dev-server ports.
 */
function pickFixedPort(): number {
  return 40000 + Math.floor(Math.random() * 5000);
}

/**
 * Wait for `cond` to return true, polling `interval` ms, up to `timeout` ms.
 * Throws with a descriptive message on timeout.
 */
async function waitFor(
  cond: () => boolean,
  {
    timeout = 5000,
    interval = 25,
    label = 'condition',
  }: { timeout?: number; interval?: number; label?: string } = {},
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (cond()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms: ${label}`);
}

/**
 * Spawn the built bin, capture stdout/stderr, and resolve once the bin has
 * printed its startup line. Returns the live (OS-assigned) port parsed from
 * that line.
 *
 * If the bin exits before printing the startup line (e.g. EADDRINUSE), the
 * helper still resolves — callers that expect a live server should assert
 * `child.exitCode === null` before using it. Callers that expect failure
 * (the EADDRINUSE test) get back the captured stderr to inspect.
 */
async function spawnBin(args: string[]): Promise<SpawnedBin> {
  const child = spawn('node', [BIN_PATH, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout: string[] = [];
  const stderr: string[] = [];
  let exited = false;

  child.stdout.setEncoding('utf-8');
  child.stderr.setEncoding('utf-8');
  child.stdout.on('data', (chunk: string) => stdout.push(chunk));
  child.stderr.on('data', (chunk: string) => stderr.push(chunk));
  child.on('exit', () => {
    exited = true;
  });

  let port = -1;
  try {
    await waitFor(
      () => {
        if (exited) return true;
        const match = stdout.join('').match(STARTUP_LINE_RE);
        if (match) {
          port = Number(match[1]);
          return true;
        }
        return false;
      },
      { timeout: 5000, label: 'bin startup line or exit' },
    );
  } catch (err) {
    // Surface what the child printed so failures are debuggable.
    throw new Error(
      `${(err as Error).message}\nstdout: ${stdout.join('')}\nstderr: ${stderr.join('')}`,
    );
  }

  return { child, port, stdout, stderr };
}

/**
 * Best-effort termination: SIGTERM, then SIGKILL after a short grace period.
 * Resolves once the child has actually exited so the next test starts clean.
 */
async function killBin(child: BinChild): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  try {
    await waitFor(() => child.exitCode !== null || child.signalCode !== null, {
      timeout: 2000,
      label: 'child SIGTERM exit',
    });
  } catch {
    child.kill('SIGKILL');
    await waitFor(() => child.exitCode !== null || child.signalCode !== null, {
      timeout: 1000,
      label: 'child SIGKILL exit',
    });
  }
}

interface TmpFixture {
  dir: string;
  routingPath: string;
  tokensPath: string;
}

function makeTmpFixture(): TmpFixture {
  const dir = mkdtempSync(join(tmpdir(), 'dtp-bin-it-'));
  const tokensPath = join(dir, 'tokens.css');
  writeFileSync(tokensPath, ':root {\n  --x-color: red;\n}\n', 'utf-8');
  const routingPath = join(dir, 'routing.json');
  writeFileSync(routingPath, JSON.stringify({ x: 'tokens.css' }), 'utf-8');
  return { dir, routingPath, tokensPath };
}

beforeAll(() => {
  if (!existsSync(BIN_PATH)) {
    throw new Error(
      `[design-token-panel integration test] missing ${BIN_PATH}. ` +
        'Run `pnpm --filter @takazudo/zudo-design-token-panel build` first.',
    );
  }
});

describe('design-token-panel-server bin (integration)', () => {
  const cleanupTasks: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    // Run cleanup in reverse order (children first, then tmpdirs).
    for (const task of cleanupTasks.reverse()) {
      try {
        await task();
      } catch {
        // Swallow cleanup errors so one stuck child doesn't mask test results.
      }
    }
    cleanupTasks.length = 0;
  });

  it('POST /apply happy path rewrites tokens.css and returns the apply envelope', async () => {
    const fix = makeTmpFixture();
    cleanupTasks.push(() => rmSync(fix.dir, { recursive: true, force: true }));

    const allowOrigin = 'http://localhost:9999';
    const bin = await spawnBin([
      '--root',
      fix.dir,
      '--write-root',
      fix.dir,
      '--routing',
      fix.routingPath,
      '--port',
      '0',
      '--allow-origin',
      allowOrigin,
    ]);
    cleanupTasks.push(() => killBin(bin.child));
    expect(bin.child.exitCode).toBeNull();
    expect(bin.port).toBeGreaterThan(0);

    const response = await fetch(`http://127.0.0.1:${bin.port}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: allowOrigin,
      },
      body: JSON.stringify({ tokens: { '--x-color': 'blue' } }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      updated: Array<{ file: string; changed: string[] }>;
    };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.updated)).toBe(true);
    expect(body.updated.length).toBeGreaterThan(0);
    expect(body.updated[0].changed).toContain('--x-color');

    const css = readFileSync(fix.tokensPath, 'utf-8');
    expect(css).toContain('--x-color: blue');
    expect(css).not.toContain('--x-color: red');
  }, 10_000);

  it('POST /apply from a disallowed origin is rejected with 403 and no CORS header', async () => {
    const fix = makeTmpFixture();
    cleanupTasks.push(() => rmSync(fix.dir, { recursive: true, force: true }));

    const bin = await spawnBin([
      '--root',
      fix.dir,
      '--write-root',
      fix.dir,
      '--routing',
      fix.routingPath,
      '--port',
      '0',
      '--allow-origin',
      'http://localhost:9999',
    ]);
    cleanupTasks.push(() => killBin(bin.child));

    const response = await fetch(`http://127.0.0.1:${bin.port}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://evil.example',
      },
      body: JSON.stringify({ tokens: { '--x-color': 'blue' } }),
    });
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  }, 10_000);

  it('OPTIONS /apply preflight from a disallowed origin returns 403', async () => {
    const fix = makeTmpFixture();
    cleanupTasks.push(() => rmSync(fix.dir, { recursive: true, force: true }));

    const bin = await spawnBin([
      '--root',
      fix.dir,
      '--write-root',
      fix.dir,
      '--routing',
      fix.routingPath,
      '--port',
      '0',
      '--allow-origin',
      'http://localhost:9999',
    ]);
    cleanupTasks.push(() => killBin(bin.child));

    const response = await fetch(`http://127.0.0.1:${bin.port}/apply`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://evil.example',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(response.status).toBe(403);
  }, 10_000);

  it('GET /healthz returns 200 with the writeRoot/routing/port shape', async () => {
    const fix = makeTmpFixture();
    cleanupTasks.push(() => rmSync(fix.dir, { recursive: true, force: true }));

    const bin = await spawnBin([
      '--root',
      fix.dir,
      '--write-root',
      fix.dir,
      '--routing',
      fix.routingPath,
      '--port',
      '0',
      '--allow-origin',
      'http://localhost:9999',
    ]);
    cleanupTasks.push(() => killBin(bin.child));

    const response = await fetch(`http://127.0.0.1:${bin.port}/healthz`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      writeRoot: string;
      routing: string;
      port: number;
    };
    expect(body.ok).toBe(true);
    // The bin's healthz currently surfaces the REQUESTED port (0 here).
    // We don't pin that — the contract for the test is just that the
    // payload has the documented keys with reasonable types.
    expect(typeof body.writeRoot).toBe('string');
    expect(typeof body.routing).toBe('string');
    expect(typeof body.port).toBe('number');
  }, 10_000);

  it('a second bin on the same fixed port exits 1 with EADDRINUSE on stderr', async () => {
    const fix = makeTmpFixture();
    cleanupTasks.push(() => rmSync(fix.dir, { recursive: true, force: true }));

    // Defensively retry up to a few different fixed ports — if something
    // else on the machine is squatting on our random pick, the test would
    // misattribute the failure to the bin.
    let firstBin: SpawnedBin | null = null;
    let chosenPort = -1;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = pickFixedPort();
      const bin = await spawnBin([
        '--root',
        fix.dir,
        '--write-root',
        fix.dir,
        '--routing',
        fix.routingPath,
        '--port',
        String(candidate),
        '--allow-origin',
        'http://localhost:9999',
      ]);
      if (bin.child.exitCode === null) {
        firstBin = bin;
        chosenPort = candidate;
        break;
      }
      // Exited immediately — likely EADDRINUSE on a squatted port. Try
      // another candidate.
      await killBin(bin.child);
    }
    if (!firstBin || chosenPort < 0) {
      throw new Error('Could not bind any candidate fixed port for EADDRINUSE test');
    }
    cleanupTasks.push(() => killBin(firstBin!.child));

    // Spawn the second instance on the same port and wait for it to exit.
    const second = spawn(
      'node',
      [
        BIN_PATH,
        '--root',
        fix.dir,
        '--write-root',
        fix.dir,
        '--routing',
        fix.routingPath,
        '--port',
        String(chosenPort),
        '--allow-origin',
        'http://localhost:9999',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    cleanupTasks.push(() => killBin(second));
    const secondStderr: string[] = [];
    second.stderr.setEncoding('utf-8');
    second.stderr.on('data', (chunk: string) => secondStderr.push(chunk));
    const exitCode = await new Promise<number | null>((resolveExit) => {
      second.on('exit', (code) => resolveExit(code));
    });
    expect(exitCode).toBe(1);
    expect(secondStderr.join('')).toMatch(/EADDRINUSE|already in use/i);
  }, 10_000);
});
