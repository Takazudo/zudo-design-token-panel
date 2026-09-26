// @vitest-environment jsdom

import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __OPEN_VERIFY_DELAY_MS_FOR_TESTS,
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

async function waitForOpenVerification(): Promise<void> {
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, __OPEN_VERIFY_DELAY_MS_FOR_TESTS + 50)));
}

// Leaves the root connected and still owned, but with no live Preact tree
// behind it — the state the downstream packed consumer reported (#986).
function killTreeKeepingRoot(root: HTMLElement): void {
  render(null, root);
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

  it('remounts an owned empty root whose tree stopped responding to toggles (#986)', async () => {
    const cfg = config('dead-tree-preview');
    const handle = configurePanel(cfg);
    await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
    const root = document.getElementById(panelRootId(cfg))!;
    expect(root.querySelector('.tokenpanel-shell')).not.toBeNull();

    killTreeKeepingRoot(root);
    expect(root.isConnected).toBe(true);
    expect(root.childElementCount).toBe(0);

    // The stored intent is still open, so the first toggle closes it.
    await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
    await waitForOpenVerification();
    expect(root.querySelector('.tokenpanel-shell')).toBeNull();

    await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
    await waitForOpenVerification();
    expect(document.getElementById(panelRootId(cfg))).toBe(root);
    expect(root.querySelector('.tokenpanel-shell')).not.toBeNull();
    expect(__mountedSpawnSlotsForTests().has(cfg.storagePrefix)).toBe(true);

    // The recovered tree is live: steady-state toggles work again.
    await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
    expect(root.querySelector('.tokenpanel-shell')).toBeNull();
    await flush(() => window.dispatchEvent(new CustomEvent(toggleEventName(cfg))));
    expect(root.querySelector('.tokenpanel-shell')).not.toBeNull();
    handle.destroy();
  });

  it('recovers a fresh after-swap mount that dies before page-load reapply (#986)', async () => {
    const cfg = config('dead-swap-preview');
    const handle = configurePanel(cfg);
    await flush(() => handle.open());
    await flush(() => document.dispatchEvent(new CustomEvent('astro:before-swap')));
    expect(document.getElementById(panelRootId(cfg))).toBeNull();

    // Header click during after-swap mounts fresh; the tree dies before its
    // mount effects run, then page-load reapply asks for the open panel.
    window.dispatchEvent(new CustomEvent(toggleEventName(cfg)));
    const root = document.getElementById(panelRootId(cfg))!;
    killTreeKeepingRoot(root);
    await flush(() => document.dispatchEvent(new CustomEvent('astro:page-load')));
    expect(root.childElementCount).toBe(0);

    await waitForOpenVerification();
    expect(document.getElementById(panelRootId(cfg))).toBe(root);
    expect(root.querySelector('.tokenpanel-shell')).not.toBeNull();
    handle.destroy();
  });

  it('leaves a healthy open tree alone after the verification window', async () => {
    const cfg = config('healthy-preview');
    const handle = configurePanel(cfg);
    await flush(() => handle.open());
    const shell = document.getElementById(panelRootId(cfg))?.querySelector('.tokenpanel-shell');
    expect(shell).not.toBeNull();
    await waitForOpenVerification();
    expect(document.getElementById(panelRootId(cfg))?.querySelector('.tokenpanel-shell')).toBe(shell);
    handle.destroy();
  });
});
