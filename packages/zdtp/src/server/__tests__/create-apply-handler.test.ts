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
  --zd-p5: #33ff33; /* accent */
  --zd-p6: #888888;
}

@media (prefers-color-scheme: dark) {
  :root {
    --zd-p5: #1a1a1a;
  }
}
`;

const SECONDARY_TOKENS_CSS_FIXTURE = `:root {
  --secondary-pa7: #dd6644;
  --secondary-pa8: #aa3333;
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

    const res = await handler(makeRequest({ tokens: { '--zd-p5': '#66ff66' } }));
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
          '--zd-p5': '#66ff66',
          '--secondary-pa7': '#33dd33',
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
    expect(tokensCss).toContain('--zd-p5: #66ff66;');
    // --zd-p6 was NOT supplied and must remain untouched.
    expect(tokensCss).toContain('--zd-p6: #888888;');
    // The nested @media :root block must be untouched.
    expect(tokensCss).toContain('--zd-p5: #1a1a1a;');

    const secondaryCss = await fs.readFile(
      join(tmpRepo, 'tokens/secondary-tokens.css'),
      'utf-8',
    );
    expect(secondaryCss).toContain('--secondary-pa7: #33dd33;');
    expect(secondaryCss).toContain('--secondary-pa8: #aa3333;');
  });

  // ----- @theme block support (Tailwind v4, #507 / repro of #496) -----------

  it('rewrites vars across a mixed :root + @theme file (Tailwind v4, #496 repro)', async () => {
    // #496: a Tailwind v4 tokens file keeps a palette var in :root and the
    // design tokens in @theme. Before #507 the @theme vars landed in
    // unknownCssVars; now all three must be rewritten in one pass. All three
    // share one routing prefix so they form a single group (one file write).
    const rel = 'tokens/tailwind.css';
    const absPath = join(tmpRepo, rel);
    const mixed =
      ':root {\n  --tw-palette-cool-700: oklch(0.21 0.03 264);\n}\n\n' +
      '@theme {\n' +
      '  --tw-spacing-md: 0.75rem;\n' +
      '  --tw-color-ink: light-dark(var(--tw-palette-cool-700), #fff);\n' +
      '}\n';
    await fs.writeFile(absPath, mixed, 'utf-8');

    const twHandler = createApplyHandler({
      rootDir: tmpRepo,
      writeRoot: resolve(tmpRepo, 'tokens'),
      routing: { tw: rel },
    });

    const res = await twHandler(
      makeRequest({
        tokens: {
          '--tw-palette-cool-700': 'oklch(0.30 0.03 264)',
          '--tw-spacing-md': '1rem',
          '--tw-color-ink': '#000',
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(true);
    expect(json.unknownCssVars).toEqual([]);

    const changed = (json.updated as Array<{ changed: string[] }>).flatMap((u) => u.changed);
    expect(changed).toContain('--tw-palette-cool-700'); // lives in :root
    expect(changed).toContain('--tw-spacing-md'); // lives in @theme
    expect(changed).toContain('--tw-color-ink'); // lives in @theme

    const after = await fs.readFile(absPath, 'utf-8');
    expect(after).toContain('--tw-palette-cool-700: oklch(0.30 0.03 264);');
    expect(after).toContain('--tw-spacing-md: 1rem;');
    expect(after).toContain('--tw-color-ink: #000;');
  });

  it('no longer 409s for a @theme-only file (no :root) and writes the change', async () => {
    const rel = 'tokens/theme-only.css';
    const absPath = join(tmpRepo, rel);
    const themeOnly = '@theme {\n  --tw-spacing-md: 0.75rem;\n}\n';
    await fs.writeFile(absPath, themeOnly, 'utf-8');

    const twHandler = createApplyHandler({
      rootDir: tmpRepo,
      writeRoot: resolve(tmpRepo, 'tokens'),
      routing: { tw: rel },
    });

    const res = await twHandler(makeRequest({ tokens: { '--tw-spacing-md': '1rem' } }));
    expect(res.status).toBe(200);
    const json = await readResponseJson(res);
    expect(json.ok).toBe(true);
    expect(json.unknownCssVars).toEqual([]);

    const after = await fs.readFile(absPath, 'utf-8');
    expect(after).toContain('--tw-spacing-md: 1rem;');
  });

  // ----- idempotent re-apply -------------------------------------------------

  it('reports values already matching the file as unchanged (idempotent re-apply)', async () => {
    const absPath = join(tmpRepo, 'tokens/tokens.css');
    const before = await fs.stat(absPath);

    const res = await handler(makeRequest({ tokens: { '--zd-p5': '#33ff33' } }));
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
          '--zd-p5': '#fafafa',
          '--secondary-pa7': '#fafafa',
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

  // ----- unknownOutsideBlock diagnostic (#508) -------------------------------

  describe('unknownOutsideBlock diagnostic (#508)', () => {
    it('flags a var declared only in a nested @media { :root { ... } } block', async () => {
      const rel = 'tokens/nested.css';
      const absPath = join(tmpRepo, rel);
      const src =
        ':root {\n  --zd-p5: #111111;\n}\n' +
        '@media (prefers-color-scheme: dark) {\n  :root {\n    --zd-nested-only: #222222;\n  }\n}\n';
      await fs.writeFile(absPath, src, 'utf-8');

      const nestedHandler = createApplyHandler({
        rootDir: tmpRepo,
        writeRoot: resolve(tmpRepo, 'tokens'),
        routing: { zd: rel },
      });

      const res = await nestedHandler(
        makeRequest({ tokens: { '--zd-nested-only': '#333333' } }),
      );
      expect(res.status).toBe(200);
      const json = await readResponseJson(res);
      expect(json.ok).toBe(true);
      expect(json.unknownCssVars).toEqual(['--zd-nested-only']);
      expect(json.unknownOutsideBlockCssVars).toEqual(['--zd-nested-only']);
      expect(json.updated).toEqual([
        expect.objectContaining({
          file: rel,
          unknown: ['--zd-nested-only'],
          unknownOutsideBlock: ['--zd-nested-only'],
        }),
      ]);

      // File must remain unchanged — nothing was rewritable.
      const after = await fs.readFile(absPath, 'utf-8');
      expect(after).toBe(src);
    });

    it('flags a var declared only in a grouped :root, html {} selector', async () => {
      const rel = 'tokens/grouped.css';
      const absPath = join(tmpRepo, rel);
      // A genuine top-level :root block keeps the file 409-free; the target
      // var lives ONLY in the trailing grouped selector, which the scanner
      // does not recognize as a `:root` block.
      const src =
        ':root {\n  --zd-p5: #111111;\n}\n:root, html {\n  --zd-grouped-only: #444444;\n}\n';
      await fs.writeFile(absPath, src, 'utf-8');

      const groupedHandler = createApplyHandler({
        rootDir: tmpRepo,
        writeRoot: resolve(tmpRepo, 'tokens'),
        routing: { zd: rel },
      });

      const res = await groupedHandler(
        makeRequest({ tokens: { '--zd-grouped-only': '#555555' } }),
      );
      expect(res.status).toBe(200);
      const json = await readResponseJson(res);
      expect(json.ok).toBe(true);
      expect(json.unknownCssVars).toEqual(['--zd-grouped-only']);
      expect(json.unknownOutsideBlockCssVars).toEqual(['--zd-grouped-only']);
    });

    it('flags a var declared only in a SECOND top-level :root or @theme block', async () => {
      const rel = 'tokens/second-block.css';
      const absPath = join(tmpRepo, rel);
      const src =
        ':root {\n  --zd-p5: #111111;\n}\n' +
        ':root {\n  --zd-second-root-only: #222222;\n}\n' +
        '@theme {\n  --zd-first-theme: 1rem;\n}\n' +
        '@theme {\n  --zd-second-theme-only: 2rem;\n}\n';
      await fs.writeFile(absPath, src, 'utf-8');

      const secondBlockHandler = createApplyHandler({
        rootDir: tmpRepo,
        writeRoot: resolve(tmpRepo, 'tokens'),
        routing: { zd: rel },
      });

      const res = await secondBlockHandler(
        makeRequest({
          tokens: {
            '--zd-second-root-only': '#333333',
            '--zd-second-theme-only': '3rem',
          },
        }),
      );
      expect(res.status).toBe(200);
      const json = await readResponseJson(res);
      expect(json.ok).toBe(true);
      expect(json.unknownCssVars).toEqual(
        expect.arrayContaining(['--zd-second-root-only', '--zd-second-theme-only']),
      );
      expect(json.unknownOutsideBlockCssVars).toEqual(
        expect.arrayContaining(['--zd-second-root-only', '--zd-second-theme-only']),
      );
    });

    it('leaves a truly-absent var as plain unknown (not in unknownOutsideBlockCssVars)', async () => {
      const res = await handler(makeRequest({ tokens: { '--zd-totally-missing': '#666666' } }));
      expect(res.status).toBe(200);
      const json = await readResponseJson(res);
      expect(json.ok).toBe(true);
      expect(json.unknownCssVars).toEqual(['--zd-totally-missing']);
      expect(json.unknownOutsideBlockCssVars).toEqual([]);
      expect(json.updated).toEqual([
        expect.objectContaining({
          unknown: ['--zd-totally-missing'],
          unknownOutsideBlock: [],
        }),
      ]);
    });
  });
});
