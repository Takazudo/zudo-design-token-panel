import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(packageRoot, 'test-results/pack');

function run(command, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

const scratchRoot = await mkdtemp(join(tmpdir(), 'zdtp-pack-smoke-'));
const packDir = join(scratchRoot, 'pack');
const appDir = join(scratchRoot, 'app');
await mkdir(packDir);
await mkdir(appDir);
await mkdir(outputDir, { recursive: true });
process.once('exit', () => rmSync(scratchRoot, { recursive: true, force: true }));

await run('pnpm', ['pack', '--pack-destination', packDir], packageRoot);
const tarballs = (await readdir(packDir)).filter((name) => name.endsWith('.tgz'));
if (tarballs.length !== 1) {
  throw new Error(`Expected one packed tarball, found ${tarballs.length}`);
}

const tarball = join(packDir, tarballs[0]);
await writeFile(join(appDir, 'package.json'), JSON.stringify({
  name: 'zdtp-packed-consumer-smoke',
  private: true,
  type: 'module',
  dependencies: {
    '@takazudo/zdtp': `file:${tarball}`,
    preact: '^10.29.1',
  },
}, null, 2));
await run('pnpm', ['install', '--no-frozen-lockfile', '--ignore-scripts'], appDir);

await writeFile(join(appDir, 'index.html'), '<div id="app"></div><script type="module" src="/smoke.js"></script>\n');
await writeFile(join(appDir, 'smoke.js'), `
import * as panel from '@takazudo/zdtp';
import * as astro from '@takazudo/zdtp/astro';
import '@takazudo/zdtp/styles';

window.__zdtpSmoke = { entry: Object.keys(panel), astro: Object.keys(astro) };
const handle = panel.configurePanel({
  storagePrefix: 'packed-consumer-smoke',
  consoleNamespace: 'packedConsumerSmoke',
  modalClassPrefix: 'packed-consumer-smoke-modal',
  schemaId: 'packed-consumer-smoke/v1',
  exportFilenameBase: 'packed-consumer-smoke',
  tabs: [{
    id: 'spacing',
    label: 'Spacing',
    tiers: [{
      id: 'raw',
      label: 'Raw spacing',
      items: [{
        id: 'space-sm',
        cssVar: '--space-sm',
        label: 'Small',
        default: '8px',
        type: { kind: 'length', step: 1, unit: 'px' },
      }],
    }],
  }],
});
handle.open();
`);

const vite = await createServer({
  root: appDir,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0, strictPort: false },
});
let browser;
let context;
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not expose a TCP port');

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext();
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
  const smoke = await page.evaluate(() => window.__zdtpSmoke);
  if (!smoke?.entry.includes('configurePanel')) throw new Error('Package entry did not import');
  if (!smoke?.astro.includes('configurePanel')) throw new Error('Astro subpath did not import');
  if (errors.length > 0) throw new Error(`Packed browser smoke emitted errors:\n${errors.join('\n')}`);
  await context.tracing.stop();
  console.log(`Packed tarball mounted successfully: ${tarballs[0]}`);
} catch (error) {
  if (context) {
    await context.tracing.stop({ path: join(outputDir, 'trace.zip') }).catch(() => undefined);
  }
  throw error;
} finally {
  await context?.close();
  await browser?.close();
  await vite.close();
}
