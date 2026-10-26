import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const panel = join(root, 'packages/zdtp');
const skipBuild = process.argv.includes('--skip-build');
assert.ok(process.argv.slice(2).every((arg) => arg === '--skip-build'), 'Unknown option');
const scratch = await mkdtemp(join(tmpdir(), 'zdtp-dashboard-client-'));
let browser, server;
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ok(!result.error && !result.signal && result.status === 0,
    `${command} ${args.join(' ')} failed: ${result.error ?? ''}${result.stdout}${result.stderr}`);
}
try {
  assert.ok(!(await realpath(scratch)).startsWith((await realpath(root)) + sep));
  if (!skipBuild) run('pnpm', ['--filter', '@takazudo/zdtp', 'build']);
  run('pnpm', ['--filter', '@takazudo/zdtp', 'pack', '--pack-destination', scratch]);
  const tarballs = (await readdir(scratch)).filter((file) => file.endsWith('.tgz'));
  assert.equal(tarballs.length, 1);
  await cp(join(root, 'scripts/fixtures/dashboard-client-consumer'), scratch, { recursive: true });
  await writeFile(join(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  const version = async (name) => JSON.parse(await readFile(join(panel, 'node_modules', name, 'package.json'), 'utf8')).version;
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false',
    join(scratch, tarballs[0]), `@takazudo/zfb@${await version('@takazudo/zfb')}`,
    `vite@${await version('vite')}`, `typescript@${await version('typescript')}`], scratch);
  const manifest = JSON.parse(await readFile(join(scratch, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies.preact, undefined, 'Host must not declare Preact');
  const installed = join(scratch, 'node_modules/@takazudo/zdtp');
  const packed = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(packed.dependencies.preact, undefined, 'Package must not depend on Preact');
  assert.equal(packed.peerDependencies?.preact, undefined);
  // The dashboard client renders with the host's zudo-react, an optional zfb peer.
  assert.equal(packed.peerDependenciesMeta?.['@takazudo/zfb']?.optional, true);
  const require = createRequire(join(scratch, 'package.json'));
  for (const entry of ['./dashboard/client', './dashboard/styles.css']) {
    const target = packed.exports[entry];
    assert.ok(target);
    await readFile(join(installed, typeof target === 'string' ? target : target.import));
  }
  run(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'], scratch);
  run(process.execPath, [join(scratch, 'node_modules/vite/bin/vite.js'), 'build'], scratch);
  const outputFiles = await readdir(join(scratch, 'dist/assets'));
  const scripts = await Promise.all(outputFiles.filter((file) => file.endsWith('.js')).map((file) => readFile(join(scratch, 'dist/assets', file), 'utf8')));
  assert.ok(scripts.some((source) => source.includes('Blue token')));
  assert.ok(scripts.every((source) => !source.includes('tokenpanel-shell') && !source.includes('@tailwindcss/browser')),
    'Client bundle must not initialize the root panel or optional compiler');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = path === '/' ? 'index.html' : path.slice(1);
    if (file.includes('..')) { response.writeHead(400).end(); return; }
    try {
      response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
      response.end(await readFile(join(scratch, 'dist', file)));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
  const { chromium } = createRequire(join(panel, 'package.json'))('playwright');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => errors.push(`Failed request: ${request.url()}`));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.dashboardDemo.abandonImport());
  assert.equal(await page.locator('#dashboard-host .zdtp-dashboard').count(), 0, 'Abandoned import must not mount');
  await page.evaluate(() => window.dashboardDemo.mount());
  assert.equal(await page.locator('#dashboard-host .zdtp-dashboard').count(), 1);
  assert.ok((await page.locator('#dashboard-host').textContent()).includes('Blue token'));
  assert.equal(await page.locator('.zdtp-dashboard__sample--color').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(37, 99, 235)');
  assert.equal(await page.locator('.zdtp-dashboard').evaluate((element) => getComputedStyle(element).borderTopStyle), 'solid');
  await page.evaluate(() => window.dashboardDemo.dispose());
  assert.equal(await page.locator('#dashboard-host').textContent(), '');
  await page.evaluate(() => window.dashboardDemo.mount('Remounted dashboard'));
  assert.equal(await page.locator('#dashboard-host .zdtp-dashboard').count(), 1);
  assert.ok((await page.locator('#dashboard-host').textContent()).includes('Remounted dashboard'));
  assert.equal(await page.locator('#dashboard-host').getAttribute('data-owned-by'), 'host');
  assert.equal(await page.locator('#host-ui').textContent(), 'Host UI stays here');
  assert.equal(await page.locator('.tokenpanel-shell').count(), 0);
  assert.deepEqual(errors, [], 'No page or console errors');
  console.log(`Packed dashboard client browser consumer: PASS (${tarballs[0]}, no host Preact, pinned Chromium)`);
} finally {
  await browser?.close();
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
  await rm(scratch, { recursive: true, force: true });
}
