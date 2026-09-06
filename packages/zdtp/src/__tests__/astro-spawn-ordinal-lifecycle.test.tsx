// @vitest-environment jsdom

/**
 * Persisted spawn identity across the real Astro soft-navigation lifecycle
 * (#596). These tests intentionally drive document events rather than calling
 * the allocator directly: registration order and first-open order differ in
 * the original regression.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import {
  __mountedSpawnSlotsForTests,
  __resetInstanceBindingsForTests,
  __resetSpawnSlotsForTests,
} from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  storageKey_spawnOrdinal,
  type PanelConfig,
  type PanelInstanceHandle,
} from '../config/panel-config';
import { defaultGeometry, getPositionKey } from '../state/tweak-state';
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

function shellPosition(cfg: PanelConfig): { top: string; left: string } {
  const root = document.getElementById(panelRootId(cfg));
  const shell = root?.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!shell) throw new Error(`no mounted shell for ${cfg.storagePrefix}`);
  return { top: shell.style.top, left: shell.style.left };
}

function expectedPosition(ordinal: number): { top: string; left: string } {
  const geometry = defaultGeometry(ordinal);
  return { top: `${geometry.top}px`, left: `${geometry.left}px` };
}

async function navigate(): Promise<void> {
  await act(() => {
    document.dispatchEvent(new CustomEvent('astro:before-swap'));
  });
  await act(() => {
    document.dispatchEvent(new CustomEvent('astro:page-load'));
  });
  await flushEffects();
}

let handles: PanelInstanceHandle[] = [];

describe('Astro persisted spawn identity (#596)', () => {
  beforeEach(() => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    __resetSpawnSlotsForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    handles = [];
  });

  afterEach(async () => {
    for (const handle of handles) handle.destroy();
    handles = [];
    await flushEffects();
    __resetInstanceBindingsForTests();
    __resetSpawnSlotsForTests();
    document.body.innerHTML = '';
    localStorage.clear();
    __resetPanelConfigForTests();
  });

  it('keeps B-registered-first/A-opened-first positions stable over three soft navigations', async () => {
    const cfgA = makeConfig('astro-ordinal-a');
    const cfgB = makeConfig('astro-ordinal-b');
    const handleB = configurePanel(cfgB);
    const handleA = configurePanel(cfgA);
    handles.push(handleA, handleB);

    // The bug requires registration order B,A but mount order A,B.
    handleA.open();
    handleB.open();
    await flushEffects();

    const originalA = shellPosition(cfgA);
    const originalB = shellPosition(cfgB);
    expect(originalA).toEqual(expectedPosition(0));
    expect(originalB).toEqual(expectedPosition(1));
    expect(localStorage.getItem(storageKey_spawnOrdinal(cfgA))).toBe('0');
    expect(localStorage.getItem(storageKey_spawnOrdinal(cfgB))).toBe('1');
    expect(localStorage.getItem(getPositionKey(cfgA)), 'A was never dragged').toBeNull();
    expect(localStorage.getItem(getPositionKey(cfgB)), 'B was never dragged').toBeNull();

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await navigate();
      expect(shellPosition(cfgA), `A is stable after navigation ${cycle}`).toEqual(originalA);
      expect(shellPosition(cfgB), `B is stable after navigation ${cycle}`).toEqual(originalB);
      expect(__mountedSpawnSlotsForTests().get(cfgA.storagePrefix)).toBe(0);
      expect(__mountedSpawnSlotsForTests().get(cfgB.storagePrefix)).toBe(1);
      expect(localStorage.getItem(getPositionKey(cfgA))).toBeNull();
      expect(localStorage.getItem(getPositionKey(cfgB))).toBeNull();
    }
  });

  it('a departing instance releases its slot for a later instance', async () => {
    const departed = makeConfig('astro-ordinal-departed');
    const survivor = makeConfig('astro-ordinal-survivor');
    const departedHandle = configurePanel(departed);
    const survivorHandle = configurePanel(survivor);
    handles.push(departedHandle, survivorHandle);

    // `close()` mounts a closed shell without arming autoload, so it genuinely
    // does not re-materialise on page-load. It owns slot 0 before departure.
    departedHandle.close();
    survivorHandle.open();
    await flushEffects();
    expect(__mountedSpawnSlotsForTests().get(departed.storagePrefix)).toBe(0);
    expect(__mountedSpawnSlotsForTests().get(survivor.storagePrefix)).toBe(1);

    await navigate();
    expect(document.getElementById(panelRootId(departed))).toBeNull();
    expect(__mountedSpawnSlotsForTests().has(departed.storagePrefix)).toBe(false);
    expect(__mountedSpawnSlotsForTests().get(survivor.storagePrefix)).toBe(1);

    const newcomer = makeConfig('astro-ordinal-newcomer');
    const newcomerHandle = configurePanel(newcomer);
    handles.push(newcomerHandle);
    newcomerHandle.open();
    await flushEffects();

    expect(__mountedSpawnSlotsForTests().get(newcomer.storagePrefix)).toBe(0);
    expect(shellPosition(newcomer)).toEqual(expectedPosition(0));
  });

  it('a dragged position still wins across repeated soft navigations', async () => {
    const cfgA = makeConfig('astro-ordinal-drag-a');
    const cfgB = makeConfig('astro-ordinal-drag-b');
    const stored = { top: 310, left: 470 };
    localStorage.setItem(getPositionKey(cfgB), JSON.stringify(stored));

    const handleB = configurePanel(cfgB);
    const handleA = configurePanel(cfgA);
    handles.push(handleA, handleB);
    handleA.open();
    handleB.open();
    await flushEffects();

    const expected = { top: `${stored.top}px`, left: `${stored.left}px` };
    expect(shellPosition(cfgB)).toEqual(expected);
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await navigate();
      expect(shellPosition(cfgB), `stored position wins after navigation ${cycle}`).toEqual(expected);
    }
  });

  it('uses the pre-change mount-order ordinals when persistence keys are absent', async () => {
    const cfgA = makeConfig('astro-ordinal-absent-a');
    const cfgB = makeConfig('astro-ordinal-absent-b');
    expect(localStorage.getItem(storageKey_spawnOrdinal(cfgA))).toBeNull();
    expect(localStorage.getItem(storageKey_spawnOrdinal(cfgB))).toBeNull();

    const handleA = configurePanel(cfgA);
    const handleB = configurePanel(cfgB);
    handles.push(handleA, handleB);
    handleB.open();
    handleA.open();
    await flushEffects();

    expect(shellPosition(cfgB)).toEqual(expectedPosition(0));
    expect(shellPosition(cfgA)).toEqual(expectedPosition(1));
  });
});
