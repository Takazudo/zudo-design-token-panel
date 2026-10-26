/** @jsxImportSource @takazudo/zfb/zudo-react */
import { batch, computed, getScope, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { ApplyModal, flattenApplyOverrides } from './apply-modal';
import { ExportModal } from './export-modal';
import { ImportModal } from './import-modal';
import { loadLastApplied, saveLastApplied, unsavedCssVars } from './apply/last-applied';
import { reconcileApplied } from './apply/reconcile-applied';
import { RoleButton } from './controls/role-button';
import { createTooltipController } from './controls/tooltip-controller';
import { HighlightSettingsPopover } from './highlight/highlight-settings-popover';
import { useHighlightController } from './highlight/highlight-orchestrator';
import { tokenChainSignal } from './chain/token-chain-context';
import { useElementPath } from './element-path/element-path-orchestrator';
import { ElementPathToggleButton } from './element-path/element-path-toggle-button';
import { useElementInspect } from './element-inspect/element-inspect-orchestrator';
import { ElementInspectToggleButton } from './element-inspect/element-inspect-toggle-button';
import { ElementInspectView } from './element-inspect/element-inspect-view';
import { ELEMENT_INSPECT_TAB_ID } from './element-inspect/element-inspect-context';
import { useDomTweaker } from './dom-tweaker/dom-tweaker-orchestrator';
import { DomTweakerToggleButton } from './dom-tweaker/dom-tweaker-toggle-button';
import { DomTweakerDiffActionLink } from './dom-tweaker/dom-tweaker-diff-action-link';
import { ShellHeader } from './shell/header';
import { DensitySlider, ShellTabBar } from './shell/tab-bar';
import { ShellFooter } from './shell/footer';
import { DockModeSwitch } from './shell/dock-mode-switch';
import { MiniPill } from './shell/mini-pill';
import { loadGhostIdle, saveGhostIdle, useGhostIdle } from './shell/ghost-idle';
import { createShellRegions, type RegionItems, type ShellRegionItem } from './shell/regions';
import { createLayerActivity, useLayerRegistration } from './shell/layer-activity';
import { createShortcutDispatcher, useShortcut } from './shell/shortcut-dispatcher';
import { HistoryRail, HistoryUndoButton, historyRegionItem, useHistoryShortcuts } from './history';
import { createSnapshotStore, restoreSnapshotState, type SnapshotSlot } from './history/snapshots';
import { SearchHeader } from './search/search-header';
import { SearchMatchBar, type SearchTabCount } from './search/match-bar';
import { CommandPalette, type CommandPaletteAction } from './search/command-palette';
import { buildTokenIndex, tokenAddressKey, type TokenAddress } from './utils/token-index';
import { matchesTokenEntry } from './search/token-search';
import { scrollToTokenRow } from './tabs/flat/scroll-to-token-row';
import type { ChangedContributionOptions } from './changed/contribution';
import { ChangedFooterContent } from './changed/footer-content';
import { ChangedOnlyToggle } from './changed/tab-filter';
import ColorTab from './tabs/color-tab';
import FontTab from './tabs/font-tab';
import GenericTab from './tabs/generic-tab';
import SizeTab from './tabs/size-tab';
import SpacingTab from './tabs/spacing-tab';
import PaletteTab from './tabs/palette/palette-tab';
import NotesTab from './tabs/notes-tab';
import type { BulkPatchEntry } from './bulk';
import {
  getPanelConfig,
  isApplyConfigured,
  openStateChangedEventName,
  storageKey_visible,
  type PanelConfig,
} from './config/panel-config';
import type { TabConfig } from './tokens/tier-model';
import { isDocumentUsable } from './utils/document-liveness';
import { claimHostDock, releaseHostMutations } from './host/host-mutations';
import { onPageSpecimenMutationOwner } from './specimen/on-page-specimen';
import { createTweakHistory } from './state/history';
import { createPersist } from './state/persist';
import { createTweakStateTransaction } from './state/transaction';
import { createPanelServices } from './zr/panel-services';
import { Checkbox } from './zr/form-controls';
import { Rebuild } from './zr/rebuild';
import { storeSignal } from './zr/store';
import { toZrStyle } from './zr/style';
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
  MIN_PANEL_WIDTH,
  DEFAULT_POSITION,
  applyColorSlices,
  applyFullState,
  applyManifestModeDefaults,
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
import {
  changedCounts,
  isChanged,
  revertEntry,
  type ColorBaseline,
} from './utils/token-diff';

// --- Tab configuration ---

// Reserved tab ids dispatched to their dedicated components. 'notes' (#515)
// is a special-cased reserved id too — it renders NotesTab instead of a
// tier-driven token editor and carries no state/persist props (see the
// tab-body dispatch below and utils/design-token-serde.ts's OWN separate
// RESERVED_TAB_IDS Set, which independently excludes it from export/import).
const RESERVED_TAB_IDS = ['color', 'font', 'spacing', 'size', 'palette', 'notes', ELEMENT_INSPECT_TAB_ID] as const;
type ReservedTabId = (typeof RESERVED_TAB_IDS)[number];

const DEFAULT_TAB_ID: ReservedTabId = 'color';
const APPLY_DISABLED_REASON = 'Apply unavailable: configure an apply endpoint and a non-empty routing map.';

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

function GhostIdleToggle({
  enabled,
  onChange,
  compact = false,
}: {
  enabled: ReadonlySignal<boolean>;
  onChange: (enabled: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      class={`tokenpanel-ghost-idle-toggle${compact ? ' is-compact' : ''}`}
      title="Fade the panel while the pointer is outside it"
    >
      <Checkbox
        checked={enabled}
        onChange={onChange}
        class="tokenpanel-ghost-idle-checkbox"
        aria-label="Ghost when idle"
      />
      <span>Ghost when idle</span>
    </label>
  );
}

let nextAriaScope = 0;

// --- Main Component ---

/**
 * Props for the panel shell.
 *
 * `instanceConfig` is the FULL registered config of the instance this mounted
 * tree belongs to (issue #354). The adapter (`index.tsx`) passes it at
 * mount time. The panel reads its OWN open key, visible key,
 * per-instance open-state sync-event name, AND its OWN tabs from this config —
 * so two panels on one page read/write distinct storage keys, listen on
 * distinct sync events, and render distinct manifests, never cross-talking.
 * Omitted (e.g. a direct test render) → the active/default instance, preserving
 * the historical single-panel behaviour.
 *
 * `spawnOrdinal` is this shell's slot in the mounted-shell registry (#584),
 * handed down by the adapter at mount time. It cascades the FIRST-OPEN
 * position of concurrently mounted instances apart (#585) so a second panel
 * stops landing exactly on top of the first; a persisted position ignores it.
 * Omitted → 0, i.e. no offset.
 */
interface DesignTokenTweakPanelProps {
  instanceConfig?: PanelConfig;
  spawnOrdinal?: number;
  onCloseIntent?: () => void;
}

export default function DesignTokenTweakPanel(props: DesignTokenTweakPanelProps = {}) {
  // The registered config of this instance, or the active default instance
  // for a direct (prop-less) test render. Fixed for the mount's lifetime.
  const instanceConfig = props.instanceConfig ?? getPanelConfig();
  const spawnOrdinal = props.spawnOrdinal ?? 0;
  const { onCloseIntent } = props;
  const scope = getScope();

  // Scope WAI-ARIA IDs to this panel instance so that two mounted panels in
  // the same document do not share dtp-tab-* / dtp-panel-* IDs.
  const ariaIdScope = `zdtp${nextAriaScope++}`;
  const open = signal(false);
  const showExport = signal(false);
  const showImport = signal(false);
  const showApply = signal(false);
  const showHighlightSettings = signal(false);
  const historyRailOpen = signal(false);
  const selectedSnapshot = signal<SnapshotSlot | null>(null);
  const historyNotice = signal<string | null>(null);
  const showCommandPalette = signal(false);
  const searchQuery = signal('');
  // Changed-only is intentionally transient UI state. It follows the active
  // tab but is never written to localStorage or the tweak envelope.
  const changedOnly = signal(false);
  const pendingJumpAddress = signal<TokenAddress | null>(null);
  const gearBtnRef: { current: HTMLDivElement | null } = { current: null };
  const state = signal<TweakState | null>(null);
  // Mirrors `state` for reads that must not subscribe (handlers, effects).
  let stateNow: TweakState | null = null;
  // activeTab holds a string to support host-supplied non-reserved tab ids.
  // Lands on the FIRST configured tab (instanceConfig.tabs[0]) rather than
  // the hardcoded 'color' — a host makes ANY tab (e.g. 'notes', #515) the
  // landing view simply by ordering it first in tabs[]. Falls back to
  // DEFAULT_TAB_ID only when tabs is empty (the DEFAULT_PANEL_CONFIG stub,
  // or a misconfigured host) so the panel never lands on an undefined tab id.
  const activeTab = signal<string>(instanceConfig.tabs[0]?.id ?? DEFAULT_TAB_ID);
  const position = signal<PanelPosition>(DEFAULT_POSITION);
  const size = signal<PanelSize>(defaultSize());
  const density = signal<PanelDensity>(DEFAULT_DENSITY);
  const dockMode = signal<DockMode>(DEFAULT_DOCK_MODE);
  const dockSize = signal<DockSize>(DEFAULT_DOCK_SIZE);
  // The page specimen temporarily forces right docking.  Its previous mode is
  // transient (never persisted as a separate key) and must survive until the
  // specimen exits through any path, including shell unmount/navigation.
  const renderSpecimenOnPage = signal(false);
  let specimenPreviousDockMode: DockMode | null = null;
  const ghostIdle = signal(false);
  let previousInspectTab: string | null = null;
  // The full shell element; the shortcut root is the shell or the mini pill.
  const panelRef: { current: HTMLDivElement | null } = { current: null };
  const shortcutRootRef: { current: HTMLDivElement | null } = { current: null };
  // tabRefs is keyed by string to support host-supplied tab ids.
  const tabRefs: Record<string, HTMLDivElement | null> = {};
  // Current geometry for drag/resize handlers, which write the DOM directly
  // and commit to the signals once on mouseup.
  let positionNow: PanelPosition = DEFAULT_POSITION;
  let sizeNow: PanelSize = size.value;
  let dockSizeNow: DockSize = DEFAULT_DOCK_SIZE;
  let dockModeNow: DockMode = DEFAULT_DOCK_MODE;
  let lastFullDockMode: DockMode = 'float';
  // Active drag / resize document listeners, removed on close or unmount.
  let dragCleanup: (() => void) | null = null;
  let resizeCleanup: (() => void) | null = null;

  const setPosition = (next: PanelPosition) => {
    positionNow = next;
    position.value = next;
  };
  const setSize = (next: PanelSize) => {
    sizeNow = next;
    size.value = next;
  };
  const setDockSize = (next: DockSize) => {
    dockSizeNow = next;
    dockSize.value = next;
  };
  const setDockMode = (next: DockMode) => {
    dockModeNow = next;
    if (next !== 'mini') lastFullDockMode = next;
    dockMode.value = next;
  };

  const shortcuts = createShortcutDispatcher();
  const layers = createLayerActivity();

  const history = createTweakHistory();
  const { commitTweakState } = createTweakStateTransaction({
    cfg: instanceConfig,
    history,
    getState: () => stateNow,
    setState: (next) => {
      stateNow = next;
      state.value = next;
    },
  });
  const historySnapshot = storeSignal(history);
  const { snapshots, save: saveSnapshotSlot } = createSnapshotStore(instanceConfig);
  const { persistColor, persistSpacing, persistFont, persistSize, persistSecondary, persistTab } =
    createPersist(commitTweakState);

  const activeColorIdentity = computed(() => {
    // Re-derived on every state change, since a scheme switch commits state.
    void state.value;
    const cluster = getActivePrimaryCluster(instanceConfig);
    // `getActiveColorIdentity` consults the host document for a light/dark
    // cluster. Without a document, use the cluster's configured scheme as
    // the deterministic identity seed.
    if (typeof document === 'undefined' || !document.documentElement) {
      return cluster.panelSettings.colorScheme;
    }
    return getActiveColorIdentity(cluster, instanceConfig);
  });

  // --- Feature controllers ---

  const highlight = useHighlightController(instanceConfig);
  const elementPath = useElementPath();
  const domTweaker = useDomTweaker(instanceConfig);
  const tooltip = isDocumentUsable() && document.body ? createTooltipController(document) : null;
  scope.onActivate(() => tooltip?.connect());
  const services = createPanelServices({
    tooltip,
    highlight,
    chain: tokenChainSignal(instanceConfig, state),
    setLayerActive: layers.setLayerActive,
  });

  // Bulk action bars hand the panel a complete patch. Keep the callback at
  // this layer so the whole selection travels through exactly one transaction
  // (apply → save → state → history), rather than one transaction per row.
  const bulkApplyTo = (slice: 'spacing' | 'typography' | 'size') =>
    (patch: readonly BulkPatchEntry[]) => {
      if (patch.length === 0) return;
      commitTweakState('bulk', (previous) => ({
        ...previous,
        [slice]: patch.reduce(
          (next, item) => ({ ...next, [item.address.itemId]: item.value }),
          { ...previous[slice] },
        ),
      }));
    };
  const handleSpacingBulkApply = bulkApplyTo('spacing');
  const handleFontBulkApply = bulkApplyTo('typography');
  const handleSizeBulkApply = bulkApplyTo('size');

  const handleGenericBulkApply = (tabId: string, patch: readonly BulkPatchEntry[]) => {
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
  };

  // Restore open state, position, and size from localStorage after mount.
  scope.onActivate(() => {
    if (!isDocumentUsable()) return;
    batch(() => {
      try {
        if (localStorage.getItem(getOpenKey(instanceConfig)) === '1') {
          open.value = true;
          localStorage.setItem(storageKey_visible(instanceConfig), '1');
        }
      } catch {
        /* ignore */
      }
      const loadedSize = loadSize(instanceConfig);
      setSize(loadedSize);
      // Pass `loadedSize` so the first-open fallback is centered and contained
      // against the size this shell will ACTUALLY render at — an instance with a
      // persisted (resized) size but no persisted position would otherwise be
      // centered as if it were the default width and hang off the viewport.
      const loaded = loadPosition(instanceConfig, spawnOrdinal, loadedSize);
      // Clamp against current viewport so a position saved on a 4K monitor
      // (e.g. left:3000) doesn't restore fully off-screen on a 1080p laptop.
      // loadSize was already clamped; use its result for the position clamp so
      // both agree on panel dimensions.
      setPosition(clampPosition(loaded.top, loaded.left, loadedSize.width, loadedSize.height));
      density.value = loadDensity(instanceConfig);
      const storedDockSize = loadDockSize(instanceConfig);
      setDockSize({
        right: Math.max(MIN_PANEL_WIDTH, Math.min(storedDockSize.right, window.innerWidth)),
        bottom: Math.max(240, Math.min(storedDockSize.bottom, window.innerHeight)),
      });
      setDockMode(loadDockMode(instanceConfig));
      ghostIdle.value = loadGhostIdle(instanceConfig.storagePrefix);
    });
  });

  // A public close can unmount the shell while the command palette is open;
  // keep the transient overlay state aligned with the shell lifetime.
  scope.effect(() => {
    if (open.value) return;
    showCommandPalette.value = false;
    pendingJumpAddress.value = null;
  });

  const handleDensityChange = (next: PanelDensity) => {
    density.value = next;
    saveDensity(next, instanceConfig);
  };

  const handleGhostIdleChange = (enabled: boolean) => {
    ghostIdle.value = enabled;
    saveGhostIdle(instanceConfig.storagePrefix, enabled);
  };

  // Publish intent before the empty render can trigger dead-root recovery (#1046).
  const closePanel = () => {
    if (!isDocumentUsable()) return;
    onCloseIntent?.();
    try {
      localStorage.removeItem(getOpenKey(instanceConfig));
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(storageKey_visible(instanceConfig), '0');
    } catch {
      /* ignore */
    }
    open.value = false;
  };

  // Dock claims are live only while the shell is visible. The shared registry
  // makes the ownership decision cross-bundle safe and restores host inline
  // declarations on every cleanup path (mode change, close, or unmount).
  scope.effect(() => {
    const mode = dockMode.value;
    const sizes = dockSize.value;
    if (!open.value || (mode !== 'right' && mode !== 'bottom')) {
      releaseHostMutations(instanceConfig.storagePrefix);
      return;
    }
    const claimed = claimHostDock(
      instanceConfig.storagePrefix,
      mode,
      sizes[mode],
      instanceConfig.dock?.reflow ?? 'body-margin',
    );
    if (!claimed) {
      console.warn(
        `[design-token-panel] Cannot dock ${mode}: that edge is already owned; falling back to float`,
      );
      setDockMode('float');
      saveDockMode('float', instanceConfig);
      return;
    }
    return () => releaseHostMutations(instanceConfig.storagePrefix);
  });

  // Sync `open` from the authoritative `localStorage[OPEN_KEY]` whenever the
  // adapter (`index.tsx`) signals a change. The adapter writes OPEN_KEY itself
  // (header-button event, public API call, etc.) and then dispatches the
  // internal sync event on `window`. This component is downstream: it doesn't
  // compute the toggle from its own previous state — it just mirrors storage.
  //
  // The event name and the open key are BOTH keyed by this instance's
  // `storagePrefix` (issue #354): the panel listens only on its OWN
  // per-instance sync event and reads only its OWN open key, so panel A's
  // toggle never flips panel B.
  //
  // The two historical public event names (`toggle-design-token-panel` and
  // its deprecated `toggle-color-tweak-panel` alias) are handled in `index.tsx`
  // (see `handleExternalToggleEvent`), which avoids the dual-listener race
  // behind the "click-twice-after-close" regression.
  scope.onActivate(() => {
    const eventName = openStateChangedEventName(instanceConfig);
    function syncOpenFromStorage() {
      if (!isDocumentUsable()) return;
      try {
        const nextOpen = localStorage.getItem(getOpenKey(instanceConfig)) === '1';
        open.value = nextOpen;
        localStorage.setItem(storageKey_visible(instanceConfig), nextOpen ? '1' : '0');
      } catch {
        /* ignore */
      }
    }
    window.addEventListener(eventName, syncOpenFromStorage);
    return () => window.removeEventListener(eventName, syncOpenFromStorage);
  });

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
  scope.onActivate(() => {
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
        applyManifestModeDefaults(instanceConfig, true);
      }
      commitTweakState(
        'scheme-reapply',
        stateNow
          ? (previous) => ({ ...previous, color: nextColor, secondary: nextSecondary })
          : { ...freshTweakState(instanceConfig), color: nextColor, secondary: nextSecondary },
        { record: false, apply: false, save: false },
      );
    }
    window.addEventListener('color-scheme-changed', handleSchemeChange);
    return () => window.removeEventListener('color-scheme-changed', handleSchemeChange);
  });

  // Initialize state on first open. Every storage read + apply is scoped to
  // THIS instance's config (#357): panel A loads from A's storage keys and
  // applies through A's sink, never touching B's.
  scope.effect(() => {
    if (!open.value || state.value) return;
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
    // Keep stylesheet colors while establishing explicit manifest mode pairs.
    applyManifestModeDefaults(instanceConfig);
    // The `secondary` slice is always seeded — every fresh-state path
    // includes it so the persisted envelope shape stays stable regardless
    // of the user's path.
    commitTweakState('initialize', freshTweakState(instanceConfig), {
      record: false,
      apply: false,
      save: false,
    });
  });

  // Drag handler for panel header (reads position from the mirror).
  const handleDragStart = (e: MouseEvent) => {
    if (dockModeNow === 'right' || dockModeNow === 'bottom') return;
    // Skip if target is a button (or role=button/tab div), select, or inside one
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, select, option, [contenteditable], [role='tab'], [role='button'], .tokenpanel-search-control")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = positionNow.left;
    const startTop = positionNow.top;
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
      // Write directly to the DOM during drag to avoid re-rendering the
      // shell at ~60 fps; mouseup commits the final value once.
      if (panelRef.current) {
        panelRef.current.style.top = `${clamped.top}px`;
        panelRef.current.style.left = `${clamped.left}px`;
      }
      positionNow = clamped;
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragCleanup = null;
      const finalPos = positionNow;
      setPosition(finalPos);
      savePosition(finalPos, instanceConfig);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dragCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  };

  // Resize handler for the bottom-right grip — mirrors handleDragStart's
  // structure: writes directly to the DOM during the drag and commits the
  // final value to the signals + localStorage on mouseup.
  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = sizeNow.width;
    const startHeight = sizeNow.height;

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
      sizeNow = next;
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizeCleanup = null;
      const finalSize = sizeNow;
      batch(() => {
        setSize(finalSize);
        saveSize(finalSize, instanceConfig);
        // Re-clamp position against the new size — a wider panel may need its
        // anchor pulled back into the viewport.
        const finalPos = clampPosition(
          positionNow.top,
          positionNow.left,
          finalSize.width,
          finalSize.height,
        );
        if (finalPos.top !== positionNow.top || finalPos.left !== positionNow.left) {
          setPosition(finalPos);
          savePosition(finalPos, instanceConfig);
        }
      });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    resizeCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  };

  const handleDockResizeStart = (e: MouseEvent) => {
    if (dockModeNow !== 'right' && dockModeNow !== 'bottom') return;
    const edge = dockModeNow;
    e.preventDefault();
    e.stopPropagation();
    const start = edge === 'right' ? e.clientX : e.clientY;
    const startSize = dockSizeNow[edge];
    const min = edge === 'right' ? MIN_PANEL_WIDTH : 240;
    const viewportMax = edge === 'right' ? window.innerWidth : window.innerHeight;
    const max = Math.max(min, viewportMax);

    function onMouseMove(ev: MouseEvent) {
      const pointer = edge === 'right' ? ev.clientX : ev.clientY;
      const nextValue = Math.max(min, Math.min(max, startSize + start - pointer));
      dockSizeNow = { ...dockSizeNow, [edge]: nextValue };
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
      resizeCleanup = null;
      setDockSize(dockSizeNow);
      saveDockSize(dockSizeNow, instanceConfig);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    resizeCleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  };

  const cancelPointerGestures = () => {
    dragCleanup?.();
    dragCleanup = null;
    resizeCleanup?.();
    resizeCleanup = null;
  };

  const handleDockModeChange = (next: DockMode) => {
    // Render on page owns the panel's right edge while active.  The only
    // path allowed to leave that edge is restoreSpecimenDockMode(), which
    // writes state directly after the page specimen has been disabled.
    if (renderSpecimenOnPage.value && next !== 'right') return;
    // A shortcut can switch modes (or close can follow) while the pointer is
    // still held on a drag/resize handle. Cancel those document listeners
    // before changing ownership so a later mousemove cannot re-claim an edge
    // that this panel has already released.
    cancelPointerGestures();
    setDockMode(next);
    saveDockMode(next, instanceConfig);
  };

  /** Restore the mode that was active before Render on page forced right dock. */
  const restoreSpecimenDockMode = (syncState = true) => {
    const previous = specimenPreviousDockMode;
    if (previous === null) return;
    specimenPreviousDockMode = null;
    // Remove the host portal synchronously on every logical exit.  The
    // OnPageSpecimen cleanup also releases this owner, but this direct release
    // covers panel-close / toggle-off before the next flush.
    releaseHostMutations(onPageSpecimenMutationOwner(instanceConfig));
    if (syncState) renderSpecimenOnPage.value = false;
    if (dockModeNow === previous) return;
    if (syncState) setDockMode(previous);
    else dockModeNow = previous;
    saveDockMode(previous, instanceConfig);
  };

  const handleRenderSpecimenOnPageChange = (enabled: boolean) => {
    if (!enabled) {
      restoreSpecimenDockMode();
      return;
    }
    if (specimenPreviousDockMode !== null) return;
    specimenPreviousDockMode = dockModeNow;
    renderSpecimenOnPage.value = true;
    if (dockModeNow !== 'right') handleDockModeChange('right');
  };

  // Closing the panel unmounts FontTab (and thus the portal), so restore the
  // dock mode while the shell still owns its state.  Leaving right is also an
  // exit path: for example, the shared dock registry may reject this panel's
  // right-edge claim when another instance already owns it and fall back to
  // float. Restore the user's prior mode instead of leaving the page specimen
  // active without the dock it depends on.
  scope.effect(() => {
    const isOpen = open.value;
    const mode = dockMode.value;
    const specimen = renderSpecimenOnPage.value;
    if (!isOpen) restoreSpecimenDockMode();
    else if (specimen && mode !== 'right') restoreSpecimenDockMode();
  });

  scope.effect(() => {
    if (!open.value) cancelPointerGestures();
  });

  // Astro swaps and destroy() drive a real unmount; the dock-mode write must
  // still happen even though the component itself is going away.
  scope.onCleanup(() => {
    restoreSpecimenDockMode(false);
    cancelPointerGestures();
  });

  // Re-clamp position + size on window resize so a viewport shrink keeps the
  // panel within bounds.
  //
  // Design notes:
  // (a) Uses the freshly clamped size as input to clampPosition, NOT the DOM's
  //     offsetWidth/Height — those reflect the pre-clamp frame and can differ.
  // (b) Only writes size / position / storage when the value actually
  //     changed, avoiding spurious updates and localStorage writes on every
  //     resize event.
  // (c) Trailing 150 ms debounce — resize fires at ~60 fps; without debouncing
  //     every pixel of window drag issues a localStorage write.
  scope.onActivate(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function handleResize() {
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;

        // Re-clamp size first — a viewport shrink might force a smaller panel,
        // and the new dimensions feed into the position clamp below.
        const currentSize = sizeNow;
        const clampedSize = clampSize(currentSize.width, currentSize.height);
        if (clampedSize.width !== currentSize.width || clampedSize.height !== currentSize.height) {
          setSize(clampedSize);
          saveSize(clampedSize, instanceConfig);
        }

        // Re-clamp position against the (potentially) new clamped size.
        const currentPos = positionNow;
        const clampedPos = clampPosition(
          currentPos.top,
          currentPos.left,
          clampedSize.width,
          clampedSize.height,
        );
        if (clampedPos.top !== currentPos.top || clampedPos.left !== currentPos.left) {
          setPosition(clampedPos);
          savePosition(clampedPos, instanceConfig);
        }
      }, 150);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceTimer !== null) clearTimeout(debounceTimer);
    };
  });

  const handleLoadFromJson = (loaded: TweakState) => {
    // Clear color cluster vars first — mirrors the scheme-change clear above.
    // Without this, a dangling `{ ref }` in the imported state (skipped by
    // the resolver, #482 import nit) would leave the PREVIOUS session's
    // inline value painted instead of falling back to the stylesheet default.
    // Unknown tokens have already been filtered out by deserialize(). Apply +
    // persist are scoped to THIS instance (#357).
    commitTweakState('import', loaded, {
      beforeApply: () => clearAppliedColorStyles(undefined, undefined, instanceConfig),
    });
  };

  const handleResetAll = () => {
    // Clear + reset are scoped to THIS instance's storage keys, clusters, and
    // sink so a reset on panel A never touches panel B's storage/vars (#357).
    // Always seed the secondary slice — every fresh-state path emits a
    // uniform envelope shape so persistence stays consistent.
    commitTweakState('reset-all', freshTweakState(instanceConfig), {
      apply: () => {
        clearAppliedStyles(undefined, instanceConfig);
        applyManifestModeDefaults(instanceConfig);
      },
      save: () => clearPersistedState(undefined, instanceConfig),
    });
  };

  const handleHistoryResult = (result: { skippedReason?: string }) => {
    historyNotice.value = result.skippedReason ?? null;
  };

  const handleUndo = () => {
    if (!history.getSnapshot().canUndo) return;
    handleHistoryResult(history.undo());
  };

  const handleRedo = () => {
    if (!history.getSnapshot().canRedo) return;
    handleHistoryResult(history.redo());
  };

  const handleHistoryJump = (index: number) => {
    handleHistoryResult(history.jumpTo(index));
  };

  const handleSaveSnapshot = (slot: SnapshotSlot) => {
    if (!stateNow) return;
    saveSnapshotSlot(slot, stateNow, activeColorIdentity.value, history.getSnapshot().cursor);
    batch(() => {
      selectedSnapshot.value = slot;
      historyNotice.value = null;
    });
  };

  const handleSelectSnapshot = (slot: SnapshotSlot) => {
    const snapshot = snapshots.value[slot];
    if (!snapshot || !stateNow) return;
    const restored = restoreSnapshotState(snapshot, stateNow, activeColorIdentity.value, slot);
    commitTweakState(`snapshot-${slot.toLowerCase()}`, restored.state, {
      beforeApply: () => clearAppliedColorStyles(undefined, undefined, instanceConfig),
    });
    batch(() => {
      selectedSnapshot.value = slot;
      historyNotice.value = restored.skippedReason ?? `Showing snapshot ${slot}.`;
    });
  };

  const handleFlipSnapshots = () => {
    if (!snapshots.value.A || !snapshots.value.B) {
      historyNotice.value = 'Save both A and B before flipping snapshots.';
      return;
    }
    handleSelectSnapshot(selectedSnapshot.value === 'A' ? 'B' : 'A');
  };

  const handleResetTab = (tabId: string) => {
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
  };

  // Single source of truth for the four header actions (#518) — rendered
  // both as the always-visible .tokenpanel-action-link header links AND
  // inside the narrow-panel kebab popover, so a label/handler change only
  // needs one edit instead of two synchronized ones.
  const applyConfigured = isApplyConfigured(instanceConfig);
  const panelActions = [
    { id: 'export', label: 'Export', onSelect: () => { showExport.value = true; } },
    { id: 'import', label: 'Load from JSON…', onSelect: () => { showImport.value = true; } },
    {
      id: 'apply',
      label: 'Apply',
      onSelect: () => { showApply.value = true; },
      disabled: !applyConfigured,
      disabledReason: !applyConfigured ? APPLY_DISABLED_REASON : undefined,
    },
    { id: 'reset', label: 'Reset', onSelect: handleResetAll },
  ];

  // The active scheme/mode is the Color evaluator's identity baseline. A
  // scheme change updates it so reverting a Color row restores the
  // newly-active identity rather than the previous scheme's seed.
  let colorDefaultsFor: { identity: string; value: ColorTweakState } | null = null;
  const colorDefaults = computed(() => {
    const identity = activeColorIdentity.value;
    if (colorDefaultsFor?.identity !== identity) {
      colorDefaultsFor = {
        identity,
        value: initColorFromScheme(getActivePrimaryCluster(instanceConfig), instanceConfig),
      };
    }
    return colorDefaultsFor.value;
  });
  const secondaryDefaults = initSecondaryFromConfig(instanceConfig);
  const lastApplied = signal(loadLastApplied(instanceConfig));
  const unsavedCount = computed(() => {
    const current = state.value;
    const flattened = current ? flattenApplyOverrides(current, colorDefaults.value, instanceConfig) : {};
    return unsavedCssVars(flattened, lastApplied.value).length;
  });

  const handleApplied = (writtenCssVars: string[]) => {
    commitTweakState('apply', (current) => {
      const next = reconcileApplied(current, writtenCssVars, instanceConfig, colorDefaults.value, secondaryDefaults);
      // Disk now contains the written subset; retained overrides remain
      // browser-only and therefore intentionally compare dirty against {}.
      saveLastApplied({}, instanceConfig);
      lastApplied.value = {};
      return next;
    }, { resetHistory: true, forceRecord: true });
  };

  // The tab list comes from this instance's PanelConfig.tabs (required), so a
  // non-default panel renders ITS own manifest (#354). configurePanel is
  // one-shot per prefix, so the list is fixed for a mount's lifetime.
  const activeTabs: readonly { id: string; label: string }[] = [
    { id: ELEMENT_INSPECT_TAB_ID, label: 'Inspect' },
    ...instanceConfig.tabs
      .filter((t: TabConfig) => t.id !== ELEMENT_INSPECT_TAB_ID)
      .map((t: TabConfig) => ({ id: t.id, label: t.label })),
  ];
  const tabConfigById: Record<string, TabConfig> = {};
  for (const t of instanceConfig.tabs) tabConfigById[t.id] = t;

  const handleActiveTabChange = (nextTab: string) => {
    const current = activeTab.value;
    if (nextTab === ELEMENT_INSPECT_TAB_ID && current !== ELEMENT_INSPECT_TAB_ID) {
      previousInspectTab = current;
    } else if (nextTab !== ELEMENT_INSPECT_TAB_ID && current === ELEMENT_INSPECT_TAB_ID) {
      previousInspectTab = null;
    }
    activeTab.value = nextTab;
  };

  const openInspectTab = () => {
    if (activeTab.value !== ELEMENT_INSPECT_TAB_ID) previousInspectTab = activeTab.value;
    activeTab.value = ELEMENT_INSPECT_TAB_ID;
  };

  const clearInspectTab = () => {
    if (activeTab.value !== ELEMENT_INSPECT_TAB_ID) return;
    const previous = previousInspectTab;
    previousInspectTab = null;
    activeTab.value = previous && activeTabs.some((tab) => tab.id === previous)
      ? previous
      : instanceConfig.tabs[0]?.id ?? DEFAULT_TAB_ID;
  };

  const jumpToColorTab = () => {
    if (activeTabs.some((tab) => tab.id === 'color')) activeTab.value = 'color';
  };

  const elementInspect = useElementInspect({
    instanceConfig,
    state,
    commitTweakState,
    onInspectTabOpen: openInspectTab,
    onInspectTabClear: clearInspectTab,
    onJumpToColorTab: jumpToColorTab,
    panelOpen: open,
  });

  const searchIndex = buildTokenIndex(instanceConfig);
  // Color rows are backed by a complete ColorTweakState, so their baseline is
  // the active identity's freshly-seeded state. Flat rows continue to compare
  // against manifest defaults through the same S2 evaluator.
  let baselineFor: { color: ColorTweakState; value: ColorBaseline } | null = null;
  const changedBaseline = computed<ColorBaseline>(() => {
    const color = colorDefaults.value;
    if (baselineFor?.color !== color) {
      baselineFor = {
        color,
        value: { color, ...(secondaryDefaults ? { secondary: secondaryDefaults } : {}) },
      };
    }
    return baselineFor.value;
  });
  const changedTokenCounts = computed(() => {
    const current = state.value;
    return current ? changedCounts(searchIndex.entries, current, changedBaseline.value, instanceConfig) : {};
  });
  const changedTotal = computed(() =>
    Object.values(changedTokenCounts.value).reduce((sum, count) => sum + count, 0),
  );
  // The primary Color view owns both primary and optional secondary cluster
  // sections, so its active-tab filter count includes both evaluator slices.
  // Other tabs map one-to-one to their changedCounts entry.
  const changedOnlyCount = computed(() => {
    const counts = changedTokenCounts.value;
    return activeTab.value === 'color'
      ? (counts.color ?? 0) + (counts['color-secondary'] ?? 0)
      : counts[activeTab.value] ?? 0;
  });
  const isTokenChanged = computed(() => {
    const current = state.value;
    const baseline = changedBaseline.value;
    return (address: TokenAddress) => {
      const entry = searchIndex.entry(address);
      return Boolean(entry && current && isChanged(entry, current, baseline, instanceConfig));
    };
  });
  const handleRevertAddress = (address: TokenAddress) => {
    if (!stateNow) return;
    const entry = searchIndex.entry(address);
    if (!entry) return;
    commitTweakState('revert', revertEntry(entry, changedBaseline.value, instanceConfig), {
      address: tokenAddressKey(address),
    });
  };
  const changedRowOptions = computed<ChangedContributionOptions | undefined>(() => {
    const current = state.value;
    return current
      ? {
          index: searchIndex,
          state: current,
          baseline: changedBaseline.value,
          cfg: instanceConfig,
          changedOnly: changedOnly.value,
          onRevert: handleRevertAddress,
        }
      : undefined;
  });
  const searchCounts = computed<readonly SearchTabCount[]>(() => {
    const query = searchQuery.value;
    const current = state.value;
    return activeTabs.map((tab) => {
      if (tab.id === 'palette') {
        const config = tabConfigById[tab.id];
        const total = config?.tiers.length ?? 0;
        const matches = query.trim()
          ? (config?.tiers ?? []).filter((tier) =>
              [tier.id, tier.label].some((field) => field.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
            ).length
          : total;
        return { tab: config ?? { id: tab.id, label: tab.label, tiers: [] }, total, matches };
      }
      const entries = searchIndex.entries.filter((entry) => entry.address.tabId === tab.id);
      const total = entries.length;
      const matches = entries.filter((entry) => matchesTokenEntry(entry, query, current ?? undefined, instanceConfig)).length;
      return { tab: tabConfigById[tab.id] ?? { id: tab.id, label: tab.label, tiers: [] }, total, matches };
    });
  });

  const focusTokenAddress = (address: TokenAddress) => {
    const row = panelRef.current ? scrollToTokenRow(panelRef.current, address) : null;
    const focusSelector = 'input:not([type="hidden"]), select, textarea, [role="button"]';
    const focusTarget = row?.matches(focusSelector)
      ? row
      : row?.querySelector<HTMLElement>(focusSelector);
    focusTarget?.focus();
  };

  const handleCommandToken = (address: TokenAddress) => {
    // A secondary cluster is rendered inside the primary Color tab, not as a
    // selectable tab of its own. The address stays intact for row navigation.
    const targetTab = address.tabId === 'color-secondary' ? 'color' : address.tabId;
    batch(() => {
      searchQuery.value = '';
      activeTab.value = targetTab;
      if (address.tabId === 'palette') pendingJumpAddress.value = address;
    });
    if (address.tabId === 'palette') return;
    window.requestAnimationFrame(() => focusTokenAddress(address));
  };

  const handlePaletteJumpHandled = (address: TokenAddress) => {
    pendingJumpAddress.value = null;
    window.requestAnimationFrame(() => focusTokenAddress(address));
  };

  const commandActions: readonly CommandPaletteAction[] = [
    ...panelActions.slice(0, 3),
    ...activeTabs
      .filter((tab) => tab.id !== 'notes' && tab.id !== 'color-secondary')
      .map((tab) => ({
        id: `reset-${tab.id}`,
        label: `Reset ${tab.label}`,
        onSelect: () => handleResetTab(tab.id),
      })),
    ...activeTabs
      .filter((tab) => tab.id !== 'color-secondary')
      .map((tab) => ({
        id: `goto-${tab.id}`,
        label: `Go to ${tab.label}`,
        onSelect: () => {
          activeTab.value = tab.id;
        },
      })),
    {
      id: 'highlight-settings',
      label: 'Highlight settings',
      onSelect: () => {
        showHighlightSettings.value = true;
      },
    },
  ];

  // --- Shell regions ---

  const footerItem: ShellRegionItem = {
    id: 'changed-state-footer',
    render: () => (
      <ChangedFooterContent
        index={searchIndex}
        state={computed(() => state.value!)}
        baseline={changedBaseline}
        cfg={instanceConfig}
        onRevertAll={handleResetAll}
      />
    ),
  };
  const staticItems: Omit<RegionItems, 'footer'> = {
    'header-actions': [
      {
        id: 'search-filter',
        order: -1,
        render: () => (
          <SearchHeader
            query={searchQuery}
            onQueryChange={(query) => {
              searchQuery.value = query;
            }}
            onOpenPalette={() => {
              showCommandPalette.value = true;
            }}
            shortcuts={shortcuts}
            layerActive={layers.active}
          />
        ),
      },
      ...panelActions.map(
        (action, index): ShellRegionItem => ({
          id: `panel-action-${action.id}`,
          order: index,
          compactAction: action,
          render: () => (
            <RoleButton
              onClick={action.onSelect}
              class="tokenpanel-action-link"
              aria-disabled={action.disabled ?? null}
              title={action.disabledReason ?? null}
              data-zdtp-action={action.id}
            >
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
            controller={domTweaker}
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
            <GhostIdleToggle enabled={ghostIdle} onChange={handleGhostIdleChange} compact />
          ) : null,
      },
      {
        id: 'density-compact',
        order: panelActions.length + 3,
        renderInCompactMenu: true,
        render: ({ compact }) =>
          compact ? (
            <label class="tokenpanel-density is-compact">
              <span class="tokenpanel-density-label">Density</span>
              <DensitySlider density={density} onDensityChange={handleDensityChange} />
            </label>
          ) : null,
      },
      {
        id: 'changed-only-compact',
        order: panelActions.length + 4,
        renderInCompactMenu: true,
        render: ({ compact }) =>
          compact ? (
            <ChangedOnlyToggle
              enabled={changedOnly}
              count={changedOnlyCount}
              onChange={(enabled) => {
                changedOnly.value = enabled;
              }}
            />
          ) : null,
      },
    ],
    'header-right': [
      historyRegionItem({
        history: historySnapshot,
        railOpen: historyRailOpen,
        onUndo: handleUndo,
        onRedo: handleRedo,
        onToggleRail: () => {
          historyRailOpen.value = !historyRailOpen.value;
        },
      }),
      {
        id: 'apply-sync-status',
        order: -2,
        renderInCompactMenu: true,
        render: () => (
          <div
            class={computed(() => `tokenpanel-apply-sync${unsavedCount.value > 0 ? ' is-unsaved' : ''}`)}
            role="status"
          >
            {computed(() => (unsavedCount.value > 0 ? `● ${unsavedCount.value} unsaved` : '✓ in sync'))}
          </div>
        ),
      },
      {
        id: 'dock-modes',
        order: -1,
        render: () => <DockModeSwitch value={dockMode} onChange={handleDockModeChange} />,
      },
      {
        id: 'element-path',
        order: 0,
        renderInCompactMenu: true,
        render: ({ compact }) => <ElementPathToggleButton controller={elementPath} compact={compact} />,
      },
      {
        id: 'element-inspect',
        order: 1,
        renderInCompactMenu: true,
        render: ({ compact }) => (
          <ElementInspectToggleButton controller={elementInspect} shortcuts={shortcuts} compact={compact} />
        ),
      },
      ...(instanceConfig.domTweaker !== undefined
        ? [
            {
              id: 'dom-tweaker',
              order: 2,
              renderInCompactMenu: true,
              render: ({ compact }) => <DomTweakerToggleButton controller={domTweaker} compact={compact} />,
            } satisfies ShellRegionItem,
          ]
        : []),
      {
        id: 'highlight-settings',
        order: 3,
        render: () => {
          const toggleSettings = () => {
            showHighlightSettings.value = !showHighlightSettings.value;
          };
          return (
            <div
              ref={gearBtnRef}
              role="button"
              tabindex={0}
              class="tokenpanel-gear-btn"
              aria-label="Highlight outline settings"
              aria-expanded={showHighlightSettings}
              aria-haspopup="dialog"
              on:click={toggleSettings}
              on:keydown={(event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleSettings();
                }
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
          );
        },
      },
      {
        id: 'close',
        order: 4,
        render: () => (
          <RoleButton
            onClick={closePanel}
            class="tokenpanel-close-btn"
            aria-label="Close panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
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
        render: () => <GhostIdleToggle enabled={ghostIdle} onChange={handleGhostIdleChange} />,
      },
      {
        id: 'changed-only',
        order: 1,
        render: () => (
          <ChangedOnlyToggle
            enabled={changedOnly}
            count={changedOnlyCount}
            onChange={(enabled) => {
              changedOnly.value = enabled;
            }}
          />
        ),
      },
    ],
  };
  const hasState = computed(() => state.value !== null);
  const regions = createShellRegions(
    computed(() => ({ ...staticItems, footer: hasState.value ? [footerItem] : [] })),
  );

  // --- Layers and shortcuts ---

  useLayerRegistration(layers, 'export-modal', showExport);
  useLayerRegistration(layers, 'import-modal', showImport);
  useLayerRegistration(layers, 'apply-modal', showApply);
  useLayerRegistration(layers, 'highlight-settings', showHighlightSettings);

  // The dispatcher routes keys only while the shell (or mini pill) is open.
  scope.effect(() => {
    if (!open.value) return;
    return shortcuts.attach(() => shortcutRootRef.current);
  });

  const selectMode = (mode: DockMode, event: KeyboardEvent) => {
    if (mode === dockModeNow) return;
    event.preventDefault();
    handleDockModeChange(mode);
  };
  useShortcut(shortcuts, { key: '1', altKey: true }, (event) => selectMode('float', event));
  useShortcut(shortcuts, { key: '2', altKey: true }, (event) => selectMode('right', event));
  useShortcut(shortcuts, { key: '3', altKey: true }, (event) => selectMode('bottom', event));
  useShortcut(shortcuts, { key: '4', altKey: true }, (event) => selectMode('mini', event));

  useHistoryShortcuts({
    shortcuts,
    enabled: open,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onFlipSnapshots: handleFlipSnapshots,
  });

  useShortcut(
    shortcuts,
    { key: 'Escape' },
    (event) => {
      if (event.defaultPrevented || layers.active.value) return;
      event.preventDefault();
      closePanel();
    },
    open,
  );

  // --- Rendering ---

  const presentState = computed(() => state.value!);

  function TabBody({ tab }: { tab: { id: string; label: string } }) {
    const config = tabConfigById[tab.id];
    if (tab.id === ELEMENT_INSPECT_TAB_ID) {
      return <ElementInspectView inspect={elementInspect} onJumpToColorTab={jumpToColorTab} />;
    }
    // No state/persist props — the notes tab carries no token overrides
    // (#515): it's excluded from state.tabs, apply routing, and
    // export/import serde by construction.
    if (tab.id === 'notes') return config ? <NotesTab tab={config} /> : null;
    if (!config) return null;
    return (
      <Show when={hasState}>
        {() => {
          if (tab.id === 'color') {
            return (
              <ColorTab
                tab={config}
                state={computed(() => presentState.value.color)}
                persistColor={persistColor}
                secondaryTab={tabConfigById['color-secondary'] ?? null}
                secondaryState={computed(() =>
                  presentState.value.secondary ?? initSecondaryFromConfig(instanceConfig) ?? null)}
                persistSecondary={persistSecondary}
                instanceConfig={instanceConfig}
                tabOverrides={computed(() => presentState.value.tabs ?? {})}
                searchQuery={searchQuery}
                isChanged={isTokenChanged}
                changedOnly={changedOnly}
                onRevert={handleRevertAddress}
                services={services}
              />
            );
          }
          if (tab.id === 'spacing') {
            return (
              <SpacingTab
                tab={config}
                state={computed(() => presentState.value.spacing)}
                persistSpacing={persistSpacing}
                searchQuery={searchQuery}
                onBulkApply={handleSpacingBulkApply}
                changed={changedRowOptions}
                changedOnly={changedOnly}
                services={services}
              />
            );
          }
          if (tab.id === 'font') {
            return (
              <FontTab
                tab={config}
                state={computed(() => presentState.value.typography)}
                persistFont={persistFont}
                instanceConfig={instanceConfig}
                renderOnPage={renderSpecimenOnPage}
                onRenderOnPageChange={handleRenderSpecimenOnPageChange}
                searchQuery={searchQuery}
                onBulkApply={handleFontBulkApply}
                changed={changedRowOptions}
                changedOnly={changedOnly}
                services={services}
              />
            );
          }
          if (tab.id === 'size') {
            return (
              <SizeTab
                tab={config}
                state={computed(() => presentState.value.size)}
                persistSize={persistSize}
                searchQuery={searchQuery}
                onBulkApply={handleSizeBulkApply}
                changed={changedRowOptions}
                changedOnly={changedOnly}
                services={services}
              />
            );
          }
          if (tab.id === 'palette') {
            return (
              <PaletteTab
                tab={config}
                overrides={computed(() => presentState.value.tabs?.['palette'] ?? {})}
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
                changedOnly={changedOnly}
                isChanged={isTokenChanged}
                jumpAddress={pendingJumpAddress}
                onJumpAddressHandled={handlePaletteJumpHandled}
                services={services}
              />
            );
          }
          if ((RESERVED_TAB_IDS as readonly string[]).includes(tab.id)) return null;
          return (
            <GenericTab
              tab={config}
              overrides={computed(() => presentState.value.tabs?.[tab.id] ?? {})}
              searchQuery={searchQuery}
              onBulkApply={(patch) => handleGenericBulkApply(tab.id, patch)}
              changed={changedRowOptions}
              changedOnly={changedOnly}
              services={services}
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
          );
        }}
      </Show>
    );
  }

  const shellStyle = computed(() => {
    const effectiveDockMode = dockMode.value === 'mini' ? 'float' : dockMode.value;
    const { width: panelW, height: panelH } = computePanelSize(size.value);
    const panelPos =
      effectiveDockMode === 'right'
        ? { position: 'fixed', top: 0, right: 0, bottom: 0, left: 'auto' }
        : effectiveDockMode === 'bottom'
          ? { position: 'fixed', top: 'auto', right: 0, bottom: 0, left: 0 }
          : { position: 'fixed', top: position.value.top, left: position.value.left };
    return toZrStyle({
      ...panelPos,
      width:
        effectiveDockMode === 'right'
          ? dockSize.value.right
          : effectiveDockMode === 'bottom'
            ? '100vw'
            : panelW,
      height:
        effectiveDockMode === 'bottom'
          ? dockSize.value.bottom
          : effectiveDockMode === 'right'
            ? '100vh'
            : panelH,
      maxHeight: effectiveDockMode === 'float' ? 'calc(100vh - 32px)' : 'none',
      // `--tokenpanel-grid-min` is read by .tokenpanel-tab-grid /
      // .tokenpanel-tab-advanced-grid; switching the variable rewires the
      // min-card-width without re-rendering the grids.
      '--tokenpanel-grid-min': densityToGridMin(density.value),
    });
  });
  const effectiveMode = computed(() => (dockMode.value === 'mini' ? 'float' : dockMode.value));

  function Shell() {
    const shellRef = {
      get current() {
        return panelRef.current;
      },
      set current(element: HTMLDivElement | null) {
        panelRef.current = element;
        shortcutRootRef.current = element;
      },
    };
    useGhostIdle(panelRef, ghostIdle, layers.active);
    return (
      <div
        ref={shellRef}
        class={computed(() =>
          `tokenpanel-shell${effectiveMode.value === 'right' ? ' is-docked-right' : ''}${effectiveMode.value === 'bottom' ? ' is-docked-bottom' : ''}${historyRailOpen.value ? ' is-history-open' : ''}`)}
        style={shellStyle}
      >
        <ShellHeader onMouseDown={handleDragStart} regions={regions} layers={layers} />
        <ShellTabBar
          tabs={activeTabs}
          activeTab={activeTab}
          onActiveTabChange={handleActiveTabChange}
          ariaIdScope={ariaIdScope}
          tabRefs={tabRefs}
          density={density}
          onDensityChange={handleDensityChange}
          changedCounts={changedTokenCounts}
          regions={regions}
          shortcuts={shortcuts}
          layers={layers}
        />
        <SearchMatchBar
          query={searchQuery}
          activeTabId={activeTab}
          counts={searchCounts}
          onSelectTab={(tabId) => {
            activeTab.value = tabId;
          }}
        />

        {/* Tab panels — reserved ids dispatch to their dedicated components;
            non-reserved ids dispatch to GenericTab. */}
        <div class="tokenpanel-body">
          {activeTabs.map((tab) => (
            <div
              role="tabpanel"
              id={`dtp-panel-${ariaIdScope}-${tab.id}`}
              aria-labelledby={`dtp-tab-${ariaIdScope}-${tab.id}`}
              tabindex={0}
              hidden={computed(() => activeTab.value !== tab.id)}
            >
              <TabBody tab={tab} />
            </div>
          ))}
        </div>

        <Show when={historyRailOpen}>
          {() => (
            <HistoryRail
              history={historySnapshot}
              snapshots={snapshots}
              selectedSnapshot={selectedSnapshot}
              notice={computed(() => historyNotice.value ?? historySnapshot.value.lastSkippedReason)}
              activeIdentity={activeColorIdentity}
              onSaveSnapshot={handleSaveSnapshot}
              onSelectSnapshot={handleSelectSnapshot}
              onJumpTo={handleHistoryJump}
            />
          )}
        </Show>

        <ShellFooter regions={regions} />

        {/* Bottom-right resize grip — available on every viewport width.

            ARIA: `role="separator"` would imply a 1D resizer between two
            regions; this grip resizes the panel on both axes, which has no
            standard role. We keep just `aria-label` for SR users — keyboard
            resize is intentionally out of scope. */}
        <Rebuild value={effectiveMode}>
          {(mode) => (mode === 'float' ? (
            <div
              class="tokenpanel-resize-handle"
              on:mousedown={handleResizeStart}
              aria-label="Resize panel"
              title="Drag to resize"
            />
          ) : (
            <div
              class={`tokenpanel-dock-resize-handle is-${mode}`}
              on:mousedown={handleDockResizeStart}
              aria-label={`Resize ${mode}-docked panel`}
              title="Drag to resize"
            />
          ))}
        </Rebuild>
        <CommandPalette
          open={showCommandPalette}
          onOpen={() => {
            showCommandPalette.value = true;
          }}
          onClose={() => {
            showCommandPalette.value = false;
          }}
          config={instanceConfig}
          state={state}
          actions={signal(commandActions)}
          onSelectToken={handleCommandToken}
          shortcuts={shortcuts}
          layers={layers}
        />
      </div>
    );
  }

  function Mini() {
    return (
      <MiniPill
        rootRef={shortcutRootRef}
        onApply={() => {
          showApply.value = true;
        }}
        applyDisabled={!applyConfigured}
        applyDisabledReason={!applyConfigured ? APPLY_DISABLED_REASON : undefined}
        onExpand={() => handleDockModeChange(lastFullDockMode)}
        changedCount={computed(() => (changedTotal.value > 0 ? changedTotal.value : undefined))}
        undo={
          <HistoryUndoButton
            canUndo={computed(() => historySnapshot.value.canUndo)}
            onUndo={handleUndo}
          />
        }
      />
    );
  }

  const isMini = computed(() => dockMode.value === 'mini');

  return (
    <Show when={open}>
      {() => [
        <Rebuild value={isMini}>{(mini) => (mini ? <Mini /> : <Shell />)}</Rebuild>,
        <Show when={computed(() => showExport.value && hasState.value)}>
          {() => (
            <ExportModal
              onClose={() => {
                showExport.value = false;
              }}
              state={presentState}
              colorDefaults={colorDefaults}
              instanceConfig={instanceConfig}
            />
          )}
        </Show>,
        <Show when={computed(() => showImport.value && hasState.value)}>
          {() => (
            <ImportModal
              onClose={() => {
                showImport.value = false;
              }}
              onLoad={handleLoadFromJson}
              colorDefaults={initColorFromScheme(getActivePrimaryCluster(instanceConfig), instanceConfig)}
              current={presentState}
              instanceConfig={instanceConfig}
            />
          )}
        </Show>,
        <Show when={computed(() => showApply.value && hasState.value)}>
          {() => (
            <ApplyModal
              state={presentState}
              open={showApply}
              onClose={() => {
                showApply.value = false;
              }}
              colorDefaults={colorDefaults}
              onApplied={handleApplied}
              instanceConfig={instanceConfig}
            />
          )}
        </Show>,
        <Show when={showHighlightSettings}>
          {() => (
            <HighlightSettingsPopover
              anchorRef={gearBtnRef}
              onClose={() => {
                showHighlightSettings.value = false;
              }}
              highlight={highlight}
            />
          )}
        </Show>,
      ]}
    </Show>
  );
}

export type { TweakState } from './state/tweak-state';
