// @vitest-environment jsdom

import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __mountedSpawnSlotsForTests,
  __resetInstanceBindingsForTests,
  __resetSpawnSlotsForTests,
  setLifecycleAdapter,
} from '../index';
import {
  __resetPanelConfigForTests,
  configurePanel,
  panelRootId,
  storageKey_visible,
  toggleEventName,
  type PanelConfig,
} from '../config/panel-config';
import { getOpenKey } from '../state/tweak-state';

function config(prefix: string): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: [],
  };
}

async function flush(fn: () => void): Promise<void> {
  await act(fn);
}

describe('SPA remount root ownership (#992)', () => {
  beforeEach(() => {
    setLifecycleAdapter(null);
    __resetInstanceBindingsForTests();
    __resetSpawnSlotsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    setLifecycleAdapter(null);
    document.dispatchEvent(new CustomEvent('astro:before-swap'));
    const mountedRoots = (window as Window & {
      __zudoDesignTokenPanelMountedRoots?: Map<string, HTMLElement>;
    }).__zudoDesignTokenPanelMountedRoots;
    expect(mountedRoots?.size ?? 0).toBe(0);
    __resetInstanceBindingsForTests();
    __resetSpawnSlotsForTests();
    __resetPanelConfigForTests();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('adopts an orphan root when the after-swap toggle precedes page-load reapply', async () => {
    const cfg = config('spa-preview');
    const handle = configurePanel(cfg);
    await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
    const firstRoot = document.getElementById(panelRootId(cfg));
    expect(firstRoot?.querySelector('.tokenpanel-shell')).not.toBeNull();

    await flush(() => document.dispatchEvent(new CustomEvent('astro:before-swap')));
    expect(firstRoot?.isConnected).toBe(false);
    const orphan = document.createElement('div');
    orphan.id = panelRootId(cfg);
    document.body.append(orphan);

    // The listener precedes the package's page-load listener, matching the
    // persisted-header event order. No private repair API is involved.
    const onAfterSwap = () => window.dispatchEvent(new CustomEvent(toggleEventName(cfg)));
    document.addEventListener('spa:after-swap', onAfterSwap);
    setLifecycleAdapter({
      onBeforeSwap: (callback) => {
        document.addEventListener('spa:before-swap', callback);
        return () => document.removeEventListener('spa:before-swap', callback);
      },
      onPageLoad: (callback) => {
        document.addEventListener('spa:after-swap', callback);
        return () => document.removeEventListener('spa:after-swap', callback);
      },
    });
    try {
      await flush(() => document.dispatchEvent(new CustomEvent('spa:after-swap')));
      expect(document.getElementById(panelRootId(cfg))).toBe(orphan);
      expect(orphan.querySelector('.tokenpanel-shell')).not.toBeNull();
      expect(localStorage.getItem(getOpenKey(cfg))).toBe('1');
      expect(localStorage.getItem(storageKey_visible(cfg))).toBe('1');
      expect(__mountedSpawnSlotsForTests().has(cfg.storagePrefix)).toBe(true);

      await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
      expect(orphan.querySelector('.tokenpanel-shell')).toBeNull();
      await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
      expect(orphan.querySelector('.tokenpanel-shell')).not.toBeNull();
    } finally {
      document.removeEventListener('spa:after-swap', onAfterSwap);
      handle.destroy();
    }
  });

  it('retains a healthy closed tree and its slot across repeated close/page-load calls', async () => {
    const cfg = config('closed-preview');
    const handle = configurePanel(cfg);
    await flush(() => handle.close());
    const root = document.getElementById(panelRootId(cfg));
    const slot = __mountedSpawnSlotsForTests().get(cfg.storagePrefix);
    expect(root).not.toBeNull();
    expect(root?.childElementCount).toBe(0);

    await flush(() => handle.close());
    await flush(() => document.dispatchEvent(new CustomEvent('astro:page-load')));
    expect(document.getElementById(panelRootId(cfg))).toBe(root);
    expect(__mountedSpawnSlotsForTests().get(cfg.storagePrefix)).toBe(slot);
    expect(localStorage.getItem(getOpenKey(cfg))).toBeNull();
    expect(localStorage.getItem(storageKey_visible(cfg))).toBe('0');
    handle.destroy();
  });

  it('releases stale detached ownership and mounts into a replacement root', async () => {
    const cfg = config('replacement-preview');
    const sibling = config('sibling-preview');
    const handle = configurePanel(cfg);
    const siblingHandle = configurePanel(sibling);
    await flush(() => handle.open());
    await flush(() => siblingHandle.open());
    const oldRoot = document.getElementById(panelRootId(cfg))!;
    const siblingRoot = document.getElementById(panelRootId(sibling));
    const oldSlot = __mountedSpawnSlotsForTests().get(cfg.storagePrefix);
    const siblingSlot = __mountedSpawnSlotsForTests().get(sibling.storagePrefix);
    const replacement = document.createElement('div');
    replacement.id = oldRoot.id;
    oldRoot.replaceWith(replacement);

    await flush(() => handle.open());
    expect(replacement.querySelector('.tokenpanel-shell')).not.toBeNull();
    expect(__mountedSpawnSlotsForTests().size).toBe(2);
    expect(__mountedSpawnSlotsForTests().get(cfg.storagePrefix)).toBe(oldSlot);
    expect(__mountedSpawnSlotsForTests().get(sibling.storagePrefix)).toBe(siblingSlot);
    expect(document.getElementById(panelRootId(sibling))).toBe(siblingRoot);
    expect(localStorage.getItem(getOpenKey(sibling))).toBe('1');
    handle.destroy();
    expect(replacement.isConnected).toBe(false);
    expect(__mountedSpawnSlotsForTests().size).toBe(1);
    expect(document.getElementById(panelRootId(sibling))).toBe(siblingRoot);
    siblingHandle.destroy();
    expect(__mountedSpawnSlotsForTests().size).toBe(0);
  });

  it('releases a detached tree when the host removes it before the swap callback', async () => {
    const cfg = config('early-detach-preview');
    const handle = configurePanel(cfg);
    await flush(() => handle.open());
    const root = document.getElementById(panelRootId(cfg))!;
    expect(__mountedSpawnSlotsForTests().has(cfg.storagePrefix)).toBe(true);

    root.remove();
    await flush(() => document.dispatchEvent(new CustomEvent('astro:before-swap')));
    expect(__mountedSpawnSlotsForTests().has(cfg.storagePrefix)).toBe(false);
    expect(localStorage.getItem(storageKey_visible(cfg))).toBe('1');

    await flush(() => document.dispatchEvent(new CustomEvent('astro:page-load')));
    expect(document.getElementById(panelRootId(cfg))?.querySelector('.tokenpanel-shell')).not.toBeNull();
    expect(__mountedSpawnSlotsForTests().has(cfg.storagePrefix)).toBe(true);
    handle.destroy();
  });
});
