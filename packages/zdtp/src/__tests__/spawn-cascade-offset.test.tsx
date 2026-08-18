// @vitest-environment jsdom

/**
 * Cascading per-instance spawn offset (#585).
 *
 * Two independently configured instances used to spawn at EXACTLY the same
 * geometry: instance identity is keyed by `storagePrefix`, but initial
 * geometry was never part of that key space, so the second panel landed
 * pixel-perfect on top of the first and only the top one was usable.
 *
 * The fix feeds the mounted-shell registry's spawn ordinal (#584) into
 * `defaultGeometry()`, which steps `SPAWN_CASCADE_STEP` px per ordinal in both
 * axes and then runs the result through `clampSpawnPosition()`.
 *
 * Two rules the assertions below pin down, both deliberate (epic #582):
 *
 *   - Containment beats distinctness. Where the viewport has no spare room the
 *     cascade is reduced, then dropped, and positions may coincide. A panel
 *     spawned off-screen is the worse failure.
 *   - The offset applies to FRESH spawns only. A persisted position is an
 *     explicit user preference and comes back untouched.
 *
 * `clampPosition()` — the permissive drag-recovery clamp — is not involved and
 * is not modified; spawn containment is its own, stricter rule.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MIN_PANEL_HEIGHT,
  MIN_PANEL_WIDTH,
  SPAWN_CASCADE_STEP,
  clampSpawnPosition,
  defaultGeometry,
  defaultPosition,
  defaultSize,
  getPositionKey,
  loadPosition,
} from '../state/tweak-state';
import { __resetInstanceBindingsForTests, __resetSpawnSlotsForTests } from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  type PanelConfig,
} from '../config/panel-config';
import { flushEffects } from './_test-helpers';

const ORIGINAL_INNER_WIDTH = window.innerWidth;
const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

afterEach(() => {
  setViewport(ORIGINAL_INNER_WIDTH, ORIGINAL_INNER_HEIGHT);
});

describe('defaultGeometry — cascade on a roomy viewport', () => {
  it('steps the second and third instance SPAWN_CASCADE_STEP px along both axes', () => {
    setViewport(1600, 1000);
    const first = defaultGeometry(0);
    const second = defaultGeometry(1);
    const third = defaultGeometry(2);

    expect(second.top).toBe(first.top + SPAWN_CASCADE_STEP);
    expect(second.left).toBe(first.left + SPAWN_CASCADE_STEP);
    expect(third.top).toBe(first.top + 2 * SPAWN_CASCADE_STEP);
    expect(third.left).toBe(first.left + 2 * SPAWN_CASCADE_STEP);
  });

  it('gives three fresh instances three distinct positions', () => {
    setViewport(1600, 1000);
    const positions = [0, 1, 2].map((ordinal) => {
      const { top, left } = defaultGeometry(ordinal);
      return `${top}:${left}`;
    });
    expect(new Set(positions).size).toBe(3);
  });

  it('cascades the position only — the size is ordinal-independent', () => {
    setViewport(1600, 1000);
    const { width, height } = defaultGeometry(0);
    for (const ordinal of [1, 2, 5]) {
      const geom = defaultGeometry(ordinal);
      expect(geom.width).toBe(width);
      expect(geom.height).toBe(height);
    }
    expect(defaultSize()).toEqual({ width, height });
  });
});

describe('defaultGeometry — ordinal 0 is the untouched single-instance result', () => {
  for (const [w, h] of [
    [320, 568],
    [375, 667],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    it(`matches the no-argument geometry at ${w}×${h}`, () => {
      setViewport(w, h);
      // The single-instance contract from #583: the first instance never takes
      // an offset, so the cascade must be invisible to a one-panel host.
      expect(defaultGeometry(0)).toEqual(defaultGeometry());
      expect(defaultPosition(0)).toEqual(defaultPosition());
    });
  }
});

describe('defaultGeometry — containment holds at every ordinal', () => {
  const viewports = [
    [320, 568],
    [360, 640],
    [375, 667],
    [414, 896],
    [1024, 768],
    [1600, 1000],
  ] as const;

  for (const [w, h] of viewports) {
    for (const ordinal of [0, 1, 2, 7]) {
      it(`keeps ordinal ${ordinal} fully on-screen at ${w}×${h}`, () => {
        setViewport(w, h);
        const geom = defaultGeometry(ordinal);
        expect(geom.left).toBeGreaterThanOrEqual(0);
        expect(geom.top).toBeGreaterThanOrEqual(0);
        expect(geom.left + geom.width).toBeLessThanOrEqual(w);
        expect(geom.top + geom.height).toBeLessThanOrEqual(h);
      });
    }
  }
});

describe('defaultGeometry — the cascade degrades before it overflows', () => {
  it('reduces the step to the spare room when the viewport has less than one step', () => {
    // 330px viewport: clampSize floors the width at MIN_PANEL_WIDTH (320), so
    // exactly 10px of horizontal slack remain — less than one 24px step. The
    // horizontal cascade must shrink to that 10px rather than overflow, while
    // the vertical axis, which has room, still takes the full step.
    setViewport(330, 600);
    const first = defaultGeometry(0);
    const second = defaultGeometry(1);

    expect(first.width).toBe(MIN_PANEL_WIDTH);
    expect(second.left).toBe(330 - MIN_PANEL_WIDTH);
    expect(second.left).toBeLessThan(first.left + SPAWN_CASCADE_STEP);
    expect(second.left + second.width).toBe(330);
    expect(second.top).toBe(first.top + SPAWN_CASCADE_STEP);
  });

  it('drops the cascade entirely when the viewport has no spare room at all', () => {
    // 320×240 is the exact size the MIN_PANEL_* floors produce, so there is
    // zero slack on either axis. Distinct contained positions are impossible
    // here: containment wins and the instances coincide (documented trade-off).
    setViewport(320, 240);
    const first = defaultGeometry(0);
    expect(first).toEqual({ top: 0, left: 0, width: MIN_PANEL_WIDTH, height: MIN_PANEL_HEIGHT });

    for (const ordinal of [1, 2, 9]) {
      const geom = defaultGeometry(ordinal);
      expect(geom).toEqual(first);
      expect(geom.left + geom.width).toBeLessThanOrEqual(320);
      expect(geom.top + geom.height).toBeLessThanOrEqual(240);
    }
  });

  it('satisfies the #583 invariants for a second instance on a 320px viewport', () => {
    setViewport(320, 568);
    const geom = defaultGeometry(1);
    expect(geom.left).toBeGreaterThanOrEqual(0);
    expect(geom.left + geom.width).toBeLessThanOrEqual(320);
    expect(geom.top).toBeGreaterThanOrEqual(0);
    expect(geom.top + geom.height).toBeLessThanOrEqual(568);
  });
});

describe('defaultGeometry — junk ordinals fall back to no cascade', () => {
  it('treats negative, non-finite, and fractional ordinals sanely', () => {
    setViewport(1600, 1000);
    const base = defaultGeometry(0);
    expect(defaultGeometry(-1)).toEqual(base);
    expect(defaultGeometry(Number.NaN)).toEqual(base);
    expect(defaultGeometry(Number.POSITIVE_INFINITY)).toEqual(base);
    // Fractional ordinals floor to a whole step count rather than producing a
    // sub-pixel position.
    expect(defaultGeometry(1.9)).toEqual(defaultGeometry(1));
  });
});

describe('clampSpawnPosition', () => {
  it('confines the panel to [0, viewport - panel] on both axes', () => {
    setViewport(1000, 800);
    expect(clampSpawnPosition(-50, -50, 400, 300)).toEqual({ top: 0, left: 0 });
    expect(clampSpawnPosition(10_000, 10_000, 400, 300)).toEqual({ top: 500, left: 600 });
    expect(clampSpawnPosition(120, 240, 400, 300)).toEqual({ top: 120, left: 240 });
  });

  it('collapses to the origin when the panel is larger than the viewport', () => {
    setViewport(300, 200);
    expect(clampSpawnPosition(24, 24, MIN_PANEL_WIDTH, MIN_PANEL_HEIGHT)).toEqual({
      top: 0,
      left: 0,
    });
  });
});

describe('loadPosition — the cascade applies to fresh spawns only', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
    localStorage.clear();
    setViewport(1600, 1000);
  });

  afterEach(() => {
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('falls back to the cascaded default when nothing is stored', () => {
    expect(loadPosition(undefined, 1)).toEqual(defaultPosition(1));
    expect(loadPosition(undefined, 1)).not.toEqual(defaultPosition(0));
  });

  it('returns a stored position verbatim, whatever the ordinal', () => {
    localStorage.setItem(getPositionKey(), JSON.stringify({ top: 300, left: 400 }));
    for (const ordinal of [0, 1, 2]) {
      expect(loadPosition(undefined, ordinal)).toEqual({ top: 300, left: 400 });
    }
  });
});

// ---------------------------------------------------------------------------
// End-to-end: real mounts through the adapter
// ---------------------------------------------------------------------------

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

function shellPosition(cfg: PanelConfig): { top: string; left: string } {
  const root = document.getElementById(panelRootId(cfg));
  const shell = root?.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!shell) throw new Error(`no mounted shell for ${cfg.storagePrefix}`);
  return { top: shell.style.top, left: shell.style.left };
}

describe('mounted instances spawn apart (#585 end-to-end)', () => {
  beforeEach(() => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    // Slots outlive a `document.body.innerHTML = ''` teardown — a stale claim
    // would hand this suite an unexpected ordinal (#584 hand-off note).
    __resetSpawnSlotsForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    setViewport(1600, 1000);
  });

  afterEach(() => {
    __resetInstanceBindingsForTests();
    __resetSpawnSlotsForTests();
    document.body.innerHTML = '';
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('renders two concurrent shells at different top/left', async () => {
    const cfgA = makeConfig('cascade-a');
    const cfgB = makeConfig('cascade-b');
    configurePanel(cfgA).open();
    configurePanel(cfgB).open();
    await flushEffects();

    const a = shellPosition(cfgA);
    const b = shellPosition(cfgB);
    expect(a).toEqual({ top: `${defaultGeometry(0).top}px`, left: `${defaultGeometry(0).left}px` });
    expect(b).toEqual({ top: `${defaultGeometry(1).top}px`, left: `${defaultGeometry(1).left}px` });
    expect(b.top).not.toBe(a.top);
    expect(b.left).not.toBe(a.left);
  });

  it('gives three concurrent shells three distinct positions', async () => {
    const cfgs = ['cascade-a', 'cascade-b', 'cascade-c'].map(makeConfig);
    for (const cfg of cfgs) configurePanel(cfg).open();
    await flushEffects();

    const rendered = cfgs.map((cfg) => {
      const { top, left } = shellPosition(cfg);
      return `${top}:${left}`;
    });
    expect(new Set(rendered).size).toBe(3);
  });

  it('keeps both shells contained and apart on a 375px viewport', async () => {
    // The full chain at a phone width: cascade -> spawn clamp -> the mount
    // effect's `clampPosition()`. The drag-recovery clamp is permissive enough
    // to let a contained spawn position through untouched, so the cascade must
    // survive it intact and neither shell may hang off the edge.
    setViewport(375, 667);
    const cfgA = makeConfig('cascade-a');
    const cfgB = makeConfig('cascade-b');
    configurePanel(cfgA).open();
    configurePanel(cfgB).open();
    await flushEffects();

    for (const [cfg, ordinal] of [
      [cfgA, 0],
      [cfgB, 1],
    ] as const) {
      const geom = defaultGeometry(ordinal);
      expect(shellPosition(cfg)).toEqual({ top: `${geom.top}px`, left: `${geom.left}px` });
      expect(geom.left + geom.width).toBeLessThanOrEqual(375);
      expect(geom.top + geom.height).toBeLessThanOrEqual(667);
    }
    expect(shellPosition(cfgB).left).not.toBe(shellPosition(cfgA).left);
    expect(shellPosition(cfgB).top).not.toBe(shellPosition(cfgA).top);
  });

  it('restores a dragged instance exactly where it was left, ignoring its ordinal', async () => {
    const cfgA = makeConfig('cascade-a');
    const cfgB = makeConfig('cascade-b');
    // B has been dragged before: its stored position must survive verbatim
    // even though it now mounts second and holds ordinal 1.
    localStorage.setItem(getPositionKey(cfgB), JSON.stringify({ top: 512, left: 640 }));

    configurePanel(cfgA).open();
    configurePanel(cfgB).open();
    await flushEffects();

    expect(shellPosition(cfgB)).toEqual({ top: '512px', left: '640px' });
  });
});
