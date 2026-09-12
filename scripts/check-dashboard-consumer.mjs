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
  for (const name of ['index.html', 'dark.html', 'dashboard.css', 'host.css']) {
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
  // require/import conditions legitimately select different files in Preact.
  // Compare package identity while retaining both entry paths as evidence.
  assert.equal(evidence.resolutions.dashboardPreactPackage, evidence.resolutions.preactPackage, 'Dashboard and app share Preact');
  evidence.cssSha256 = hash(await readFile(evidence.resolutions.styles));
  const require = createRequire(join(panel, 'package.json'));
  const { chromium } = require('playwright');
  let missingCss = false;
  server = createServer(async (request, response) => {
    const paths = { '/': 'index.html', '/dark.html': 'dark.html', '/dashboard.css': 'dashboard.css', '/host.css': 'host.css' };
    const name = paths[request.url];
    if (!name || (missingCss && name === 'dashboard.css')) { response.writeHead(404); response.end('Not found'); return; }
    try {
      response.writeHead(200, { 'Content-Type': name.endsWith('.css') ? 'text/css' : 'text/html', 'Cache-Control': 'no-store' });
      response.end(await readFile(join(scratch, 'dist', name)));
    } catch { response.destroy(); }
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  const url = `http://127.0.0.1:${server.address().port}/`;
  const darkUrl = `${url}dark.html`;
  const assetUrls = [`${url}host.css`, `${url}dashboard.css`];
  assert.ok(!interrupted, 'Consumer check interrupted');
  browser = await chromium.launch({ headless: true });
  async function visit(width, theme = 'light', mutation = false) {
    const pageUrl = theme === 'dark' ? darkUrl : url;
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const problems = [], missing = [], failedRequests = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    page.on('request', (request) => { if (![pageUrl, ...assetUrls].includes(request.url())) problems.push(`Unexpected request: ${request.url()}`); });
    page.on('response', (response) => {
      if (mutation && response.url() === `${url}dashboard.css` && response.status() === 404) missing.push(response.url());
      else if (response.status() !== 200) problems.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    try {
      await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 15000 });
      assert.equal(missing.length, mutation ? 1 : 0);
      // Chromium can also emit requestfailed for the deliberately rejected CSS.
      // Exempt only that URL after confirming its expected 404 response above.
      problems.push(...failedRequests.filter((failed) => !(mutation && missing.includes(failed))).map((failed) => `Failed: ${failed}`));
      assert.deepEqual(problems, [], 'Resource/page errors');
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
  function rgbChannels(value) {
    const match = /^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:[, /]+\s*([\d.]+))?\s*\)$/i.exec(value);
    if (match) return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
    // Chromium may preserve the oklab color space when reporting color-mix().
    // Convert it to sRGB before computing WCAG contrast.
    const oklab = /^oklab\(\s*([\d.+-]+%?)\s+([\d.+-]+%?)\s+([\d.+-]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(value);
    assert.ok(oklab, `Expected an sRGB or oklab computed color, got ${value}`);
    const component = (raw) => raw.endsWith('%') ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw);
    const L = component(oklab[1]);
    const a = component(oklab[2]);
    const b = component(oklab[3]);
    const alpha = oklab[4] === undefined ? 1 : component(oklab[4]);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const toSrgb = (linear) => {
      const encoded = linear <= 0.0031308
        ? 12.92 * linear
        : 1.055 * Math.max(linear, 0) ** (1 / 2.4) - 0.055;
      return Math.max(0, Math.min(1, encoded)) * 255;
    };
    return [
      toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
      alpha,
    ];
  }
  function relativeLuminance(value) {
    const [red, green, blue] = rgbChannels(value).map((channel) => channel / 255).slice(0, 3);
    const linear = (channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  }
  function contrastRatio(foreground, background) {
    const foregroundAlpha = rgbChannels(foreground)[3];
    const backgroundAlpha = rgbChannels(background)[3];
    assert.equal(foregroundAlpha, 1, `Foreground must be opaque: ${foreground}`);
    assert.equal(backgroundAlpha, 1, `Background must be opaque: ${background}`);
    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  }
  function assertContrast(foreground, background, label) {
    assert.ok(contrastRatio(foreground, background) >= 4.5, `${label} has insufficient computed contrast`);
  }
  function hexRgb(value) {
    const hex = value.slice(1);
    const channels = hex.length === 3 ? [...hex].map((channel) => Number.parseInt(channel + channel, 16))
      : [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    return `rgb(${channels.join(', ')})`;
  }
  async function chromeSnapshot(page, id) {
    return page.locator(`#${id}`).evaluate((element) => {
      const root = getComputedStyle(element);
      const headerElement = element.querySelector('.zdtp-dashboard__header');
      const header = getComputedStyle(headerElement);
      const regions = [...element.querySelectorAll('.zdtp-dashboard__region')].map((region) => {
        const regionStyle = getComputedStyle(region);
        const card = region.querySelector('.zdtp-dashboard__token');
        const cardStyle = getComputedStyle(card);
        const label = getComputedStyle(region.querySelector('.zdtp-dashboard__name'));
        return {
          scheme: region.getAttribute('data-scheme'),
          background: regionStyle.backgroundColor,
          color: regionStyle.color,
          cardBackground: cardStyle.backgroundColor,
          cardColor: cardStyle.color,
          labelColor: label.color,
        };
      });
      return {
        rootBackground: root.backgroundColor,
        rootColor: root.color,
        header: {
          background: header.backgroundColor,
          color: header.color,
        },
        regions,
      };
    });
  }
  function chromePaint(snapshot) {
    const independent = snapshot.regions[1];
    return {
      header: snapshot.header,
      independent: independent && {
        background: independent.background,
        color: independent.color,
        cardBackground: independent.cardBackground,
        cardColor: independent.cardColor,
        labelColor: independent.labelColor,
      },
    };
  }
  function assertChromeContract(snapshot, id, schemes) {
    assert.equal(snapshot.rootBackground, 'rgba(0, 0, 0, 0)', `${id} keeps a transparent shell`);
    assert.equal(snapshot.regions.length, 2, `${id} exposes dependent and independent regions`);
    assert.deepEqual(snapshot.regions.map((region) => region.scheme), schemes, `${id} region schemes`);
    const independent = snapshot.regions[1];
    assert.deepEqual(snapshot.header, {
      background: independent.background,
      color: independent.color,
    }, `${id} header and independent-region chrome agree`);
    assertContrast(snapshot.header.color, snapshot.header.background, `${id} header`);
    for (const [index, region] of snapshot.regions.entries()) {
      assertContrast(region.color, region.background, `${id} region ${index}`);
      assertContrast(region.cardColor, region.cardBackground, `${id} region ${index} card`);
      assertContrast(region.labelColor, region.cardBackground, `${id} region ${index} label`);
      assert.notEqual(region.cardBackground, 'rgba(0, 0, 0, 0)', `${id} region ${index} cards are painted`);
    }
  }
  async function specimenSnapshot(page, id) {
    return page.locator(`#${id} .zdtp-dashboard__preview > .zdtp-dashboard__specimen`).evaluateAll((elements) => elements.map((element) => {
      const dashboard = element.closest('.zdtp-dashboard');
      const region = element.closest('.zdtp-dashboard__region');
      const regions = [...dashboard.querySelectorAll('.zdtp-dashboard__region')];
      const preview = element.closest('.zdtp-dashboard__preview');
      const sample = element.querySelector('.zdtp-dashboard__sample');
      const specimenCss = getComputedStyle(element);
      const sampleCss = getComputedStyle(sample);
      const bounds = sample.getBoundingClientRect();
      const typography = preview.classList.contains('zdtp-dashboard__preview--typography');
      return {
        mode: dashboard.getAttribute('data-mode'),
        regionIndex: regions.indexOf(region),
        regionScheme: region.getAttribute('data-scheme'),
        inlineColorScheme: element.style.colorScheme,
        computedColorScheme: specimenCss.colorScheme,
        specimenBackgroundColor: specimenCss.backgroundColor,
        specimenBackgroundImage: specimenCss.backgroundImage,
        sampleBackgroundColor: sampleCss.backgroundColor,
        sampleBackgroundImage: sampleCss.backgroundImage,
        sampleColor: typography ? sampleCss.color : null,
        sampleWidth: bounds.width,
        sampleHeight: bounds.height,
      };
    }));
  }
  function specimenPaint(snapshots) {
    return snapshots.map(({ regionIndex: _regionIndex, regionScheme: _regionScheme, inlineColorScheme: _inlineColorScheme, computedColorScheme: _computedColorScheme, ...paint }) => paint);
  }
  async function verifyChrome(page, theme) {
    const modes = { light: 'light', dark: 'dark', 'host-light-inv': 'light', 'host-dark-inv': 'dark', compact: 'light' };
    const chrome = { light: 'light', dark: 'light', 'host-light-inv': 'host', 'host-dark-inv': 'host', compact: 'light' };
    const ids = ['light', 'dark', 'host-light-inv', 'host-dark-inv', 'compact'];
    const snapshots = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await chromeSnapshot(page, id)])));
    for (const id of ids) assertChromeContract(snapshots[id], id, [modes[id], chrome[id]]);
    assert.deepEqual(chromePaint(snapshots.light), chromePaint(snapshots.dark), 'Fixed-light chrome is independent of inventory mode');
    assert.deepEqual(chromePaint(snapshots['host-light-inv']), chromePaint(snapshots['host-dark-inv']), 'Host chrome is shared by both host-following instances');
    if (theme === 'light') assert.deepEqual(chromePaint(snapshots['host-light-inv']), chromePaint(snapshots.light), 'Host chrome follows the light page scheme');
    else assert.notDeepEqual(chromePaint(snapshots['host-light-inv']), chromePaint(snapshots.light), 'Host chrome follows the dark page scheme');

    for (const [id, mode] of [['light', 'light'], ['dark', 'dark'], ['host-light-inv', 'light'], ['host-dark-inv', 'dark'], ['compact', 'light']]) {
      const expectedSchemes = [mode, chrome[id]];
      const specimen = await specimenSnapshot(page, id);
      assert.ok(specimen.length > 0, `${id} has specimens`);
      assert.ok(specimen.every((snapshot) => snapshot.mode === mode), `${id} keeps its declared dashboard mode`);
      assert.ok(specimen.every((snapshot) => expectedSchemes.includes(snapshot.regionScheme)), `${id} scopes specimens to their region`);
      const dependent = specimen.filter((snapshot) => snapshot.regionIndex === 0);
      const independent = specimen.filter((snapshot) => snapshot.regionIndex === 1);
      assert.ok(dependent.length > 0 && dependent.every((snapshot) => snapshot.regionScheme === mode), `${id} has mode-scoped dependent specimens`);
      assert.ok(independent.length > 0 && independent.every((snapshot) => snapshot.regionScheme === chrome[id]), `${id} has chrome-scoped independent specimens`);
      assert.ok(specimen.every((snapshot) => snapshot.inlineColorScheme === (snapshot.regionScheme === 'host' ? 'inherit' : snapshot.regionScheme)), `${id} gives each specimen its region scheme`);
      assert.ok(specimen.every((snapshot) => snapshot.computedColorScheme === (snapshot.regionScheme === 'host' ? theme : snapshot.regionScheme)), `${id} resolves each specimen against its effective scheme`);
      if (chrome[id] === 'host') assert.ok(independent.every((snapshot) => snapshot.computedColorScheme === theme), `${id} independent specimens inherit the ${theme} host scheme`);
      assert.ok(specimen.every((snapshot) => snapshot.sampleHeight > 0), `${id} painted samples have positive height`);
    }
    const dependentPaint = async (id) => specimenPaint((await specimenSnapshot(page, id)).filter((snapshot) => snapshot.regionIndex === 0));
    assert.deepEqual(await dependentPaint('host-light-inv'), await dependentPaint('light'), 'Light host specimens keep their mode-scoped paint');
    assert.deepEqual(await dependentPaint('host-dark-inv'), await dependentPaint('dark'), 'Dark host specimens keep their mode-scoped paint');
  }
  async function verifyIsolation(page) {
    const snapshot = await page.evaluate(() => {
      const names = ['--consumer-pale', '--consumer-paired', '--consumer-surface'];
      const dashboards = [...document.querySelectorAll('.zdtp-dashboard')];
      return {
        documentValues: names.map((name) => document.documentElement.style.getPropertyValue(name)),
        dashboards: dashboards.map((dashboard) => ({
          style: dashboard.getAttribute('style') ?? '',
          inventoryValues: names.map((name) => dashboard.querySelector('.zdtp-dashboard__inventory').style.getPropertyValue(name)),
        })),
      };
    });
    assert.deepEqual(snapshot.documentValues, ['', '', ''], 'Dashboard declarations do not write to document root');
    assert.ok(snapshot.dashboards.every(({ style }) => !style.includes('--consumer-')), 'Dashboard roots do not own token declarations');
    assert.ok(snapshot.dashboards.every(({ inventoryValues }) => inventoryValues.every((value) => value.length > 0)), 'Each dashboard owns one complete declaration scope');
  }
  const expectedRegionRows = {
    dependent: ['--consumer-paired', '--consumer-surface'],
    independent: ['--consumer-pale', '--consumer-deep', '--consumer-zero', '--consumer-space', '--consumer-alias', '--consumer-large', '--consumer-missing', '--consumer-size', '--consumer-family', '--consumer-weight', '--consumer-leading'],
  };
  const order = [...expectedRegionRows.dependent, ...expectedRegionRows.independent];
  const pageSpecimens = {};
  for (const theme of ['light', 'dark']) {
    for (const width of [1280, 360]) {
      const page = await visit(width, theme);
    try {
      await verifyStyles(page);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      await verifyChrome(page, theme);
      await verifyIsolation(page);
      assert.equal(await page.locator('script, img, .tokenpanel-shell').count(), 0);
      assert.equal(await page.locator('[role="listitem"]').count(), order.length * 5);
      for (const id of ['light', 'dark', 'host-light-inv', 'host-dark-inv', 'compact']) {
        assert.equal(await page.locator(`#${id} > .zdtp-dashboard__header > [role="heading"]`).count(), 1, `${id} has one dashboard heading`);
        assert.equal(await page.locator(`#${id} > .zdtp-dashboard__inventory > .zdtp-dashboard__region`).count(), 2, `${id} has two inventory regions`);
        const rowsByRegion = await page.locator(`#${id} .zdtp-dashboard__region`).evaluateAll((regions) => regions.map((region) => ({
          scheme: region.getAttribute('data-scheme'),
          rows: [...region.querySelectorAll('[data-css-var]')].map((node) => node.getAttribute('data-css-var')),
        })));
        assert.deepEqual(rowsByRegion.map((region) => region.rows), [expectedRegionRows.dependent, expectedRegionRows.independent], `${id} keeps region row order and partition`);
        assert.deepEqual(rowsByRegion.flatMap((region) => region.rows), order, `${id} keeps dependent rows before independent rows`);
        assert.equal(await page.locator(`#${id} [data-css-var="--consumer-missing"] [data-diagnostic]`).count(), 1);
        assert.equal(await page.locator(`#${id} [data-css-var="--consumer-missing"] .zdtp-dashboard__sample`).count(), 0);
        assert.equal(await page.locator(`#${id} .zdtp-dashboard__palette [role="listitem"]`).count(), 3);
        const dashboardMode = await page.locator(`#${id}`).getAttribute('data-mode');
        const pair = dashboardMode === 'dark' ? '#1e3a8a' : '#dbeafe';
        assert.equal(await page.locator(`#${id} [data-css-var="--consumer-paired"] .zdtp-dashboard__value`).textContent(), pair, `${id} selects the ${dashboardMode} mode pair`);
        assert.equal(await page.locator(`#${id} [data-css-var="--consumer-paired"] .zdtp-dashboard__sample`).evaluate((element) => getComputedStyle(element).backgroundColor), hexRgb(pair), `${id} paints the selected mode pair`);
        for (const [name, expected] of [['zero', 0], ['space', 32], ['alias', 32], ['large', 1536]]) {
          const size = await page.locator(`#${id} [data-css-var="--consumer-${name}"] .zdtp-dashboard__sample`).evaluate((element) => element.getBoundingClientRect().width);
          assert.ok(Math.abs(size - expected) < 0.1, `${id}/${name} exact ruler: ${size}`);
        }
        const sample = (name) => page.locator(`#${id} [data-css-var="--consumer-${name}"] .zdtp-dashboard__sample`);
        assert.equal(await sample('surface').evaluate((e) => getComputedStyle(e).backgroundColor), ['dark', 'host-dark-inv'].includes(id) ? 'rgb(24, 36, 58)' : 'rgb(238, 244, 255)');
        assert.equal(await sample('leading').evaluate((e) => getComputedStyle(e).lineHeight), '43.2px');
        assert.equal(await sample('family').evaluate((e) => getComputedStyle(e).fontFamily), 'serif');
        assert.equal(await sample('weight').evaluate((e) => getComputedStyle(e).fontWeight), '700');
        const passage = await sample('size').textContent();
        assert.ok(passage.includes('\n\n好きな文章で行間を確認します。\n<img src=x onerror=alert(1)> & plain text'));
        assert.ok((await sample('size').boundingBox()).height > 72, 'Long text wraps');
      }
      if (width === 1280) {
        const current = {
          light: (await specimenSnapshot(page, 'host-light-inv')).filter((snapshot) => snapshot.regionIndex === 0),
          dark: (await specimenSnapshot(page, 'host-dark-inv')).filter((snapshot) => snapshot.regionIndex === 0),
        };
        if (pageSpecimens.light) {
          assert.deepEqual(current.light, pageSpecimens.light, 'Light host specimens are identical on both pages');
          assert.deepEqual(current.dark, pageSpecimens.dark, 'Dark host specimens are identical on both pages');
        } else {
          pageSpecimens.light = current.light;
          pageSpecimens.dark = current.dark;
        }
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow');
      const scroll = page.locator('#compact [data-css-var="--consumer-large"] .zdtp-dashboard__ruler-scroll');
      await page.keyboard.press('Tab');
      await scroll.focus();
      assert.equal(await scroll.evaluate((e) => e === document.activeElement && getComputedStyle(e).outlineStyle !== 'none'), true, 'Visible keyboard focus');
      await page.keyboard.press('ArrowRight');
      // Poll from Node: page-side animation-frame polling does not run reliably
      // when browser JavaScript is disabled.
      const deadline = Date.now() + 3000;
      while (await scroll.evaluate((e) => e.scrollLeft) <= 0 && Date.now() < deadline) {
        await new Promise((accept) => setTimeout(accept, 50));
      }
      assert.ok(await scroll.evaluate((e) => e.scrollLeft > 0), 'ArrowRight scrolls the focused ruler');
      if (output && width === 1280) { await mkdir(output, { recursive: true }); await page.screenshot({ path: join(output, `host-${theme}.png`), fullPage: true }); }
      evidence.checks.push(`JavaScript-disabled ${theme} ${width}px and compact: PASS`);
    } finally { await page.close(); }
    }
  }
  const osOverride = await visit(1280, 'light');
  try {
    await osOverride.emulateMedia({ colorScheme: 'dark' });
    await verifyChrome(osOverride, 'light');
    evidence.checks.push('OS dark preference cannot override explicit-light host chrome: PASS');
  } finally { await osOverride.close(); }
  missingCss = true;
  const broken = await visit(360, 'light', true);
  try {
    await assert.rejects(() => verifyStyles(broken), (error) => error.code === 'ERR_ASSERTION' && error.message.includes('PUBLIC_CSS_APPLIED'));
    evidence.checks.push('Missing public CSS rejected by shared style verifier: PASS');
  } finally { await broken.close(); missingCss = false; }
  const recovered = await visit(360, 'light');
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
