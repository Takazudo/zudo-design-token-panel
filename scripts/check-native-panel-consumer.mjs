import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { chromium } from '../packages/zdtp/node_modules/playwright/index.mjs';
const root = resolve(import.meta.dirname, '..');
const scratch = mkdtempSync(join(tmpdir(), 'zdtp-native-'));
const pack = join(scratch, 'pack'); const app = join(scratch, 'app');
mkdirSync(pack); cpSync(join(root, 'scripts/fixtures/native-panel-consumer'), app, { recursive: true });
function run(cmd, args, cwd = root) {
 const result = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
 if (result.error || result.signal || result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed\n${result.error ?? ''}${result.stdout}${result.stderr}`);
 console.log(result.stdout);
}
try {
 const published = process.argv.find(arg => arg.startsWith('--published='))?.slice('--published='.length);
 if (!published && !process.argv.includes('--skip-build')) run('pnpm', ['--filter', '@takazudo/zdtp', 'build']);
 if (!published) run('pnpm', ['--filter', '@takazudo/zdtp', 'pack', '--pack-destination', pack]);
 const dependency = published ?? `file:${join(pack, readdirSync(pack).find(name => name.endsWith('.tgz')))}`;
 const host = JSON.parse(readFileSync(join(root, 'playground/package.json'), 'utf8'));
 writeFileSync(join(app, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: {
  '@takazudo/zdtp': dependency, '@takazudo/zfb': host.dependencies['@takazudo/zfb'],
  '@takazudo/zfb-runtime': host.dependencies['@takazudo/zfb-runtime'],
 } }));
 run('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', '--package-lock=false'], app);
 const manifest = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
 assert.equal(manifest.dependencies.preact, undefined);
 const publicCss = readFileSync(join(app, 'styles/global.css'), 'utf8');
 for (const mode of ['public-css', 'self-injection']) {
  writeFileSync(join(app, 'styles/global.css'), mode === 'public-css' ? publicCss : publicCss.replace(/^@import.*\n/, ''));
  run(join(app, 'node_modules/.bin/zfb'), ['build'], app);
  await exercise(mode);
 }
 console.log('Native packed ZFB consumer: public CSS and self-injection, no host Preact, lifecycle/edit/persistence/theme/navigation and lazy compiler graph: PASS');
} finally { rmSync(scratch, { recursive: true, force: true }); }
async function exercise(mode) {
 const dist = join(app, 'dist'); const requests = new Set();
 const server = createServer(async(req, res) => {
  try {
   const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
   let path = resolve(dist, '.' + pathname); assert.ok(path.startsWith(dist + '/') || path === dist);
   if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
   requests.add(path);
   res.setHeader('content-type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html');
   res.end(await readFile(path));
  } catch { res.statusCode = 404; res.end('Not found'); }
 });
 await new Promise(r => server.listen(0, '127.0.0.1', r)); const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin); await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.tokenpanel-shell').count(), 1);
  assert.equal(await page.locator('#preview').evaluate(e => getComputedStyle(e).paddingLeft), '8px');
  const input = page.getByLabel('--space-sm value'); await input.fill('24'); await input.dispatchEvent('input');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#preview')).paddingLeft === '24px');
  await page.waitForFunction(() => Object.values(localStorage).some(value => value.includes('space-sm') && value.includes('24px')));
  for (const route of ['/', '/next/', '/']) {
   await page.goto(origin + route); await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
   await page.waitForFunction(() => getComputedStyle(document.querySelector('#preview')).paddingLeft === '24px');
   assert.equal(await page.getByLabel('--space-sm value').inputValue(), '24');
   await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; document.documentElement.style.colorScheme = 'dark'; window.__nativeHandle.close(); window.__nativeHandle.open(); window.__nativeHandle.toggle(); window.__nativeHandle.toggle(); });
   await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' }); assert.equal(await page.locator('.tokenpanel-shell').count(), 1);
  }
  assert.equal(await page.locator('[data-zdtp-dom-tweaker-tailwind-runtime], [data-zdtp-dom-tweaker-tailwind-runtime-script], style[type="text/tailwindcss"]').count(), 0);
  const compilerChunks = walk(dist).filter(file => file.endsWith('.js') && /@tailwindcss\/browser|data-zdtp-dom-tweaker-tailwind-runtime|tailwind-merge/.test(readFileSync(file, 'utf8')));
  assert.ok(compilerChunks.length, 'Inspect real emitted lazy compiler chunks, not an empty graph');
  assert.deepEqual(compilerChunks.filter(file => requests.has(file)), [], 'Ordinary mounted panel must not request a compiler chunk');
  await page.evaluate(() => window.__nativeHandle.destroy()); assert.equal(await page.locator('.tokenpanel-shell').count(), 0);
  assert.deepEqual(errors, []); console.log(`${mode}: 8→24px, persisted navigation, theme, handle lifecycle, ${compilerChunks.length} compiler chunks emitted but not requested: PASS`);
 } finally { await browser.close(); await new Promise(r => server.close(r)); }
}
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]); }
