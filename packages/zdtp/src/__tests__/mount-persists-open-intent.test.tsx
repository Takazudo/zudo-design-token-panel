// @vitest-environment jsdom

import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
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

type StorageWrite = { op: 'set' | 'remove'; key: string; value?: string };

function recordStorageWrites(): { writes: StorageWrite[]; restore: () => void } {
  const writes: StorageWrite[] = [];
  const realSet = Storage.prototype.setItem;
  const realRemove = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    writes.push({ op: 'set', key, value: String(value) });
    realSet.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key: string) {
    writes.push({ op: 'remove', key });
    realRemove.call(this, key);
  };
  return {
    writes,
    restore: () => {
      Storage.prototype.setItem = realSet;
      Storage.prototype.removeItem = realRemove;
    },
  };
}

describe('mount never persists a closed state over the stored open intent (#1000)', () => {
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
    __resetInstanceBindingsForTests();
    __resetSpawnSlotsForTests();
    __resetPanelConfigForTests();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('keeps the open key and :visible=1 through the first effect flush of a fresh open mount', async () => {
    const cfg = config('mount-intent');
    configurePanel(cfg);
    const openKey = getOpenKey(cfg);
    const visibleKey = storageKey_visible(cfg);
    const recorder = recordStorageWrites();
    try {
      await act(() => {
        window.dispatchEvent(new CustomEvent(toggleEventName(cfg)));
      });
    } finally {
      recorder.restore();
    }

    expect(document.getElementById(panelRootId(cfg))?.querySelector('.tokenpanel-shell')).not.toBeNull();
    const closedWrites = recorder.writes.filter(
      (write) =>
        (write.op === 'remove' && write.key === openKey) ||
        (write.op === 'set' && write.key === openKey && write.value !== '1') ||
        (write.op === 'set' && write.key === visibleKey && write.value !== '1'),
    );
    expect(closedWrites).toEqual([]);
    expect(localStorage.getItem(openKey)).toBe('1');
    expect(localStorage.getItem(visibleKey)).toBe('1');
  });
});
