/* Headless verification of the DOM Tweaker prototype (issue #528).
   Serves nothing itself — expects the prototype dir on http://localhost:8637.
   Playwright is resolved from the zdtp repo's node_modules. */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/Users/takazudo/repos/myoss/zdtp/packages/zdtp/package.json');
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const results = [];
let failed = 0;

const check = (name, actual, expected) => {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (!ok) failed++;
  results.push({ name, ok, actual: String(actual), expected: String(expected) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (actual: ${actual})`);
};

const css = (page, sel, prop) =>
  page.$eval(sel, (n, p) => getComputedStyle(n)[p], prop);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto('http://localhost:8637/', { waitUntil: 'networkidle' });

// -- baseline: purged dist behaves as purged ------------------------------
check('baseline: #cta px-2 => paddingLeft 8px', await css(page, '#cta', 'paddingLeft'), '8px');
check('baseline: canary h1 fontSize 32px (no preflight)', await css(page, '#preflight-canary', 'fontSize'), '32px');

// prove the purge problem: adding an unknown class WITHOUT the runtime does nothing
await page.$eval('#docs-btn', (n) => n.classList.add('px-24'));
check('purge problem: px-24 without runtime stays 8px', await css(page, '#docs-btn', 'paddingLeft'), '8px');
await page.$eval('#docs-btn', (n) => n.classList.remove('px-24'));

await page.screenshot({ path: join(here, '01-initial.png') });

// -- turn the tweaker on --------------------------------------------------
const t0 = Date.now();
await page.click('[data-tweaker="toggle"]');
await page.waitForSelector('[data-tweaker="status"][data-state="ready"]', { timeout: 15000 });
console.log(`runtime ready in ~${Date.now() - t0}ms`);

check('runtime on: canary h1 still 32px (preflight NOT injected)', await css(page, '#preflight-canary', 'fontSize'), '32px');
check('runtime on: existing dist utility unchanged (#cta 8px)', await css(page, '#cta', 'paddingLeft'), '8px');
check('runtime on: host body bg preserved', await css(page, 'body', 'backgroundColor'), 'rgb(243, 244, 246)');

// -- alt-click -> edit icon -> editor -------------------------------------
await page.click('#cta', { modifiers: ['Alt'] });
await page.waitForSelector('[data-tweaker="edit-icon"]', { state: 'visible' });
await page.click('[data-tweaker="edit-icon"]');
await page.waitForSelector('[data-tweaker="editor"]', { state: 'visible' });

// remove px-2 via its chip
await page.click('[data-chip="px-2"] [data-remove]');

// add classes that DO NOT exist in the purged dist
for (const cls of ['px-24', 'py-3', 'bg-brand']) {
  await page.fill('[data-tweaker="class-input"]', cls);
  await page.keyboard.press('Enter');
}
// let the runtime recompile
await page.waitForFunction(
  () => getComputedStyle(document.querySelector('#cta')).paddingLeft === '96px',
  { timeout: 5000 },
).catch(() => {});

check('JIT: px-24 (absent from dist) => paddingLeft 96px', await css(page, '#cta', 'paddingLeft'), '96px');
check('JIT: py-3 => paddingTop 12px', await css(page, '#cta', 'paddingTop'), '12px');
check('JIT: custom @theme bg-brand => rgb(124, 58, 237)', await css(page, '#cta', 'backgroundColor'), 'rgb(124, 58, 237)');

// -- suggestion dropdown: type prefix, ArrowDown, Enter --------------------
await page.fill('[data-tweaker="class-input"]', 'rounded-f');
await page.waitForSelector('[data-sug="rounded-full"]', { state: 'visible' });
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForFunction(
  () => document.querySelector('#cta').classList.contains('rounded-full'),
);
check('suggestion flow adds rounded-full class',
  await page.$eval('#cta', (n) => n.classList.contains('rounded-full')), true);

// Tailwind semantics finding: with BOTH rounded-md and rounded-full on the
// element, canonical sheet order (full before md) makes rounded-md win —
// class-attr order is irrelevant, same as a real Tailwind build. The feature
// needs conflict handling (tailwind-merge-style auto-removal or manual chip removal).
await page.waitForTimeout(400); // let the runtime recompile
check('conflict semantics: rounded-full does NOT beat still-present rounded-md',
  await css(page, '#cta', 'borderRadius'), '6px');

// removing the conflicting chip resolves it
await page.click('[data-chip="rounded-md"] [data-remove]');
await page.waitForFunction(
  () => parseFloat(getComputedStyle(document.querySelector('#cta')).borderRadius) > 1000,
  { timeout: 5000 },
).catch(() => {});
check('conflict resolved: removing rounded-md chip lets rounded-full apply',
  await css(page, '#cta', 'borderRadius'), (v) => parseFloat(v) > 1000);

// -- diff export -----------------------------------------------------------
const diff = await page.inputValue('[data-tweaker="diff"]');
console.log('\n--- exported diff ---\n' + diff + '---------------------\n');
check('diff: names the element', diff, (d) => d.includes('#cta'));
check('diff: records removal', diff, (d) => d.includes('-px-2'));
check('diff: records additions', diff, (d) => d.includes('+px-24') && d.includes('+bg-brand'));

await page.click('[data-tweaker="editor"] button'); // close editor for a clean shot
await page.screenshot({ path: join(here, '02-after-edit.png') });

await browser.close();
console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURES`} (${results.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
