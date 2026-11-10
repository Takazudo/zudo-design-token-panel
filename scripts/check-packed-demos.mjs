/**
 * Build both demo strategies against a freshly packed @takazudo/zdtp tarball.
 * The temporary consumers live outside the workspace and do not keep the
 * source alias that would resolve packages/zdtp instead of the tarball.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { chromium } from '../packages/zdtp/node_modules/playwright/index.mjs';

const root = resolve(import.meta.dirname, '..');
const requested = process.argv.find((arg) => arg.startsWith('--demo='))?.slice('--demo='.length);
const givenTarball = process.argv.find((arg) => arg.startsWith('--tarball='))?.slice('--tarball='.length);
const demos = [
  { id: 'zudowind', dir: 'demos/zudowind' },
  { id: 'cssmodules', dir: 'demos/cssmodules' },
].filter((demo) => !requested || demo.id === requested);
if (demos.length === 0) throw new Error(`Unknown demo ${requested}`);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  }
  return result.stdout;
}

function hashDist(dir) {
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(dir);
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    hash.update(file.slice(dir.length));
    hash.update(readFileSync(file));
  }
  return hash.digest('hex');
}

const scratch = mkdtempSync(join(tmpdir(), 'zdtp-packed-demos-'));
const packDir = join(scratch, 'pack');
mkdirSync(packDir);
let tarball = givenTarball;
try {
  if (!tarball) {
    if (!process.argv.includes('--skip-build')) run('pnpm', ['--filter', '@takazudo/zdtp', 'build'], root);
    run('pnpm', ['--filter', '@takazudo/zdtp', 'pack', '--pack-destination', packDir], root);
    tarball = join(packDir, readdirSync(packDir).find((name) => name.endsWith('.tgz')));
  }
  const extractDir = join(scratch, 'extract');
  mkdirSync(extractDir);
  run('tar', ['-xzf', tarball, '-C', extractDir], root);
  const packedVersion = JSON.parse(readFileSync(join(extractDir, 'package/package.json'), 'utf8')).version;
  const packedHash = hashDist(join(extractDir, 'package/dist'));
  console.log(`Packed @takazudo/zdtp@${packedVersion} dist ${packedHash}`);

  for (const demo of demos) {
    const app = join(scratch, demo.id);
    cpSync(join(root, demo.dir), app, {
      recursive: true,
      filter: (source) => !source.includes(`${demo.dir}/node_modules`) && !source.includes(`${demo.dir}/dist`) && !source.includes('/.zfb'),
    });
    const manifest = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
    manifest.dependencies['@takazudo/zdtp'] = `file:${tarball}`;
    delete manifest.scripts.prebuild;
    delete manifest.scripts.predev;
    delete manifest.scripts.pretypecheck;
    delete manifest.scripts.prebuildDeploy;
    writeFileSync(join(app, 'package.json'), JSON.stringify(manifest, null, 2));
    const configPath = join(app, 'zfb.config.ts');
    const config = readFileSync(configPath, 'utf8')
      .replace(/\n\s*\{ name: '\.\/plugins\/workspace-zdtp-alias\.mjs' \},?/g, '');
    writeFileSync(configPath, config);
    writeFileSync(join(app, 'config/build-info.generated.ts'), `export const PANEL_VERSION: string = ${JSON.stringify(String(packedVersion))};
export const COMMIT_SHA: string = "packed";
export const BUILT_AT: string = "packed";
export const NPM_LATEST: string = ${JSON.stringify(String(packedVersion))};
export const PROVENANCE: 'released' | 'ahead' | 'unknown' = "unknown";
export const DEPLOY_MODE: boolean = true;
`);
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], app);
    const installed = resolve(app, 'node_modules/@takazudo/zdtp');
    const installedPackage = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
    if (installedPackage.version !== packedVersion) {
      throw new Error(`${demo.id} installed ${installedPackage.version}, expected ${packedVersion}`);
    }
    if (installed.startsWith(join(root, 'packages/zdtp'))) {
      throw new Error(`${demo.id} resolved the workspace package instead of the tarball`);
    }
    const installedHash = hashDist(join(installed, 'dist'));
    if (installedHash !== packedHash) {
      throw new Error(`${demo.id} dist hash ${installedHash} != packed ${packedHash}`);
    }
    run(join(app, 'node_modules/.bin/zfb'), ['build'], app);
    const dist = join(app, 'dist');
    const leaked = spawnSync('grep', ['-R', '-n', '-F', '/api/dev/apply', dist], { encoding: 'utf8' });
    if (leaked.status === 0 && leaked.stdout.trim()) {
      throw new Error(`${demo.id} production build still references Apply\n${leaked.stdout}`);
    }
    if (leaked.status !== 0 && leaked.status !== 1) {
      throw new Error(leaked.stderr || 'grep failed');
    }
    await exercise(demo.id, dist);
    console.log(`${demo.id}: packed tarball build and computed-style chain PASS`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

async function exercise(id, dist) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let path = resolve(dist, `.${pathname}`);
      if (!(path === dist || path.startsWith(`${dist}/`))) throw new Error('escape');
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
      const body = await readFile(path);
      res.setHeader('content-type', path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'text/javascript' : 'text/html');
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => requests.push(request.url()));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    const card = page.locator('[data-token-card]').first();
    await card.waitFor();
    const before = await card.evaluate((element) => getComputedStyle(element).paddingTop);
    if (before !== '20px') throw new Error(`${id} card padding ${before}`);
    await page.evaluate(() => document.documentElement.style.setProperty('--demo-space-card', '40px'));
    const after = await card.evaluate((element) => getComputedStyle(element).paddingTop);
    if (after !== '40px') throw new Error(`${id} override padding ${after}`);
    if (id === 'zudowind') {
      const windSpace = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--zw-spacing-card'));
      if (!windSpace.includes('var(--demo-space-card)')) throw new Error(`Wind spacing token is ${windSpace}`);
    } else {
      const classes = await page.evaluate(() => ({
        card: document.querySelector('[data-token-card] h1')?.className,
        note: document.querySelector('[data-note] h2')?.className,
      }));
      if (!classes.card || !classes.note || classes.card === classes.note || classes.card === 'title') {
        throw new Error(`CSS module classes did not stay scoped: ${JSON.stringify(classes)}`);
      }
    }
    await page.getByRole('button', { name: 'Open token panel', exact: true }).click();
    await page.locator('.tokenpanel-shell').waitFor();
    if (requests.some((url) => url.includes('/api/dev/apply'))) throw new Error(`${id} requested Apply`);
    if (errors.length) throw new Error(errors.join('\n'));
  } finally {
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}
