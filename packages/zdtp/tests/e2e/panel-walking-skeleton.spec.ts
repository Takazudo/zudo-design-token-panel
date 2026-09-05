import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = resolve(packageRoot, '../..');
const playgroundRoot = join(repositoryRoot, 'playground');
const sidecarPort = 24685;

async function waitForSidecar(process: ChildProcess, output: () => string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`zdtp-server exited before becoming ready (${process.exitCode})\n${output()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${sidecarPort}/`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.status < 500) return;
    } catch {
      // The socket is expected to reject until the server starts listening.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Timed out waiting for zdtp-server\n${output()}`);
}

async function stopSidecar(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null) return;
  process.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolveExit) => process.once('exit', () => resolveExit())),
    new Promise<void>((resolveWait) => setTimeout(resolveWait, 2_000)),
  ]);
  if (process.exitCode === null) process.kill('SIGKILL');
}

test('spacing tweak survives export, reload, import, and real-bin apply', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error('The E2E baseURL is required');

  const writeRoot = await mkdtemp(join(tmpdir(), 'zdtp-e2e-'));
  const stylesDir = join(writeRoot, 'styles');
  const stylesheetPath = join(stylesDir, 'global.css');
  await mkdir(stylesDir);
  await writeFile(stylesheetPath, await readFile(join(playgroundRoot, 'styles/global.css')));
  await writeFile(join(writeRoot, 'scaffold.routing.json'), '{"zfb":"styles/global.css"}\n');

  let serverOutput = '';
  const sidecar = spawn(
    process.execPath,
    [
      join(packageRoot, 'dist/bin/server.js'),
      '--write-root', writeRoot,
      '--routing', join(writeRoot, 'scaffold.routing.json'),
      '--port', String(sidecarPort),
      '--allow-origin', baseURL,
    ],
    { cwd: writeRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  sidecar.stdout?.on('data', (chunk) => { serverOutput += String(chunk); });
  sidecar.stderr?.on('data', (chunk) => { serverOutput += String(chunk); });

  try {
    await waitForSidecar(sidecar, () => serverOutput);
    await page.goto('/');
    await page.waitForFunction(() => typeof window.zfb?.showDesignPanel === 'function');
    await page.evaluate(() => window.zfb?.showDesignPanel());

    const hostElement = page.locator('.zfb-nav');
    const input = page.getByLabel('--zfb-hsp-md value');
    await expect(input).toBeVisible();
    await expect(hostElement).toHaveCSS('padding-left', '16px');
    await input.fill('1.25');
    await input.dispatchEvent('input');
    await expect(hostElement).toHaveCSS('padding-left', '20px');

    await page.getByText('Export', { exact: true }).first().click();
    const exportDialog = page.locator('[data-design-token-panel-modal-variant="export"]');
    await expect(exportDialog).toBeVisible();
    const exportedJson = await exportDialog.locator('[role="none"]').textContent();
    expect(exportedJson).toContain('"--zfb-hsp-md": "1.25rem"');
    await exportDialog.getByText('Close', { exact: true }).click();

    // zfb's dev runtime can detach the frame while Playwright waits for the
    // `load` event from `page.reload()`. Navigating to the same URL is still a
    // full document reload, but lets Playwright observe the new document
    // through its normal goto lifecycle without that race.
    await page.goto(page.url(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.zfb?.showDesignPanel === 'function');
    await page.evaluate(() => window.zfb?.showDesignPanel());
    await expect(hostElement).toHaveCSS('padding-left', '20px');
    await expect(page.getByLabel('--zfb-hsp-md value')).toHaveValue('1.25');

    await page.getByText('Load from JSON…', { exact: true }).first().click();
    const importDialog = page.locator('[data-design-token-panel-modal-variant="import"]');
    await importDialog.locator('textarea').fill(exportedJson ?? '');
    await importDialog.getByText('Load', { exact: true }).click();
    await expect(importDialog.getByRole('status')).toContainText('Loaded.');
    await importDialog.getByText('Close', { exact: true }).click();

    await page.getByText('Apply', { exact: true }).first().click();
    const applyDialog = page.locator('[data-design-token-panel-modal-variant="apply"]');
    await expect(applyDialog).toBeVisible();
    // Exercise the modal's primary write action. The routed basename is shown
    // in the preview, while the action label summarizes selected files/tokens.
    await applyDialog.getByRole('button', { name: /^Write 1 file \(1 token/ }).click();
    await expect(applyDialog.getByRole('status')).toContainText('Applied successfully.');

    await expect.poll(async () => readFile(stylesheetPath, 'utf8')).toContain(
      '--zfb-hsp-md: 1.25rem;',
    );
  } finally {
    await stopSidecar(sidecar);
    await rm(writeRoot, { recursive: true, force: true });
  }
});

declare global {
  interface Window {
    zfb?: { showDesignPanel(): void };
  }
}
