/**
 * Diagnostic script — investigates Playwright fill() vs Preact onChange in headless mode.
 *
 * Implements the four-scenario truth table recommended for (a)/(b)/(c) classification:
 *  1. locator.fill('15')                             — baseline
 *  2. el.value = '15'; dispatchEvent('input')        — naive direct dispatch
 *  3. native setter + dispatchEvent('input')          — React/Preact valueTracker workaround
 *  4. locator.pressSequentially('15')                — real keystrokes
 *
 * Each scenario is tested BOTH in headless and headed mode, against a component
 * that mirrors the exact draft+commit pattern from slider-row.tsx.
 *
 * Usage:
 *   node tests/playwright/diagnose-fill.mjs
 *   node tests/playwright/diagnose-fill.mjs --headed
 */

import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '../..');

// Read preact UMD bundles to inline them
const preactCore = readFileSync(
  path.join(pkgRoot, 'node_modules/preact/dist/preact.min.js'),
  'utf8',
);
const preactHooks = readFileSync(
  path.join(pkgRoot, 'node_modules/preact/hooks/dist/hooks.umd.js'),
  'utf8',
);
const preactCompat = readFileSync(
  path.join(pkgRoot, 'node_modules/preact/compat/dist/compat.umd.js'),
  'utf8',
);

// The HTML fixture — mirrors slider-row.tsx draft+commit pattern exactly.
// Uses preact UMD via inline scripts (no server needed).
const fixtureHtml = `<!DOCTYPE html>
<html>
<head>
  <title>SliderRow Fixture</title>
  <script>
    // Preact core (UMD — sets window.preact)
    ${preactCore}
  </script>
  <script>
    // Preact hooks (UMD — sets window.preactHooks)
    ${preactHooks}
  </script>
  <script>
    // Preact compat (UMD — sets window.preactCompat)
    ${preactCompat}
  </script>
</head>
<body>
  <div id="app"></div>
  <div id="commit-log"></div>
  <script>
    // Unpack from UMD globals
    const { h, render } = window.preact;
    const { useState, useEffect, useCallback } = window.preactHooks;

    // parseNumericValue — mirrors manifest.ts
    function parseNumericValue(value) {
      const match = String(value).trim().match(/^(-?\\d+(?:\\.\\d+)?)/);
      if (!match) return null;
      const n = Number(match[1]);
      return Number.isFinite(n) ? n : null;
    }

    function formatValue(n, unit) {
      return String(n) + unit;
    }

    // Global commit counter and log (exposed for Playwright assertions)
    window.__commitCount = 0;
    window.__commitLog = [];
    window.__eventLog = [];

    // Component variant flag — controlled by URL param ?component=slider (default) or ?component=generic
    const urlParams = new URLSearchParams(window.location.search);
    const componentVariant = urlParams.get('component') || 'slider';
    window.__componentVariant = componentVariant;

    // SliderRow — exact copy of slider-row.tsx draft+commit pattern
    // value={draft} (string draft state), only commits when parseable
    function SliderRow({ token, value, onChange }) {
      const numeric = parseNumericValue(value);
      const slidable = !token.readonly && numeric !== null;
      const [draft, setDraft] = useState(numeric !== null ? String(numeric) : value);

      useEffect(() => {
        setDraft(numeric !== null ? String(numeric) : value);
      }, [value]);

      const handleNumber = useCallback(
        (e) => {
          const raw = e.currentTarget ? e.currentTarget.value : e.target.value;
          window.__eventLog.push({ type: 'handler-called', raw });
          setDraft(raw);
          const n = parseNumericValue(raw);
          if (n === null) {
            window.__eventLog.push({ type: 'parse-null', raw });
            return;
          }
          const clamped = Math.min(token.max, Math.max(token.min, n));
          window.__eventLog.push({ type: 'commit', value: formatValue(clamped, token.unit) });
          onChange(token.id, formatValue(clamped, token.unit));
        },
        [onChange, token.id, token.min, token.max, token.unit],
      );

      return h('div', { className: 'tokenpanel-row--stacked' },
        h('div', { className: 'tokenpanel-row-head' },
          h('input', {
            type: 'text',
            inputMode: 'decimal',
            value: draft,
            onChange: handleNumber,
            className: 'tokenpanel-row-number-input',
            'aria-label': token.cssVar + ' value',
            'data-testid': 'number-input',
          }),
          h('span', null, token.unit)
        ),
        h('input', {
          type: 'range',
          min: token.min,
          max: token.max,
          step: token.step,
          value: slidable ? numeric : token.min,
          className: 'tokenpanel-row-slider',
          'aria-label': token.cssVar + ' slider',
        })
      );
    }

    // GenericItemEditor (length case) — exact copy of _generic-item-editor.tsx
    // value={displayNumeric} (a number, NO draft state), commits immediately when finite
    function GenericItemEditor({ token, value, onChange }) {
      const numeric = parseFloat(value);
      const displayNumeric = Number.isFinite(numeric) ? numeric : token.min;
      const unit = token.unit;
      const min = token.min;
      const max = token.max;
      const step = token.step;

      const handleNumber = (e) => {
        const raw = e.currentTarget ? e.currentTarget.value : e.target.value;
        window.__eventLog.push({ type: 'handler-called', raw });
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) {
          window.__eventLog.push({ type: 'parse-nan', raw });
          return;
        }
        const clamped = Math.min(max, Math.max(min, n));
        window.__eventLog.push({ type: 'commit', value: unit ? String(clamped) + unit : String(clamped) });
        onChange(token.id, unit ? String(clamped) + unit : String(clamped));
      };

      return h('div', { className: 'tokenpanel-row--stacked', 'data-testid': 'tier-item-' + token.id },
        h('div', { className: 'tokenpanel-row-head' },
          h('input', {
            type: 'text',
            inputMode: 'decimal',
            value: displayNumeric,
            onChange: handleNumber,
            className: 'tokenpanel-row-number-input',
            'aria-label': token.cssVar + ' value',
            'data-testid': 'number-input',
          }),
          unit && h('span', { className: 'tokenpanel-row-unit' }, unit)
        ),
        h('input', {
          type: 'range',
          min: min,
          max: max,
          step: step,
          value: displayNumeric,
          className: 'tokenpanel-row-slider',
          'aria-label': token.cssVar + ' slider',
        })
      );
    }

    // Parent component
    const token = {
      id: 'hsp-md',
      cssVar: '--zd-spacing-hgap-md',
      label: 'hsp-md',
      min: 0,
      max: 64,
      step: 1,
      unit: 'px',
      group: 'hsp',
      default: '40px',
    };

    function App() {
      const [value, setValue] = useState('40px');

      const handleChange = useCallback((id, next) => {
        window.__commitCount++;
        window.__commitLog.push({ id, next, count: window.__commitCount });
        setValue(next);
        const logEl = document.getElementById('commit-log');
        if (logEl) logEl.textContent = 'commits: ' + window.__commitCount + ' last: ' + next;
      }, []);

      // Expose setValue for external reset
      window.__resetValue = (v) => setValue(v);

      const Component = componentVariant === 'generic' ? GenericItemEditor : SliderRow;
      return h(Component, { token, value, onChange: handleChange });
    }

    render(h(App, null), document.getElementById('app'));

    // Log ALL native events on the input
    document.addEventListener('input', (e) => {
      if (e.target && e.target.dataset && e.target.dataset.testid === 'number-input') {
        window.__eventLog.push({ type: 'native-input', value: e.target.value });
      }
    }, true);
    document.addEventListener('change', (e) => {
      if (e.target && e.target.dataset && e.target.dataset.testid === 'number-input') {
        window.__eventLog.push({ type: 'native-change', value: e.target.value });
      }
    }, true);
  </script>
</body>
</html>`;

const headed = process.argv.includes('--headed');

async function runScenario(page, name, scenarioFn) {
  // Reset state
  await page.evaluate(() => {
    window.__commitCount = 0;
    window.__commitLog = [];
    window.__eventLog = [];
    window.__resetValue('40px');
  });
  // Wait for reset to propagate
  await page.waitForTimeout(50);

  await scenarioFn(page);

  // Wait for potential async commits
  await page.waitForTimeout(100);

  const result = await page.evaluate(() => ({
    commitCount: window.__commitCount,
    commitLog: window.__commitLog,
    eventLog: window.__eventLog,
    inputValue: document.querySelector('[data-testid="number-input"]')?.value,
  }));

  console.log(`\n--- Scenario: ${name} ---`);
  console.log('  Input value after:', result.inputValue);
  console.log('  Commit count:', result.commitCount);
  console.log('  Last commit:', result.commitLog[result.commitLog.length - 1]);
  console.log('  Event log:', JSON.stringify(result.eventLog, null, 2));
  return result;
}

async function runScenariosOnPage(page) {
  const locator = page.locator('[data-testid="number-input"]');
  const results = {};

  // Scenario 1: locator.fill()
  results.fill = await runScenario(page, '1. locator.fill("15")', async (p) => {
    await locator.fill('15');
  });

  // Scenario 2: direct .value + native input event
  results.directDispatch = await runScenario(
    page,
    '2. el.value = "15" + dispatchEvent(input)',
    async (p) => {
      await p.evaluate(() => {
        const el = document.querySelector('[data-testid="number-input"]');
        el.value = '15';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    },
  );

  // Scenario 3: native setter + dispatchEvent (React valueTracker workaround)
  results.nativeSetter = await runScenario(
    page,
    '3. native setter + dispatchEvent(input)',
    async (p) => {
      await p.evaluate(() => {
        const el = document.querySelector('[data-testid="number-input"]');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        ).set;
        nativeInputValueSetter.call(el, '15');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    },
  );

  // Scenario 4: pressSequentially (real keystrokes)
  results.pressSequentially = await runScenario(
    page,
    '4. locator.pressSequentially("15")',
    async (p) => {
      await locator.click();
      // Select all text (triple-click selects all in input)
      await locator.evaluate((el) => el.select());
      await locator.pressSequentially('15');
    },
  );

  // Bonus: dispatch only 'change' event (verify it doesn't fire onChange)
  results.changeOnly = await runScenario(page, 'BONUS: dispatchEvent(change only)', async (p) => {
    await p.evaluate(() => {
      const el = document.querySelector('[data-testid="number-input"]');
      el.value = '15';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  return results;
}

async function runAll(headless) {
  const modeName = headless ? 'HEADLESS' : 'HEADED';
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  MODE: ${modeName}`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless });

  // Test SliderRow (draft state pattern)
  console.log('\n=== Component: SliderRow (draft state, value={draft}) ===');
  const page1 = await browser.newPage();
  await page1.setContent(fixtureHtml + '<!-- ?component=slider -->', { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(100);
  const sliderResults = await runScenariosOnPage(page1);
  await page1.close();

  // Test GenericItemEditor (no draft, value={displayNumeric})
  console.log('\n=== Component: GenericItemEditor (no draft, value={displayNumeric}) ===');
  // Use URL param to switch component variant
  const genericHtml = fixtureHtml.replace(
    "const componentVariant = urlParams.get('component') || 'slider';",
    "const componentVariant = urlParams.get('component') || 'generic';",
  );
  const page2 = await browser.newPage();
  await page2.setContent(genericHtml, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(100);
  const genericResults = await runScenariosOnPage(page2);
  await page2.close();

  await browser.close();

  return { sliderResults, genericResults };
}

// Run both headless and headed (or just headless if --headed not in args)
async function main() {
  const headlessAll = await runAll(true);

  if (headed) {
    const headedAll = await runAll(false);

    console.log('\n\n=== COMPARISON SUMMARY ===');
    console.log('\n-- SliderRow (draft state) --');
    console.log('Scenario | Headless commits | Headed commits');
    for (const key of Object.keys(headlessAll.sliderResults)) {
      console.log(
        `  ${key}: ${headlessAll.sliderResults[key].commitCount} headless | ${headedAll.sliderResults[key].commitCount} headed`,
      );
    }
    console.log('\n-- GenericItemEditor (no draft) --');
    console.log('Scenario | Headless commits | Headed commits');
    for (const key of Object.keys(headlessAll.genericResults)) {
      console.log(
        `  ${key}: ${headlessAll.genericResults[key].commitCount} headless | ${headedAll.genericResults[key].commitCount} headed`,
      );
    }
  } else {
    console.log('\n\n=== SUMMARY (headless only) ===');
    console.log('\n-- SliderRow (draft state) --');
    for (const key of Object.keys(headlessAll.sliderResults)) {
      console.log(`  ${key}: ${headlessAll.sliderResults[key].commitCount} commits`);
    }
    console.log('\n-- GenericItemEditor (no draft) --');
    for (const key of Object.keys(headlessAll.genericResults)) {
      console.log(`  ${key}: ${headlessAll.genericResults[key].commitCount} commits`);
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
