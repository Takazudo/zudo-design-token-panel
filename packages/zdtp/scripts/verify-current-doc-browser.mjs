import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// Complements the unchanged packed-remount regression, which proves early
// activation, held lazy imports, root ownership and repeated listener cleanup.
const args = process.argv.slice(2);
const option = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const dist = option('--host');
const dev = option('--dev');
let origin = option('--origin');
assert.equal([dist, dev, origin].filter(Boolean).length, 1,
  'Usage: node verify-current-doc-browser.mjs --host <dist> | --dev <scratch-doc> | --origin <url>');
const timeout = 30_000;
const processes = [];
let server;
let browser;
let activePage;
const browserLog = [];
let serverOutput = '';
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function ready(url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (processes.some((child) => child.exitCode !== null)) throw new Error(`Dev process exited:\n${serverOutput}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch { /* Wait for the actual server to listen. */ }
    await sleep(200);
  }
  throw new Error(`Server did not become ready: ${url}\n${serverOutput}`);
}
function start(command, cwd) {
  const child = spawn('pnpm', command, { cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  processes.push(child);
  child.stdout.on('data', (chunk) => { serverOutput += chunk; });
  child.stderr.on('data', (chunk) => { serverOutput += chunk; });
  child.on('error', (error) => { serverOutput += String(error); });
}
async function stopProcesses() {
  await Promise.all(processes.map(async (child) => {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise((done) => child.once('exit', done));
    let timer;
    try {
      process.kill(-child.pid, 'SIGTERM');
      await Promise.race([exited, new Promise((done) => { timer = setTimeout(done, 2_000); })]);
      if (child.exitCode === null && child.signalCode === null) {
        process.kill(-child.pid, 'SIGKILL');
        await exited;
      }
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    } finally { clearTimeout(timer); }
  }));
}
async function builtServer(directory) {
  const root = resolve(directory);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
  server = createServer(async (request, response) => {
    try {
      let path = resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`);
      assert(!relative(root, path).startsWith('..'), 'Outside static root');
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
      response.end(await readFile(path));
    } catch { response.writeHead(404).end('Not found'); }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${server.address().port}`;
}
async function settled(page) {
  await page.waitForFunction(() => document.querySelector('#design-token-trigger') &&
    document.querySelector('[data-zfb-island="DocPanelBootstrap"][data-zfb-island-mounted]') &&
    document.querySelector('[data-zd-theme-menu] button') &&
    !document.querySelector('[data-zd-theme-menu] button[data-zd-pending]'));
}
async function spa(page, action, path) {
  const before = await page.evaluate(() => ({
    marker: window.__currentDocProbe.marker,
    swaps: window.__currentDocProbe.swaps,
    loads: window.__currentDocProbe.loads,
  }));
  await action();
  // after-swap precedes runScripts and native island mounting. Complete this
  // navigation before starting the next back/forward operation.
  await page.waitForFunction(({ marker, swaps, loads, path }) => window.__currentDocProbe.marker === marker &&
    window.__currentDocProbe.swaps > swaps && window.__currentDocProbe.loads > loads &&
    window.__currentDocProbe.loadedPath.replace(/\/$/, '') === path.replace(/\/$/, '') &&
    location.pathname.replace(/\/$/, '') === path.replace(/\/$/, ''), { ...before, path });
  await settled(page);
  assert.equal(await page.evaluate(() => window.__currentDocProbe.marker), before.marker,
    `SPA navigation unexpectedly replaced the document: ${path}`);
}
async function history(page, expectedPath) {
  const pending = page.waitForResponse((response) => new URL(response.url()).pathname === expectedPath);
  await page.locator('[data-doc-history-trigger]').click();
  const response = await pending;
  assert(response.ok(), `History response failed: ${response.status()} ${expectedPath}`);
  const data = await response.json();
  assert(Array.isArray(data.entries) && data.entries.length > 0, `Expected real fixture revision history: ${expectedPath}`);
  await page.locator('[data-doc-history-panel][open]').waitFor();
  assert(!/Failed to load|Malformed history/.test(await page.locator('[data-doc-history-panel]').innerText()));
  await page.getByRole('button', { name: 'Close history panel', exact: true }).click();
}
async function panelInvariant(page) {
  return page.evaluate(() => {
    const prefix = 'zudo-doc-tweak';
    const roots = [...document.querySelectorAll(`#${prefix}-root`)];
    const bindings = window.__zudoDesignTokenPanelInstanceBindings;
    return {
      roots: roots.length,
      shells: document.querySelectorAll('.tokenpanel-shell').length,
      bindings: bindings instanceof Map ? [...bindings.keys()].filter((key) => key === prefix).length : null,
      cleanupCount: window.__zudoDesignTokenPanelLifecycle?.cleanups?.length,
    };
  });
}

async function lateImportCancellation() {
  // Production assets expose the actual lazy panel chunk, so interception does
  // not alter application code or substitute a mocked panel implementation.
  const chunks = new Set();
  for (const entry of await readdir(resolve(dist, 'assets'))) {
    if (entry.endsWith('.js') && (await readFile(resolve(dist, 'assets', entry), 'utf8')).includes('tokenpanel-shell')) {
      chunks.add(`/assets/${entry}`);
    }
  }
  assert(chunks.size > 0, 'Missing lazy panel implementation chunk');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(timeout);
  let release;
  const gate = new Promise((done) => { release = done; });
  let held;
  const requested = new Promise((done) => { held = done; });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*.js*', async (route) => {
    if (chunks.has(new URL(route.request().url()).pathname)) {
      held();
      await gate;
    }
    await route.continue();
  });
  try {
    await page.goto(`${origin}/docs/getting-started/`, { waitUntil: 'domcontentloaded' });
    await settled(page);
    await page.locator('#design-token-trigger').click();
    let deadline;
    try {
      await Promise.race([requested, new Promise((_, reject) => {
        deadline = setTimeout(() => reject(new Error('Lazy panel chunk was not requested')), timeout);
      })]);
    } finally { clearTimeout(deadline); }
    await page.evaluate(() => {
      window.__lateRoot = document.getElementById('zudo-doc-tweak-root');
      window.__lateSwap = false;
      document.addEventListener('zfb:after-swap', () => { window.__lateSwap = true; }, { once: true });
    });
    await page.getByRole('link', { name: 'Reference', exact: true }).first().click();
    await page.waitForFunction(() => window.__lateSwap && location.pathname.startsWith('/docs/reference'));
    release();
    await settled(page);
    // A second explicit activation after the cancelled navigation must recover.
    await page.locator('#design-token-trigger').click();
    await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
    const state = await panelInvariant(page);
    assert.equal(state.roots, 1);
    assert.equal(state.shells, 1);
    assert.equal(state.bindings, 1);
    assert(await page.evaluate(() => !window.__lateRoot || window.__lateRoot.isConnected || window.__lateRoot.childElementCount === 0),
      'Late import populated the detached outgoing panel root');
    assert.deepEqual(errors, [], 'Late-import cancellation emitted page errors');
    console.log('PASS current production lazy import: navigate while held, release, recover one owned root without filling detached outgoing root');
  } finally {
    release();
    await context.close();
  }
}

try {
  if (dist) origin = await builtServer(dist);
  if (dev) {
    start(['dev:history'], resolve(dev));
    await ready('http://127.0.0.1:4322/health');
    start(['exec', 'zfb', 'dev', '--host', '127.0.0.1', '--port', '4327'], resolve(dev));
    origin = 'http://127.0.0.1:4327';
    await ready(origin);
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(timeout);
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    browserLog.push(`${message.type()}: ${message.text()}`);
    if (browserLog.length > 100) browserLog.shift();
  });
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) browserLog.push(`main-frame: ${frame.url()}`);
  });
  await page.addInitScript(() => {
    window.__currentDocProbe = { marker: Math.random(), swaps: 0, loads: 0, loadedPath: '', toggles: 0 };
    const record = (event) => console.debug('current-doc-event', JSON.stringify({
      event, path: location.pathname, ...window.__currentDocProbe,
    }));
    record('document-init');
    document.addEventListener('zfb:after-swap', () => { window.__currentDocProbe.swaps++; record('after-swap'); });
    document.addEventListener('zfb:page-load', () => {
      window.__currentDocProbe.loads++;
      window.__currentDocProbe.loadedPath = location.pathname;
      record('page-load');
    });
    document.addEventListener('zfb:navigation-aborted', () => record('navigation-aborted'));
    window.addEventListener('toggle-design-token-panel', () => window.__currentDocProbe.toggles++);
  });

  // Direct loads prove locale route and history wiring separately from SPA.
  for (const [path, language, historyPath] of [
    ['/docs/getting-started/', 'en', '/doc-history/getting-started.json'],
    ['/ja/docs/getting-started/', 'ja', '/doc-history/ja/getting-started.json'],
    ['/ja/docs/getting-started/migration-fallback/', 'ja', '/doc-history/getting-started/migration-fallback.json'],
  ]) {
    const response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
    assert(response.ok(), `Direct route failed: ${path}`);
    await settled(page);
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    if (path.includes('migration-fallback')) {
      assert((await page.locator('[role="note"]').allTextContents()).some((text) => text.includes('翻訳')),
        'JA fallback notice missing');
      await page.getByRole('link', { name: 'Jump to migration anchor', exact: true }).click();
      await page.waitForFunction(() => location.hash === '#migration-anchor');
      assert(await page.locator('#migration-anchor').count(), 'Anchor target missing');
    }
    await history(page, historyPath);
  }

  await page.goto(`${origin}/docs/getting-started/quickstart/`, { waitUntil: 'domcontentloaded' });
  await settled(page);
  const highlighting = await page.locator('.hi-root').evaluateAll((blocks) => ({
    blocks: blocks.length,
    colors: [...new Set(blocks.flatMap((block) => [...block.querySelectorAll('[class*="hi-"]')]
      .map((token) => getComputedStyle(token).color)))],
  }));
  assert(highlighting.blocks > 0 && highlighting.colors.length > 1,
    `Fenced-code semantic highlighting lacks emitted/computed token colors: ${JSON.stringify(highlighting)}`);

  await page.goto(`${origin}/docs/getting-started/`, { waitUntil: 'domcontentloaded' });
  await settled(page);
  await page.getByRole('button', { name: /^Appearance:/ }).click();
  await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  const resizer = page.getByRole('separator', { name: 'Resize sidebar', exact: true });
  await resizer.focus();
  await resizer.press('Home');
  await page.waitForFunction(() => Math.abs(document.getElementById('desktop-sidebar').getBoundingClientRect().width - 192) < 1);
  await resizer.press('ArrowRight');
  await page.waitForFunction(() => Math.abs(document.getElementById('desktop-sidebar').getBoundingClientRect().width - 202) < 1);
  assert.equal(await resizer.getAttribute('aria-valuenow'), '202');
  assert.equal(await page.evaluate(() => localStorage.getItem('zudo-doc-sidebar-width')), '202');
  await page.getByRole('button', { name: 'Hide sidebar', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-sidebar-hidden'));

  // Exercise the actual v6 indexed-search UI. Its published implementation
  // loads search-index.json; it does not call Pagefind's browser API.
  await page.locator('[data-open-search]:visible').click();
  await page.locator('[data-search-input]').fill('token');
  await page.locator('[data-search-results] a').first().waitFor();
  await page.locator('[data-close-search]').click();

  await page.locator('#design-token-trigger').click();
  await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
  await page.getByRole('tab', { name: 'Spacing', exact: true }).click();
  const input = page.getByLabel('--spacing-hsp-md value', { exact: true });
  const navLink = page.locator('[data-header-nav] a[data-nav-category="getting-started"]');
  const previousPadding = await navLink.evaluate((element) => getComputedStyle(element).paddingLeft);
  await input.fill('1.25');
  await input.dispatchEvent('input');
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--spacing-hsp-md').trim() === '1.25rem');
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-header-nav] a[data-nav-category="getting-started"]');
    const expected = 1.25 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Math.abs(parseFloat(getComputedStyle(element).paddingLeft) - expected) < 0.1;
  });
  assert.notEqual(await navLink.evaluate((element) => getComputedStyle(element).paddingLeft), previousPadding,
    'Token edit did not change real header padding');
  const ownership = await panelInvariant(page);
  assert.equal(ownership.roots, 1);
  assert.equal(ownership.shells, 1);
  assert.equal(ownership.bindings, 1);
  assert.equal(typeof ownership.cleanupCount, 'number');
  await page.locator('#design-token-trigger').click();
  await page.locator('.tokenpanel-shell').waitFor({ state: 'hidden' });
  await page.locator('#design-token-trigger').click();
  await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
  assert.equal(await input.inputValue(), '1.25', 'Token edit lost on reopen');
  // Close the overlay so the actual navigation link is hit-tested.
  await page.locator('#design-token-trigger').click();
  await page.locator('.tokenpanel-shell').waitFor({ state: 'hidden' });
  const toggles = await page.evaluate(() => window.__currentDocProbe.toggles);
  await spa(page, () => page.getByRole('link', { name: 'Reference', exact: true }).first().click(), '/docs/reference');
  for (let i = 0; i < 2; i++) {
    await spa(page, () => page.goBack(), '/docs/getting-started');
    await spa(page, () => page.goForward(), '/docs/reference');
  }
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert(await page.locator('html').evaluate((element) => element.hasAttribute('data-sidebar-hidden')));
  assert.equal(await page.evaluate(() => window.__currentDocProbe.toggles), toggles, 'Navigation replayed panel toggle');
  await page.locator('#design-token-trigger').click();
  await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
  await page.getByRole('tab', { name: 'Spacing', exact: true }).click();
  assert.equal(await input.inputValue(), '1.25', 'Token edit lost during SPA remount');
  assert.deepEqual(await panelInvariant(page), ownership, 'Repeated remount leaked roots/listeners');
  assert.equal(await page.evaluate(() => window.__currentDocProbe.toggles), toggles + 1, 'Header click dispatched more than one event');
  await page.goto(page.url(), { waitUntil: 'domcontentloaded' });
  await settled(page);
  await page.locator('.tokenpanel-shell').waitFor({ state: 'visible' });
  await page.getByRole('tab', { name: 'Spacing', exact: true }).click();
  assert.equal(await input.inputValue(), '1.25', 'Token edit lost on reload');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert(await page.locator('html').evaluate((element) => element.hasAttribute('data-sidebar-hidden')));
  await page.locator('#design-token-trigger').click();
  await page.locator('.tokenpanel-shell').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Show sidebar', exact: true }).click();
  await page.waitForFunction(() => Math.abs(document.getElementById('desktop-sidebar').getBoundingClientRect().width - 202) < 1);

  // Reproduce the native History-write rejection fixed in runtime 4.3.1.
  // The supported GET recovery is a document load, not a mismatched URL/DOM.
  await page.evaluate(() => {
    const original = history.pushState;
    history.pushState = function (...parameters) {
      history.pushState = original;
      throw new DOMException('Current-host probe: one rejected History write', 'SecurityError');
    };
    document.addEventListener('zfb:navigation-aborted', () => {
      sessionStorage.setItem('current-doc-rejection', JSON.stringify({
        path: location.pathname,
        heading: document.querySelector('h1')?.textContent,
      }));
    }, { once: true });
    sessionStorage.setItem('current-doc-before-recovery', String(window.__currentDocProbe.marker));
  });
  await page.getByRole('link', { name: 'Getting Started', exact: true }).first().click();
  await page.waitForFunction(() => location.pathname.replace(/\/$/, '') === '/docs/getting-started' &&
    String(window.__currentDocProbe.marker) !== sessionStorage.getItem('current-doc-before-recovery'));
  await settled(page);
  const rejected = await page.evaluate(() => JSON.parse(sessionStorage.getItem('current-doc-rejection')));
  assert.equal(rejected?.path.replace(/\/$/, ''), '/docs/reference', 'Rejected History write altered the outgoing URL before recovery');
  assert(rejected?.heading?.includes('Reference'), 'Rejected navigation swapped outgoing content before recovery');
  await spa(page, () => page.getByRole('link', { name: 'Reference', exact: true }).first().click(), '/docs/reference');
  assert.deepEqual(errors, [], 'Current host emitted browser errors');
  console.log(`PASS current ${dev ? 'dev + real history sidecar' : dist ? 'production' : 'served origin'}: EN/JA/fallback/history/anchor/search/theme/sidebar resize/computed token effect/reopen/SPA/back-forward/persistence/root ownership/History rejection recovery`);
  await context.close();
  if (dist) await lateImportCancellation();
} catch (error) {
  console.error('Current-doc browser timeline:', JSON.stringify(browserLog));
  if (activePage && !activePage.isClosed()) {
    try {
      console.error('Current-doc failure state:', JSON.stringify(await activePage.evaluate(() => ({
        path: location.href,
        probe: window.__currentDocProbe,
        heading: document.querySelector('h1')?.textContent,
        bootstraps: [...document.querySelectorAll('[data-zfb-island="DocPanelBootstrap"]')].map((node) => node.outerHTML),
        tabs: [...document.querySelectorAll('[role="tab"]')].map((node) => node.textContent),
        roots: [...document.querySelectorAll('[id$="-root"]')].filter((node) => node.id.includes('tweak')).map((node) => ({ id: node.id, html: node.innerHTML.slice(0, 6000) })),
        storage: Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('zudo-doc'))),
      }))));
    } catch (diagnosticError) { console.error('Could not capture failure state:', diagnosticError); }
  }
  if (dev) console.error(serverOutput);
  throw error;
} finally {
  const cleanupResults = await Promise.allSettled([browser?.close(), stopProcesses()]);
  if (server) {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
  for (const result of cleanupResults) {
    if (result.status === 'rejected') {
      console.error('Current-doc probe cleanup failed:', result.reason);
      process.exitCode = 1;
    }
  }
}
