import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, mkdir, readFile, writeFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { dirname, resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const panel = join(root, 'packages/zdtp');
const args = process.argv.slice(2);
let keep = false, skipBuild = false, output;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--keep') keep = true;
  else if (args[i] === '--skip-build') skipBuild = true;
  else if (args[i] === '--output-dir' && args[i + 1] && !args[i + 1].startsWith('--')) output = resolve(args[++i]);
  else throw new Error(`Unknown or incomplete option: ${args[i]}`);
}
// Acquire the machine-wide browser slot before creating any owned resources.
const guard = join(homedir(), '.claude/scripts/playwright-guard.sh');
if (!process.env.CI && !process.env.PW_GUARD_HELD && existsSync(guard)) {
  const result = spawnSync('bash', [guard, '--wait', '300', '--', process.execPath, fileURLToPath(import.meta.url), ...args], { stdio: 'inherit', timeout: 1_200_000 });
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
const scratch = await mkdtemp(join(tmpdir(), 'zdtp-dashboard-consumer-'));
const evidence = { scratch, checks: [], subprocesses: [] };
let browser, server, activeChild;
let interrupted = false;
function killChild(child) {
  if (!child) return;
  try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { /* Already exited. */ }
}
function interrupt() {
  interrupted = true;
  process.exitCode = 1;
  killChild(activeChild);
  void browser?.close().catch(() => {});
}
process.on('SIGTERM', interrupt);
process.on('SIGINT', interrupt);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function run(command, argv, cwd = root) {
  assert.ok(!interrupted, 'Consumer check interrupted');
  evidence.stage = [command, ...argv].join(' ');
  const result = await new Promise((accept, reject) => {
    // Own a process group so a timed-out package-manager child cannot leave its
    // compiler/build subprocess running against an installation being deleted.
    const child = spawn(command, argv, { cwd, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' } });
    activeChild = child;
    let output = '', timedOut = false;
    const collect = (chunk) => { output = (output + chunk).slice(-16000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const timer = setTimeout(() => {
      timedOut = true;
      killChild(child);
    }, 300_000);
    child.once('error', (error) => { clearTimeout(timer); activeChild = undefined; reject(error); });
    child.once('close', (status, signal) => { clearTimeout(timer); activeChild = undefined; accept({ status, signal, output, timedOut }); });
  });
  evidence.subprocesses.push({ command: [command, ...argv], ...result });
  assert.ok(!result.timedOut && !result.signal && result.status === 0,
    `${command} failed (${result.signal ?? result.status}): ${result.output}`);
}
async function saveEvidence() {
  if (!output) return;
  await mkdir(output, { recursive: true });
  for (const name of ['index.html', 'dashboard.css', 'host.css']) {
    const source = join(scratch, 'dist', name);
    if (existsSync(source)) await cp(source, join(output, name));
  }
  await writeFile(join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
}
try {
  assert.ok(!(await realpath(scratch)).startsWith((await realpath(root)) + sep), 'Consumer must be outside workspace');
  if (!skipBuild) await run('pnpm', ['--filter', '@takazudo/zdtp', 'build']);
  await run('pnpm', ['--filter', '@takazudo/zdtp', 'pack', '--pack-destination', scratch]);
  const tarballs = (await readdir(scratch)).filter((name) => name.endsWith('.tgz'));
  assert.equal(tarballs.length, 1);
  const tarball = join(scratch, tarballs[0]);
  evidence.tarball = { name: tarballs[0], sha256: hash(await readFile(tarball)) };
  await cp(join(root, 'scripts/fixtures/dashboard-consumer'), scratch, { recursive: true });
  await writeFile(join(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module', scripts: { build: 'tsc -p tsconfig.json && node build.mjs' } }, null, 2));
  const peers = ['preact', 'preact-render-to-string', 'typescript'];
  evidence.versions = Object.fromEntries(await Promise.all(peers.map(async (name) => [name, JSON.parse(await readFile(join(panel, 'node_modules', name, 'package.json'), 'utf8')).version])));
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', tarball,
    ...peers.map((name) => `${name}@${evidence.versions[name]}`)], scratch);
  const consumerRequire = createRequire(join(scratch, 'package.json'));
  const compiler = await realpath(consumerRequire.resolve('typescript/bin/tsc'));
  assert.ok(compiler.startsWith(join(scratch, 'node_modules') + sep));
  await run(process.execPath, [compiler, '-p', 'tsconfig.json'], scratch);
  await run(process.execPath, ['build.mjs'], scratch);
  evidence.resolutions = JSON.parse(await readFile(join(scratch, 'resolution.json'), 'utf8'));
  evidence.resolutions.compiler = compiler;
  for (const [name, path] of Object.entries(evidence.resolutions)) assert.ok(path.startsWith(join(scratch, 'node_modules') + sep), `${name} escaped isolated installation`);
  assert.deepEqual(await readFile(join(scratch, 'dist/dashboard.css')), await readFile(evidence.resolutions.styles), 'Copied public CSS bytes');
  assert.equal(evidence.resolutions.dashboardPreact, evidence.resolutions.preact, 'Dashboard and app share Preact');
  evidence.cssSha256 = hash(await readFile(evidence.resolutions.styles));
  const require = createRequire(join(panel, 'package.json'));
  const { chromium } = await import(require.resolve('playwright'));
  let missingCss = false;
  server = createServer(async (request, response) => {
    const paths = { '/': 'index.html', '/dashboard.css': 'dashboard.css', '/host.css': 'host.css' };
    const name = paths[request.url];
    if (!name || (missingCss && name === 'dashboard.css')) { response.writeHead(404); response.end('Not found'); return; }
    try {
      response.writeHead(200, { 'Content-Type': name.endsWith('.css') ? 'text/css' : 'text/html', 'Cache-Control': 'no-store' });
      response.end(await readFile(join(scratch, 'dist', name)));
    } catch { response.destroy(); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  const url = `http://127.0.0.1:${server.address().port}/`;
  assert.ok(!interrupted, 'Consumer check interrupted');
  browser = await chromium.launch({ headless: true });
  async function visit(width, mutation = false) {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const problems = [], missing = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('requestfailed', (request) => problems.push(`Failed: ${request.url()}`));
    page.on('request', (request) => { if (![url, `${url}host.css`, `${url}dashboard.css`].includes(request.url())) problems.push(`Unexpected request: ${request.url()}`); });
    page.on('response', (response) => {
      if (mutation && response.url() === `${url}dashboard.css` && response.status() === 404) missing.push(response.url());
      else if (response.status() !== 200) problems.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      assert.deepEqual(problems, [], 'Resource/page errors');
      assert.equal(missing.length, mutation ? 1 : 0);
      return page;
    } catch (error) { await page.close(); throw error; }
  }
  async function verifyStyles(page) {
    const actual = await page.locator('#light [data-css-var="--consumer-size"] .zdtp-dashboard__sample').evaluate((element) => {
      const css = getComputedStyle(element);
      return { fontSize: css.fontSize, margin: css.margin, padding: css.padding, display: css.display };
    });
    assert.deepEqual(actual, { fontSize: '24px', margin: '0px', padding: '0px', display: 'block' }, 'PUBLIC_CSS_APPLIED');
  }
  const order = ['pale', 'deep', 'surface', 'zero', 'space', 'alias', 'large', 'missing', 'size', 'family', 'weight', 'leading'].map((name) => `--consumer-${name}`);
  for (const width of [1280, 360]) {
    const page = await visit(width);
    try {
      await verifyStyles(page);
      assert.equal(await page.locator('script, img, .tokenpanel-shell').count(), 0);
      assert.equal(await page.locator('[role="listitem"]').count(), 36);
      for (const id of ['light', 'dark', 'compact']) {
        assert.deepEqual(await page.locator(`#${id} [data-css-var]`).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-css-var'))), order);
        assert.equal(await page.locator(`#${id} [data-css-var="--consumer-missing"] [data-diagnostic]`).count(), 1);
        assert.equal(await page.locator(`#${id} [data-css-var="--consumer-missing"] .zdtp-dashboard__sample`).count(), 0);
        assert.equal(await page.locator(`#${id} .zdtp-dashboard__palette [role="listitem"]`).count(), 2);
        for (const [name, expected] of [['zero', 0], ['space', 32], ['alias', 32], ['large', 1536]]) {
          const size = await page.locator(`#${id} [data-css-var="--consumer-${name}"] .zdtp-dashboard__sample`).evaluate((element) => element.getBoundingClientRect().width);
          assert.ok(Math.abs(size - expected) < 0.1, `${id}/${name} exact ruler: ${size}`);
        }
        const sample = (name) => page.locator(`#${id} [data-css-var="--consumer-${name}"] .zdtp-dashboard__sample`);
        assert.equal(await sample('surface').evaluate((e) => getComputedStyle(e).backgroundColor), id === 'dark' ? 'rgb(24, 36, 58)' : 'rgb(238, 244, 255)');
        assert.equal(await sample('leading').evaluate((e) => getComputedStyle(e).lineHeight), '43.2px');
        assert.equal(await sample('family').evaluate((e) => getComputedStyle(e).fontFamily), 'serif');
        assert.equal(await sample('weight').evaluate((e) => getComputedStyle(e).fontWeight), '700');
        const passage = await sample('size').textContent();
        assert.ok(passage.includes('\n\n好きな文章で行間を確認します。\n<img src=x onerror=alert(1)> & plain text'));
        assert.ok((await sample('size').boundingBox()).height > 72, 'Long text wraps');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow');
      const scroll = page.locator('#compact [data-css-var="--consumer-large"] .zdtp-dashboard__ruler-scroll');
      await page.keyboard.press('Tab');
      await scroll.focus();
      assert.equal(await scroll.evaluate((e) => e === document.activeElement && getComputedStyle(e).outlineStyle !== 'none'), true, 'Visible keyboard focus');
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('#compact [data-css-var="--consumer-large"] .zdtp-dashboard__ruler-scroll').scrollLeft > 0);
      if (output) { await mkdir(output, { recursive: true }); await page.screenshot({ path: join(output, `dashboard-${width}.png`), fullPage: true }); }
      evidence.checks.push(`JavaScript-disabled ${width}px and compact: PASS`);
    } finally { await page.close(); }
  }
  missingCss = true;
  const broken = await visit(360, true);
  try {
    await assert.rejects(() => verifyStyles(broken), (error) => error.code === 'ERR_ASSERTION' && error.message.includes('PUBLIC_CSS_APPLIED'));
    evidence.checks.push('Missing public CSS rejected by shared style verifier: PASS');
  } finally { await broken.close(); missingCss = false; }
  const recovered = await visit(360);
  try { await verifyStyles(recovered); evidence.checks.push('Fresh-page CSS recovery: PASS'); } finally { await recovered.close(); }
  assert.ok(!interrupted, 'Consumer check interrupted');
  evidence.status = 'passed';
  console.log(evidence.checks.join('\n'));
} catch (error) {
  evidence.status = 'failed'; evidence.error = error.stack;
  process.exitCode = 1;
  console.error(error);
} finally {
  try {
    const closed = await Promise.allSettled([
      browser?.close(),
      server && new Promise((accept) => { server.closeAllConnections(); server.close(accept); }),
    ]);
    evidence.resourceCleanup = closed.map((result) => result.status);
    if (closed.some((result) => result.status === 'rejected')) process.exitCode = 1;
    await saveEvidence();
  } finally {
    if (keep) console.log(`Retained consumer: ${scratch}\nRebuild: cd ${scratch} && npm run build\nServe: python3 -m http.server --bind 127.0.0.1 --directory ${scratch}/dist 8080`);
    else await rm(scratch, { recursive: true, force: true });
    evidence.cleanup = keep ? 'retained by request' : 'removed';
    if (output) await writeFile(join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
  }
}
