import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const TRIGGER_SELECTOR = '#design-token-trigger';
const PANEL_STORAGE_PREFIX = 'zudo-doc-tweak';
const PANEL_ROOT_ID = `${PANEL_STORAGE_PREFIX}-root`;
const PANEL_CHUNK_MARKER = 'tokenpanel-shell';
const TIMEOUT_MS = 15_000;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolveValue) => { resolvePromise = resolveValue; });
  return { promise, resolve: resolvePromise };
}

async function findPanelChunks(distDir) {
  const assetsDir = resolve(distDir, 'assets');
  const files = await readdir(assetsDir, { withFileTypes: true });
  const panelChunks = [];

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.js')) continue;
    const source = await readFile(resolve(assetsDir, file.name), 'utf8');
    if (source.includes(PANEL_CHUNK_MARKER)) panelChunks.push(`/assets/${file.name}`);
  }

  check(
    panelChunks.length > 0,
    `Built packed doc has no JavaScript asset containing ${PANEL_CHUNK_MARKER}`,
  );
  return new Set(panelChunks);
}

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

async function startBuiltDoc(distDir) {
  const root = resolve(distDir);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      let filePath = resolve(root, `.${pathname}`);
      const escapedRoot = relative(root, filePath).startsWith(`..${sep}`) || relative(root, filePath) === '..';
      if (escapedRoot) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      let fileStat;
      try {
        fileStat = await stat(filePath);
      } catch {
        filePath = resolve(filePath, 'index.html');
        fileStat = await stat(filePath);
      }
      if (fileStat.isDirectory()) {
        filePath = resolve(filePath, 'index.html');
        fileStat = await stat(filePath);
      }
      if (!fileStat.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }

      response.writeHead(200, {
        'content-type': CONTENT_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      if (request.method === 'HEAD') response.end();
      else response.end(await readFile(filePath));
    } catch (error) {
      response.writeHead(404).end('Not found');
      if (process.env.DEBUG_PACKED_REMOUNT) console.error(error);
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  check(address && typeof address !== 'string', 'Static doc server did not expose a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, reject) => {
      server.close((error) => error ? reject(error) : resolveClose());
    }),
  };
}

function lifecycleProbeInitScript() {
  return `(() => {
    const probe = window.__packedRemountProbe = {
      triggerClicks: 0,
      toggleEvents: 0,
      clickProofs: [],
      swapClicks: [],
      pageLoads: [],
      timeline: [],
      armedClick: null,
    };
    const storagePrefix = '${PANEL_STORAGE_PREFIX}';
    const rootIdentityIds = new WeakMap();
    let nextRootIdentityId = 1;
    const apiReady = () => Boolean(
      window.zdtp &&
      typeof window.zdtp.show === 'function' &&
      typeof window.zdtp.hide === 'function' &&
      typeof window.zdtp.toggle === 'function'
    );
    const pending = () => Math.max(0, probe.triggerClicks - probe.toggleEvents);
    const rootIdentity = (root) => {
      if (!root) return null;
      if (!rootIdentityIds.has(root)) rootIdentityIds.set(root, nextRootIdentityId++);
      return rootIdentityIds.get(root);
    };
    probe.identityFor = rootIdentity;
    const rootStatus = () => {
      const root = document.getElementById('${PANEL_ROOT_ID}');
      const mountedRoots = window.__zudoDesignTokenPanelMountedRoots;
      const bindings = window.__zudoDesignTokenPanelInstanceBindings;
      const lifecycle = window.__zudoDesignTokenPanelLifecycle;
      const identity = rootIdentity(root);
      probe.lastRootIdentity = identity;
      return {
        rootIdentity: identity,
        rootConnected: Boolean(root && root.isConnected),
        rootChildren: root?.childElementCount ?? 0,
        rootOwned: mountedRoots instanceof Map && mountedRoots.get(storagePrefix) === root,
        mountedPrefixes: mountedRoots instanceof Map ? [...mountedRoots.keys()] : null,
        bindingPrefixes: bindings instanceof Map ? [...bindings.keys()] : null,
        lifecycleCleanups: Array.isArray(lifecycle?.cleanups) ? lifecycle.cleanups.length : null,
      };
    };
    const record = (name, details = {}) => {
      probe.timeline.push({ name, path: location.pathname, time: performance.now(), ...details, ...rootStatus() });
    };
    const snapshot = (stage) => {
      const root = document.getElementById('${PANEL_ROOT_ID}');
      const shells = [...document.querySelectorAll('.tokenpanel-shell')];
      probe.pageLoads.push({
        stage,
        path: location.pathname,
        rootIdentity: rootIdentity(root),
        rootCount: document.querySelectorAll('#${PANEL_ROOT_ID}').length,
        rootConnected: Boolean(root && root.isConnected),
        rootChildren: root?.childElementCount ?? 0,
        shellCount: shells.length,
        shellConnected: shells.every((shell) => shell.isConnected),
        visible: shells.length === 1 && !shells[0].hidden && getComputedStyle(shells[0]).visibility !== 'hidden',
        ...rootStatus(),
      });
    };

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('${TRIGGER_SELECTOR}') : null;
      if (!target) return;
      probe.triggerClicks += 1;
      probe.clickProofs.push({
        path: location.pathname,
        ready: apiReady(),
        pending: pending(),
        eventsBefore: probe.toggleEvents,
      });
      record('header-click', probe.clickProofs.at(-1));
    }, true);
    window.addEventListener('toggle-design-token-panel', () => {
      probe.toggleEvents += 1;
      record('public-toggle-design-token-panel', { toggleEvents: probe.toggleEvents, pending: pending() });
    });

    document.addEventListener('zfb:before-swap', () => {
      record('zfb:before-swap');
      snapshot('zfb:before-swap');
    });
    document.addEventListener('zfb:after-swap', () => {
      record('zfb:after-swap');
      snapshot('zfb:after-swap-start');
      const arm = probe.armedClick;
      if (!arm) return;
      probe.armedClick = null;
      const button = document.querySelector('${TRIGGER_SELECTOR}');
      const proof = {
        label: arm.label,
        path: location.pathname,
        visible: Boolean(button && !button.hidden && button.isConnected && button.getClientRects().length > 0),
        ready: apiReady(),
        pending: pending(),
        eventsBefore: probe.toggleEvents,
        ...rootStatus(),
      };
      if (proof.visible) button.click();
      queueMicrotask(() => {
        proof.eventsAfter = probe.toggleEvents;
        proof.pendingAfter = pending();
        Object.assign(proof, rootStatus());
        record('after-swap-header-click-complete', proof);
      });
      probe.swapClicks.push(proof);
    });
    document.addEventListener('zfb:page-load', () => {
      record('zfb:page-load');
      snapshot('zfb:page-load');
      queueMicrotask(() => snapshot('after-zfb:page-load-microtask'));
      requestAnimationFrame(() => snapshot('after-zfb:page-load-frame'));
    });
  })();`;
}

function publicApiReady(probe) {
  return Boolean(
    probe && probe.ready === true &&
    typeof probe.pending === 'number',
  );
}

async function waitForZfbEvent(page, eventName) {
  return page.evaluate(({ eventName, timeoutMs }) => new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      document.removeEventListener(eventName, onEvent);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    const onEvent = () => {
      window.clearTimeout(timeout);
      resolve({ path: location.pathname, time: performance.now() });
    };
    document.addEventListener(eventName, onEvent, { once: true });
  }), { eventName, timeoutMs: TIMEOUT_MS });
}

async function waitForPublicEvents(page) {
  await page.waitForFunction(() => {
    const probe = window.__packedRemountProbe;
    return probe && probe.triggerClicks === probe.toggleEvents;
  }, null, { timeout: TIMEOUT_MS });
}

async function panelDiagnostics(page) {
  return page.evaluate(({ rootId, storagePrefix }) => {
    const root = document.getElementById(rootId);
    const shells = [...document.querySelectorAll('.tokenpanel-shell')];
    const mountedRoots = window.__zudoDesignTokenPanelMountedRoots;
    const bindings = window.__zudoDesignTokenPanelInstanceBindings;
    const lifecycle = window.__zudoDesignTokenPanelLifecycle;
    return {
      route: location.pathname,
      rootCount: document.querySelectorAll(`#${rootId}`).length,
      rootConnected: Boolean(root && root.isConnected),
      rootIdentity: window.__packedRemountProbe.identityFor(root),
      rootOwned: mountedRoots instanceof Map && mountedRoots.get(storagePrefix) === root,
      mountedPrefixes: mountedRoots instanceof Map ? [...mountedRoots.keys()] : null,
      bindingPrefixes: bindings instanceof Map ? [...bindings.keys()] : null,
      lifecycleCleanups: Array.isArray(lifecycle?.cleanups) ? lifecycle.cleanups.length : null,
      rootChildren: root?.childElementCount ?? 0,
      rootHtmlLength: root?.innerHTML.length ?? 0,
      shellCount: shells.length,
      shellConnected: shells.every((shell) => shell.isConnected),
      shellVisible: shells.length === 1 && !shells[0].hidden && getComputedStyle(shells[0]).visibility !== 'hidden',
      panelApi: Boolean(window.zdtp && typeof window.zdtp.toggle === 'function'),
      probe: {
        triggerClicks: window.__packedRemountProbe.triggerClicks,
        toggleEvents: window.__packedRemountProbe.toggleEvents,
        swapClicks: window.__packedRemountProbe.swapClicks,
        pageLoads: window.__packedRemountProbe.pageLoads,
        timeline: window.__packedRemountProbe.timeline,
      },
    };
  }, { rootId: PANEL_ROOT_ID, storagePrefix: PANEL_STORAGE_PREFIX });
}

async function assertPanelState(page, visible, label) {
  const shell = page.locator('.tokenpanel-shell');
  if (visible) await shell.waitFor({ state: 'visible', timeout: TIMEOUT_MS });
  else await shell.waitFor({ state: 'hidden', timeout: TIMEOUT_MS });

  const diagnostics = await panelDiagnostics(page);
  check(diagnostics.rootCount === 1 && diagnostics.rootConnected,
    `${label}: expected one connected panel root; ${JSON.stringify(diagnostics)}`);
  if (visible) {
    check(diagnostics.rootChildren > 0 && diagnostics.rootHtmlLength > 0,
      `${label}: expected a populated panel root; ${JSON.stringify(diagnostics)}`);
    check(diagnostics.mountedPrefixes === null || diagnostics.rootOwned,
      `${label}: connected root is not the root owned by the active Preact mount; ${JSON.stringify(diagnostics)}`);
    check(diagnostics.shellCount === 1 && diagnostics.shellConnected,
      `${label}: expected exactly one connected panel shell; ${JSON.stringify(diagnostics)}`);
  } else {
    check(diagnostics.shellCount === 0,
      `${label}: expected the closed panel to have no rendered shell; ${JSON.stringify(diagnostics)}`);
  }
  check(diagnostics.shellVisible === visible,
    `${label}: expected shell visible=${visible}; ${JSON.stringify(diagnostics)}`);
  return diagnostics;
}

async function assertPageLoadSnapshot(page, expectedPath, label, { populated = true, visible } = {}) {
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame())));
  const state = await panelDiagnostics(page);
  check(
    state.route === expectedPath,
    `${label}: expected route ${expectedPath}, received ${state.route}`,
  );
  const snapshots = await page.evaluate(() => window.__packedRemountProbe.pageLoads);
  check(
    snapshots.some((snapshot) =>
      snapshot.path === expectedPath && snapshot.stage === 'zfb:page-load'),
    `${label}: no zfb:page-load snapshot for ${expectedPath}: ${JSON.stringify(snapshots)}`,
  );
  if (populated) {
    const afterPageLoad = snapshots.filter((snapshot) =>
      snapshot.path === expectedPath && snapshot.stage === 'after-zfb:page-load-frame').at(-1);
    check(afterPageLoad,
      `${label}: missing post-page-load frame snapshot for ${expectedPath}: ${JSON.stringify(snapshots)}`);
    try {
      await page.locator('.tokenpanel-shell').waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    } catch {
      throw new Error(`${label}: shell stayed absent after zfb:page-load: ${JSON.stringify(await panelDiagnostics(page))}`);
    }
    const mounted = await panelDiagnostics(page);
    check(mounted.rootCount === 1 && mounted.rootConnected && mounted.rootChildren > 0,
      `${label}: zfb:page-load did not leave one connected populated root: ${JSON.stringify(mounted)}`);
    check(mounted.mountedPrefixes === null || mounted.rootOwned,
      `${label}: zfb:page-load root identity is not owned by the active Preact mount: ${JSON.stringify(mounted)}`);
    check(mounted.shellCount === 1 && mounted.shellConnected,
      `${label}: zfb:page-load did not leave exactly one connected shell: ${JSON.stringify(mounted)}`);
    if (visible !== undefined) {
      check(mounted.shellVisible === visible,
        `${label}: expected page-load shell visible=${visible}: ${JSON.stringify(mounted)}`);
    }
  } else if (visible === false) {
    const afterPageLoad = snapshots.filter((snapshot) =>
      snapshot.path === expectedPath && snapshot.stage === 'after-zfb:page-load-frame').at(-1);
    check(afterPageLoad && afterPageLoad.rootCount === 1 && afterPageLoad.rootConnected,
      `${label}: zfb:page-load lost the connected root while the panel was closed: ${JSON.stringify(afterPageLoad)}`);
    check(afterPageLoad.shellCount === 0,
      `${label}: zfb:page-load rendered a shell after the header closed it: ${JSON.stringify(afterPageLoad)}`);
  }
  return state;
}

function installBrowserErrorCapture(page, errors) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`));
}

async function provePrehydrationClick(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  installBrowserErrorCapture(page, errors);

  const scriptsGate = deferred();
  const heldScripts = [];
  await page.addInitScript(lifecycleProbeInitScript());
  await page.route('**/*.js*', async (route) => {
    heldScripts.push(route.request().url());
    await scriptsGate.promise;
    await route.continue();
  });

  try {
    await page.goto(`${origin}/`, { waitUntil: 'commit' });
    const trigger = page.locator(TRIGGER_SELECTOR);
    await trigger.waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    await page.waitForFunction(() => window.__zdtpToggleShimInstalled === true,
      null, { timeout: TIMEOUT_MS });
    const before = await page.evaluate(() => ({
      ready: Boolean(window.zdtp && typeof window.zdtp.toggle === 'function'),
      clicks: window.__packedRemountProbe.triggerClicks,
      events: window.__packedRemountProbe.toggleEvents,
    }));
    check(!before.ready, `Prehydration control started after the bootstrap became ready: ${JSON.stringify(before)}`);

    await trigger.click();
    const earlyClick = await page.evaluate(() => ({
      ...window.__packedRemountProbe.clickProofs.at(-1),
      clicks: window.__packedRemountProbe.triggerClicks,
      events: window.__packedRemountProbe.toggleEvents,
    }));
    check(earlyClick.ready === false && earlyClick.clicks === 1,
      `Header click did not occur before bootstrap readiness: ${JSON.stringify(earlyClick)}`);
    check(heldScripts.length > 0, 'Prehydration control did not hold the consumer JavaScript bundle');

    scriptsGate.resolve();
    await page.waitForFunction(() => Boolean(
      window.zdtp && typeof window.zdtp.toggle === 'function',
    ), null, { timeout: TIMEOUT_MS });
    try {
      await page.waitForFunction(() => window.__packedRemountProbe.toggleEvents === 2,
        null, { timeout: TIMEOUT_MS });
    } catch (error) {
      const state = await panelDiagnostics(page);
      console.error('Prehydration diagnostics:', JSON.stringify({
        triggerClicks: state.probe.triggerClicks,
        toggleEvents: state.probe.toggleEvents,
        timeline: state.probe.timeline,
      }));
      throw error;
    }
    // The click dispatches once before hydration; zudo-doc's inline capture
    // replays that same intent after bootstrap, so both events are observable.
    await assertPanelState(page, true, 'prehydration click replay');
    check(errors.length === 0, `Prehydration flow emitted browser errors: ${errors.join(' | ')}`);
    console.log('PASS packed prehydration: one early header click was delivered after bootstrap and mounted one shell');
  } finally {
    scriptsGate.resolve();
    await context.close();
  }
}

function panelChunksLoaded(page, paths) {
  return page.evaluate((expectedPaths) => performance.getEntriesByType('resource')
    .some((entry) => expectedPaths.includes(new URL(entry.name).pathname)), [...paths]);
}

async function armAfterSwapHeaderClick(page, label) {
  await page.evaluate((clickLabel) => {
    window.__packedRemountProbe.armedClick = { label: clickLabel };
  }, label);
}

async function assertAfterSwapClick(page, label, { requireReady = true } = {}) {
  const result = await page.evaluate((clickLabel) => ({
    proof: window.__packedRemountProbe.swapClicks.find((click) => click.label === clickLabel),
    timeline: window.__packedRemountProbe.timeline,
  }), label);
  const { proof, timeline } = result;
  const details = JSON.stringify({ proof, timeline });
  check(proof?.visible, `${label}: public header trigger was not visible inside zfb:after-swap: ${details}`);
  if (requireReady) {
    check(publicApiReady(proof), `${label}: expected ready public bootstrap with no queued clicks: ${details}`);
  }
  check(proof.eventsAfter - proof.eventsBefore === 1 && proof.pendingAfter === 0,
    `${label}: expected exactly one public toggle event and no pending click: ${details}`);
  return proof;
}

async function proveSpaRemount(browser, origin, panelChunkPaths) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  installBrowserErrorCapture(page, errors);
  let releasePanelChunk;
  const panelChunkGate = new Promise((resolveGate) => { releasePanelChunk = resolveGate; });
  let heldPanelChunk = false;
  const heldPanelChunkRequest = deferred();
  await page.addInitScript(lifecycleProbeInitScript());
  await page.route('**/*.js*', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!panelChunkPaths.has(pathname)) {
      await route.continue();
      return;
    }
    heldPanelChunk = true;
    heldPanelChunkRequest.resolve();
    await panelChunkGate;
    await route.continue();
  });
  page.once('close', () => releasePanelChunk());

  try {
    await page.goto(`${origin}/`, { waitUntil: 'load' });
    const initialResources = await panelChunksLoaded(page, panelChunkPaths);
    check(!initialResources, 'The real panel implementation was loaded before the first header activation');
    const cleanStorage = await page.evaluate((expectedPrefix) => ({
      keys: Object.keys(localStorage).filter((key) => key.startsWith(expectedPrefix)),
    }), PANEL_STORAGE_PREFIX);
    check(cleanStorage.keys.length === 0,
      `SPA regression started with persisted panel state: ${cleanStorage.keys.join(', ')}`);

    const panelRequest = page.waitForRequest((request) =>
      panelChunkPaths.has(new URL(request.url()).pathname), { timeout: TIMEOUT_MS });
    await armAfterSwapHeaderClick(page, 'first-host-to-engine');
    const firstSwap = waitForZfbEvent(page, 'zfb:after-swap');
    const firstPageLoad = waitForZfbEvent(page, 'zfb:page-load');
    await page.getByRole('link', { name: 'Getting Started', exact: true }).first().click();
    await firstSwap;
    const firstClick = await assertAfterSwapClick(page, 'first-host-to-engine', { requireReady: false });
    check(firstClick.path.startsWith('/docs/getting-started'),
      `First transition did not reach the engine doc route: ${JSON.stringify(firstClick)}`);
    const loadedRequest = await panelRequest;
    let holdTimeout;
    try {
      await Promise.race([
        heldPanelChunkRequest.promise,
        new Promise((_, reject) => {
          holdTimeout = setTimeout(() => reject(new Error('Timed out holding packed panel chunk')), TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(holdTimeout);
    }
    check(heldPanelChunk, `The lazy panel chunk was not held for a deterministic first activation: ${loadedRequest.url()}`);
    const beforeRelease = await panelDiagnostics(page);
    check(beforeRelease.shellCount === 0,
      `Panel rendered before its packed implementation chunk was released: ${JSON.stringify(beforeRelease)}`);

    releasePanelChunk();
    await firstPageLoad;
    await page.waitForFunction(() => document.querySelector('.tokenpanel-shell')?.isConnected,
      null, { timeout: TIMEOUT_MS });
    const firstEnginePath = new URL(page.url()).pathname;
    await assertPageLoadSnapshot(page, firstEnginePath, 'first host-to-engine transition', { populated: false });
    const firstOpenState = await assertPanelState(page, true, 'first lazy header activation');
    check(firstOpenState.mountedPrefixes === null ||
      (firstOpenState.mountedPrefixes.length === 1 && firstOpenState.mountedPrefixes.includes(PANEL_STORAGE_PREFIX)),
    `Expected one mounted panel root owner after first activation: ${JSON.stringify(firstOpenState)}`);
    check(firstOpenState.bindingPrefixes?.filter((prefix) => prefix === PANEL_STORAGE_PREFIX).length === 1,
    `Expected one public toggle binding after first activation: ${JSON.stringify(firstOpenState)}`);
    check(typeof firstOpenState.lifecycleCleanups === 'number',
      `Could not inspect lifecycle cleanup registration after first activation: ${JSON.stringify(firstOpenState)}`);
    const expectedLifecycleCleanups = firstOpenState.lifecycleCleanups;
    const expectedBindingPrefixes = [...firstOpenState.bindingPrefixes].sort();
    const title = (await page.locator('.tokenpanel-title').textContent())?.trim();
    check(title?.startsWith('zdtp'), `Expected real packed panel title, received ${title}`);
    const tabs = await page.locator('[role="tab"]').allTextContents();
    check(tabs.some((tab) => tab.trim() === 'Color'),
      `Expected real zudo-doc Color tab, received ${JSON.stringify(tabs)}`);

    const backSwap = waitForZfbEvent(page, 'zfb:after-swap');
    const backPageLoad = waitForZfbEvent(page, 'zfb:page-load');
    await page.goBack();
    await backSwap;
    await backPageLoad;
    await assertPageLoadSnapshot(page, '/', 'engine-to-host transition', { visible: true });
    await assertPanelState(page, true, 'engine-to-host remount');
    const hostPath = new URL(page.url()).pathname;
    check(hostPath === '/' || hostPath === '', `Expected host home route after back, received ${hostPath}`);

    await armAfterSwapHeaderClick(page, 'second-host-to-engine');
    const forwardSwap = waitForZfbEvent(page, 'zfb:after-swap');
    const forwardPageLoad = waitForZfbEvent(page, 'zfb:page-load');
    await page.goForward();
    await forwardSwap;
    const remountClick = await assertAfterSwapClick(page, 'second-host-to-engine');
    check(remountClick.path.startsWith('/docs/getting-started'),
      `Second transition did not reach the engine doc route: ${JSON.stringify(remountClick)}`);
    await forwardPageLoad;
    const enginePath = new URL(page.url()).pathname;
    await assertPageLoadSnapshot(page, enginePath, 'second host-to-engine transition', { visible: true });
    await assertPanelState(page, true, 'ready header click recovered the panel before page-load');

    const beforeInitialClose = await page.evaluate(() => window.__packedRemountProbe.toggleEvents);
    await page.locator(TRIGGER_SELECTOR).click();
    await waitForPublicEvents(page);
    await assertPanelState(page, false, 'header close after SPA remount');
    const afterInitialClose = await page.evaluate(() => window.__packedRemountProbe.toggleEvents);
    check(afterInitialClose - beforeInitialClose === 1,
      `Close delivered ${afterInitialClose - beforeInitialClose} public toggle events instead of one`);
    const beforeReopen = afterInitialClose;
    await page.locator(TRIGGER_SELECTOR).click();
    await waitForPublicEvents(page);
    await assertPanelState(page, true, 'header reopen after SPA remount');
    const afterReopen = await page.evaluate(() => window.__packedRemountProbe.toggleEvents);
    check(afterReopen - beforeReopen === 1,
      `Reopen delivered ${afterReopen - beforeReopen} public toggle events instead of one`);

    const eventCountBeforeRepeat = afterReopen;
    const repeatBack = waitForZfbEvent(page, 'zfb:after-swap');
    const repeatBackLoad = waitForZfbEvent(page, 'zfb:page-load');
    await page.goBack();
    await repeatBack;
    await repeatBackLoad;
    await assertPageLoadSnapshot(page, '/', 'repeated engine-to-host transition', { visible: true });
    await assertPanelState(page, true, 'repeated engine-to-host remount');

    const repeatForward = waitForZfbEvent(page, 'zfb:after-swap');
    const repeatForwardLoad = waitForZfbEvent(page, 'zfb:page-load');
    await page.goForward();
    await repeatForward;
    await repeatForwardLoad;
    await assertPageLoadSnapshot(page, enginePath, 'repeated host-to-engine transition', { visible: true });
    const repeatedOpenState = await assertPanelState(page, true, 'repeated host-to-engine remount');
    check(repeatedOpenState.mountedPrefixes === null ||
      (repeatedOpenState.mountedPrefixes.length === 1 && repeatedOpenState.mountedPrefixes.includes(PANEL_STORAGE_PREFIX)),
    `Repeated navigation changed panel root ownership: ${JSON.stringify(repeatedOpenState)}`);
    check(JSON.stringify([...repeatedOpenState.bindingPrefixes].sort()) === JSON.stringify(expectedBindingPrefixes),
      `Repeated navigation duplicated or dropped public toggle bindings: ${JSON.stringify(repeatedOpenState)}`);
    check(repeatedOpenState.lifecycleCleanups === expectedLifecycleCleanups,
      `Repeated navigation changed lifecycle listener cleanup count (${expectedLifecycleCleanups} → ${repeatedOpenState.lifecycleCleanups}): ${JSON.stringify(repeatedOpenState)}`);
    const eventCountAfterRepeat = await page.evaluate(() => window.__packedRemountProbe.toggleEvents);
    check(eventCountAfterRepeat === eventCountBeforeRepeat,
      `Navigation replayed ${eventCountAfterRepeat - eventCountBeforeRepeat} unexpected public toggle events`);

    const beforeRepeatClose = eventCountAfterRepeat;
    await page.locator(TRIGGER_SELECTOR).click();
    await waitForPublicEvents(page);
    await assertPanelState(page, false, 'final header close');
    const afterRepeatClose = await page.evaluate(() => window.__packedRemountProbe.toggleEvents);
    check(afterRepeatClose - beforeRepeatClose === 1,
      `Final close delivered ${afterRepeatClose - beforeRepeatClose} public toggle events`);
    const beforeFinalReopen = afterRepeatClose;
    await page.locator(TRIGGER_SELECTOR).click();
    await waitForPublicEvents(page);
    await assertPanelState(page, true, 'final header reopen');
    const afterFinalReopen = await page.evaluate(() => window.__packedRemountProbe.toggleEvents);
    check(afterFinalReopen - beforeFinalReopen === 1,
      `Final reopen delivered ${afterFinalReopen - beforeFinalReopen} public toggle events`);

    check(errors.length === 0, `SPA remount flow emitted browser errors: ${errors.join(' | ')}`);
    const evidence = await page.evaluate(() => ({
      clicks: window.__packedRemountProbe.triggerClicks,
      publicToggleEvents: window.__packedRemountProbe.toggleEvents,
      afterSwapClicks: window.__packedRemountProbe.swapClicks,
      pageLoadRoots: window.__packedRemountProbe.pageLoads.filter((snapshot) =>
        snapshot.stage === 'after-zfb:page-load-frame'),
      eventTimeline: window.__packedRemountProbe.timeline,
    }));
    console.log(`Packed remount evidence: ${JSON.stringify(evidence)}`);
    console.log('PASS packed SPA remount: host→engine→host→engine header clicks, populated root, one shell, and repeat navigation');
  } finally {
    releasePanelChunk();
    await context.close();
  }
}

const hostIndex = process.argv.indexOf('--host');
check(hostIndex >= 0 && process.argv[hostIndex + 1],
  'Usage: node verify-packed-remount-browser.mjs --host <built-doc-dist>');
const distDir = resolve(process.argv[hostIndex + 1]);
const panelChunkPaths = await findPanelChunks(distDir);
const server = await startBuiltDoc(distDir);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  await provePrehydrationClick(browser, server.origin);
  await proveSpaRemount(browser, server.origin, panelChunkPaths);
} finally {
  await browser?.close();
  await server.close();
}
