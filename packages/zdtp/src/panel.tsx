import { useState, useEffect, useCallback, useRef, useId, useMemo } from 'preact/compat';
import type { RefObject } from 'preact';
import { ExportModal } from './export-modal';
import { ImportModal } from './import-modal';
import { ApplyModal, flattenApplyOverrides } from './apply-modal';
import { loadLastApplied, saveLastApplied, unsavedCssVars } from './apply/last-applied';
import { reconcileApplied } from './apply/reconcile-applied';
import { RoleButton } from './controls/role-button';
import { HighlightSettingsPopover } from './highlight/highlight-settings-popover';
import { HighlightOrchestrator } from './highlight/highlight-orchestrator';
import { ElementPathOrchestrator } from './element-path/element-path-orchestrator';
import { ElementPathToggleButton } from './element-path/element-path-toggle-button';
import {
  ElementInspectOrchestrator,
  ElementInspectToggleButton,
  ElementInspectView,
  ELEMENT_INSPECT_TAB_ID,
} from './element-inspect';
import { DomTweakerOrchestrator } from './dom-tweaker/dom-tweaker-orchestrator';
import { DomTweakerToggleButton } from './dom-tweaker/dom-tweaker-toggle-button';
import { DomTweakerDiffActionLink } from './dom-tweaker/dom-tweaker-diff-action-link';
import { ShellHeader } from './shell/header';
import { ShellTabBar } from './shell/tab-bar';
import { ShellFooter } from './shell/footer';
import { DockModeSwitch } from './shell/dock-mode-switch';
import { MiniPill } from './shell/mini-pill';
import {
  loadGhostIdle,
  saveGhostIdle,
  useGhostIdle,
} from './shell/ghost-idle';
import { ShellRegionsProvider, type ShellRegionItem } from './shell/regions';
import {
  LayerActivityProvider,
  useLayerActivity,
  useLayerRegistration,
} from './shell/layer-activity';
import { ShortcutProvider, useShortcut } from './shell/shortcut-dispatcher';
import {
  HistoryButtons,
  HistoryRail,
  HistoryShortcuts,
  HistoryUndoButton,
} from './history';
import {
  restoreSnapshotState,
  useSnapshots,
  type SnapshotSlot,
} from './history/snapshots';
import { SearchHeader } from './search/search-header';
import { SearchMatchBar, type SearchTabCount } from './search/match-bar';
import { CommandPalette, type CommandPaletteAction } from './search/command-palette';
import { buildTokenIndex, type TokenAddress } from './utils/token-index';
import { matchesTokenEntry } from './search/token-search';
import { scrollToTokenRow } from './tabs/flat/scroll-to-token-row';
import ColorTab from './tabs/color-tab';
import FontTab from './tabs/font-tab';
import SizeTab from './tabs/size-tab';
import SpacingTab from './tabs/spacing-tab';
import GenericTab from './tabs/generic-tab';
import PaletteTab from './tabs/palette/palette-tab';
import NotesTab from './tabs/notes-tab';
import type { BulkPatchEntry } from './bulk';
import { TooltipProvider } from './controls/tooltip';
import {
  getPanelConfig,
  openStateChangedEventName,
  storageKey_visible,
  type PanelConfig,
} from './config/panel-config';
import type { TabConfig } from './tokens/tier-model';
import { isDocumentUsable } from './utils/document-liveness';
import { claimHostDock, releaseHostMutations } from './host/host-mutations';
import { onPageSpecimenMutationOwner } from './specimen/on-page-specimen';
import { usePersist } from './state/persist';
import { useHistory } from './state/history';
import { useTweakStateTransaction } from './state/transaction';
import {
  type TweakState,
  type ColorTweakState,
  type PanelDensity,
  type DockMode,
  type DockSize,
  type PanelPosition,
  type PanelSize,
  DEFAULT_DENSITY,
  DEFAULT_DOCK_MODE,
  DEFAULT_DOCK_SIZE,
  DEFAULT_POSITION,
  applyColorSlices,
  applyFullState,
  applyNonColorSlices,
  clampPosition,
  clampSize,
  clearAppliedColorStyles,
  clearAppliedStyles,
  clearPersistedState,
  defaultSize,
  densityToGridMin,
  emptyOverrides,
  getActivePrimaryCluster,
  getActiveColorIdentity,
  getOpenKey,
  hasActiveColorSlot,
  initColorFromScheme,
  initSecondaryFromConfig,
  loadDensity,
  loadDockMode,
  loadDockSize,
  loadPersistedState,
  loadPosition,
  loadSize,
  saveDensity,
  saveDockMode,
  saveDockSize,
  savePosition,
  saveSize,
} from './state/tweak-state';

// --- Tab configuration ---

// Reserved tab ids dispatched to their dedicated components. 'notes' (#515)
// is a special-cased reserved id too — it renders NotesTab instead of a
// tier-driven token editor and carries no state/persist props (see the
// tab-body dispatch below and utils/design-token-serde.ts's OWN separate
// RESERVED_TAB_IDS Set, which independently excludes it from export/import).
const RESERVED_TAB_IDS = ['color', 'font', 'spacing', 'size', 'palette', 'notes', ELEMENT_INSPECT_TAB_ID] as const;
type ReservedTabId = (typeof RESERVED_TAB_IDS)[number];

const DEFAULT_TAB_ID: ReservedTabId = 'color';

// --- Panel sizing ---

/**
 * The panel is always draggable, movable, and resizable — on any viewport
 * width. `loadSize` / `defaultSize` already clamp the stored size to the
 * viewport (down to MIN_PANEL_WIDTH/HEIGHT), and `clampPosition` keeps a
 * visible slice on-screen, so a fixed-px panel stays usable on narrow windows
 * without a separate centered/locked layout.
 */
function computePanelSize(storedSize: PanelSize): {
  width: number;
  height: number;
} {
  return {
    width: storedSize.width,
    height: storedSize.height,
  };
}

// --- State factory ---

/**
 * Return a freshly-initialised TweakState: colour defaults from the active
 * scheme, empty override maps for spacing / typography / size, and the
 * secondary colour cluster defaults (if configured).
 *
 * Extracted from four identical inline object literals throughout the panel
 * so that adding or renaming a state slice only requires one change.
 *
 * `cfg` scopes the colour-cluster + secondary-cluster derivation to THIS
 * mounted panel instance (multi-instance, #357). Omitting it resolves the
 * default instance, preserving the single-panel path.
 */
function freshTweakState(cfg?: PanelConfig): TweakState {
  return {
    color: initColorFromScheme(getActivePrimaryCluster(cfg), cfg),
    spacing: emptyOverrides(),
    typography: emptyOverrides(),
    size: emptyOverrides(),
    secondary: initSecondaryFromConfig(cfg),
  };
}

function PanelLayerRegistrations({
  exportOpen,
  importOpen,
  applyOpen,
  highlightSettingsOpen,
}: {
  exportOpen: boolean;
  importOpen: boolean;
  applyOpen: boolean;
  highlightSettingsOpen: boolean;
}) {
  useLayerRegistration('export-modal', exportOpen);
  useLayerRegistration('import-modal', importOpen);
  useLayerRegistration('apply-modal', applyOpen);
  useLayerRegistration('highlight-settings', highlightSettingsOpen);
  return null;
}

function PanelEscapeShortcut({ onClose }: { onClose: () => void }) {
  const layerActive = useLayerActivity();
  useShortcut({ key: 'Escape' }, (event) => {
    if (event.defaultPrevented || layerActive) return;
    event.preventDefault();
    onClose();
  });
  return null;
}

function GhostIdleBehavior({
  enabled,
  targetRef,
}: {
  enabled: boolean;
  targetRef: RefObject<HTMLDivElement>;
}) {
  const layerActive = useLayerActivity();
  useGhostIdle(targetRef, enabled, layerActive);
  return null;
}

function GhostIdleToggle({
  enabled,
  onChange,
  compact = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={`tokenpanel-ghost-idle-toggle${compact ? ' is-compact' : ''}`}
      title="Fade the panel while the pointer is outside it"
    >
      <input
        type="checkbox"
        checked={enabled}
        onInput={(event) => onChange((event.currentTarget as HTMLInputElement).checked)}
        className="tokenpanel-ghost-idle-checkbox"
        aria-label="Ghost when idle"
      />
      <span>Ghost when idle</span>
    </label>
  );
}

// --- Main Component ---

/**
 * Props for the panel shell.
 *
 * `instanceConfig` is the FULL registered config of the instance this mounted
 * tree belongs to (issue #354). The adapter (`index.tsx`) passes it at
 * `render(...)` time. The panel reads its OWN open key, visible key,
 * per-instance open-state sync-event name, AND its OWN tabs from this config —
 * so two panels on one page read/write distinct storage keys, listen on
 * distinct sync events, and render distinct manifests, never cross-talking.
 * Omitted (e.g. a direct test render) → the active/default instance, preserving
 * the historical single-panel behaviour.
 *
 * `spawnOrdinal` is this shell's slot in the mounted-shell registry (#584),
 * handed down by the adapter at `render(...)` time. It cascades the FIRST-OPEN
 * position of concurrently mounted instances apart (#585) so a second panel
 * stops landing exactly on top of the first; a persisted position ignores it.
 * Omitted → 0, i.e. no offset.
 */
interface DesignTokenTweakPanelProps {
  instanceConfig?: PanelConfig;
  spawnOrdinal?: number;
}

export default function DesignTokenTweakPanel({
  instanceConfig: instanceConfigProp,
  spawnOrdinal = 0,
}: DesignTokenTweakPanelProps = {}) {
  // Resolve the instance config: the passed-in registered config, or the active
  // default instance for a direct (prop-less) test render. Memoised so the
  // object identity is stable across re-renders (the prop is fixed for a
  // mount's lifetime), which keeps the [instanceConfig] effect deps quiet.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const instanceConfig = useMemo<PanelConfig>(
    () => instanceConfigProp ?? getPanelConfig(),
    [instanceConfigProp],
  );

  // Scope WAI-ARIA IDs to this panel instance so that two mounted panels in
  // the same document do not share dtp-tab-* / dtp-panel-* IDs.
  const ariaIdScope = useId();
  const [open, setOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showHighlightSettings, setShowHighlightSettings] = useState(false);
  const [historyRailOpen, setHistoryRailOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotSlot | null>(null);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingJumpAddress, setPendingJumpAddress] = useState<TokenAddress | null>(null);
  const gearBtnRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TweakState | null>(null);
  // activeTab holds a string to support host-supplied non-reserved tab ids.
  // Lands on the FIRST configured tab (instanceConfig.tabs[0]) rather than
  // the hardcoded 'color' — a host makes ANY tab (e.g. 'notes', #515) the
  // landing view simply by ordering it first in tabs[]. Falls back to
  // DEFAULT_TAB_ID only when tabs is empty (the DEFAULT_PANEL_CONFIG stub,
  // or a misconfigured host) so the panel never lands on an undefined tab id.
  const [activeTab, setActiveTab] = useState<string>(
    instanceConfig.tabs[0]?.id ?? DEFAULT_TAB_ID,
  );
  const [position, setPosition] = useState<PanelPosition>(DEFAULT_POSITION);
  const [size, setSize] = useState<PanelSize>(defaultSize);
  const [density, setDensity] = useState<PanelDensity>(DEFAULT_DENSITY);
  const [dockMode, setDockMode] = useState<DockMode>(DEFAULT_DOCK_MODE);
  const [dockSize, setDockSize] = useState<DockSize>(DEFAULT_DOCK_SIZE);
  // The page specimen temporarily forces right docking.  Its previous mode is
  // transient (never persisted as a separate key) and must survive until the
  // specimen exits through any path, including shell unmount/navigation.
  const [renderSpecimenOnPage, setRenderSpecimenOnPage] = useState(false);
  const specimenPreviousDockModeRef = useRef<DockMode | null>(null);
  const [ghostIdle, setGhostIdle] = useState(false);
  const previousInspectTabRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // tabRefs is now keyed by string to support host-supplied tab ids.
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({
    spacing: null,
    font: null,
    size: null,
    color: null,
  });
  const positionRef = useRef<PanelPosition>(DEFAULT_POSITION);
  // Keep ref in sync with state for use in drag handlers (avoids stale closure)
  positionRef.current = position;
  const sizeRef = useRef<PanelSize>(size);
  sizeRef.current = size;
  const dockSizeRef = useRef<DockSize>(dockSize);
  dockSizeRef.current = dockSize;
  const dockModeRef = useRef<DockMode>(dockMode);
  dockModeRef.current = dockMode;
  const lastFullDockModeRef = useRef<DockMode>('float');
  // Track active drag listeners for cleanup on unmount
  const dragCleanupRef = useRef<(() => void) | null>(null);
  // Track active resize listeners for cleanup on unmount
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const { commitTweakState, history } = useTweakStateTransaction(state, setState, instanceConfig);
  const historySnapshot = useHistory(history);
  const { snapshots, save: saveSnapshotSlot } = useSnapshots(instanceConfig);
  const { persistColor, persistSpacing, persistFont, persistSize, persistSecondary, persistTab } =
    usePersist(commitTweakState, instanceConfig);

  const activeColorIdentity = useMemo(
    () => {
      const cluster = getActivePrimaryCluster(instanceConfig);
      // `getActiveColorIdentity` consults the host document for a
      // light/dark cluster. During SSR there is no document yet, so use the
      // cluster's configured scheme as the deterministic identity seed.
      if (typeof document === 'undefined' || !document.documentElement) {
        return cluster.panelSettings.colorScheme;
      }
      return getActiveColorIdentity(cluster, instanceConfig);
    },
    [instanceConfig, state],
  );

  // Bulk action bars hand the panel a complete patch. Keep the callback at
  // this layer so the whole selection travels through exactly one transaction
  // (apply → save → state → history), rather than one transaction per row.
  const handleSpacingBulkApply = useCallback((patch: readonly BulkPatchEntry[]) => {
    if (patch.length === 0) return;
    commitTweakState('bulk', (previous) => ({
      ...previous,
      spacing: patch.reduce(
        (next, item) => ({ ...next, [item.address.itemId]: item.value }),
        { ...previous.spacing },
      ),
    }));
  }, [commitTweakState]);

  const handleFontBulkApply = useCallback((patch: readonly BulkPatchEntry[]) => {
    if (patch.length === 0) return;
    commitTweakState('bulk', (previous) => ({
      ...previous,
      typography: patch.reduce(
        (next, item) => ({ ...next, [item.address.itemId]: item.value }),
        { ...previous.typography },
      ),
    }));
  }, [commitTweakState]);

  const handleSizeBulkApply = useCallback((patch: readonly BulkPatchEntry[]) => {
    if (patch.length === 0) return;
    commitTweakState('bulk', (previous) => ({
      ...previous,
      size: patch.reduce(
        (next, item) => ({ ...next, [item.address.itemId]: item.value }),
        { ...previous.size },
      ),
    }));
  }, [commitTweakState]);

  const handleGenericBulkApply = useCallback((tabId: string, patch: readonly BulkPatchEntry[]) => {
    if (patch.length === 0) return;
    commitTweakState('bulk', (previous) => {
      const previousTab = previous.tabs?.[tabId] ?? {};
      const nextTab = { ...previousTab };
      for (const item of patch) {
        nextTab[item.address.tierId] = {
          ...nextTab[item.address.tierId],
          [item.address.itemId]: item.value,
        };
      }
      return {
        ...previous,
        tabs: {
          ...previous.tabs,
          [tabId]: nextTab,
        },
      };
    });
  }, [commitTweakState]);

  // Restore open state, position, and size from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    // Liveness probe (zudolab/zudo-doc#3344): Preact flushes this effect on
    // rAF/setTimeout, which can land after a test environment tore down the
    // document. The setStates below would schedule a re-render that Preact
    // materialises via the dead global document (createElementNS on a
    // non-Document) — skip the restore entirely; there is no page left to
    // restore into.
    if (!isDocumentUsable()) return;
    try {
      if (localStorage.getItem(getOpenKey(instanceConfig)) === '1') setOpen(true);
    } catch {
      /* ignore */
    }
    const loadedSize = loadSize(instanceConfig);
    setSize(loadedSize);
    sizeRef.current = loadedSize;
    // Pass `loadedSize` so the first-open fallback is centered and contained
    // against the size this shell will ACTUALLY render at — an instance with a
    // persisted (resized) size but no persisted position would otherwise be
    // centered as if it were the default width and hang off the viewport.
    const loaded = loadPosition(instanceConfig, spawnOrdinal, loadedSize);
    // Clamp against current viewport so a position saved on a 4K monitor
    // (e.g. left:3000) doesn't restore fully off-screen on a 1080p laptop.
    // loadSize was already clamped; use its result for the position clamp so
    // both agree on panel dimensions.
    const clampedPos = clampPosition(loaded.top, loaded.left, loadedSize.width, loadedSize.height);
    setPosition(clampedPos);
    positionRef.current = clampedPos;
    setDensity(loadDensity(instanceConfig));
    const storedDockSize = loadDockSize(instanceConfig);
    const loadedDockSize = {
      right: Math.max(320, Math.min(storedDockSize.right, window.innerWidth)),
      bottom: Math.max(240, Math.min(storedDockSize.bottom, window.innerHeight)),
    };
    setDockSize(loadedDockSize);
    dockSizeRef.current = loadedDockSize;
    setDockMode(loadDockMode(instanceConfig));
    setGhostIdle(loadGhostIdle(instanceConfig.storagePrefix));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A public close can unmount the shell while the command palette is open;
  // keep the transient overlay state aligned with the shell lifetime.
  useEffect(() => {
    if (!open) {
      setShowCommandPalette(false);
      setPendingJumpAddress(null);
    }
  }, [open]);

  // The mini pill is a transient presentation of the last full mode. Keep
  // that mode in memory so expanding after a mini switch returns to the exact
  // float/right/bottom layout the user was looking at.
  useEffect(() => {
    if (dockMode !== 'mini') lastFullDockModeRef.current = dockMode;
  }, [dockMode]);

  // Persist density on change
  const handleDensityChange = useCallback(
    (next: PanelDensity) => {
      setDensity(next);
      saveDensity(next, instanceConfig);
    },
    [instanceConfig],
  );

  const handleGhostIdleChange = useCallback(
    (enabled: boolean) => {
      setGhostIdle(enabled);
      saveGhostIdle(instanceConfig.storagePrefix, enabled);
    },
    [instanceConfig],
  );

  // Persist open state, and keep the adapter-level :visible key in sync.
  // The adapter (index.tsx) only writes :visible from its public API paths
  // (show/hide/toggle), so an internal close (X button, ESC) would leave
  // :visible='1' while -open is absent — causing the panel to reopen on the
  // next page load via reapplyFromStorage → wasVisible(). Writing :visible
  // here ensures every close path (public API or internal UI) stays in lockstep.
  useEffect(() => {
    // Liveness probe (zudolab/zudo-doc#3344): when the mount-restore effect
    // above bailed on a torn-down document, `open` is still its initial
    // `false` — writing that here would REMOVE the open key and write
    // :visible='0', clobbering the seeds `showInstance` had already made
    // synchronously and restoring the panel closed on the next page. Skip:
    // the dead environment's `open` says nothing about the user's intent.
    // Inert on a live mount — the `open` dep re-runs this effect as soon as
    // the restore sets it, rewriting the correct values.
    if (!isDocumentUsable()) return;
    try {
      const openKey = getOpenKey(instanceConfig);
      if (open) localStorage.setItem(openKey, '1');
      else localStorage.removeItem(openKey);
    } catch {
      /* ignore */
    }
    try {
      const visibleKey = storageKey_visible(instanceConfig);
      localStorage.setItem(visibleKey, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open, instanceConfig]);

  // Dock claims are live only while the shell is visible. The shared registry
  // makes the ownership decision cross-bundle safe and restores host inline
  // declarations on every cleanup path (mode change, close, or unmount).
  useEffect(() => {
    if (!open || (dockMode !== 'right' && dockMode !== 'bottom')) {
      releaseHostMutations(instanceConfig.storagePrefix);
      return;
    }
    const claimed = claimHostDock(
      instanceConfig.storagePrefix,
      dockMode,
      dockSize[dockMode],
      instanceConfig.dock?.reflow ?? 'body-margin',
    );
    if (!claimed) {
      console.warn(
        `[design-token-panel] Cannot dock ${dockMode}: that edge is already owned; falling back to float`,
      );
      setDockMode('float');
      saveDockMode('float', instanceConfig);
      return;
    }
    return () => releaseHostMutations(instanceConfig.storagePrefix);
  }, [dockMode, dockSize, instanceConfig, open]);

  // Sync `open` from the authoritative `localStorage[OPEN_KEY]` whenever the
  // adapter (`index.tsx`) signals a change. The adapter writes OPEN_KEY itself
  // (header-button event, public API call, etc.) and then dispatches the
  // internal sync event on `window`. This component is downstream: it doesn't
  // compute the toggle from its own `prev` state — it just mirrors storage.
  //
  // The event name and the open key are BOTH keyed by this instance's
  // `storagePrefix` (issue #354): the panel listens only on its OWN
  // per-instance sync event and reads only its OWN open key, so panel A's
  // toggle never flips panel B.
  //
  // The two historical public event names (`toggle-design-token-panel` and
  // its deprecated `toggle-color-tweak-panel` alias) are handled in `index.tsx`
  // (see `handleExternalToggleEvent`). Removing them from this effect
  // eliminates the dual-listener race that caused the "click-twice-after-close"
  // regression — see `index.tsx` for the full rationale.
  useEffect(() => {
    const eventName = openStateChangedEventName(instanceConfig);
    function syncOpenFromStorage() {
      try {
        setOpen(localStorage.getItem(getOpenKey(instanceConfig)) === '1');
      } catch {
        /* ignore */
      }
    }
    window.addEventListener(eventName, syncOpenFromStorage);
    return () => {
      window.removeEventListener(eventName, syncOpenFromStorage);
    };
  }, [instanceConfig]);

  // Re-initialize the COLOR slice when the color scheme or light/dark mode
  // changes. Per-scheme tweak model (#500/#509 — supersedes the old global
  // model in README §9): each (scheme, mode) IDENTITY owns its own persisted
  // color/secondary slot in the v4 envelope.
  //
  // On a scheme change we clear the old scheme's inline color vars, then:
  //   - if the NEW identity has a persisted slot → hydrate it (through the #503
  //     validation, inside loadPersistedState) and APPLY it via applyColorSlices
  //     so the user's saved overrides for that scheme paint immediately instead
  //     of drifting until the next unrelated edit clobbers the old slot (#500).
  //   - else → reseed from config defaults and leave the color vars cleared so
  //     the new scheme's stylesheet shows through (the pre-existing behavior).
  //
  // Spacing / typography / size tweaks are scheme-INDEPENDENT (a light/dark
  // toggle does not change them), so they are preserved across the toggle:
  // clearAppliedColorStyles clears only color vars and applyColorSlices writes
  // only color vars, leaving the non-color live state + its inline vars intact
  // (#347). Everything is scoped to THIS instance (#357).
  //
  // The apply is done outside setState (with values that don't depend on `prev`)
  // so the state updater stays a pure merge of the new color/secondary slices.
  useEffect(() => {
    function handleSchemeChange() {
      clearAppliedColorStyles(undefined, undefined, instanceConfig);
      const cluster = getActivePrimaryCluster(instanceConfig);
      const slotPresent = hasActiveColorSlot(instanceConfig, cluster);
      let nextColor: ColorTweakState;
      let nextSecondary: ColorTweakState | undefined;
      if (slotPresent) {
        const loaded = loadPersistedState(undefined, undefined, cluster, instanceConfig);
        nextColor = loaded ? loaded.color : initColorFromScheme(cluster, instanceConfig);
        nextSecondary = loaded ? loaded.secondary : initSecondaryFromConfig(instanceConfig);
        // The new identity has persisted overrides — paint them now.
        applyColorSlices(nextColor, nextSecondary, instanceConfig);
      } else {
        nextColor = initColorFromScheme(cluster, instanceConfig);
        nextSecondary = initSecondaryFromConfig(instanceConfig);
      }
      if (state) {
        commitTweakState(
          'scheme-reapply',
          (previous) => ({
            ...previous,
            color: nextColor,
            secondary: nextSecondary,
          }),
          { record: false, apply: false, save: false },
        );
      } else {
        commitTweakState(
          'scheme-reapply',
          { ...freshTweakState(instanceConfig), color: nextColor, secondary: nextSecondary },
          { record: false, apply: false, save: false },
        );
      }
    }
    window.addEventListener('color-scheme-changed', handleSchemeChange);
    return () => window.removeEventListener('color-scheme-changed', handleSchemeChange);
  }, [instanceConfig, commitTweakState, state]);

  // Initialize state on first open. Every storage read + apply is scoped to
  // THIS instance's config (#357): panel A loads from A's storage keys and
  // applies through A's sink, never touching B's.
  useEffect(() => {
    if (!open || state) return;
    const cluster = getActivePrimaryCluster(instanceConfig);
    const persisted = loadPersistedState(undefined, undefined, cluster, instanceConfig);
    if (persisted) {
      // Gate color application on whether the ACTIVE (scheme, mode) identity
      // actually has a persisted color slot. If it does not — a v4 envelope
      // exists but was saved under a DIFFERENT identity — apply only the
      // scheme-independent non-color tweaks and let the active scheme's own
      // stylesheet colors show through, instead of painting synthesized
      // config-default colors inline (#509 audit; mirrors the scheme-change
      // handler's missing-slot behavior).
      if (hasActiveColorSlot(instanceConfig, cluster)) {
        applyFullState(persisted, instanceConfig);
      } else {
        applyNonColorSlices(persisted, instanceConfig);
      }
      commitTweakState('initialize', persisted, { record: false, apply: false, save: false });
      return;
    }
    // No saved state — page already has correct colors from ColorSchemeProvider.
    // Just read scheme data for panel display; don't apply (avoids overwriting host CSS with redundant defaults).
    // The `secondary` slice is always seeded — every fresh-state path
    // includes it so the persisted envelope shape stays stable regardless
    // of the user's path.
    commitTweakState('initialize', freshTweakState(instanceConfig), {
      record: false,
      apply: false,
      save: false,
    });
  }, [open, state, instanceConfig, commitTweakState]);

  // Drag handler for panel header (stable — reads position from ref)
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dockMode === 'right' || dockMode === 'bottom') return;
    // Skip if target is a button (or role=button/tab div), select, or inside one
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, select, option, [contenteditable], [role='tab'], [role='button'], .tokenpanel-search-control")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = positionRef.current.left;
    const startTop = positionRef.current.top;
    const panelWidth = panelRef.current?.offsetWidth ?? 600;
    const panelHeight = panelRef.current?.offsetHeight ?? 600;

    function onMouseMove(ev: MouseEvent) {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      const clamped = clampPosition(
        startTop + deltaY,
        startLeft + deltaX,
        panelWidth,
        panelHeight,
      );
      // Write directly to the DOM during drag to avoid re-rendering the whole
      // panel tree at ~60 fps. positionRef stays in sync so mouseup can commit
      // the final value to React state in one shot.
      if (panelRef.current) {
        panelRef.current.style.top = `${clamped.top}px`;
        panelRef.current.style.left = `${clamped.left}px`;
      }
      positionRef.current = clamped;
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragCleanupRef.current = null;
      // Commit final position to React state (single re-render on drag end).
      const finalPos = positionRef.current;
      setPosition(finalPos);
      savePosition(finalPos, instanceConfig);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dragCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dockMode, instanceConfig]);

  // Resize handler for the bottom-right grip — mirrors handleDragStart's
  // structure: writes directly to the DOM during the drag (to avoid 60 fps
  // re-renders of the whole panel) and commits the final value to React
  // state + localStorage on mouseup.
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = sizeRef.current.width;
    const startHeight = sizeRef.current.height;

    function onMouseMove(ev: MouseEvent) {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      // Bottom-right grip: drag right/down grows the panel. The panel is
      // anchored top-left, so growing width pushes the right edge rightward
      // (toward the cursor), and growing height extends the bottom edge —
      // both natural.
      const next = clampSize(startWidth + deltaX, startHeight + deltaY);
      if (panelRef.current) {
        panelRef.current.style.width = `${next.width}px`;
        panelRef.current.style.height = `${next.height}px`;
      }
      sizeRef.current = next;
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizeCleanupRef.current = null;
      const finalSize = sizeRef.current;
      setSize(finalSize);
      saveSize(finalSize, instanceConfig);
      // Re-clamp position against the new size — a wider panel may need its
      // anchor pulled back into the viewport.
      const finalPos = clampPosition(
        positionRef.current.top,
        positionRef.current.left,
        finalSize.width,
        finalSize.height,
      );
      if (finalPos.top !== positionRef.current.top || finalPos.left !== positionRef.current.left) {
        setPosition(finalPos);
        savePosition(finalPos, instanceConfig);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    resizeCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [instanceConfig]);

  const handleDockResizeStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dockMode !== 'right' && dockMode !== 'bottom') return;
      const edge = dockMode;
      e.preventDefault();
      e.stopPropagation();
      const start = edge === 'right' ? e.clientX : e.clientY;
      const startSize = dockSizeRef.current[edge];
      const min = edge === 'right' ? 320 : 240;
      const viewportMax = edge === 'right' ? window.innerWidth : window.innerHeight;
      const max = Math.max(min, viewportMax);

      function onMouseMove(ev: MouseEvent) {
        const pointer = edge === 'right' ? ev.clientX : ev.clientY;
        const nextValue = Math.max(min, Math.min(max, startSize + start - pointer));
        const next = { ...dockSizeRef.current, [edge]: nextValue };
        dockSizeRef.current = next;
        if (panelRef.current) {
          if (edge === 'right') panelRef.current.style.width = `${nextValue}px`;
          else panelRef.current.style.height = `${nextValue}px`;
        }
        claimHostDock(
          instanceConfig.storagePrefix,
          edge,
          nextValue,
          instanceConfig.dock?.reflow ?? 'body-margin',
        );
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        resizeCleanupRef.current = null;
        setDockSize(dockSizeRef.current);
        saveDockSize(dockSizeRef.current, instanceConfig);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      resizeCleanupRef.current = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    },
    [dockMode, instanceConfig],
  );

  const handleDockModeChange = useCallback(
    (next: DockMode) => {
      // Render on page owns the panel's right edge while active.  The only
      // path allowed to leave that edge is restoreSpecimenDockMode(), which
      // writes state directly after the page specimen has been disabled.
      if (renderSpecimenOnPage && next !== 'right') return;
      // A shortcut can switch modes (or close can follow) while the pointer is
      // still held on a drag/resize handle. Cancel those document listeners
      // before changing ownership so a later mousemove cannot re-claim an edge
      // that this panel has already released.
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      dockModeRef.current = next;
      setDockMode(next);
      saveDockMode(next, instanceConfig);
    },
    [instanceConfig, renderSpecimenOnPage],
  );

  /** Restore the mode that was active before Render on page forced right dock. */
  const restoreSpecimenDockMode = useCallback((syncState = true) => {
    const previous = specimenPreviousDockModeRef.current;
    if (previous === null) return;
    specimenPreviousDockModeRef.current = null;
    // Remove the host portal synchronously on every logical exit.  The
    // OnPageSpecimen effect cleanup also releases this owner, but this direct
    // release covers panel-close / toggle-off before the next effect flush.
    releaseHostMutations(onPageSpecimenMutationOwner(instanceConfig));
    if (syncState) setRenderSpecimenOnPage(false);
    if (dockModeRef.current === previous) return;
    dockModeRef.current = previous;
    if (syncState) setDockMode(previous);
    saveDockMode(previous, instanceConfig);
  }, [instanceConfig]);

  const handleRenderSpecimenOnPageChange = useCallback((enabled: boolean) => {
    if (!enabled) {
      restoreSpecimenDockMode();
      return;
    }
    if (specimenPreviousDockModeRef.current !== null) return;
    specimenPreviousDockModeRef.current = dockModeRef.current;
    setRenderSpecimenOnPage(true);
    if (dockModeRef.current !== 'right') handleDockModeChange('right');
  }, [handleDockModeChange, restoreSpecimenDockMode]);

  // Closing the panel unmounts FontTab (and thus the portal), so restore the
  // dock mode while the shell still owns its state.  Leaving right is also an
  // exit path: for example, the shared dock registry may reject this panel's
  // right-edge claim when another instance already owns it and fall back to
  // float. Restore the user's prior mode instead of leaving the page specimen
  // active without the dock it depends on.
  useEffect(() => {
    if (!open) restoreSpecimenDockMode();
    else if (renderSpecimenOnPage && dockMode !== 'right') restoreSpecimenDockMode();
  }, [dockMode, open, renderSpecimenOnPage, restoreSpecimenDockMode]);

  // Astro swaps and destroy() drive a real Preact unmount, but the state write
  // must still happen even though the component itself is going away.
  useEffect(() => () => restoreSpecimenDockMode(false), [restoreSpecimenDockMode]);

  useEffect(() => {
    if (open) return;
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
  }, [open]);

  // Clean up drag + resize listeners on unmount
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      resizeCleanupRef.current?.();
    };
  }, []);

  // Re-clamp position + size on window resize so a viewport shrink keeps the
  // panel within bounds.
  //
  // Design notes:
  // (a) Reads current values from sizeRef / positionRef — NOT from setState
  //     updaters — so the function is called after each debounce tick with
  //     the latest committed values without placing side effects (localStorage
  //     writes) inside updaters (which React / Preact may call multiple times).
  // (b) Uses the freshly clamped size as input to clampPosition, NOT the DOM's
  //     offsetWidth/Height — those reflect the pre-clamp frame and can differ.
  // (c) Only calls setSize / setPosition / save* when the value actually
  //     changed, avoiding spurious re-renders and localStorage writes on
  //     every resize event.
  // (d) Trailing 150 ms debounce — resize fires at ~60 fps; without debouncing
  //     every pixel of window drag issues a localStorage write.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function handleResize() {
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;

        // Re-clamp size first — a viewport shrink might force a smaller panel,
        // and the new dimensions feed into the position clamp below.
        const currentSize = sizeRef.current;
        const clampedSize = clampSize(currentSize.width, currentSize.height);
        const sizeDirty =
          clampedSize.width !== currentSize.width || clampedSize.height !== currentSize.height;
        if (sizeDirty) {
          setSize(clampedSize);
          sizeRef.current = clampedSize;
          saveSize(clampedSize, instanceConfig);
        }

        // Re-clamp position against the (potentially) new clamped size.
        const currentPos = positionRef.current;
        const clampedPos = clampPosition(
          currentPos.top,
          currentPos.left,
          clampedSize.width,
          clampedSize.height,
        );
        const posDirty =
          clampedPos.top !== currentPos.top || clampedPos.left !== currentPos.left;
        if (posDirty) {
          setPosition(clampedPos);
          positionRef.current = clampedPos;
          savePosition(clampedPos, instanceConfig);
        }
      }, 150);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceTimer !== null) clearTimeout(debounceTimer);
    };
  }, [instanceConfig]);

  const handleLoadFromJson = useCallback(
    (loaded: TweakState) => {
      // Clear color cluster vars first — mirrors the scheme-change clear
      // above. Without this, a dangling `{ ref }` in the imported state
      // (skipped by the resolver, #482 import nit) would leave the PREVIOUS
      // session's inline value painted instead of falling back to the
      // stylesheet default.
      // Replace the panel state with the loaded tweak, apply CSS vars, persist
      // to localStorage. Unknown tokens have already been filtered out by
      // deserialize(). Apply + persist are scoped to THIS instance (#357).
      commitTweakState('import', loaded, {
        beforeApply: () => clearAppliedColorStyles(undefined, undefined, instanceConfig),
      });
    },
    [instanceConfig, commitTweakState],
  );

  const handleResetAll = useCallback(() => {
    // Clear + reset are scoped to THIS instance's storage keys, clusters, and
    // sink so a reset on panel A never touches panel B's storage/vars (#357).
    // Always seed the secondary slice — every fresh-state path emits a
    // uniform envelope shape so persistence stays consistent.
    commitTweakState('reset', freshTweakState(instanceConfig), {
      apply: () => clearAppliedStyles(undefined, instanceConfig),
      save: () => clearPersistedState(undefined, instanceConfig),
    });
  }, [instanceConfig, commitTweakState]);

  const handleHistoryResult = useCallback(
    (result: { skippedReason?: string }) => {
      setHistoryNotice(result.skippedReason ?? null);
    },
    [],
  );

  const handleUndo = useCallback(() => {
    if (!historySnapshot.canUndo) return;
    handleHistoryResult(history.undo());
  }, [handleHistoryResult, history, historySnapshot.canUndo]);

  const handleRedo = useCallback(() => {
    if (!historySnapshot.canRedo) return;
    handleHistoryResult(history.redo());
  }, [handleHistoryResult, history, historySnapshot.canRedo]);

  const handleHistoryJump = useCallback(
    (index: number) => {
      handleHistoryResult(history.jumpTo(index));
    },
    [handleHistoryResult, history],
  );

  const handleSaveSnapshot = useCallback(
    (slot: SnapshotSlot) => {
      if (!state) return;
      saveSnapshotSlot(slot, state, activeColorIdentity, historySnapshot.cursor);
      setSelectedSnapshot(slot);
      setHistoryNotice(null);
    },
    [activeColorIdentity, historySnapshot.cursor, saveSnapshotSlot, state],
  );

  const handleSelectSnapshot = useCallback(
    (slot: SnapshotSlot) => {
      const snapshot = snapshots[slot];
      if (!snapshot || !state) return;
      const restored = restoreSnapshotState(snapshot, state, activeColorIdentity, slot);
      commitTweakState(`snapshot-${slot.toLowerCase()}`, restored.state, {
        beforeApply: () => clearAppliedColorStyles(undefined, undefined, instanceConfig),
      });
      setSelectedSnapshot(slot);
      setHistoryNotice(restored.skippedReason ?? `Showing snapshot ${slot}.`);
    },
    [activeColorIdentity, commitTweakState, instanceConfig, snapshots, state],
  );

  const handleFlipSnapshots = useCallback(() => {
    if (!snapshots.A || !snapshots.B) {
      setHistoryNotice('Save both A and B before flipping snapshots.');
      return;
    }
    handleSelectSnapshot(selectedSnapshot === 'A' ? 'B' : 'A');
  }, [handleSelectSnapshot, selectedSnapshot, snapshots.A, snapshots.B]);

  const handleResetTab = useCallback((tabId: string) => {
    if (tabId === 'color') {
      commitTweakState('reset-color', (previous) => ({
        ...previous,
        color: freshTweakState(instanceConfig).color,
      }), {
        beforeApply: () => clearAppliedColorStyles(undefined, undefined, instanceConfig),
      });
      return;
    }
    if (tabId === 'spacing') {
      persistSpacing(() => ({}));
      return;
    }
    if (tabId === 'font') {
      persistFont(() => ({}));
      return;
    }
    if (tabId === 'size') {
      persistSize(() => ({}));
      return;
    }
    if (tabId === 'notes' || tabId === 'color-secondary') return;
    persistTab(tabId, () => ({}));
  }, [commitTweakState, instanceConfig, persistFont, persistSize, persistSpacing, persistTab]);

  // Single source of truth for the four header actions (#518) — rendered
  // both as the always-visible .tokenpanel-action-link header links AND
  // inside the narrow-panel kebab popover, so a label/handler change only
  // needs one edit instead of two synchronized ones.
  const panelActions = useMemo(
    () => [
      { label: 'Export', onSelect: () => setShowExport(true) },
      { label: 'Load from JSON…', onSelect: () => setShowImport(true) },
      { label: 'Apply', onSelect: () => setShowApply(true) },
      { label: 'Reset', onSelect: handleResetAll },
    ],
    [handleResetAll],
  );

  const colorDefaults = useMemo(
    () => initColorFromScheme(getActivePrimaryCluster(instanceConfig), instanceConfig),
    [instanceConfig],
  );
  const secondaryDefaults = useMemo(() => initSecondaryFromConfig(instanceConfig), [instanceConfig]);
  const flattenedOverrides = useMemo(
    () => state ? flattenApplyOverrides(state, colorDefaults, instanceConfig) : {},
    [state, colorDefaults, instanceConfig],
  );
  const [lastApplied, setLastApplied] = useState(() => loadLastApplied(instanceConfig));
  const unsaved = useMemo(
    () => unsavedCssVars(flattenedOverrides, lastApplied),
    [flattenedOverrides, lastApplied],
  );

  const handleApplied = useCallback((writtenCssVars: string[]) => {
    commitTweakState('apply', (current) => {
      const next = reconcileApplied(current, writtenCssVars, instanceConfig, colorDefaults, secondaryDefaults);
      // Disk now contains the written subset; retained overrides remain
      // browser-only and therefore intentionally compare dirty against {}.
      saveLastApplied({}, instanceConfig);
      setLastApplied({});
      return next;
    }, { resetHistory: true, forceRecord: true });
  }, [instanceConfig, colorDefaults, secondaryDefaults, commitTweakState]);

  // Build the active tab list from this instance's PanelConfig.tabs (required).
  // Keyed on `instanceConfig` so a non-default panel renders ITS own manifest,
  // not the active default instance's (#354). configurePanel is one-shot per
  // prefix, so the list is stable for a mount's lifetime.
  const activeTabs = useMemo((): readonly { id: string; label: string }[] => {
    return [
      { id: ELEMENT_INSPECT_TAB_ID, label: 'Inspect' },
      ...instanceConfig.tabs
        .filter((t: TabConfig) => t.id !== ELEMENT_INSPECT_TAB_ID)
        .map((t: TabConfig) => ({ id: t.id, label: t.label })),
    ];
  }, [instanceConfig]);

  const openInspectTab = useCallback(() => {
    setActiveTab((current) => {
      if (current !== ELEMENT_INSPECT_TAB_ID) previousInspectTabRef.current = current;
      return ELEMENT_INSPECT_TAB_ID;
    });
  }, []);

  const handleActiveTabChange = useCallback((nextTab: string) => {
    setActiveTab((current) => {
      if (nextTab === ELEMENT_INSPECT_TAB_ID && current !== ELEMENT_INSPECT_TAB_ID) {
        previousInspectTabRef.current = current;
      } else if (nextTab !== ELEMENT_INSPECT_TAB_ID && current === ELEMENT_INSPECT_TAB_ID) {
        previousInspectTabRef.current = null;
      }
      return nextTab;
    });
  }, []);

  const clearInspectTab = useCallback(() => {
    setActiveTab((current) => {
      if (current !== ELEMENT_INSPECT_TAB_ID) return current;
      const previous = previousInspectTabRef.current;
      previousInspectTabRef.current = null;
      if (previous && activeTabs.some((tab) => tab.id === previous)) return previous;
      return instanceConfig.tabs[0]?.id ?? DEFAULT_TAB_ID;
    });
  }, [activeTabs, instanceConfig]);

  const jumpToColorTab = useCallback(() => {
    if (activeTabs.some((tab) => tab.id === 'color')) setActiveTab('color');
  }, [activeTabs]);

  // Build an id→TabConfig lookup for the tab-body dispatch (this instance's
  // tabs). Keyed on `instanceConfig` — same as `activeTabs` above — so the body
  // dispatch map tracks the active config. A prior `useMemo([])` left this map
  // frozen at first render: a config change updated the tab strip (`activeTabs`)
  // but the body kept dispatching against the stale map, rendering empty (#370).
  const tabConfigById = useMemo((): Record<string, TabConfig> => {
    const out: Record<string, TabConfig> = {};
    for (const t of instanceConfig.tabs) {
      out[t.id] = t;
    }
    return out;
  }, [instanceConfig]);

  const searchIndex = useMemo(() => buildTokenIndex(instanceConfig), [instanceConfig]);
  const searchCounts = useMemo<readonly SearchTabCount[]>(() => activeTabs.map((tab) => {
    if (tab.id === 'palette') {
      const config = tabConfigById[tab.id];
      const total = config?.tiers.length ?? 0;
      const matches = searchQuery.trim()
        ? (config?.tiers ?? []).filter((tier) =>
            [tier.id, tier.label].some((field) => field.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())),
          ).length
        : total;
      return { tab: config ?? { id: tab.id, label: tab.label, tiers: [] }, total, matches };
    }
    const entries = searchIndex.entries.filter((entry) => entry.address.tabId === tab.id);
    const total = entries.length;
    const matches = entries.filter((entry) => matchesTokenEntry(entry, searchQuery, state ?? undefined, instanceConfig)).length;
    return { tab: tabConfigById[tab.id] ?? { id: tab.id, label: tab.label, tiers: [] }, total, matches };
  }), [activeTabs, instanceConfig, searchIndex, searchQuery, state, tabConfigById]);

  const focusTokenAddress = useCallback((address: TokenAddress) => {
    const row = panelRef.current ? scrollToTokenRow(panelRef.current, address) : null;
    const focusSelector = 'input:not([type="hidden"]), select, textarea, [role="button"]';
    const focusTarget = row?.matches(focusSelector)
      ? row
      : row?.querySelector<HTMLElement>(focusSelector);
    focusTarget?.focus();
  }, []);

  const handleCommandToken = useCallback((address: TokenAddress) => {
    // A secondary cluster is rendered inside the primary Color tab, not as a
    // selectable tab of its own. The address stays intact for row navigation.
    const targetTab = address.tabId === 'color-secondary' ? 'color' : address.tabId;
    setSearchQuery('');
    setActiveTab(targetTab);
    if (address.tabId === 'palette') {
      setPendingJumpAddress(address);
      return;
    }
    window.requestAnimationFrame(() => focusTokenAddress(address));
  }, [focusTokenAddress]);

  const handlePaletteJumpHandled = useCallback((address: TokenAddress) => {
    setPendingJumpAddress(null);
    window.requestAnimationFrame(() => focusTokenAddress(address));
  }, [focusTokenAddress]);

  const commandActions = useMemo<readonly CommandPaletteAction[]>(() => {
    const actions: CommandPaletteAction[] = [
      { id: 'export', label: 'Export', onSelect: () => setShowExport(true) },
      { id: 'import', label: 'Load from JSON…', onSelect: () => setShowImport(true) },
      { id: 'apply', label: 'Apply', onSelect: () => setShowApply(true) },
    ];
    for (const tab of activeTabs) {
      if (tab.id === 'notes' || tab.id === 'color-secondary') continue;
      actions.push({
        id: `reset-${tab.id}`,
        label: `Reset ${tab.label}`,
        onSelect: () => handleResetTab(tab.id),
      });
    }
    for (const tab of activeTabs) {
      if (tab.id === 'color-secondary') continue;
      actions.push({
        id: `goto-${tab.id}`,
        label: `Go to ${tab.label}`,
        onSelect: () => setActiveTab(tab.id),
      });
    }
    actions.push({
      id: 'highlight-settings',
      label: 'Highlight settings',
      onSelect: () => setShowHighlightSettings(true),
    });
    return actions;
  }, [activeTabs, handleResetTab]);

  const shellRegionItems = useMemo(
    (): Partial<
      Record<'header-actions' | 'header-right' | 'tabbar-extras', readonly ShellRegionItem[]>
    > => ({
      'header-actions': [
        {
          id: 'search-filter',
          order: -1,
          render: () => (
            <SearchHeader
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onOpenPalette={() => setShowCommandPalette(true)}
            />
          ),
        },
        ...panelActions.map(
          (action, index): ShellRegionItem => ({
            id: `panel-action-${action.label}`,
            order: index,
            compactAction: action,
            render: () => (
              <RoleButton onClick={action.onSelect} className="tokenpanel-action-link">
                {action.label}
              </RoleButton>
            ),
          }),
        ),
        {
          id: 'dom-tweaker-diff',
          order: panelActions.length,
          renderInCompactMenu: true,
          render: ({ compact, closeCompactMenu }) => (
            <DomTweakerDiffActionLink
              instanceConfig={instanceConfig}
              onSelected={compact ? closeCompactMenu : undefined}
            />
          ),
        },
        {
          id: 'dock-modes-compact',
          order: panelActions.length + 1,
          renderInCompactMenu: true,
          render: ({ compact, closeCompactMenu }) =>
            compact ? (
              <DockModeSwitch
                value={dockMode}
                onChange={(mode) => {
                  handleDockModeChange(mode);
                  closeCompactMenu();
                }}
                compact
              />
            ) : null,
        },
        {
          id: 'ghost-idle-compact',
          order: panelActions.length + 2,
          renderInCompactMenu: true,
          render: ({ compact }) =>
            compact ? (
              <GhostIdleToggle
                enabled={ghostIdle}
                onChange={handleGhostIdleChange}
                compact
              />
            ) : null,
        },
      ],
      'header-right': [
        {
          id: 'apply-sync-status',
          order: -2,
          render: () => (
            <div className={`tokenpanel-apply-sync${unsaved.length > 0 ? ' is-unsaved' : ''}`} role="status">
              {unsaved.length > 0 ? `● ${unsaved.length} unsaved` : '✓ in sync'}
            </div>
          ),
        },
        {
          id: 'dock-modes',
          order: -1,
          render: () => (
            <DockModeSwitch
              value={dockMode}
              onChange={handleDockModeChange}
              enableShortcuts
            />
          ),
        },
        {
          id: 'element-path',
          order: 0,
          render: () => <ElementPathToggleButton />,
        },
        {
          id: 'element-inspect',
          order: 1,
          render: () => <ElementInspectToggleButton />,
        },
        ...(instanceConfig.domTweaker !== undefined
          ? [
              {
                id: 'dom-tweaker',
                order: 2,
                render: () => <DomTweakerToggleButton />,
              } satisfies ShellRegionItem,
            ]
          : []),
        {
          id: 'highlight-settings',
          order: 3,
          render: () => (
            <div
              ref={gearBtnRef}
              role="button"
              tabIndex={0}
              className="tokenpanel-gear-btn"
              aria-label="Highlight outline settings"
              aria-expanded={showHighlightSettings}
              aria-haspopup="dialog"
              onClick={() => setShowHighlightSettings((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setShowHighlightSettings((value) => !value);
                }
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
          ),
        },
        {
          id: 'close',
          order: 4,
          render: () => (
            <RoleButton
              onClick={() => setOpen(false)}
              className="tokenpanel-close-btn"
              aria-label="Close panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </RoleButton>
          ),
        },
      ],
      'tabbar-extras': [
        {
          id: 'ghost-idle',
          order: 0,
          render: () => (
            <GhostIdleToggle enabled={ghostIdle} onChange={handleGhostIdleChange} />
          ),
        },
      ],
    }),
    [
      dockMode,
      ghostIdle,
      handleDockModeChange,
      handleGhostIdleChange,
      instanceConfig,
      panelActions,
      searchQuery,
      showHighlightSettings,
      unsaved.length,
    ],
  );

  return (
    <LayerActivityProvider>
    <ShortcutProvider shellRef={panelRef} enabled={open}>
    <ShellRegionsProvider initialItems={shellRegionItems}>
    <PanelLayerRegistrations
      exportOpen={showExport}
      importOpen={showImport}
      applyOpen={showApply}
      highlightSettingsOpen={showHighlightSettings}
    />
    <HistoryButtons
      history={historySnapshot}
      railOpen={historyRailOpen}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onToggleRail={() => setHistoryRailOpen((openState) => !openState)}
    />
    <HistoryShortcuts
      enabled={open}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onFlipSnapshots={handleFlipSnapshots}
    />
    {open && <PanelEscapeShortcut onClose={() => setOpen(false)} />}
    <HighlightOrchestrator>
    <ElementPathOrchestrator>
    <ElementInspectOrchestrator
      instanceConfig={instanceConfig}
      state={state}
      commitTweakState={commitTweakState}
      onInspectTabOpen={openInspectTab}
      onInspectTabClear={clearInspectTab}
      onJumpToColorTab={jumpToColorTab}
      panelOpen={open}
    >
      <DomTweakerOrchestrator instanceConfig={instanceConfig}>
      <TooltipProvider>
      {open && (() => {
        const { width: panelW, height: panelH } = computePanelSize(size);

        const effectiveDockMode = dockMode === 'mini' ? 'float' : dockMode;
        const panelPos =
          effectiveDockMode === 'right'
            ? { position: 'fixed' as const, top: 0, right: 0, bottom: 0, left: 'auto' }
            : effectiveDockMode === 'bottom'
              ? { position: 'fixed' as const, top: 'auto', right: 0, bottom: 0, left: 0 }
              : { position: 'fixed' as const, top: position.top, left: position.left };
        const renderedWidth =
          effectiveDockMode === 'right'
            ? dockSize.right
            : effectiveDockMode === 'bottom'
              ? '100vw'
              : panelW;
        const renderedHeight =
          effectiveDockMode === 'bottom'
            ? dockSize.bottom
            : effectiveDockMode === 'right'
              ? '100vh'
              : panelH;

        return (
          <>
            {dockMode === 'mini' ? (
              <MiniPill
                onApply={() => setShowApply(true)}
                onExpand={() => handleDockModeChange(lastFullDockModeRef.current)}
                changedCount={unsaved.length > 0 ? unsaved.length : undefined}
                undo={
                  <HistoryUndoButton
                    canUndo={historySnapshot.canUndo}
                    onUndo={handleUndo}
                  />
                }
              />
            ) : (
        <div
        ref={panelRef}
        className={`tokenpanel-shell${effectiveDockMode === 'right' ? ' is-docked-right' : ''}${effectiveDockMode === 'bottom' ? ' is-docked-bottom' : ''}${historyRailOpen ? ' is-history-open' : ''}`}
        style={{
          ...panelPos,
          width: renderedWidth,
          height: renderedHeight,
          maxHeight: effectiveDockMode === 'float' ? 'calc(100vh - 32px)' : 'none',
          // `--tokenpanel-grid-min` is read by .tokenpanel-tab-grid /
          // .tokenpanel-tab-advanced-grid; switching the variable rewires the
          // min-card-width without re-rendering the grids.
          ['--tokenpanel-grid-min' as string]: densityToGridMin(density),
        }}
      >
        <GhostIdleBehavior enabled={ghostIdle} targetRef={panelRef} />
        <ShellHeader
          width={
            effectiveDockMode === 'right'
              ? dockSize.right
              : effectiveDockMode === 'bottom'
                ? window.innerWidth
                : size.width
          }
          onMouseDown={handleDragStart}
        />
        <ShellTabBar
          tabs={activeTabs}
          activeTab={activeTab}
          onActiveTabChange={handleActiveTabChange}
          ariaIdScope={ariaIdScope}
          tabRefs={tabRefs}
          density={density}
          onDensityChange={handleDensityChange}
          open={open}
        />
        <SearchMatchBar
          query={searchQuery}
          activeTabId={activeTab}
          counts={searchCounts}
          onSelectTab={setActiveTab}
        />

        {/* Tab panels — reserved ids dispatch to their dedicated components;
            non-reserved ids dispatch to GenericTab. */}
        <div className="tokenpanel-body">
          {activeTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            const isReserved = (RESERVED_TAB_IDS as readonly string[]).includes(tab.id);
            return (
              <div
                key={tab.id}
                role="tabpanel"
                id={`dtp-panel-${ariaIdScope}-${tab.id}`}
                aria-labelledby={`dtp-tab-${ariaIdScope}-${tab.id}`}
                tabIndex={0}
                hidden={!isSelected}
              >
                {tab.id === ELEMENT_INSPECT_TAB_ID && (
                  <ElementInspectView onJumpToColorTab={jumpToColorTab} />
                )}
                {tab.id === 'color' && state && tabConfigById['color'] && (
                  <ColorTab
                    tab={tabConfigById['color']}
                    state={state.color}
                    persistColor={persistColor}
                    secondaryTab={tabConfigById['color-secondary'] ?? null}
                    secondaryState={state.secondary ?? initSecondaryFromConfig(instanceConfig) ?? null}
                    persistSecondary={persistSecondary}
                    instanceConfig={instanceConfig}
                    tabOverrides={state.tabs ?? {}}
                    searchQuery={searchQuery}
                  />
                )}
                {tab.id === 'spacing' && state && tabConfigById['spacing'] && (
                  <SpacingTab
                    tab={tabConfigById['spacing']}
                    state={state.spacing}
                    persistSpacing={persistSpacing}
                    searchQuery={searchQuery}
                    onBulkApply={handleSpacingBulkApply}
                  />
                )}
                {tab.id === 'font' && state && tabConfigById['font'] && (
                  <FontTab
                    tab={tabConfigById['font']}
                    state={state.typography}
                    persistFont={persistFont}
                    instanceConfig={instanceConfig}
                    renderOnPage={renderSpecimenOnPage}
                    onRenderOnPageChange={handleRenderSpecimenOnPageChange}
                    searchQuery={searchQuery}
                    onBulkApply={handleFontBulkApply}
                  />
                )}
                {tab.id === 'size' && state && tabConfigById['size'] && (
                  <SizeTab
                    tab={tabConfigById['size']}
                    state={state.size}
                    persistSize={persistSize}
                    searchQuery={searchQuery}
                    onBulkApply={handleSizeBulkApply}
                  />
                )}
                {tab.id === 'palette' && state && tabConfigById['palette'] && (
                  <PaletteTab
                    tab={tabConfigById['palette']}
                    overrides={state.tabs?.['palette'] ?? {}}
                    onChange={(tierId, itemId, next) =>
                      persistTab('palette', (prev) => ({
                        ...prev,
                        [tierId]: { ...prev[tierId], [itemId]: next },
                      }))
                    }
                    onCommitBatch={(tierId, patch) =>
                      // One drag gesture = ONE persistTab call: merge the whole
                      // { [itemId]: oklch } patch for the tier in a single
                      // updater so the DOM apply + localStorage write happen
                      // once, not once per drag frame.
                      persistTab('palette', (prev) => ({
                        ...prev,
                        [tierId]: { ...prev[tierId], ...patch },
                      }))
                    }
                    searchQuery={searchQuery}
                    jumpAddress={pendingJumpAddress}
                    onJumpAddressHandled={handlePaletteJumpHandled}
                  />
                )}
                {tab.id === 'notes' && tabConfigById['notes'] && (
                  // No state/persist props — the notes tab carries no token
                  // overrides (#515): it's excluded from state.tabs, apply
                  // routing, and export/import serde by construction.
                  <NotesTab tab={tabConfigById['notes']} />
                )}
                {!isReserved && tabConfigById[tab.id] && state && (
                  <GenericTab
                    tab={tabConfigById[tab.id]}
                    overrides={state.tabs?.[tab.id] ?? {}}
                    searchQuery={searchQuery}
                    onBulkApply={(patch) => handleGenericBulkApply(tab.id, patch)}
                    onChange={(tierId, itemId, next) => {
                      // `next === undefined` (ref-tier "Literal…" pick, #470)
                      // means drop the stored override entirely so the item
                      // reverts to its tier's default ref, matching the
                      // font/spacing/size tabs' delete-the-key behavior.
                      persistTab(tab.id, (prev) => {
                        if (next === undefined) {
                          const tierPrev = { ...prev[tierId] };
                          delete tierPrev[itemId];
                          return { ...prev, [tierId]: tierPrev };
                        }
                        return {
                          ...prev,
                          [tierId]: {
                            ...prev[tierId],
                            [itemId]: next,
                          },
                        };
                      });
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {historyRailOpen && (
          <HistoryRail
            history={historySnapshot}
            snapshots={snapshots}
            selectedSnapshot={selectedSnapshot}
            notice={historyNotice ?? historySnapshot.lastSkippedReason}
            activeIdentity={activeColorIdentity}
            onSaveSnapshot={handleSaveSnapshot}
            onSelectSnapshot={handleSelectSnapshot}
            onJumpTo={handleHistoryJump}
          />
        )}

        <ShellFooter />

        {/* Bottom-right resize grip — available on every viewport width.

            ARIA: `role="separator"` would imply a 1D resizer between two
            regions; this grip resizes the panel on both axes, which has no
            standard role. We keep just `aria-label` for SR users — keyboard
            resize is intentionally out of scope. */}
        {effectiveDockMode === 'float' ? (
          <div
            className="tokenpanel-resize-handle"
            onMouseDown={handleResizeStart}
            aria-label="Resize panel"
            title="Drag to resize"
          />
        ) : (
          <div
            className={`tokenpanel-dock-resize-handle is-${effectiveDockMode}`}
            onMouseDown={handleDockResizeStart}
            aria-label={`Resize ${effectiveDockMode}-docked panel`}
            title="Drag to resize"
          />
        )}
        <CommandPalette
          open={showCommandPalette}
          onOpen={() => setShowCommandPalette(true)}
          onClose={() => setShowCommandPalette(false)}
          config={instanceConfig}
          state={state}
          actions={commandActions}
          onSelectToken={handleCommandToken}
        />
              </div>
            )}

      {showExport && state && (
        <ExportModal
          onClose={() => setShowExport(false)}
          state={state}
          colorDefaults={colorDefaults}
          instanceConfig={instanceConfig}
        />
      )}

      {showImport && state && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onLoad={handleLoadFromJson}
          colorDefaults={initColorFromScheme(getActivePrimaryCluster(instanceConfig), instanceConfig)}
          instanceConfig={instanceConfig}
        />
      )}

      {showApply && state && (
        <ApplyModal
          state={state}
          open={showApply}
          onClose={() => setShowApply(false)}
          colorDefaults={colorDefaults}
          onApplied={handleApplied}
          instanceConfig={instanceConfig}
        />
      )}

      {showHighlightSettings && (
        <HighlightSettingsPopover
          anchorRef={gearBtnRef}
          onClose={() => setShowHighlightSettings(false)}
        />
      )}
          </>
        );
      })()}
      </TooltipProvider>
      </DomTweakerOrchestrator>
    </ElementInspectOrchestrator>
      </ElementPathOrchestrator>
    </HighlightOrchestrator>
    </ShellRegionsProvider>
    </ShortcutProvider>
    </LayerActivityProvider>
  );
}

export type { TweakState } from './state/tweak-state';
