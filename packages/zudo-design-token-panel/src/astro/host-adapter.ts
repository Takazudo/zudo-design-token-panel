/**
 * Astro host adapter.
 *
 * Loaded by `DesignTokenPanelHost.astro` via a per-page `<script>` block.
 * Responsibilities:
 *
 *  1. Read the JSON config inlined by the Astro component (a
 *     `<script type="application/json" id="tokenpanel-config">` element).
 *  2. Call `configurePanel(parsedConfig)` BEFORE the lazy-load probes run, so
 *     every downstream `getPanelConfig()` reader (storage keys, console
 *     namespace, modal class prefix, …) sees the host's intended values.
 *  3. Install the console API on `window[config.consoleNamespace]`
 *     (`showDesignPanel` / `hideDesignPanel` / `toggleDesignPanel`). The
 *     namespace is a configured field — different consumers can pick
 *     distinct values to prove the contract is host-agnostic.
 *  4. Gate the panel module's dynamic import on the same probes the legacy
 *     host script used: an existing `wasVisible()` flag or any persisted v2
 *     overrides. When neither is set, the panel module stays out of the
 *     initial bundle and only loads when the user calls a `window.<ns>.*`
 *     helper from the console.
 *
 * Idempotency
 * -----------
 * The Astro `<script>` re-executes on view-transition (`astro:before-swap` /
 * `astro:page-load`) — the consumer-side bundler emits one script per page
 * and Astro's view-transition runtime re-runs it. We pin a window-scoped
 * flag derived from the configured `storagePrefix` so subsequent runs short-
 * circuit. (The panel module owns its own view-transition listener
 * lifecycle internally; this flag is only about *adapter*-level state.)
 *
 * Singleton sharing
 * -----------------
 * `configurePanel` mutates a module-level singleton in
 * `../config/panel-config.ts`. The dynamic import below resolves through the
 * package's exports map back to the lib bundle's `dist/index.js`, which
 * imports from the same `panel-config` chunk that this adapter imports —
 * Vite's multi-entry build code-splits shared modules into a single chunk so
 * both surfaces observe one and the same singleton. Without that property,
 * the adapter's `configurePanel` call would not be visible to the panel.
 *
 * NOTE: This file is a sibling of `index.ts`; both compile under the
 * `astro/*` entry tree of `vite.config.ts`. It is consumed only by the
 * Astro toolchain on the consumer side (via the `<script>` import in
 * `DesignTokenPanelHost.astro`), never by the lib bundle's `index.ts`.
 */

// Type-only import via the source entry — runtime resolution at consumer
// build time still goes through the package self-reference below
// (`@takazudo/zudo-design-token-panel`), kept external by `vite.config.ts`.
import type * as DesignTokenPanelModule from '../index';
import {
  assertValidPanelConfig,
  configurePanel,
  getPanelConfig,
  storageKey_stateV2,
  storageKey_visible,
  type PanelConfig,
} from '../config/panel-config';

interface DesignTokenPanelAdapterState {
  /** Per-`storagePrefix` bind flag — re-runs of the script are no-ops. */
  bound: boolean;
  /** Memoised module promise so steady-state toggle/show/hide share one load. */
  modulePromise: Promise<typeof DesignTokenPanelModule> | null;
}

interface ConsoleApiSurface {
  showDesignPanel?: () => Promise<void>;
  hideDesignPanel?: () => Promise<void>;
  toggleDesignPanel?: () => Promise<void>;
  // Allow co-existence with other helpers a host may install on the same
  // namespace (e.g. `window.<ns>.someOtherDebugHelper()`).
  [extra: string]: unknown;
}

type AdapterStateMap = Record<string, DesignTokenPanelAdapterState>;

interface AdapterWindow extends Window {
  __zudoDesignTokenPanelAdapter?: AdapterStateMap;
  // Index access for the configured console namespace.
  [namespace: string]: unknown;
}

const CONFIG_SCRIPT_ID = 'tokenpanel-config';

/**
 * Read & parse the inline JSON config. Throws if the script tag is missing
 * or its payload is not valid JSON — both indicate a host-side wiring bug
 * the developer should hear about loudly.
 */
function readInlineConfig(): PanelConfig {
  if (typeof document === 'undefined') {
    throw new Error(
      '[design-token-panel] host-adapter loaded without a document; expected to run in a browser context.',
    );
  }
  const el = document.getElementById(CONFIG_SCRIPT_ID);
  if (!el) {
    throw new Error(
      `[design-token-panel] Inline config script #${CONFIG_SCRIPT_ID} not found. ` +
        'Ensure <DesignTokenPanelHost config={...} /> is rendered on this page before the host script runs.',
    );
  }
  const raw = el.textContent ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[design-token-panel] Failed to parse inline config from #${CONFIG_SCRIPT_ID}: ${
        (err as Error).message
      }`,
    );
  }
  // runtime validation at the trust boundary.
  // The TypeScript view of the JSON parse is `PanelConfig` because the host
  // <DesignTokenPanelHost> component types the prop, but at runtime the
  // payload is just whatever string the inline <script> tag held — typos,
  // serialization regressions, future Astro lifecycle changes, or even a
  // hand-edited DOM tree could produce a malformed parse. Surface it as a
  // single clear error here instead of cryptic downstream failures (storage
  // keys reading undefined.storagePrefix, palette length mismatch, etc.).
  assertValidPanelConfig(parsed);
  return parsed;
}

function getAdapterStateMap(win: AdapterWindow): AdapterStateMap {
  if (!win.__zudoDesignTokenPanelAdapter) {
    win.__zudoDesignTokenPanelAdapter = {};
  }
  return win.__zudoDesignTokenPanelAdapter;
}

function getAdapterState(win: AdapterWindow, key: string): DesignTokenPanelAdapterState {
  const map = getAdapterStateMap(win);
  let state = map[key];
  if (!state) {
    state = { bound: false, modulePromise: null };
    map[key] = state;
  }
  return state;
}

function wasVisible(visibleKey: string): boolean {
  try {
    return window.localStorage.getItem(visibleKey) === '1';
  } catch {
    return false;
  }
}

function hasPersistedOverrides(stateV2Key: string): boolean {
  try {
    return window.localStorage.getItem(stateV2Key) !== null;
  } catch {
    return false;
  }
}

/**
 * Lazily import the panel adapter via package self-reference. First call
 * runs the panel module's top-level bootstrap, which binds Astro
 * view-transition listeners and re-applies persisted state. Subsequent
 * calls return the same promise.
 *
 * The package self-reference is marked external in `vite.config.ts` so the
 * import remains a runtime resolution against the consumer's
 * `node_modules/@takazudo/zudo-design-token-panel/dist/index.js`. That
 * resolution shares the `config/panel-config` chunk with this adapter, so
 * the `configurePanel` call below is observed by the panel module.
 *
 * Singleton-sharing runtime guard: after the dynamic import resolves,
 * compare the adapter's `getPanelConfig()` result against the panel
 * module's view via `__panelConfigForTest()`. They MUST be the same object
 * reference — Vite's multi-entry build code-splits the shared
 * `config/panel-config` module into one chunk so both surfaces observe one
 * and the same singleton. A reference mismatch indicates a future
 * packaging refactor split the singleton across two chunks; we
 * `console.warn` loudly so the regression is caught in dev. The check
 * fires once per adapter-state `modulePromise` lifecycle (i.e. once per
 * fresh module load), not on every show/hide/toggle call.
 */
async function loadPanelModule(state: DesignTokenPanelAdapterState) {
  if (state.modulePromise === null) {
    state.modulePromise = import('@takazudo/zudo-design-token-panel').then((mod) => {
      // Cheap insurance — compare object reference, not structural equality.
      // Both surfaces should resolve through the same `panel-config-*.js`
      // chunk, so the active config singleton is one object visible to both.
      try {
        const adapterView = getPanelConfig();
        const panelView = mod.__panelConfigForTest();
        if (adapterView !== panelView) {
          console.warn(
            '[design-token-panel] Singleton-sharing check failed: the host adapter and ' +
              'the panel module observed different PanelConfig singletons. This indicates ' +
              "the package's `config/panel-config` module is no longer code-split into a " +
              'single shared chunk. The panel may behave correctly today, but storage ' +
              'keys / namespaces / branding could diverge between the two surfaces in ' +
              'future bundles.',
          );
        }
      } catch (err) {
        // Defensive: never let the guard itself break the panel surface. If
        // `__panelConfigForTest` is missing (consumer pinned an older dist),
        // surface a quieter warning and continue.
        console.warn(
          '[design-token-panel] Singleton-sharing check could not run (likely an older ' +
            'dist without the __panelConfigForTest accessor): ' +
            (err as Error).message,
        );
      }
      return mod;
    });
  }
  return state.modulePromise;
}

function installConsoleApi(
  win: AdapterWindow,
  namespace: string,
  state: DesignTokenPanelAdapterState,
): void {
  const existing = (win[namespace] as ConsoleApiSurface | undefined) ?? {};
  existing.showDesignPanel = async () => {
    const panel = await loadPanelModule(state);
    panel.showDesignTokenPanel();
  };
  existing.hideDesignPanel = async () => {
    const panel = await loadPanelModule(state);
    panel.hideDesignTokenPanel();
  };
  existing.toggleDesignPanel = async () => {
    const panel = await loadPanelModule(state);
    panel.toggleDesignPanel();
  };
  win[namespace] = existing;
}

// ---------------------------------------------------------------------------
// Bootstrap (synchronous at module init)
// ---------------------------------------------------------------------------

(function bootstrap(): void {
  // 1. Parse and apply config FIRST so every subsequent reader (storage keys,
  //    console namespace, …) observes the host's intended values.
  const config = readInlineConfig();
  configurePanel(config);

  // Re-read via `getPanelConfig()` so the storage/namespace derivations use
  // the canonical source. (`configurePanel` shallow-clones, so `config` and
  // `getPanelConfig()` are equivalent here, but routing through the helper
  // keeps the contract honest if the package ever adds normalisation.)
  const cfg = getPanelConfig();
  const win = window as unknown as AdapterWindow;
  const state = getAdapterState(win, cfg.storagePrefix);

  // 2. Install console API every time — `bound` only gates the lazy-load
  //    probes, since the console handlers are idempotent (re-assigning the
  //    same closures is a no-op semantically).
  installConsoleApi(win, cfg.consoleNamespace, state);

  if (state.bound) return;
  state.bound = true;

  // 3. Lazy-load gate — eagerly load the panel module when the user had it
  //    open last session OR has persisted token overrides. Either signal
  //    means the panel must boot before first paint to avoid an FOUT.
  const visibleKey = storageKey_visible(cfg);
  const stateV2Key = storageKey_stateV2(cfg);
  if (wasVisible(visibleKey) || hasPersistedOverrides(stateV2Key)) {
    void loadPanelModule(state);
  }
})();
