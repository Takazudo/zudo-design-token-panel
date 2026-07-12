import { useState, useEffect, useCallback, useRef, useId, useMemo } from 'preact/compat';
import { ExportModal } from './export-modal';
import { ImportModal } from './import-modal';
import { ApplyModal } from './apply-modal';
import { RoleButton } from './controls/role-button';
import { ActionsMenuPopover, type ActionsMenuAction } from './controls/actions-menu-popover';
import { HighlightSettingsPopover } from './highlight/highlight-settings-popover';
import { HighlightOrchestrator } from './highlight/highlight-orchestrator';
import { ElementPathOrchestrator } from './element-path/element-path-orchestrator';
import { ElementPathToggleButton } from './element-path/element-path-toggle-button';
import { DomTweakerOrchestrator } from './dom-tweaker/dom-tweaker-orchestrator';
import { DomTweakerToggleButton } from './dom-tweaker/dom-tweaker-toggle-button';
import { DomTweakerDiffActionLink } from './dom-tweaker/dom-tweaker-diff-action-link';
import ColorTab from './tabs/color-tab';
import FontTab from './tabs/font-tab';
import SizeTab from './tabs/size-tab';
import SpacingTab from './tabs/spacing-tab';
import GenericTab from './tabs/generic-tab';
import PaletteTab from './tabs/palette/palette-tab';
import NotesTab from './tabs/notes-tab';
import { TooltipProvider } from './controls/tooltip';
import {
  getPanelConfig,
  openStateChangedEventName,
  storageKey_visible,
  type PanelConfig,
} from './config/panel-config';
import type { TabConfig } from './tokens/tier-model';
import { usePersist } from './state/persist';
import {
  type TweakState,
  type ColorTweakState,
  type PanelDensity,
  type PanelPosition,
  type PanelSize,
  DEFAULT_DENSITY,
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
  getOpenKey,
  hasActiveColorSlot,
  initColorFromScheme,
  initSecondaryFromConfig,
  loadDensity,
  loadPersistedState,
  loadPosition,
  loadSize,
  savePersistedState,
  saveDensity,
  savePosition,
  saveSize,
} from './state/tweak-state';

// --- Tab configuration ---

// Reserved tab ids dispatched to their dedicated components. 'notes' (#515)
// is a special-cased reserved id too — it renders NotesTab instead of a
// tier-driven token editor and carries no state/persist props (see the
// tab-body dispatch below and utils/design-token-serde.ts's OWN separate
// RESERVED_TAB_IDS Set, which independently excludes it from export/import).
const RESERVED_TAB_IDS = ['color', 'font', 'spacing', 'size', 'palette', 'notes'] as const;
type ReservedTabId = (typeof RESERVED_TAB_IDS)[number];

const DEFAULT_TAB_ID: ReservedTabId = 'color';

// Kebab-menu container-query breakpoint (px) — must match the
// `@container tokenpanel (max-width: 479px)` rule in styles/panel.css (#518).
// `@container` always evaluates the query container's CONTENT box (excludes
// border/padding, regardless of box-sizing — confirmed against the CSS
// Containment spec), while `size.width` below is the shell's BORDER box
// (.tokenpanel-shell is box-sizing: border-box with a 1px border on each
// side). Add that 2px back so this JS comparison agrees with the CSS
// breakpoint at the same border-box width — omitting it left a ~2px dead
// zone (480–481px) where the kebab was still visible per CSS but every
// open attempt was immediately auto-closed by the width-close effect below.
const ACTIONS_MENU_BREAKPOINT_PX = 480 + 2;

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
 */
interface DesignTokenTweakPanelProps {
  instanceConfig?: PanelConfig;
}

export default function DesignTokenTweakPanel({
  instanceConfig: instanceConfigProp,
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
  const gearBtnRef = useRef<HTMLDivElement>(null);
  // Actions kebab (narrow-panel replacement for the header action links, #518).
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuBtnRef = useRef<HTMLDivElement>(null);
  // Tabs strip — measures scroll overflow for the right-edge fade hint (#518).
  const tabsStripRef = useRef<HTMLDivElement>(null);
  const [tabsHaveOverflow, setTabsHaveOverflow] = useState(false);
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
  // Track active drag listeners for cleanup on unmount
  const dragCleanupRef = useRef<(() => void) | null>(null);
  // Track active resize listeners for cleanup on unmount
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const { persistColor, persistSpacing, persistFont, persistSize, persistSecondary, persistTab } =
    usePersist(setState, instanceConfig);

  // Restore open state, position, and size from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem(getOpenKey(instanceConfig)) === '1') setOpen(true);
    } catch {
      /* ignore */
    }
    const loadedSize = loadSize(instanceConfig);
    setSize(loadedSize);
    sizeRef.current = loadedSize;
    const loaded = loadPosition(instanceConfig);
    // Clamp against current viewport so a position saved on a 4K monitor
    // (e.g. left:3000) doesn't restore fully off-screen on a 1080p laptop.
    // loadSize was already clamped; use its result for the position clamp so
    // both agree on panel dimensions.
    const clampedPos = clampPosition(loaded.top, loaded.left, loadedSize.width, loadedSize.height);
    setPosition(clampedPos);
    positionRef.current = clampedPos;
    setDensity(loadDensity(instanceConfig));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist density on change
  const handleDensityChange = useCallback(
    (next: PanelDensity) => {
      setDensity(next);
      saveDensity(next, instanceConfig);
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

  // ESC key closes the panel when no modal is open. When a modal is open the
  // native <dialog> handles ESC first (fires cancel → onClose), and we must
  // not also close the panel. Effect is installed only while open===true so
  // the listener is automatically removed when the panel is closed.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // A layered popover (ColorPicker / HighlightSettingsPopover /
      // PaletteSelector listbox) consumed this Escape via the shared
      // dismiss-layer stack, which runs in the capture phase and marks the
      // event handled. The panel is the base surface — stand down so one
      // press never closes both the popover and the panel (F10).
      if (e.defaultPrevented) return;
      // If any modal is open, let the native <dialog> handle Escape.
      if (showExport || showImport || showApply) return;
      e.preventDefault();
      setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, showExport, showImport, showApply]);

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
      setState((prev) =>
        prev
          ? { ...prev, color: nextColor, secondary: nextSecondary }
          : { ...freshTweakState(instanceConfig), color: nextColor, secondary: nextSecondary },
      );
    }
    window.addEventListener('color-scheme-changed', handleSchemeChange);
    return () => window.removeEventListener('color-scheme-changed', handleSchemeChange);
  }, [instanceConfig]);

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
      setState(persisted);
      return;
    }
    // No saved state — page already has correct colors from ColorSchemeProvider.
    // Just read scheme data for panel display; don't apply (avoids overwriting host CSS with redundant defaults).
    // The `secondary` slice is always seeded — every fresh-state path
    // includes it so the persisted envelope shape stays stable regardless
    // of the user's path.
    setState(freshTweakState(instanceConfig));
  }, [open, state, instanceConfig]);

  // Close the actions kebab popover when a resize drag carries the panel back
  // across the wide-layout breakpoint (#518) — the trigger itself disappears
  // via the @container rule, but the popover's own open state is JS-managed
  // (usePopoverClose) and would otherwise stay open, invisible-anchor, until
  // the next outside click/Escape. `size.width` already tracks the shell's
  // inline width (the resize grip is JS-driven via setSize, not native CSS
  // `resize`), so no separate ResizeObserver is needed for this check.
  useEffect(() => {
    if (showActionsMenu && size.width >= ACTIONS_MENU_BREAKPOINT_PX) {
      setShowActionsMenu(false);
    }
  }, [size.width, showActionsMenu]);

  // Drag handler for panel header (stable — reads position from ref)
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Skip if target is a button (or role=button/tab div), select, or inside one
    const target = e.target as HTMLElement;
    if (target.closest("button, select, option, [role='tab'], [role='button']")) return;
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
  }, [instanceConfig]);

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
      clearAppliedColorStyles(undefined, undefined, instanceConfig);
      // Replace the panel state with the loaded tweak, apply CSS vars, persist
      // to localStorage (v3). Unknown tokens have already been filtered out by
      // deserialize(). Apply + persist are scoped to THIS instance (#357).
      applyFullState(loaded, instanceConfig);
      savePersistedState(loaded, undefined, instanceConfig);
      setState(loaded);
    },
    [instanceConfig],
  );

  const handleResetAll = useCallback(() => {
    // Clear + reset are scoped to THIS instance's storage keys, clusters, and
    // sink so a reset on panel A never touches panel B's storage/vars (#357).
    clearPersistedState(undefined, instanceConfig);
    clearAppliedStyles(undefined, instanceConfig);
    // Always seed the secondary slice — every fresh-state path emits a
    // uniform envelope shape so persistence stays consistent.
    setState(freshTweakState(instanceConfig));
  }, [instanceConfig]);

  // Single source of truth for the four header actions (#518) — rendered
  // both as the always-visible .tokenpanel-action-link header links AND
  // inside the narrow-panel kebab popover, so a label/handler change only
  // needs one edit instead of two synchronized ones.
  const panelActions = useMemo(
    (): readonly ActionsMenuAction[] => [
      { label: 'Export', onSelect: () => setShowExport(true) },
      { label: 'Load from JSON…', onSelect: () => setShowImport(true) },
      { label: 'Apply', onSelect: () => setShowApply(true) },
      { label: 'Reset', onSelect: handleResetAll },
    ],
    [handleResetAll],
  );

  const handleApplied = useCallback(() => {
    // After a successful apply the on-disk CSS now matches the current tweak,
    // so drop the persisted override envelope and any inline overrides — the
    // page will re-render from the fresh stylesheet. Scoped to THIS instance (#357).
    clearPersistedState(undefined, instanceConfig);
    clearAppliedStyles(undefined, instanceConfig);
    // Always seed the secondary slice — every fresh-state path emits a
    // uniform envelope shape.
    setState(freshTweakState(instanceConfig));
  }, [instanceConfig]);

  // Build the active tab list from this instance's PanelConfig.tabs (required).
  // Keyed on `instanceConfig` so a non-default panel renders ITS own manifest,
  // not the active default instance's (#354). configurePanel is one-shot per
  // prefix, so the list is stable for a mount's lifetime.
  const activeTabs = useMemo((): readonly { id: string; label: string }[] => {
    return instanceConfig.tabs.map((t: TabConfig) => ({ id: t.id, label: t.label }));
  }, [instanceConfig]);

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

  // --- Tab keyboard navigation (WAI-ARIA tablist pattern) ---
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const idx = activeTabs.findIndex((t) => t.id === activeTab);
      if (idx === -1) return;
      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % activeTabs.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + activeTabs.length) % activeTabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = activeTabs.length - 1;
      if (nextIdx === null) return;
      e.preventDefault();
      const next = activeTabs[nextIdx];
      setActiveTab(next.id);
      // Move focus to the newly selected tab so SR announces it
      window.requestAnimationFrame(() => {
        tabRefs.current[next.id]?.focus();
      });
    },
    [activeTab, activeTabs],
  );

  // Toggle the tabs strip's right-edge fade hint when it actually has
  // scrollable overflow. Driven by a ResizeObserver on the strip itself (+ its
  // own scroll events) rather than `window.resize`: a grip-driven panel
  // resize changes the strip's layout size without ever firing a window
  // resize event, so a window listener would miss it (#518).
  useEffect(() => {
    if (!open) return;
    const el = tabsStripRef.current;
    if (!el) return;
    function updateOverflow() {
      if (!el) return;
      const hasOverflow =
        el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setTabsHaveOverflow(hasOverflow);
    }
    updateOverflow();
    if (typeof ResizeObserver === 'undefined') {
      // jsdom (unit tests) has no ResizeObserver — the initial synchronous
      // check above still runs; only the live-resize tracking is skipped.
      el.addEventListener('scroll', updateOverflow);
      return () => el.removeEventListener('scroll', updateOverflow);
    }
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    el.addEventListener('scroll', updateOverflow);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateOverflow);
    };
  }, [open, activeTabs]);

  return (
    <HighlightOrchestrator>
      <ElementPathOrchestrator>
      <DomTweakerOrchestrator instanceConfig={instanceConfig}>
      <TooltipProvider>
      {open && (() => {
        const { width: panelW, height: panelH } = computePanelSize(size);

        const panelPos = { position: 'fixed' as const, top: position.top, left: position.left };

        return (
          <>
            <div
        ref={panelRef}
        className="tokenpanel-shell"
        style={{
          ...panelPos,
          width: panelW,
          height: panelH,
          maxHeight: 'calc(100vh - 32px)',
          // `--tokenpanel-grid-min` is read by .tokenpanel-tab-grid /
          // .tokenpanel-tab-advanced-grid; switching the variable rewires the
          // min-card-width without re-rendering the grids.
          ['--tokenpanel-grid-min' as string]: densityToGridMin(density),
        }}
      >
        {/* Header row (expert/reset) — drag to move the panel */}
        <div
          className="tokenpanel-header"
          style={{ cursor: 'move' }}
          onMouseDown={handleDragStart}
        >
          <span className="tokenpanel-title">zdtp</span>
          {panelActions.map((action) => (
            <RoleButton
              key={action.label}
              onClick={action.onSelect}
              className="tokenpanel-action-link"
            >
              {action.label}
            </RoleButton>
          ))}
          <DomTweakerDiffActionLink instanceConfig={instanceConfig} />
          {/* Actions kebab — narrow-panel replacement for the four action
              links above (#518). Always rendered so the @container rule in
              styles/panel.css can show/hide it with pure CSS; no JS width
              tracking. Inline div (not RoleButton) so we can attach a ref for
              popover anchoring, matching the gear button below. */}
          <div
            ref={actionsMenuBtnRef}
            role="button"
            tabIndex={0}
            className="tokenpanel-actions-menu-btn"
            aria-label="Panel actions"
            aria-expanded={showActionsMenu}
            aria-haspopup="dialog"
            onClick={() => setShowActionsMenu((v) => !v)}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowActionsMenu((v) => !v);
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </div>
          {showActionsMenu && (
            <ActionsMenuPopover
              anchorRef={actionsMenuBtnRef}
              actions={panelActions}
              onClose={() => setShowActionsMenu(false)}
            >
              <DomTweakerDiffActionLink
                instanceConfig={instanceConfig}
                onSelected={() => setShowActionsMenu(false)}
              />
            </ActionsMenuPopover>
          )}
          <div className="tokenpanel-spacer" />
          {/* Element-path-copy toggle — enable, then Alt+click any element to copy its path */}
          <ElementPathToggleButton />
          {instanceConfig.domTweaker !== undefined && (
            <DomTweakerToggleButton />
          )}
          {/* Gear button — inline div so we can attach a ref for popover anchoring */}
          <div
            ref={gearBtnRef}
            role="button"
            tabIndex={0}
            className="tokenpanel-gear-btn"
            aria-label="Highlight outline settings"
            aria-expanded={showHighlightSettings}
            aria-haspopup="dialog"
            onClick={() => setShowHighlightSettings((v) => !v)}
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowHighlightSettings((v) => !v);
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
        </div>

        {/* Tab bar — data-driven when PanelConfig.tabs is supplied, otherwise
            falls back to the legacy hard-coded LEGACY_TABS strip. The tablist
            (role="tablist") and the density slider live side-by-side inside
            `.tokenpanel-tabbar`; the wrapper is a plain container so the
            tablist only ever has `role=tab` children. */}
        <div className="tokenpanel-tabbar">
          <div
            ref={tabsStripRef}
            role="tablist"
            aria-label="Design token categories"
            className={
              tabsHaveOverflow
                ? 'tokenpanel-tabbar-tabs has-overflow'
                : 'tokenpanel-tabbar-tabs'
            }
          >
            {activeTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  role="tab"
                  id={`dtp-tab-${ariaIdScope}-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`dtp-panel-${ariaIdScope}-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={handleTabKeyDown}
                  className={
                    isSelected ? 'tokenpanel-tab-button is-active' : 'tokenpanel-tab-button'
                  }
                >
                  {tab.label}
                </div>
              );
            })}
          </div>
          <div className="tokenpanel-density">
            <label
              htmlFor={`dtp-density-${ariaIdScope}`}
              className="tokenpanel-density-label"
              title="Tab grid density: dense / cozy / wide (forces 1 column)"
            >
              Density
            </label>
            <input
              id={`dtp-density-${ariaIdScope}`}
              type="range"
              min={0}
              max={2}
              step={1}
              value={density}
              onInput={(e) => {
                const raw = Number((e.currentTarget as HTMLInputElement).value);
                if (raw === 0 || raw === 1 || raw === 2) handleDensityChange(raw);
              }}
              className="tokenpanel-density-slider"
              aria-label="Tab grid density"
            />
          </div>
        </div>

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
                {tab.id === 'color' && state && tabConfigById['color'] && (
                  <ColorTab
                    tab={tabConfigById['color']}
                    state={state.color}
                    persistColor={persistColor}
                    secondaryTab={tabConfigById['color-secondary'] ?? null}
                    secondaryState={state.secondary ?? initSecondaryFromConfig(instanceConfig) ?? null}
                    persistSecondary={persistSecondary}
                    instanceConfig={instanceConfig}
                  />
                )}
                {tab.id === 'spacing' && state && tabConfigById['spacing'] && (
                  <SpacingTab
                    tab={tabConfigById['spacing']}
                    state={state.spacing}
                    persistSpacing={persistSpacing}
                  />
                )}
                {tab.id === 'font' && state && tabConfigById['font'] && (
                  <FontTab
                    tab={tabConfigById['font']}
                    state={state.typography}
                    persistFont={persistFont}
                  />
                )}
                {tab.id === 'size' && state && tabConfigById['size'] && (
                  <SizeTab
                    tab={tabConfigById['size']}
                    state={state.size}
                    persistSize={persistSize}
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

        {/* Bottom-right resize grip — available on every viewport width.

            ARIA: `role="separator"` would imply a 1D resizer between two
            regions; this grip resizes the panel on both axes, which has no
            standard role. We keep just `aria-label` for SR users — keyboard
            resize is intentionally out of scope. */}
        <div
          className="tokenpanel-resize-handle"
          onMouseDown={handleResizeStart}
          aria-label="Resize panel"
          title="Drag to resize"
        />
      </div>

      {showExport && state && (
        <ExportModal
          onClose={() => setShowExport(false)}
          state={state}
          colorDefaults={initColorFromScheme(getActivePrimaryCluster(instanceConfig), instanceConfig)}
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
          colorDefaults={initColorFromScheme(getActivePrimaryCluster(instanceConfig), instanceConfig)}
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
      </ElementPathOrchestrator>
    </HighlightOrchestrator>
  );
}

export type { TweakState } from './state/tweak-state';
