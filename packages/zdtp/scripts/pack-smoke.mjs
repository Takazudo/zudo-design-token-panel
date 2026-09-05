import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
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

function cleanModuleId(id) {
  if (!id) return null;
  const withoutQuery = id.split('?')[0];
  return withoutQuery.startsWith('/@fs/') ? withoutQuery.slice('/@fs'.length) : withoutQuery;
}

async function collectModuleGraph(server, entryUrl) {
  const root = await server.moduleGraph.getModuleByUrl(entryUrl);
  if (!root) throw new Error(`Vite module graph has no node for ${entryUrl}`);

  const seen = new Set();
  const pending = [root];
  while (pending.length > 0) {
    const moduleNode = pending.pop();
    if (!moduleNode || seen.has(moduleNode)) continue;
    seen.add(moduleNode);
    for (const imported of moduleNode.importedModules) pending.push(imported);
  }
  return { root, modules: [...seen] };
}

async function assertConstantsModuleGraph(server) {
  const { root, modules } = await collectModuleGraph(server, '/constants-smoke.js');
  const sources = modules.map((moduleNode) => ({
    moduleNode,
    id: cleanModuleId(moduleNode.id),
  }));
  const fixtureEntry = cleanModuleId(root.id);
  const packageModules = sources.filter(({ id }) =>
    id?.includes('/node_modules/@takazudo/zdtp/'),
  );
  if (packageModules.length !== 1) {
    const graphIds = packageModules.map(({ id }) => id ?? '<anonymous>').join('\n  ');
    throw new Error(
      'Packed constants consumer did not resolve exactly one constants implementation module.\n' +
      `Package modules in the transitive graph:\n  ${graphIds || '<none>'}`,
    );
  }

  const constantsModule = packageModules[0]?.id;
  const isViteHarness = (id) =>
    id?.startsWith('/@vite/') ||
    id?.startsWith('\0vite') ||
    id?.includes('/node_modules/vite/') ||
    id?.includes('/node_modules/@vite/');
  const unexpectedModules = sources.filter(({ id }) =>
    id !== fixtureEntry && id !== constantsModule && !isViteHarness(id),
  );
  if (unexpectedModules.length > 0) {
    throw new Error(
      'Packed constants consumer imported unexpected transitive modules:\n  ' +
        unexpectedModules.map(({ id }) => id ?? '<anonymous>').join('\n  '),
    );
  }

  const cssModules = sources.filter(({ id }) => id?.includes('.css'));
  if (cssModules.length > 0) {
    throw new Error(
      `Packed constants consumer imported CSS modules:\n  ${cssModules
        .map(({ id }) => id ?? '<anonymous>')
        .join('\n  ')}`,
    );
  }

  // Keep `root` in this assertion to make it clear that the traversal starts
  // at the constants-only consumer entry, rather than at a package filename.
  if (!modules.includes(root)) throw new Error('Constants module graph traversal lost its root');
}

const scratchRoot = await mkdtemp(join(tmpdir(), 'zdtp-pack-smoke-'));
const packDir = join(scratchRoot, 'pack');
const appDir = join(scratchRoot, 'app');
const constantsAppDir = join(scratchRoot, 'constants-app');
const constantsFixtureDir = join(packageRoot, 'scripts/fixtures/constants-consumer');
await mkdir(packDir);
await mkdir(appDir);
await mkdir(constantsAppDir);
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

await cp(constantsFixtureDir, constantsAppDir, { recursive: true });
await writeFile(join(constantsAppDir, 'package.json'), JSON.stringify({
  name: 'zdtp-packed-constants-consumer-smoke',
  private: true,
  type: 'module',
  dependencies: {
    '@takazudo/zdtp': `file:${tarball}`,
  },
}, null, 2));
await run('pnpm', ['install', '--no-frozen-lockfile', '--ignore-scripts'], constantsAppDir);
// Type-check through the tarball's ./constants declaration target with the
// package's already-installed TypeScript binary. The consumer itself only has
// the packed dependency, so this exercises Node's public exports resolution.
await run(
  'pnpm',
  ['exec', 'tsc', '--noEmit', '--project', join(constantsAppDir, 'tsconfig.json')],
  packageRoot,
);

await writeFile(join(appDir, 'index.html'), '<div id="app"></div><script type="module" src="/smoke.js"></script>\n');
await writeFile(join(appDir, 'smoke.js'), `
import * as panel from '@takazudo/zdtp';
import * as astro from '@takazudo/zdtp/astro';
import '@takazudo/zdtp/styles';

window.__zdtpSmoke = {
  entry: Object.keys(panel),
  astro: {
    keys: Object.keys(astro),
    setPanelColorPresets: typeof astro.setPanelColorPresets,
  },
};
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
const constantsVite = await createServer({
  root: constantsAppDir,
  logLevel: 'error',
  optimizeDeps: { exclude: ['@takazudo/zdtp/constants'] },
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
  if (smoke?.astro?.setPanelColorPresets !== 'function') {
    throw new Error('Astro subpath did not expose setPanelColorPresets');
  }
  if (errors.length > 0) throw new Error(`Packed browser smoke emitted errors:\n${errors.join('\n')}`);

  await constantsVite.listen();
  const constantsAddress = constantsVite.httpServer?.address();
  if (!constantsAddress || typeof constantsAddress === 'string') {
    throw new Error('Vite did not expose a TCP port for the constants consumer');
  }
  errors.length = 0;
  await page.goto(`http://127.0.0.1:${constantsAddress.port}/`);
  await page.waitForFunction(() => Boolean(window.__zdtpConstantsSmoke));
  const constantsSmoke = await page.evaluate(() => window.__zdtpConstantsSmoke);
  const expectedConstants = [
    'DEFAULT_STORAGE_PREFIX',
    'DEFAULT_TOGGLE_EVENT',
    'EAGER_LOAD_GATE_KEY_SUFFIXES',
    'EAGER_LOAD_GATE_STATE_FAMILY',
    'resolveToggleEventName',
  ];
  if (
    !expectedConstants.every((name) => constantsSmoke?.exportedKeys?.includes(name))
  ) {
    throw new Error('Packed constants consumer did not expose every constants export');
  }
  if (constantsSmoke.defaultPrefix !== 'zudo-design-token-panel') {
    throw new Error('Packed constants consumer returned the wrong default storage prefix');
  }
  if (constantsSmoke.defaultToggleEvent !== 'toggle-design-token-panel') {
    throw new Error('Packed constants consumer returned the wrong default toggle event');
  }
  if (constantsSmoke.defaultEvent !== constantsSmoke.defaultToggleEvent) {
    throw new Error('Packed constants consumer did not resolve the default event');
  }
  if (constantsSmoke.customEvent !== 'host:toggle' || !constantsSmoke.stateFamilyMatch) {
    throw new Error('Packed constants consumer did not execute the exported helpers');
  }
  if (
    constantsSmoke.registryPresent ||
    constantsSmoke.registrySize !== 0 ||
    constantsSmoke.globalSideEffects?.length !== 0 ||
    constantsSmoke.panelNodes !== 0 ||
    constantsSmoke.styleNodes !== 0 ||
    constantsSmoke.panelNodes !== constantsSmoke.baseline?.panelNodes ||
    constantsSmoke.styleNodes !== constantsSmoke.baseline?.styleNodes
  ) {
    throw new Error(
      'Packed constants import created panel registry, DOM, or stylesheet side effects',
    );
  }
  await assertConstantsModuleGraph(constantsVite);
  if (errors.length > 0) throw new Error(`Packed browser smoke emitted errors:\n${errors.join('\n')}`);
  await context.tracing.stop();
  console.log(`Packed tarball mounted successfully, including constants isolation: ${tarballs[0]}`);
} catch (error) {
  if (context) {
    await context.tracing.stop({ path: join(outputDir, 'trace.zip') }).catch(() => undefined);
  }
  throw error;
} finally {
  await context?.close();
  await browser?.close();
  await constantsVite.close();
  await vite.close();
}
