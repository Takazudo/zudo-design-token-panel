#!/usr/bin/env node
/**
 * Read-only browser probe for one public zdtp consumer example.
 *
 * Opens the example's home page, waits for that example's own adapter
 * readiness signal, clicks the visible "Open Design Token Panel" trigger in
 * the topbar once, then asserts the mounted panel:
 *   - exactly one visible `.tokenpanel-shell`
 *   - at least one `[role="tab"]` inside that shell
 *   - at least one populated form control inside that shell
 *   - `data-zdtp-version` on the shell equals --expect-version
 *   - no console errors or page errors
 * It never presses Apply, never calls a toggle API directly and never sends a
 * write request; a request to the dev Apply endpoint fails the probe.
 *
 * Prints one JSON line and exits 0 (pass) or 1 (fail); 2 means bad usage.
 *
 * Usage:
 *   node scripts/cross-example-probe.mjs --url <base> --example <id> \
 *     --expect-version <ver> [--executable-path <chromium>] [--timeout <ms>]
 * Env equivalents: PROBE_URL, PROBE_EXAMPLE, PROBE_EXPECT_VERSION,
 * PROBE_EXECUTABLE_PATH, PROBE_TIMEOUT_MS.
 *
 * Playwright is resolved from packages/zdtp, so run `pnpm install` at the
 * repository root first.
 */
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

// Readiness and trigger facts come from each example repository's own sources
// (Takazudo/zudo-design-token-panel-example-*): the topbar button's click
// handler calls `window.<consoleNamespace>.toggleDesignPanel`, which the host
// adapter installs asynchronously, so a click before it exists is dropped
// (Astro queues the click behind its adapter import instead).
const EXAMPLES = {
  astro: { namespace: 'astro', region: '.astro-topbar' },
  'vite-react': { namespace: 'vr', region: '.vr-topbar' },
  nextjs: { namespace: 'nx', region: 'header.nx-topbar' },
  zfb: { namespace: 'zfb', region: 'header.zfb-topbar' },
  'zfb-tailwind': { namespace: 'zfbTw', region: 'header[data-zfb-transition-persist="topbar"]' },
};

const TRIGGER_NAME = 'Open Design Token Panel';
const CONTROL_SELECTOR = 'input, select, textarea, [role="slider"], [role="combobox"]';

function usage(message) {
  console.log(JSON.stringify({ ok: false, error: `usage: ${message}` }));
  process.exit(2);
}

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    example: { type: 'string' },
    'expect-version': { type: 'string' },
    'executable-path': { type: 'string' },
    timeout: { type: 'string' },
  },
  strict: true,
});

const baseUrl = values.url ?? process.env.PROBE_URL;
const example = values.example ?? process.env.PROBE_EXAMPLE;
const expectVersion = values['expect-version'] ?? process.env.PROBE_EXPECT_VERSION;
const executablePath = values['executable-path'] ?? process.env.PROBE_EXECUTABLE_PATH;
const timeout = Number(values.timeout ?? process.env.PROBE_TIMEOUT_MS ?? 20_000);

if (!baseUrl) usage('--url <base> is required');
if (!example || !(example in EXAMPLES)) {
  usage(`--example must be one of ${Object.keys(EXAMPLES).join(', ')}`);
}
if (!expectVersion) usage('--expect-version <version> is required');
if (!Number.isFinite(timeout) || timeout <= 0) usage('--timeout must be a positive number');

const { namespace, region } = EXAMPLES[example];
const requireFromPanel = createRequire(new URL('../packages/zdtp/package.json', import.meta.url));
const { chromium } = requireFromPanel('playwright');

const result = {
  ok: false,
  example,
  url: baseUrl,
  expectVersion,
  status: null,
  ready: false,
  triggers: null,
  shells: null,
  visibleShells: null,
  tabs: null,
  controls: null,
  version: null,
  errors: [],
  ignored: [],
  failures: [],
};

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
result.browser = browser.version();

try {
  const page = await browser.newPage();
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location().url;
    // Full Chromium requests /favicon.ico on its own; the demos declare no icon, so that 404 is not page code.
    if (
      location === new URL('/favicon.ico', page.url()).href &&
      message.text().startsWith('Failed to load resource')
    ) {
      result.ignored.push(`console: ${message.text()} (${location})`);
      return;
    }
    result.errors.push(`console: ${message.text()}${location ? ` (${location})` : ''}`);
  });
  page.on('pageerror', (error) => {
    result.errors.push(`pageerror: ${error.message}`);
  });
  page.on('request', (request) => {
    if (/\/api\/dev\/apply/.test(request.url())) {
      result.failures.push(`unexpected Apply request: ${request.method()} ${request.url()}`);
    }
  });

  const response = await page.goto(new URL('./', baseUrl).href, { waitUntil: 'load', timeout });
  result.status = response?.status() ?? null;
  if (!response?.ok()) throw new Error(`home page returned HTTP ${result.status}`);

  await page.waitForFunction(
    (ns) => typeof window[ns]?.toggleDesignPanel === 'function',
    namespace,
    { timeout },
  );
  result.ready = true;

  const triggers = page
    .locator(region)
    .getByRole('button', { name: TRIGGER_NAME, exact: true });
  await triggers.first().waitFor({ state: 'visible', timeout });
  result.triggers = await triggers.count();
  if (result.triggers !== 1) throw new Error(`expected 1 trigger in ${region}, found ${result.triggers}`);
  await triggers.click();

  const allShells = page.locator('.tokenpanel-shell');
  const shell = page.locator('.tokenpanel-shell:visible');
  await shell.first().waitFor({ state: 'visible', timeout });

  const deadline = Date.now() + timeout;
  for (;;) {
    result.shells = await allShells.count();
    result.visibleShells = await shell.count();
    if (result.visibleShells === 1) {
      result.tabs = await shell.locator('[role="tab"]').count();
      result.controls = await shell.locator(CONTROL_SELECTOR).count();
      if (result.tabs > 0 && result.controls > 0) break;
    }
    if (Date.now() > deadline) break;
    await page.waitForTimeout(250);
  }

  if (result.visibleShells !== 1) {
    result.failures.push(`expected exactly 1 visible .tokenpanel-shell, found ${result.visibleShells}`);
  } else {
    result.version = await shell.getAttribute('data-zdtp-version');
    if (!(result.tabs > 0)) result.failures.push('no [role="tab"] inside the shell');
    if (!(result.controls > 0)) result.failures.push('no populated controls inside the shell');
    if (result.version !== expectVersion) {
      result.failures.push(
        `data-zdtp-version is ${JSON.stringify(result.version)}, expected ${JSON.stringify(expectVersion)}`,
      );
    }
  }

  // Let late errors from the open settle before judging.
  await page.waitForTimeout(500);
} catch (error) {
  result.failures.push(error instanceof Error ? error.message.split('\n')[0] : String(error));
} finally {
  await browser.close();
}

if (result.errors.length > 0) result.failures.push(`${result.errors.length} browser error(s)`);
result.ok = result.failures.length === 0;
console.log(JSON.stringify(result));
process.exit(result.ok ? 0 : 1);
