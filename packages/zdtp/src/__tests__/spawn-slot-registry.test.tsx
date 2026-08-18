// @vitest-environment jsdom

/**
 * Mounted-shell slot registry (#584).
 *
 * The registry answers one question the rest of the module could not: which
 * panel shells are mounted RIGHT NOW, and which spawn ordinal does each hold.
 * #585 turns those ordinals into a cascading spawn offset so a second live
 * instance stops landing exactly on top of the first.
 *
 * These tests pin the allocation contract — mount order with lowest-free-slot
 * reuse — through the public surfaces that reach `ensureMounted` /
 * `unmountInstance`: the per-instance handle (`open` / `close` / `destroy`)
 * and the Astro soft-nav lifecycle events.
 *
 * The registry deliberately does NOT reuse `getInstanceBindings()`: that map
 * tracks window-event listener bindings, is seeded eagerly at module init
 * before any panel exists, and can outlive a rendered shell (epic #582,
 * decision 3). Nothing here asserts against it.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __mountedSpawnSlotsForTests,
  __resetInstanceBindingsForTests,
  __resetSpawnSlotsForTests,
} from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  type PanelConfig,
} from '../config/panel-config';
import { flushEffects } from './_test-helpers';

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

function slotOf(cfg: PanelConfig): number | undefined {
  return __mountedSpawnSlotsForTests().get(cfg.storagePrefix);
}

function slotCount(): number {
  return __mountedSpawnSlotsForTests().size;
}

function isMounted(cfg: PanelConfig): boolean {
  return document.getElementById(panelRootId(cfg)) !== null;
}

function mountedCount(cfgs: PanelConfig[]): number {
  return cfgs.filter(isMounted).length;
}

describe('mounted-shell slot registry (#584)', () => {
  beforeEach(() => {
    // Drain real window-event listeners BEFORE clearing the config registry so
    // no stale per-instance listener survives into the next test.
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    __resetSpawnSlotsForTests();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    __resetInstanceBindingsForTests();
    __resetSpawnSlotsForTests();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('hands out 0, 1, 2 to three concurrently mounted shells', async () => {
    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    const cfgC = makeConfig('gamma');
    const handleA = configurePanel(cfgA);
    const handleB = configurePanel(cfgB);
    const handleC = configurePanel(cfgC);

    // Configuring alone must not consume a slot — no shell is mounted yet.
    expect(slotCount(), 'configure does not claim slots').toBe(0);

    handleA.open();
    handleB.open();
    handleC.open();
    await flushEffects();

    expect(slotOf(cfgA)).toBe(0);
    expect(slotOf(cfgB)).toBe(1);
    expect(slotOf(cfgC)).toBe(2);
    expect(slotCount()).toBe(3);
  });

  it('keeps an already-mounted prefix on its ordinal and consumes nothing extra', async () => {
    const cfgA = makeConfig('alpha');
    const handleA = configurePanel(cfgA);

    handleA.open();
    await flushEffects();
    expect(slotOf(cfgA)).toBe(0);
    expect(slotCount()).toBe(1);

    // Every one of these re-enters `ensureMounted` for a prefix whose root is
    // already in the DOM — the show path, the hide path, the toggle path, and
    // the `astro:page-load` re-materialisation path.
    handleA.open();
    handleA.close();
    handleA.toggle();
    document.dispatchEvent(new CustomEvent('astro:page-load'));
    await flushEffects();

    expect(slotOf(cfgA), 'ordinal unchanged across re-mount calls').toBe(0);
    expect(slotCount(), 'no extra slot consumed').toBe(1);
  });

  it('frees ordinal 0 on unmount and hands it to the next fresh mount', async () => {
    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    const cfgC = makeConfig('gamma');
    const handleA = configurePanel(cfgA);
    const handleB = configurePanel(cfgB);
    handleB.open();
    configurePanel(cfgC).open();
    handleA.open();
    await flushEffects();

    // A mounted last here, so B/C hold the low ordinals.
    expect(slotOf(cfgB)).toBe(0);
    expect(slotOf(cfgC)).toBe(1);
    expect(slotOf(cfgA)).toBe(2);

    // Destroy the holder of 0 — the freed slot must be reused, not skipped.
    handleB.destroy();
    await flushEffects();
    expect(slotOf(cfgB), 'destroyed instance released its slot').toBeUndefined();
    expect(slotCount()).toBe(2);

    const cfgD = makeConfig('delta');
    configurePanel(cfgD).open();
    await flushEffects();

    expect(slotOf(cfgD), 'lowest free slot is reclaimed, not appended').toBe(0);
    expect(slotOf(cfgC), 'untouched instance keeps its ordinal').toBe(1);
    expect(slotOf(cfgA), 'untouched instance keeps its ordinal').toBe(2);
    expect(slotCount()).toBe(3);
  });

  it('ends a destroy -> recreate cycle with the same slot count and no drift', async () => {
    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    configurePanel(cfgA).open();
    configurePanel(cfgB).open();
    await flushEffects();

    const before = slotCount();
    expect(before).toBe(2);

    for (let cycle = 0; cycle < 3; cycle += 1) {
      configurePanel(cfgA).destroy();
      await flushEffects();
      expect(slotCount(), 'destroy releases exactly one slot').toBe(1);

      configurePanel(cfgA).open();
      await flushEffects();
      expect(slotOf(cfgA), 'recreated instance reclaims the freed ordinal').toBe(0);
      expect(slotCount(), 'slot count returns to its pre-destroy value').toBe(before);
    }
  });

  it('does not leak slots across repeated Astro soft navigations', async () => {
    const cfgA = makeConfig('alpha');
    const cfgB = makeConfig('beta');
    const handleA = configurePanel(cfgA);
    const handleB = configurePanel(cfgB);

    // A is visible; B mounts CLOSED via `close()` (which never arms autoload),
    // so B is a mounted shell that the next page-load will NOT re-materialise —
    // the case where a slot would be stranded.
    handleA.open();
    handleB.close();
    await flushEffects();
    expect(slotCount()).toBe(2);
    expect(mountedCount([cfgA, cfgB])).toBe(2);

    for (let nav = 0; nav < 3; nav += 1) {
      document.dispatchEvent(new CustomEvent('astro:before-swap'));
      await flushEffects();
      expect(slotCount(), 'a body swap releases every shell it tore down').toBe(0);

      document.dispatchEvent(new CustomEvent('astro:page-load'));
      await flushEffects();

      expect(isMounted(cfgA), 'the visible instance re-materialises').toBe(true);
      expect(isMounted(cfgB), 'the hidden instance stays down').toBe(false);
      expect(slotCount(), 'registry tracks only the shells that are mounted').toBe(1);
      expect(slotOf(cfgA), 'the surviving instance keeps ordinal 0').toBe(0);
    }

    // The sharp leak probe: a NEW instance must find slot 1 free. If the
    // soft-nav teardown had stranded B's slot, this would land on 2.
    const cfgC = makeConfig('gamma');
    configurePanel(cfgC).open();
    await flushEffects();
    expect(slotOf(cfgC)).toBe(1);
  });

  it('keeps the geometry layer free of any dependency on the mount layer', () => {
    // The ordinal is allocated in the mount layer (`index.tsx`) and will be
    // passed INTO the geometry helper by #585 — never the reverse. A
    // `tweak-state.ts` -> `index.tsx` import would close that cycle (epic #582,
    // decision 4), so assert on the source rather than trusting review.
    const source = readFileSync(path.resolve(__dirname, '../state/tweak-state.ts'), 'utf8');
    const specifiers = [
      ...source.matchAll(/(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g),
    ].map((m) => m[1]);

    expect(specifiers.length, 'sanity: the regex found tweak-state imports').toBeGreaterThan(0);
    const entryImports = specifiers.filter(
      (spec) => /(^|\/)index(\.tsx?)?$/.test(spec) || spec === '@takazudo/zdtp',
    );
    expect(entryImports, 'tweak-state must not import the package entry').toEqual([]);
  });
});
