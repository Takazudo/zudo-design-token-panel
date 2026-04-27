import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createApplyHandler } from '../create-apply-handler';

// ----- fixtures & helpers -----------------------------------------------------

const TOKENS_CSS_FIXTURE = `/**
 * Zudo Design System - CSS Tokens
 */

:root {
  --zd-p5: oklch(65% 0.2 45); /* accent */
  --zd-p6: oklch(52% 0.01 50);
}

@media (prefers-color-scheme: dark) {
  :root {
    --zd-p5: oklch(10% 0 0);
  }
}
`;

const SECONDARY_TOKENS_CSS_FIXTURE = `:root {
  --secondary-pa7: oklch(65% 0.2 35);
  --secondary-pa8: oklch(50% 0.2 35);
}
`;

async function makeTmpRepo(): Promise<string> {
  const dir = join(tmpdir(), `dtp-server-test-${randomBytes(6).toString('hex')}`);
  await fs.mkdir(join(dir, 'tokens'), { recursive: true });
  await fs.writeFile(
    join(dir, 'tokens/tokens.css'),
    TOKENS_CSS_FIXTURE,
    'utf-8',
  );
  await fs.writeFile(
    join(dir, 'tokens/secondary-tokens.css'),
    SECONDARY_TOKENS_CSS_FIXTURE,
    'utf-8',
  );
  return dir;
}

async function rmTmpRepo(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

function makeRequest(body: unknown, { rawBody }: { rawBody?: string } = {}): Request {
  const payload = rawBody ?? JSON.stringify(body);
  return new Request('http://localhost/api/dev/design-tokens-apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

async function readResponseJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

// ----- tests ------------------------------------------------------------------

describe('createApplyHandler', () => {
  let tmpRepo: string;
  let handler: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    tmpRepo = await makeTmpRepo();
    handler = createApplyHandler({
      rootDir: tmpRepo,
      writeRoot: resolve(tmpRepo, 'tokens'),
      routing: {
        zd: 'tokens/tokens.css',
        secondary: 'tokens/secondary-tokens.css',
      },
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tmpRepo) await rmTmpRepo(tmpRepo);
  });

  // ----- 400 validation cases ------------------------------------------------

  it('returns 400 on invalid JSON', async () => {
    const res = await handler(makeRequest(undefined, { rawBody: '{not json' }));
    expect(res.status).toBe(400);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toMatch(/Invalid JSON/i);
  });

  it('returns 400 when body is not an object', async () => {
    const res = await handler(makeRequest([1, 2, 3]));
    expect(res.status).toBe(400);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toMatch(/must be a JSON object/i);
  });

  it('returns 400 when tokens is missing', async () => {
    const res = await handler(makeRequest({ nope: true }));
    expect(res.status).toBe(400);
    const json = await readResponseJson(res);
    expect(String(json.error)).toMatch(/tokens/i);
  });

  it('returns 400 when tokens is empty', async () => {
    const res = await handler(makeRequest({ tokens: {} }));
    expect(res.status).toBe(400);
    const json = await readResponseJson(res);
    expect(String(json.error)).toMatch(/at least one/i);
  });

  it('returns 400 when a key has an invalid shape (invalid token name)', async () => {
    const res = await handler(makeRequest({ tokens: { 'not-a-var': 'red' } }));
    expect(res.status).toBe(400);
    const json = await readResponseJson(res);
    expect(String(json.error)).toMatch(/Invalid cssVar/i);
  });

  it('returns 400 with rejected list when the prefix is unsupported', async () => {
    const res = await handler(makeRequest({ tokens: { '--foo-bar': 'red' } }));
    expect(res.status).toBe(400);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(false);
    expect(json.rejected).toEqual(['--foo-bar']);
  });

  // ----- 400 path escape -----------------------------------------------------

  it('returns 400 when routing produces a path outside writeRoot', async () => {
    // Override routing with a path that escapes the writeRoot.
    const evilHandler = createApplyHandler({
      rootDir: tmpRepo,
      writeRoot: resolve(tmpRepo, 'tokens'),
      routing: {
        zd: '../../etc/passwd.css',
      },
    });
    const res = await evilHandler(makeRequest({ tokens: { '--zd-p5': 'red' } }));
    expect(res.status).toBe(400);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toMatch(/Path not allowed/i);
  });

  // ----- 409 no :root block --------------------------------------------------

  it('returns 409 when the target file has no top-level :root block', async () => {
    const absPath = join(tmpRepo, 'tokens/tokens.css');
    const rootless = `/* no root block here */\nhtml { color: red; }\n`;
    await fs.writeFile(absPath, rootless, 'utf-8');

    const res = await handler(makeRequest({ tokens: { '--zd-p5': 'oklch(70% 0.3 50)' } }));
    expect(res.status).toBe(409);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toMatch(/:root/);

    // File must remain unchanged.
    const after = await fs.readFile(absPath, 'utf-8');
    expect(after).toBe(rootless);
  });

  // ----- 200 happy path ------------------------------------------------------

  it('writes to target files and reports changed entries (happy path)', async () => {
    const res = await handler(
      makeRequest({
        tokens: {
          '--zd-p5': 'oklch(70% 0.3 50)',
          '--secondary-pa7': 'oklch(70% 0.3 40)',
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(true);
    expect(json.unknownCssVars).toEqual([]);
    expect(json.unchangedCssVars).toEqual([]);
    expect(json.updated).toEqual([
      expect.objectContaining({
        file: 'tokens/tokens.css',
        changed: ['--zd-p5'],
      }),
      expect.objectContaining({
        file: 'tokens/secondary-tokens.css',
        changed: ['--secondary-pa7'],
      }),
    ]);

    const tokensCss = await fs.readFile(
      join(tmpRepo, 'tokens/tokens.css'),
      'utf-8',
    );
    expect(tokensCss).toContain('--zd-p5: oklch(70% 0.3 50);');
    // --zd-p6 was NOT supplied and must remain untouched.
    expect(tokensCss).toContain('--zd-p6: oklch(52% 0.01 50);');
    // The nested @media :root block must be untouched.
    expect(tokensCss).toContain('--zd-p5: oklch(10% 0 0);');

    const secondaryCss = await fs.readFile(
      join(tmpRepo, 'tokens/secondary-tokens.css'),
      'utf-8',
    );
    expect(secondaryCss).toContain('--secondary-pa7: oklch(70% 0.3 40);');
    expect(secondaryCss).toContain('--secondary-pa8: oklch(50% 0.2 35);');
  });

  // ----- idempotent re-apply -------------------------------------------------

  it('reports values already matching the file as unchanged (idempotent re-apply)', async () => {
    const absPath = join(tmpRepo, 'tokens/tokens.css');
    const before = await fs.stat(absPath);

    const res = await handler(makeRequest({ tokens: { '--zd-p5': 'oklch(65% 0.2 45)' } }));
    expect(res.status).toBe(200);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(true);
    expect(json.unchangedCssVars).toEqual(['--zd-p5']);
    expect(json.unknownCssVars).toEqual([]);
    expect(json.updated).toEqual([
      expect.objectContaining({
        file: 'tokens/tokens.css',
        changed: [],
        unchanged: ['--zd-p5'],
      }),
    ]);

    // No tmp file should be left behind after a skipped write.
    const dir = await fs.readdir(join(tmpRepo, 'tokens'));
    expect(dir.some((f) => f.startsWith('.tmp-'))).toBe(false);

    // File content must be byte-identical.
    const after = await fs.readFile(absPath, 'utf-8');
    expect(after).toBe(TOKENS_CSS_FIXTURE);

    // mtime should be unchanged (no rename happened).
    const afterStat = await fs.stat(absPath);
    expect(afterStat.mtimeMs).toBe(before.mtimeMs);
  });

  // ----- atomic rollback when file 2 of 2 fails to write --------------------

  it('rolls back previously-written files when a later write fails (atomic rollback)', async () => {
    const tokensAbsPath = join(tmpRepo, 'tokens/tokens.css');
    const secondaryAbsPath = join(tmpRepo, 'tokens/secondary-tokens.css');

    const originalTokensCss = await fs.readFile(tokensAbsPath, 'utf-8');

    // The first writeFile call succeeds (tokens.css), the second throws.
    let writeCount = 0;
    const writeSpy = vi.spyOn(fs, 'writeFile').mockImplementation(async (path, data, enc) => {
      writeCount++;
      if (writeCount === 2) {
        throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      }
      // Call the real implementation for the first write.
      await (fs.writeFile as unknown as (...a: unknown[]) => Promise<void>).call(
        null,
        path,
        data,
        enc,
      );
    });

    // Restore mocks before the spy intercepts the actual rename too — we only
    // want to simulate the writeFile failure, not rename. We test atomicity at
    // the handler level: the first file gets written (rename applied to disk),
    // then the handler should roll it back when the second file write fails.
    // However, for a cleaner unit-test setup, we'll simulate via the spy on
    // writeFile only for tmp writes and let the real rename run.
    writeSpy.mockRestore();

    // Alternative approach: spy on the second-call rename to fail.
    let renameCount = 0;
    const renameSpy = vi.spyOn(fs, 'rename').mockImplementation(async (src, dest) => {
      renameCount++;
      if (renameCount === 2) {
        throw Object.assign(new Error('rename fail'), { code: 'ENOSPC' });
      }
      // Let the first rename go through normally.
      await (fs.rename as unknown as (...a: unknown[]) => Promise<void>).call(null, src, dest);
    });

    const res = await handler(
      makeRequest({
        tokens: {
          '--zd-p5': 'oklch(99% 0.0 0)',
          '--secondary-pa7': 'oklch(99% 0.0 0)',
        },
      }),
    );

    renameSpy.mockRestore();

    // The handler must report a 500.
    expect(res.status).toBe(500);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(false);

    // After rollback, tokens.css must be back to its original contents.
    const afterTokensCss = await fs.readFile(tokensAbsPath, 'utf-8');
    expect(afterTokensCss).toBe(originalTokensCss);

    // secondary-tokens.css must never have been mutated (the failing write was for it).
    const afterSecondaryCss = await fs.readFile(secondaryAbsPath, 'utf-8');
    expect(afterSecondaryCss).toBe(SECONDARY_TOKENS_CSS_FIXTURE);

    expect(renameCount).toBeGreaterThan(0);
  });
});
