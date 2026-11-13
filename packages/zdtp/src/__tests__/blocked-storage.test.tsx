// @vitest-environment jsdom

/**
 * Blocked storage (sandboxed iframe, blocked third-party cookies): reading the
 * `localStorage` global throws a SecurityError, and in quota/policy cases
 * `setItem` throws. The panel must mount, keep edits in memory and never throw;
 * with working storage the keys and persisted formats stay unchanged.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderZr, unmountZrIn } from '../zr/test-utils';
import DesignTokenTweakPanel from '../panel';
import { loadLastApplied, saveLastApplied } from '../apply/last-applied';
import { storageKey_lastApplied, type PanelConfig } from '../config/panel-config';
import {
  clearPersistedState,
  getActivePrimaryCluster,
  getOpenKey,
  getStorageKeyV4,
  initColorFromScheme,
  initSecondaryFromConfig,
  loadPersistedState,
  savePersistedState,
  type TweakState,
} from '../state/tweak-state';
import { FIXTURE_TABS, flushEffects, installFixturePanelConfig } from './_test-helpers';

const SPACING_TAB = FIXTURE_TABS.find((t) => t.id === 'spacing')!;

function makeConfig(prefix: string): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: prefix,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: [SPACING_TAB],
    colorPresets: {},
  };
}

function freshTweakState(cfg: PanelConfig): TweakState {
  return {
    color: initColorFromScheme(getActivePrimaryCluster(cfg), cfg),
    spacing: {},
    typography: {},
    size: {},
    secondary: initSecondaryFromConfig(cfg),
  };
}

const realDescriptor =
  Object.getOwnPropertyDescriptor(globalThis, 'localStorage') ??
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(globalThis), 'localStorage');
const realStorage = globalThis.localStorage;

function blockStorageGetter(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

/** Reads work (seeded), every write throws. */
function blockStorageWrites(seed: Record<string, string>): void {
  const data = new Map(Object.entries(seed));
  const storage = {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: () => {
      throw new DOMException('Quota exceeded or blocked.', 'QuotaExceededError');
    },
    removeItem: () => {
      throw new DOMException('Blocked.', 'SecurityError');
    },
    clear: () => {
      throw new DOMException('Blocked.', 'SecurityError');
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => storage,
  });
}

function restoreStorage(): void {
  if (realDescriptor) Object.defineProperty(globalThis, 'localStorage', realDescriptor);
  else
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: realStorage });
}

let container: HTMLDivElement;

beforeEach(() => {
  installFixturePanelConfig();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  restoreStorage();
  act(() => {
    unmountZrIn(container);
  });
  container.remove();
  realStorage.clear();
  document.documentElement.removeAttribute('style');
});

describe('storage helpers with a throwing localStorage getter', () => {
  beforeEach(blockStorageGetter);

  it('last-applied load/save never throw', () => {
    const cfg = makeConfig('blocked-last-applied');
    expect(loadLastApplied(cfg)).toEqual({});
    expect(() => saveLastApplied({ '--x': '1px' }, cfg)).not.toThrow();
  });

  it('persisted-state load/save/clear with the default storage never throw', () => {
    const cfg = makeConfig('blocked-persisted');
    expect(loadPersistedState(undefined, undefined, undefined, cfg)).toBeNull();
    expect(() => savePersistedState(freshTweakState(cfg), undefined, cfg)).not.toThrow();
    expect(() => clearPersistedState(undefined, cfg)).not.toThrow();
  });

  it('the panel mounts without throwing', async () => {
    const cfg = makeConfig('blocked-mount');
    expect(() =>
      act(() => {
        renderZr(() => <DesignTokenTweakPanel instanceConfig={cfg} />, container);
      }),
    ).not.toThrow();
    await flushEffects();
  });
});

describe('storage helpers with a throwing setItem', () => {
  it('last-applied and persisted-state saves never throw', () => {
    const cfg = makeConfig('blocked-writes');
    blockStorageWrites({});
    expect(() => saveLastApplied({ '--x': '1px' }, cfg)).not.toThrow();
    expect(() => savePersistedState(freshTweakState(cfg), undefined, cfg)).not.toThrow();
    expect(() => clearPersistedState(undefined, cfg)).not.toThrow();
  });

  it('the panel opens and an edit applies in memory without throwing', async () => {
    const cfg = makeConfig('blocked-edit');
    blockStorageWrites({ [getOpenKey(cfg)]: '1' });
    act(() => {
      renderZr(() => <DesignTokenTweakPanel instanceConfig={cfg} />, container);
    });
    await flushEffects();

    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="--zd-spacing-hgap-md value"]',
    );
    expect(input, 'spacing input for hsp-md').not.toBeNull();
    expect(() =>
      act(() => {
        Object.defineProperty(input!, 'value', { value: '48', writable: true, configurable: true });
        input!.dispatchEvent(new Event('input', { bubbles: true }));
        input!.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      }),
    ).not.toThrow();
    await flushEffects();
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('48px');
  });
});

describe('working storage keeps keys and formats', () => {
  it('last-applied round-trips under the same key as before', () => {
    const cfg = makeConfig('working-last-applied');
    saveLastApplied({ '--x': '1px' }, cfg);
    expect(localStorage.getItem(storageKey_lastApplied(cfg))).toBe('{"--x":"1px"}');
    expect(loadLastApplied(cfg)).toEqual({ '--x': '1px' });
  });

  it('persisted state saves to the v4 key and loads back', () => {
    const cfg = makeConfig('working-persisted');
    const state = freshTweakState(cfg);
    savePersistedState(state, undefined, cfg);
    expect(localStorage.getItem(getStorageKeyV4(cfg))).not.toBeNull();
    expect(loadPersistedState(undefined, undefined, undefined, cfg)).not.toBeNull();
    clearPersistedState(undefined, cfg);
    expect(localStorage.getItem(getStorageKeyV4(cfg))).toBeNull();
  });
});
