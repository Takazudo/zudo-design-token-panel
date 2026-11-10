import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = resolve(packageRoot, '../..');

async function waitForSidecar(process: ChildProcess, port: number, output: () => string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`zdtp-server exited before becoming ready (${process.exitCode})\n${output()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
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

async function clickPanelAction(page: Page, label: string): Promise<void> {
  const inlineAction = page.locator('.tokenpanel-header > .tokenpanel-action-link').getByText(label, {
    exact: true,
  });
  if (await inlineAction.isVisible()) {
    await inlineAction.click();
    return;
  }

  await page.getByRole('button', { name: 'Panel actions' }).click();
  await page.locator('.tokenpanel-actions-popover').getByText(label, { exact: true }).click();
}

for (const demo of [
  {
    name: 'wind',
    root: join(repositoryRoot, 'demos/zudowind'),
    origin: 'http://127.0.0.1:44331',
    sidecarPort: 24691,
    api: 'zdtpZudowind',
  },
  {
    name: 'cssmodules',
    root: join(repositoryRoot, 'demos/cssmodules'),
    origin: 'http://127.0.0.1:44341',
    sidecarPort: 24693,
    api: 'zdtpCssmodules',
  },
] as const) {
test(`${demo.name} card spacing survives export, reload, import, and real-bin apply`, async ({ page }) => {
  test.setTimeout(90_000);

  const writeRoot = await mkdtemp(join(tmpdir(), 'zdtp-e2e-'));
  const stylesDir = join(writeRoot, 'styles');
  const stylesheetPath = join(stylesDir, 'tokens.css');
  await mkdir(stylesDir);
  await writeFile(stylesheetPath, await readFile(join(demo.root, 'styles/tokens.css')));
  await writeFile(join(writeRoot, 'scaffold.routing.json'), '{"demo":"styles/tokens.css"}\n');

  let serverOutput = '';
  const sidecar = spawn(
    process.execPath,
    [
      join(packageRoot, 'dist/bin/server.js'),
      '--write-root', writeRoot,
      '--routing', join(writeRoot, 'scaffold.routing.json'),
      '--port', String(demo.sidecarPort),
      '--allow-origin', demo.origin,
    ],
    { cwd: writeRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  sidecar.stdout?.on('data', (chunk) => { serverOutput += String(chunk); });
  sidecar.stderr?.on('data', (chunk) => { serverOutput += String(chunk); });

  try {
    await waitForSidecar(sidecar, demo.sidecarPort, () => serverOutput);
    await page.goto(`${demo.origin}/`);
    await page.waitForFunction((api) => {
      const value = (window as unknown as Record<string, { showDesignPanel?: () => void }>)[api];
      return typeof value?.showDesignPanel === 'function';
    }, demo.api);
    await page.evaluate((api) => {
      (window as unknown as Record<string, { showDesignPanel(): void }>)[api].showDesignPanel();
    }, demo.api);

    const hostElement = page.locator('[data-token-card]').first();
    const input = page.getByLabel('--demo-space-card value');
    await expect(input).toBeVisible();
    await expect(hostElement).toHaveCSS('padding-top', '20px');
    await input.fill('2');
    await input.dispatchEvent('input');
    await expect(hostElement).toHaveCSS('padding-top', '32px');

    await clickPanelAction(page, 'Export');
    const exportDialog = page.locator('[data-design-token-panel-modal-variant="export"]');
    await expect(exportDialog).toBeVisible();
    const exportedJson = await exportDialog.locator('[role="none"]').textContent();
    expect(exportedJson).toContain('"--demo-space-card": "2rem"');
    await exportDialog.getByText('Close', { exact: true }).click();

    // zfb's dev runtime can detach the frame while Playwright waits for the
    // `load` event from `page.reload()`. Navigating to the same URL is still a
    // full document reload, but lets Playwright observe the new document
    // through its normal goto lifecycle without that race.
    await page.goto(page.url(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((api) => {
      const value = (window as unknown as Record<string, { showDesignPanel?: () => void }>)[api];
      return typeof value?.showDesignPanel === 'function';
    }, demo.api);
    await page.evaluate((api) => {
      (window as unknown as Record<string, { showDesignPanel(): void }>)[api].showDesignPanel();
    }, demo.api);
    await expect(hostElement).toHaveCSS('padding-top', '32px');
    await expect(page.getByLabel('--demo-space-card value')).toHaveValue('2');

    await clickPanelAction(page, 'Load from JSON…');
    const importDialog = page.locator('[data-design-token-panel-modal-variant="import"]');
    await importDialog.locator('textarea').fill(exportedJson ?? '');
    await importDialog.getByText('Load', { exact: true }).click();
    await expect(importDialog.getByRole('status')).toContainText('Loaded.');
    await importDialog.getByText('Close', { exact: true }).click();

    await clickPanelAction(page, 'Apply');
    const applyDialog = page.locator('[data-design-token-panel-modal-variant="apply"]');
    await expect(applyDialog).toBeVisible();
    // Exercise the modal's primary write action. The routed basename is shown
    // in the preview, while the action label summarizes selected files/tokens.
    await applyDialog.getByRole('button', { name: /^Write 1 file \(1 token/ }).click();
    await expect(applyDialog.getByRole('status')).toContainText('Applied successfully.');

    await expect.poll(async () => readFile(stylesheetPath, 'utf8')).toContain(
      '--demo-space-card: 2rem;',
    );
  } finally {
    await stopSidecar(sidecar);
    await rm(writeRoot, { recursive: true, force: true });
  }
});
}
