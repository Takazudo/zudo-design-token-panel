// @vitest-environment jsdom

/**
 * Regression tests for the document-teardown race (zudolab/zudo-doc#3344).
 *
 * Downstream symptom: under parallel vitest load, an unhandled rejection
 * `document.getElementById is not a function` was thrown from the bundled
 * @takazudo/zdtp. Mechanism: a zdtp deferred continuation — an Astro
 * host-adapter closure resuming after `await loadPanelModule(...)`, or host
 * code calling the public API right after `await import('@takazudo/zdtp')`
 * resolves — ran AFTER the jsdom test environment tore down or swapped the
 * global `document`. The torn-down global is not a Document (the downstream
 * repro stubs it with a bare EventTarget carrying only `documentElement`),
 * so the first `document.getElementById(...)` threw inside an un-awaited
 * async function.
 *
 * These tests reproduce that exact environment shape deterministically
 * instead of racing parallel test files: mount/drive the panel, swap the
 * global `document` mid-flight, and assert every deferred surface cancels
 * quietly — no throw, no rejection, no state written into the dead (or
 * impostor) environment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disableAutoload,
  hideDesignTokenPanel,
  showDesignTokenPanel,
  toggleDesignPanel,
  __reapplyFromStorageForTests,
  __resetInstanceBindingsForTests,
} from '../index';
import {
  __resetPanelConfigForTests,
  panelRootId,
  storageKey_autoload,
  storageKey_visible,
  type PanelConfig,
} from '../config/panel-config';
import { getOpenKey } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects, installFixturePanelConfig } from './_test-helpers';

/**
 * The torn-down-environment stand-in, byte-mirroring the downstream repro's
 * vi.stubGlobal('document', ...) shape: an EventTarget that accepts listener
 * calls but is NOT a Document — no getElementById, no body, no head.
 */
type CrippledDocument = EventTarget & {
  documentElement: {
    getAttribute: (name: string) => string | null;
    style: { removeProperty: (name: string) => void; setProperty: (name: string) => void };
  };
};

function makeCrippledDocument(): CrippledDocument {
  const stub = new EventTarget() as CrippledDocument;
  stub.documentElement = {
    getAttribute: () => null,
    style: { removeProperty: () => {}, setProperty: () => {} },
  };
  return stub;
}

// ---------------------------------------------------------------------------
// Part A — public API entry points (index.tsx), driven the way a host's own
// async continuation drives them.
// ---------------------------------------------------------------------------

describe('public API against a torn-down document', () => {
  const OPEN_KEY = getOpenKey(FIXTURE_PANEL_CONFIG);

  beforeEach(() => {
    localStorage.clear();
    installFixturePanelConfig();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    // Let any straggler Preact effect flush settle against the restored real
    // document before tearing the fixtures down.
    await flushEffects();
    disableAutoload();
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('show/hide/toggle are quiet no-ops and write no state', () => {
    vi.stubGlobal('document', makeCrippledDocument());

    expect(() => showDesignTokenPanel()).not.toThrow();
    expect(() => toggleDesignPanel()).not.toThrow();
    expect(() => hideDesignTokenPanel()).not.toThrow();

    // The straggler guard must bail BEFORE any storage seed — a dead
    // environment's leftovers must not leak into the next environment.
    expect(localStorage.getItem(OPEN_KEY)).toBeNull();
    expect(localStorage.getItem(storageKey_visible(FIXTURE_PANEL_CONFIG))).toBeNull();
  });

  it('the downstream async-continuation shape resolves instead of rejecting', async () => {
    // Byte-shape of the zudo-doc bootstrap: `await import('@takazudo/zdtp')`
    // then an immediate show. The await boundary is what lets teardown land
    // in between.
    const straggler = (async () => {
      await Promise.resolve();
      showDesignTokenPanel();
    })();
    vi.stubGlobal('document', makeCrippledDocument());

    await expect(straggler).resolves.toBeUndefined();
  });

  it('a toggle window event replayed into a torn-down environment seeds nothing', () => {
    vi.stubGlobal('document', makeCrippledDocument());

    window.dispatchEvent(new Event('toggle-design-token-panel'));

    expect(localStorage.getItem(OPEN_KEY)).toBeNull();
  });

  it('reapplyFromStorage exits quietly even when restore intent is persisted', () => {
    // visible=1 is the strongest restore signal — without the guard this
    // path proceeds into showInstance → findRoot → getElementById.
    localStorage.setItem(storageKey_visible(FIXTURE_PANEL_CONFIG), '1');
    vi.stubGlobal('document', makeCrippledDocument());

    expect(() => __reapplyFromStorageForTests()).not.toThrow();
  });

  it('a mounted panel survives teardown landing before its effects flush', async () => {
    showDesignTokenPanel();
    expect(document.getElementById(panelRootId(FIXTURE_PANEL_CONFIG))).not.toBeNull();

    // Preact flushes effects on rAF/setTimeout — tear the document down
    // first, then flush, so every mount effect (portal mounts, stylesheet
    // observer, tooltip portal re-renders) runs against the corpse.
    vi.stubGlobal('document', makeCrippledDocument());
    await flushEffects();
  });

  it('teardown before the effect flush leaves the seeded open state intact', async () => {
    // `showInstance` seeds OPEN_KEY/:visible synchronously, but the panel's
    // mount effects land later on Preact's rAF flush. Against a dead document
    // the mount-restore effect bails, so `open` is still its initial `false` —
    // the persistence effect must bail too, or it mirrors that stale `false`
    // over the seeds and the next page restores the panel closed.
    showDesignTokenPanel();
    expect(localStorage.getItem(OPEN_KEY)).toBe('1');

    vi.stubGlobal('document', makeCrippledDocument());
    await flushEffects();

    expect(localStorage.getItem(OPEN_KEY)).toBe('1');
    expect(localStorage.getItem(storageKey_visible(FIXTURE_PANEL_CONFIG))).toBe('1');
  });

  it('a nulled document global is treated as dead, not as a live document', () => {
    // `typeof null === 'object'`, so a teardown shape that nulls the global
    // slips past a bare `typeof document !== 'undefined'` probe and the
    // following `document.getElementById` dereferences null — the exact
    // TypeError class this guard exists to prevent.
    vi.stubGlobal('document', null);

    expect(() => showDesignTokenPanel()).not.toThrow();
    expect(() => toggleDesignPanel()).not.toThrow();
    expect(() => hideDesignTokenPanel()).not.toThrow();
    expect(() => __reapplyFromStorageForTests()).not.toThrow();

    expect(localStorage.getItem(OPEN_KEY)).toBeNull();
    expect(localStorage.getItem(storageKey_visible(FIXTURE_PANEL_CONFIG))).toBeNull();
  });

  it('control: show mounts normally when the document is live (guards are inert)', () => {
    showDesignTokenPanel();

    expect(document.getElementById(panelRootId(FIXTURE_PANEL_CONFIG))).not.toBeNull();
    expect(localStorage.getItem(OPEN_KEY)).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// Part B — Astro host-adapter async closures. Bootstrap strategy mirrors
// host-adapter-zdtp-global-alias.test.ts: reset the module graph and
// re-import the adapter so its IIFE re-runs against current globals.
// ---------------------------------------------------------------------------

const CFG: PanelConfig = {
  storagePrefix: 'test-race',
  consoleNamespace: 'testRace',
  modalClassPrefix: 'test-race-modal',
  schemaId: 'test-race/v1',
  exportFilenameBase: 'test-race-tokens',
  tabs: [],
  colorPresets: {},
  applyEndpoint: undefined,
  applyRouting: undefined,
};

const ADAPTER_OPEN_KEY = getOpenKey(CFG);
const ADAPTER_AUTOLOAD_KEY = storageKey_autoload(CFG);
const ADAPTER_ROOT_ID = panelRootId(CFG);

interface ZdtpGlobalApi {
  show: () => Promise<void>;
  hide: () => Promise<void>;
  toggle: () => Promise<void>;
}

interface ConsoleApi {
  showDesignPanel: () => Promise<void>;
  hideDesignPanel: () => Promise<void>;
  toggleDesignPanel: () => Promise<void>;
}

function zdtpGlobal(): ZdtpGlobalApi {
  return (window as unknown as Record<string, unknown>).zdtp as ZdtpGlobalApi;
}

function consoleApi(): ConsoleApi {
  return (window as unknown as Record<string, unknown>)[CFG.consoleNamespace] as ConsoleApi;
}

function setupConfigScript(): void {
  let el = document.getElementById('tokenpanel-config');
  if (!el) {
    const script = document.createElement('script');
    script.id = 'tokenpanel-config';
    (script as HTMLScriptElement).type = 'application/json';
    document.head.appendChild(script);
    el = script;
  }
  el.textContent = JSON.stringify(CFG);
}

async function bootstrapAdapter(): Promise<void> {
  vi.resetModules();
  const { __resetPanelConfigForTests: reset } = await import('../config/panel-config');
  reset();
  await import('../astro/host-adapter');
}

describe('host-adapter async closures across document teardown', () => {
  beforeEach(() => {
    setupConfigScript();
    localStorage.clear();
    document.body.innerHTML = '';
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle;
    delete w[CFG.consoleNamespace];
    delete w.zdtp;
    __resetPanelConfigForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetInstanceBindingsForTests();
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    const w = window as unknown as Record<string, unknown>;
    delete w.zdtp;
    vi.restoreAllMocks();
  });

  it('cancels a mid-load show() even when the replacement document is fully usable', async () => {
    await bootstrapAdapter();

    const promise = zdtpGlobal().show();
    // A REAL second document (next test file's environment): usable, so the
    // index-level liveness guards would happily operate on it — only the
    // adapter's captured-identity check can refuse to drive a document the
    // call does not own.
    const impostor = document.implementation.createHTMLDocument('next-env');
    vi.stubGlobal('document', impostor);

    await expect(promise).resolves.toBeUndefined();
    expect(localStorage.getItem(ADAPTER_OPEN_KEY)).toBeNull();
    expect(impostor.getElementById(ADAPTER_ROOT_ID)).toBeNull();

    vi.unstubAllGlobals();
    expect(document.getElementById(ADAPTER_ROOT_ID)).toBeNull();
  });

  it('resolves quietly when the document is torn down mid-load (downstream shape)', async () => {
    await bootstrapAdapter();

    const promise = zdtpGlobal().toggle();
    vi.stubGlobal('document', makeCrippledDocument());

    await expect(promise).resolves.toBeUndefined();
    expect(localStorage.getItem(ADAPTER_OPEN_KEY)).toBeNull();
  });

  it('console API showDesignPanel cancels after teardown too', async () => {
    await bootstrapAdapter();

    const promise = consoleApi().showDesignPanel();
    vi.stubGlobal('document', makeCrippledDocument());

    await expect(promise).resolves.toBeUndefined();

    vi.unstubAllGlobals();
    expect(document.getElementById(ADAPTER_ROOT_ID)).toBeNull();
  });

  it('a cancelled console showDesignPanel does not arm owner-mode autoload', async () => {
    await bootstrapAdapter();

    const promise = consoleApi().showDesignPanel();
    vi.stubGlobal('document', makeCrippledDocument());

    await expect(promise).resolves.toBeUndefined();
    // Auto-remember must only be armed by a show that actually displayed
    // something. Persisting it from a cancelled call makes the NEXT page
    // eagerly fetch the panel bundle for a panel the user never saw.
    expect(localStorage.getItem(ADAPTER_AUTOLOAD_KEY)).toBeNull();
  });

  it('a call entered after the document global is already gone resolves quietly', async () => {
    await bootstrapAdapter();

    vi.stubGlobal('document', undefined);
    const promise = zdtpGlobal().show();

    await expect(promise).resolves.toBeUndefined();
  });

  it('control: show() still mounts when the document stays live', async () => {
    await bootstrapAdapter();

    await zdtpGlobal().show();

    expect(localStorage.getItem(ADAPTER_OPEN_KEY)).toBe('1');
    expect(document.getElementById(ADAPTER_ROOT_ID)).not.toBeNull();
  });

  it('control: a live console showDesignPanel still arms autoload', async () => {
    await bootstrapAdapter();

    await consoleApi().showDesignPanel();

    expect(localStorage.getItem(ADAPTER_AUTOLOAD_KEY)).toBe('1');
    expect(document.getElementById(ADAPTER_ROOT_ID)).not.toBeNull();
  });
});
