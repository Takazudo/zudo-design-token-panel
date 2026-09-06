/**
 * Real-Chromium confirmation for #596. This drives the package's actual Astro
 * fallback lifecycle listeners with registration order B,A and open order A,B,
 * then measures mounted shell boxes across three consecutive soft navigations.
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
  type PanelConfig,
  type PanelInstanceHandle,
} from '../config/panel-config';
import { getPositionKey } from '../state/tweak-state';
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

function shellPosition(cfg: PanelConfig): { top: number; left: number } {
  const root = document.getElementById(panelRootId(cfg));
  const shell = root?.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!shell) throw new Error(`no mounted shell for ${cfg.storagePrefix}`);
  const rect = shell.getBoundingClientRect();
  return { top: Math.round(rect.top), left: Math.round(rect.left) };
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

describe('Astro spawn identity — B registered first, A opened first (#596 browser)', () => {
  beforeEach(() => {
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    __resetSpawnSlotsForTests();
    localStorage.clear();
    document.body.innerHTML = '';
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

  it('keeps both never-dragged bounding boxes stable across three soft navigations', async () => {
    const cfgA = makeConfig('astro-browser-ordinal-a');
    const cfgB = makeConfig('astro-browser-ordinal-b');
    const handleB = configurePanel(cfgB);
    const handleA = configurePanel(cfgA);
    handles.push(handleA, handleB);

    handleA.open();
    handleB.open();
    await flushEffects();

    const originalA = shellPosition(cfgA);
    const originalB = shellPosition(cfgB);
    expect(originalA).not.toEqual(originalB);
    expect(__mountedSpawnSlotsForTests().get(cfgA.storagePrefix)).toBe(0);
    expect(__mountedSpawnSlotsForTests().get(cfgB.storagePrefix)).toBe(1);
    expect(localStorage.getItem(getPositionKey(cfgA))).toBeNull();
    expect(localStorage.getItem(getPositionKey(cfgB))).toBeNull();

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await navigate();
      expect(shellPosition(cfgA), `A after browser navigation ${cycle}`).toEqual(originalA);
      expect(shellPosition(cfgB), `B after browser navigation ${cycle}`).toEqual(originalB);
      expect(__mountedSpawnSlotsForTests().get(cfgA.storagePrefix)).toBe(0);
      expect(__mountedSpawnSlotsForTests().get(cfgB.storagePrefix)).toBe(1);
      expect(localStorage.getItem(getPositionKey(cfgA))).toBeNull();
      expect(localStorage.getItem(getPositionKey(cfgB))).toBeNull();
    }
  });
});
