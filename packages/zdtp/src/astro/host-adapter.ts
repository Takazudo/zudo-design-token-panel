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
 *     host script used: an existing `wasVisible()` flag or any non-empty
 *     persisted state envelope. When none is set, the panel module stays out
 *     of the initial bundle and only loads when the user calls a
 *     `window.<ns>.*` helper from the console.
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
// (`@takazudo/zdtp`), kept external by `vite.config.ts`.
import type * as DesignTokenPanelModule from '../index';
import {
  assertValidPanelConfig,
  configurePanel,
  getPanelConfig,
  installZdtpGlobalAlias,
  storageKey_visible,
  type PanelConfig,
  type PanelInstanceHandle,
} from '../config/panel-config';
import { ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP, getOpenKey } from '../state/tweak-state';
import { shouldAutoload, rememberAutoload, clearAutoload } from '../state/autoload-state';
import { loadElementPathEnabled, saveElementPathEnabled } from '../element-path/element-path-state';
import { loadDomTweakerEnabled } from '../dom-tweaker/dom-tweaker-state';
import { captureDocument, isSameUsableDocument } from '../utils/document-liveness';

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
  enableAutoload?: () => Promise<void>;
  disableAutoload?: () => Promise<void>;
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

/** Escape regex metacharacters so a host-supplied `storagePrefix` is matched literally. */
function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A parsed envelope counts as "has overrides" only when it is provably
 * non-empty. Malformed JSON returns `true` (epic #575 decision 3) — a parse
 * failure means the panel must still load so it can migrate or reject the
 * payload, rather than stranding the user with corrupt state it can never see.
 */
function hasNonEmptyOverridesEnvelope(raw: string | null): boolean {
  // An empty string is a blank slot, not malformed data — treat it like
  // `null` rather than routing it into the fail-open malformed-JSON branch
  // below (`JSON.parse('')` throws, but there is nothing here to migrate).
  if (raw === null || raw === '') return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return true;
  }
  if (parsed === null) return false;
  if (Array.isArray(parsed)) return parsed.length > 0;
  if (typeof parsed === 'object') return Object.keys(parsed).length > 0;
  return true;
}

function hasPersistedOverrides(cfg: PanelConfig): boolean {
  try {
    // Exact `-state` family match (v1 `${prefix}-state` through every future
    // `${prefix}-state-vN`), NOT a `startsWith(prefix + '-state')` scan. A
    // page running sibling prefixes like `myapp` and `myapp-state` would
    // otherwise have the SIBLING's own keys (`myapp-state-state`,
    // `myapp-state-state-v4`) satisfy instance `myapp`'s scan, so one
    // instance would eager-load because of another's state (epic #575
    // decision 6). Note `myapp-state-v4` is `myapp`'s OWN v4 key, not the
    // sibling's. Scanning keys directly (rather than
    // deriving one key per known version) also picks up v1 — which the old
    // per-version key list omitted — and any future version, with no schema
    // knowledge required.
    const familyRe = new RegExp(`^${escapeRegExpLiteral(cfg.storagePrefix)}-state(-v\\d+)?$`);
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key !== null && familyRe.test(key) && hasNonEmptyOverridesEnvelope(ls.getItem(key))) {
        return true;
      }
    }
    return false;
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
 * `node_modules/@takazudo/zdtp/dist/index.js`. That
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
    state.modulePromise = import('@takazudo/zdtp').then((mod) => {
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

/**
 * Install the console API on `window[namespace]`, bound to THIS instance's
 * handle (multi-instance, #357).
 *
 * The handlers must target the instance whose namespace they were installed
 * under — NOT `getPanelConfig()` at call time. Previously they called the
 * no-arg exports (`panel.showDesignTokenPanel()` etc.), which resolve the
 * most-recently-configured (default) instance: once a SECOND instance was
 * configured, namespace A's console call drove instance B. Binding to the
 * instance `handle` (captured at install time, keyed by its `storagePrefix`)
 * keeps namespace A's console call driving instance A regardless of which
 * instance is the active default.
 *
 * `handle.open/close/toggle` route through the per-instance lifecycle hooks the
 * panel module installs at load. We still `await loadPanelModule(state)` first
 * so those hooks are installed (and the panel root materialises) before the
 * handle method fires — otherwise the handle methods are no-ops.
 */
function installConsoleApi(
  win: AdapterWindow,
  namespace: string,
  state: DesignTokenPanelAdapterState,
  handle: PanelInstanceHandle,
  cfg: PanelConfig,
): void {
  const existing = (win[namespace] as ConsoleApiSurface | undefined) ?? {};
  // Every async handler below captures the document that owned the call
  // BEFORE its first `await`, and cancels itself quietly when the global
  // document is gone, swapped, or unusable on resume. Without this, a
  // continuation resuming after environment teardown (vitest jsdom swap,
  // zudolab/zudo-doc#3344) reaches `document.getElementById` on a corpse and
  // the resulting TypeError becomes an unhandled rejection — these handlers
  // are fire-and-forget for most callers.
  existing.showDesignPanel = async () => {
    const owningDoc = captureDocument();
    await loadPanelModule(state);
    if (!isSameUsableDocument(owningDoc)) return;
    // Auto-remember: showing the panel arms autoload so future page loads
    // reload it automatically (owner-mode semantics). Armed only AFTER the
    // ownership check (zudolab/zudo-doc#3344) — a show that the check cancels
    // never displayed anything, so persisting autoload would make the next
    // page eagerly load a panel the user never saw.
    rememberAutoload(cfg);
    handle.open();
  };
  existing.hideDesignPanel = async () => {
    const owningDoc = captureDocument();
    await loadPanelModule(state);
    if (!isSameUsableDocument(owningDoc)) return;
    handle.close();
  };
  existing.toggleDesignPanel = async () => {
    const owningDoc = captureDocument();
    await loadPanelModule(state);
    if (!isSameUsableDocument(owningDoc)) return;
    handle.toggle();
    // Read the post-toggle OPEN_KEY to determine whether the panel is now
    // open. Pre-toggle prediction was broken for the fresh-mount case: with
    // OPEN_KEY='1' and no mounted root (SPA-nav zombie state, or a
    // handle.destroy() + re-configure cycle that left OPEN_KEY behind),
    // `getOpenKey() !== '1'` evaluated false (predicted close) even though
    // toggleInstance correctly opens on a fresh mount. Reading post-toggle
    // avoids the race entirely: toggleInstance has already written the
    // correct value by the time we reach this line.
    let isNowOpen = false;
    try {
      isNowOpen = window.localStorage.getItem(getOpenKey(cfg)) === '1';
    } catch {
      /* storage unavailable — skip auto-remember for this toggle */
    }
    if (isNowOpen) {
      rememberAutoload(cfg);
    }
  };
  existing.enableAutoload = async () => {
    const owningDoc = captureDocument();
    // Delegate to the module's cfg-aware implementation — the single source of
    // the owner-mode contract. It sets `:autoload`, arms element-path for THIS
    // instance, and mounts the shell CLOSED. We must `await` the load first so
    // the lifecycle hooks are installed before it drives the mount.
    const mod = await loadPanelModule(state);
    if (!isSameUsableDocument(owningDoc)) return;
    mod.enableAutoload(cfg);
  };
  existing.disableAutoload = async () => {
    const owningDoc = captureDocument();
    // If the panel module was already loaded, delegate to its cfg-aware
    // disableAutoload: it clears every owner-mode key for THIS instance AND
    // fully UNMOUNTS the shell, tearing down the live Alt+click inspector
    // immediately. (Closing alone would leave the inspector armed until the
    // next reload, because clearing localStorage does not update the mounted
    // ElementPathOrchestrator's React state.)
    if (state.modulePromise !== null) {
      const mod = await loadPanelModule(state);
      if (!isSameUsableDocument(owningDoc)) return;
      mod.disableAutoload(cfg);
      return;
    }
    // Module never loaded: clear the persisted owner-mode keys for THIS instance
    // directly, without pulling the bundle just to tear nothing down.
    clearAutoload(cfg);
    saveElementPathEnabled(false, cfg);
    // Clear :visible flag (mirrors setStoredVisibility(cfg, false) in index.tsx).
    try {
      window.localStorage.setItem(storageKey_visible(cfg), '0');
    } catch {
      /* storage unavailable — degrade silently */
    }
    // Clear the open-state key so a future load does not re-open the panel.
    try {
      window.localStorage.removeItem(getOpenKey(cfg));
    } catch {
      /* storage unavailable — degrade silently */
    }
  };
  win[namespace] = existing;
}

/**
 * Install the fixed-name `window.zdtp = { show, hide, toggle }` global
 * (issue #523), bound to THIS instance's handle — mirrors
 * `installConsoleApi`'s per-instance binding rationale above. Each wrapper
 * `await`s `loadPanelModule(state)` first so the per-instance lifecycle hooks
 * are installed (and, for `show`, so `handle.open()` routes through
 * `showInstance` and arms autoload — see `index.tsx`) before the handle
 * method fires.
 *
 * Called eagerly from `bootstrap()`, so the global is available in the
 * console immediately — before the panel bundle itself has loaded.
 * `installZdtpGlobalAlias` owns the never-clobber / no-double-install guard
 * shared with the package-root install site in `index.tsx`.
 */
function installZdtpAlias(state: DesignTokenPanelAdapterState, handle: PanelInstanceHandle): void {
  // Same owning-document capture + post-await cancellation as the console API
  // handlers in `installConsoleApi` — see the comment there (#3344 upstream).
  installZdtpGlobalAlias({
    show: async () => {
      const owningDoc = captureDocument();
      await loadPanelModule(state);
      if (!isSameUsableDocument(owningDoc)) return;
      handle.open();
    },
    hide: async () => {
      const owningDoc = captureDocument();
      await loadPanelModule(state);
      if (!isSameUsableDocument(owningDoc)) return;
      handle.close();
    },
    toggle: async () => {
      const owningDoc = captureDocument();
      await loadPanelModule(state);
      if (!isSameUsableDocument(owningDoc)) return;
      handle.toggle();
    },
  });
}

// ---------------------------------------------------------------------------
// Bootstrap (synchronous at module init)
// ---------------------------------------------------------------------------

(function bootstrap(): void {
  // 1. Parse and apply config FIRST so every subsequent reader (storage keys,
  //    console namespace, …) observes the host's intended values.
  //
  // The astro path is the historical zdtp-internal caller — its persisted
  // payloads predate issue #51 and use the legacy typography ids
  // (`text-caption`, `text-small`, …) that the host's manifest now publishes
  // under their Tailwind-tier names. Inject the opt-in legacy rename map
  // here unless the host already supplied one, so existing astro deployments
  // don't lose user tweaks on the upgrade.
  const inline = readInlineConfig();
  const config: PanelConfig = inline.legacyIdRenameMap
    ? inline
    : { ...inline, legacyIdRenameMap: { ...ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP } };
  // Capture THIS instance's handle (keyed by its storagePrefix). The console
  // handlers bind to it so a namespace's console call always targets ITS
  // instance, never whichever instance was configured last (#357).
  const handle = configurePanel(config);

  // Re-read via `getPanelConfig()` so the storage/namespace derivations use
  // the canonical source. (`configurePanel` shallow-clones, so `config` and
  // `getPanelConfig()` are equivalent here, but routing through the helper
  // keeps the contract honest if the package ever adds normalisation.)
  const cfg = getPanelConfig();
  const win = window as unknown as AdapterWindow;
  const state = getAdapterState(win, cfg.storagePrefix);

  // 2. Install console API every time — `bound` only gates the lazy-load
  //    probes, since the console handlers are idempotent (re-assigning the
  //    same closures is a no-op semantically). Bind to this instance's handle.
  installConsoleApi(win, cfg.consoleNamespace, state, handle, cfg);

  // 2b. Install the fixed-name `window.zdtp` global alias (issue #523),
  //     bound to this same instance's handle. Also every-time / idempotent —
  //     `installZdtpGlobalAlias` itself no-ops past the first successful
  //     install (see its JSDoc).
  installZdtpAlias(state, handle);

  if (state.bound) return;
  state.bound = true;

  // 3. Lazy-load gate — eagerly load the panel module when the user had it
  //    open last session (via either the `:visible` flag or its `-open`
  //    mirror) OR has persisted token overrides OR the owner-autoload flag
  //    is set OR the element-path inspector is enabled OR the DOM Tweaker is
  //    enabled. Any signal means the panel must boot before first paint to
  //    avoid an FOUT or a broken closed-shell feature (element-path / DOM
  //    Tweaker both need the Preact shell).
  const visibleKey = storageKey_visible(cfg);
  if (
    wasVisible(visibleKey) ||
    wasVisible(getOpenKey(cfg)) ||
    hasPersistedOverrides(cfg) ||
    shouldAutoload(cfg) ||
    loadElementPathEnabled(cfg) ||
    (cfg.domTweaker !== undefined && loadDomTweakerEnabled(cfg))
  ) {
    // Fire-and-forget by design, but with the rejection handled: a failed
    // chunk load here has no caller to observe it, and an unhandled rejection
    // in a consumer's test runner fails the whole run (same failure class as
    // zudolab/zudo-doc#3344). Explicit callers still see the memoised
    // promise's own rejection.
    loadPanelModule(state).catch((err: unknown) => {
      console.error('[design-token-panel] Eager panel-module load failed.', err);
    });
  }
})();
