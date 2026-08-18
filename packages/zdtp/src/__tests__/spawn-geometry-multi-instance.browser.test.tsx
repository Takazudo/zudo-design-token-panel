/**
 * Real-browser confirmation for spawn geometry (epic #582, sub-issue #586).
 *
 * Waves 1-3 verified `defaultGeometry()` / the slot registry (#584) / the
 * cascade clamp (#585) purely against jsdom, which fakes layout —
 * `getBoundingClientRect()` always reports zeros there, so no jsdom
 * assertion can prove what a MOUNTED shell actually renders. #564 was found
 * by real-browser verification in a downstream consumer app; this file is
 * the epic's own such pass, run against real Chromium (the repo's existing
 * Playwright-backed vitest `browser` project — see vitest.config.ts).
 *
 * Critically, this drives the package's real mount path —
 * `configurePanel(cfg).open()` -> `index.tsx`'s `ensureMounted()` -> the
 * mounted-shell slot registry -> `panel.tsx` -> `defaultGeometry()` — not a
 * bypass that renders `DesignTokenTweakPanel` directly as a prop (that path
 * skips `ensureMounted` entirely and always gets spawn ordinal 0; see e.g.
 * panel-shell-drag.browser.test.tsx). This is also, deliberately, the FIRST
 * test surface in the repo that mounts two-plus live instances through that
 * real path inside a browser — no dedicated multi-instance fixture page
 * exists yet (the doc site exposes only a single instance), so building this
 * surface is itself part of the sub-task.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { __resetInstanceBindingsForTests, __resetSpawnSlotsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  type PanelConfig,
  type PanelInstanceHandle,
} from '../config/panel-config';
import { defaultGeometry, getPositionKey } from '../state/tweak-state';
import { flushEffects } from './_test-helpers';

// Matches vitest.config.ts's browser.viewport default. Restored after any
// test that overrides it — the browser project runs with `fileParallelism:
// false` (one worker, files execute sequentially and can share the
// underlying iframe), so a viewport left at 320x568 would leak into whatever
// browser test file runs next.
const BASELINE_VIEWPORT = { width: 1280, height: 800 } as const;

function makeConfig(prefix: string): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: [],
  };
}

function getShell(cfg: PanelConfig): HTMLElement {
  const root = document.getElementById(panelRootId(cfg));
  const shell = root?.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!shell) throw new Error(`no mounted shell for ${cfg.storagePrefix}`);
  return shell;
}

/** Real `getBoundingClientRect()` on the mounted shell — real layout, not the inline-style strings. */
function shellRect(cfg: PanelConfig): DOMRect {
  return getShell(cfg).getBoundingClientRect();
}

/** True when `outer`'s box fully covers `inner`'s — used to assert no full occlusion. */
function rectFullyContains(outer: DOMRect, inner: DOMRect): boolean {
  return (
    outer.left <= inner.left &&
    outer.top <= inner.top &&
    outer.right >= inner.right &&
    outer.bottom >= inner.bottom
  );
}

let handles: PanelInstanceHandle[] = [];

/** Configure + open one instance through the real public API, tracked for teardown. */
function open(cfg: PanelConfig): PanelInstanceHandle {
  const handle = configurePanel(cfg);
  handles.push(handle);
  handle.open();
  return handle;
}

function openFresh(prefix: string): PanelConfig {
  const cfg = makeConfig(prefix);
  open(cfg);
  return cfg;
}

beforeEach(() => {
  __resetInstanceBindingsForTests();
  __resetPanelConfigForTests();
  // Slots outlive a `document.body.innerHTML = ''` teardown — a stale claim
  // would hand this suite an unexpected ordinal (#584/#585 hand-off note,
  // confirmed true for this file too: without this reset the second describe
  // block below observes ordinal drift from the first).
  __resetSpawnSlotsForTests();
  localStorage.clear();
  document.body.innerHTML = '';
  handles = [];
});

afterEach(async () => {
  for (const handle of handles) handle.destroy();
  handles = [];
  __resetInstanceBindingsForTests();
  __resetSpawnSlotsForTests();
  document.body.innerHTML = '';
  localStorage.clear();
  __resetPanelConfigForTests();
  await page.viewport(BASELINE_VIEWPORT.width, BASELINE_VIEWPORT.height);
});

// ---------------------------------------------------------------------------
// Two / three fresh instances — measurably distinct, non-occluding rects
// ---------------------------------------------------------------------------

describe('two fresh instances mount at measurably different bounding boxes', () => {
  it('neither shell fully occludes the other', async () => {
    const cfgA = openFresh('browser-confirm-a');
    const cfgB = openFresh('browser-confirm-b');
    await flushEffects();

    const rectA = shellRect(cfgA);
    const rectB = shellRect(cfgB);

    expect(rectA.left).not.toBe(rectB.left);
    expect(rectA.top).not.toBe(rectB.top);
    expect(rectFullyContains(rectA, rectB)).toBe(false);
    expect(rectFullyContains(rectB, rectA)).toBe(false);
  });
});

describe('three fresh instances mount at three distinct bounding boxes', () => {
  it('every pair is measurably distinct and none fully occludes another', async () => {
    const cfgs = ['browser-confirm-a', 'browser-confirm-b', 'browser-confirm-c'].map(openFresh);
    await flushEffects();

    const rects = cfgs.map(shellRect);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(rects[i].left !== rects[j].left || rects[i].top !== rects[j].top).toBe(true);
        expect(rectFullyContains(rects[i], rects[j])).toBe(false);
        expect(rectFullyContains(rects[j], rects[i])).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 320px viewport — the original case-(a) repro, measured on a real shell
// ---------------------------------------------------------------------------

describe('320px viewport — real mounted shell stays contained', () => {
  it('a fresh single instance satisfies left >= 0 and right <= 320', async () => {
    await page.viewport(320, 568);
    const cfg = openFresh('browser-confirm-320-solo');
    await flushEffects();

    const rect = shellRect(cfg);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(320);
  });

  it('holds for two concurrent instances too, even as the cascade degrades', async () => {
    await page.viewport(320, 568);
    const cfgA = openFresh('browser-confirm-320-a');
    const cfgB = openFresh('browser-confirm-320-b');
    await flushEffects();

    for (const cfg of [cfgA, cfgB]) {
      const rect = shellRect(cfg);
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(320);
    }
  });
});

// ---------------------------------------------------------------------------
// A persisted position renders exactly — the cascade never touches it
// ---------------------------------------------------------------------------

describe('a persisted position renders exactly, untouched by the spawn cascade', () => {
  it('an instance with a stored position ignores its spawn ordinal', async () => {
    const cfgA = makeConfig('browser-confirm-persisted-a');
    const cfgB = makeConfig('browser-confirm-persisted-b');
    const STORED = { top: 222, left: 333 };
    // A mounts first (claims ordinal 0), guaranteeing B lands on ordinal 1 —
    // which WOULD be cascaded by SPAWN_CASCADE_STEP if B were a fresh spawn.
    localStorage.setItem(getPositionKey(cfgB), JSON.stringify(STORED));

    open(cfgA);
    open(cfgB);
    await flushEffects();

    const rect = shellRect(cfgB);
    expect(Math.round(rect.top)).toBe(STORED.top);
    expect(Math.round(rect.left)).toBe(STORED.left);
  });
});

// ---------------------------------------------------------------------------
// Destroy -> recreate does not drift
// ---------------------------------------------------------------------------

describe('destroy -> recreate cycles do not drift', () => {
  it('a lone instance re-spawns at the same position across repeated cycles', async () => {
    const cfg = makeConfig('browser-confirm-cycle');
    const expected = defaultGeometry(0);

    for (let cycle = 0; cycle < 3; cycle++) {
      const handle = configurePanel(cfg);
      handle.open();
      await flushEffects();

      const rect = shellRect(cfg);
      expect(Math.round(rect.top)).toBe(expected.top);
      expect(Math.round(rect.left)).toBe(expected.left);

      handle.destroy();
    }
  });

  it('recreating the first of two instances reclaims ordinal 0; the sibling is undisturbed', async () => {
    const cfgA = makeConfig('browser-confirm-reclaim-a');
    const cfgB = makeConfig('browser-confirm-reclaim-b');

    let handleA = configurePanel(cfgA);
    handleA.open();
    open(cfgB);
    await flushEffects();

    const bBefore = shellRect(cfgB);

    // Destroy A (releases its slot) and recreate it. Lowest-free-slot reuse
    // must hand it back ordinal 0 — not 2 — so it must land back on
    // defaultGeometry(0), not a further-cascaded position.
    handleA.destroy();
    handleA = configurePanel(cfgA);
    handles.push(handleA);
    handleA.open();
    await flushEffects();

    const aAfter = shellRect(cfgA);
    const bAfter = shellRect(cfgB);
    const expectedA = defaultGeometry(0);

    expect(Math.round(aAfter.top)).toBe(expectedA.top);
    expect(Math.round(aAfter.left)).toBe(expectedA.left);
    // B was never destroyed — A's destroy/recreate cycle must not move it.
    expect(bAfter.top).toBe(bBefore.top);
    expect(bAfter.left).toBe(bBefore.left);
  });
});
