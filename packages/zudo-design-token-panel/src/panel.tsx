import { useState, useEffect, useCallback, useRef, useId, useMemo } from 'preact/compat';
import { ExportModal } from './export-modal';
import { ImportModal } from './import-modal';
import { ApplyModal } from './apply-modal';
import { RoleButton } from './controls/role-button';
import ColorTab from './tabs/color-tab';
import FontTab from './tabs/font-tab';
import SizeTab from './tabs/size-tab';
import SpacingTab from './tabs/spacing-tab';
import GenericTab from './tabs/generic-tab';
import { getPanelConfig, storageKey_visible } from './config/panel-config';
import type { TabConfig } from './tokens/tier-model';
import { usePersist } from './state/persist';
import {
  type TweakState,
  type PanelDensity,
  type PanelPosition,
  type PanelSize,
  DEFAULT_DENSITY,
  DEFAULT_POSITION,
  applyFullState,
  clampPosition,
  clampSize,
  clearAppliedStyles,
  clearPersistedState,
  defaultSize,
  densityToGridMin,
  emptyOverrides,
  getOpenKey,
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

// Reserved tab ids dispatched to their dedicated components.
const RESERVED_TAB_IDS = ['color', 'font', 'spacing', 'size'] as const;
type ReservedTabId = (typeof RESERVED_TAB_IDS)[number];

const DEFAULT_TAB_ID: ReservedTabId = 'color';

// --- Panel sizing ---

/** Below this width the panel switches to narrow mode (non-draggable, centered, capped width). */
const NARROW_BREAKPOINT = 900;

function computePanelSize(
  viewportW: number,
  _viewportH: number,
  storedSize: PanelSize,
): {
  width: number | string;
  height: number | string;
  narrow: boolean;
} {
  const narrow = viewportW < NARROW_BREAKPOINT;
  if (narrow) {
    return {
      width: `min(calc(100vw - 16px), 500px)`,
      height: `min(800px, calc(100vh - 32px))`,
      narrow,
    };
  }
  // Wide mode: fixed px sourced from user-resizable state. `loadSize` /
  // `defaultSize` already clamp to viewport, so we can trust the values here.
  return {
    width: storedSize.width,
    height: storedSize.height,
    narrow,
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
 */
function freshTweakState(): TweakState {
  return {
    color: initColorFromScheme(),
    spacing: emptyOverrides(),
    typography: emptyOverrides(),
    size: emptyOverrides(),
    secondary: initSecondaryFromConfig(),
  };
}

// --- Main Component ---

export default function DesignTokenTweakPanel() {
  // Scope WAI-ARIA IDs to this panel instance so that two mounted panels in
  // the same document do not share dtp-tab-* / dtp-panel-* IDs.
  const instanceId = useId();
  const [open, setOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [state, setState] = useState<TweakState | null>(null);
  // activeTab holds a string to support host-supplied non-reserved tab ids.
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB_ID);
  const [position, setPosition] = useState<PanelPosition>(DEFAULT_POSITION);
  const [size, setSize] = useState<PanelSize>(defaultSize);
  const [density, setDensity] = useState<PanelDensity>(DEFAULT_DENSITY);
  const [isNarrow, setIsNarrow] = useState(false);
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
    usePersist(setState);

  // Restore open state, position, and size from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem(getOpenKey()) === '1') setOpen(true);
    } catch {
      /* ignore */
    }
    const loaded = loadPosition();
    setPosition(loaded);
    positionRef.current = loaded;
    const loadedSize = loadSize();
    setSize(loadedSize);
    sizeRef.current = loadedSize;
    setDensity(loadDensity());
    // Initial narrow-check
    setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
  }, []);

  // Persist density on change
  const handleDensityChange = useCallback((next: PanelDensity) => {
    setDensity(next);
    saveDensity(next);
  }, []);

  // Persist open state, and keep the adapter-level :visible key in sync.
  // The adapter (index.tsx) only writes :visible from its public API paths
  // (show/hide/toggle), so an internal close (X button, ESC) would leave
  // :visible='1' while -open is absent — causing the panel to reopen on the
  // next page load via reapplyFromStorage → wasVisible(). Writing :visible
  // here ensures every close path (public API or internal UI) stays in lockstep.
  useEffect(() => {
    try {
      const openKey = getOpenKey();
      if (open) localStorage.setItem(openKey, '1');
      else localStorage.removeItem(openKey);
    } catch {
      /* ignore */
    }
    try {
      const visibleKey = storageKey_visible(getPanelConfig());
      localStorage.setItem(visibleKey, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  // ESC key closes the panel when no modal is open. When a modal is open the
  // native <dialog> handles ESC first (fires cancel → onClose), and we must
  // not also close the panel. Effect is installed only while open===true so
  // the listener is automatically removed when the panel is closed.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
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
  // The two historical public event names (`toggle-design-token-panel` and
  // its deprecated `toggle-color-tweak-panel` alias) are now handled in
  // `index.tsx` (see `handleExternalToggleEvent`). Removing them from this
  // effect eliminates the dual-listener race that caused the
  // "click-twice-after-close" regression — see `index.tsx` for the full
  // rationale.
  useEffect(() => {
    function syncOpenFromStorage() {
      try {
        setOpen(localStorage.getItem(getOpenKey()) === '1');
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('__zdtp:open-state-changed', syncOpenFromStorage);
    return () => {
      window.removeEventListener('__zdtp:open-state-changed', syncOpenFromStorage);
    };
  }, []);

  // Re-initialize when the color scheme or light/dark mode changes
  useEffect(() => {
    function handleSchemeChange() {
      // Clear all inline style overrides so the new scheme's <style> tag takes effect
      clearAppliedStyles();
      setState(freshTweakState());
    }
    window.addEventListener('color-scheme-changed', handleSchemeChange);
    return () => window.removeEventListener('color-scheme-changed', handleSchemeChange);
  }, []);

  // Initialize state on first open
  useEffect(() => {
    if (!open || state) return;
    const persisted = loadPersistedState();
    if (persisted) {
      applyFullState(persisted);
      setState(persisted);
      return;
    }
    // No saved state — page already has correct colors from ColorSchemeProvider.
    // Just read scheme data for panel display; don't apply (avoids oklch->hex lossy conversion).
    // The `secondary` slice is always seeded — every fresh-state path
    // includes it so the persisted envelope shape stays stable regardless
    // of the user's path.
    setState(freshTweakState());
  }, [open, state]);

  // Drag handler for panel header (stable — reads position from ref)
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Drag disabled on narrow viewports.
    if (window.innerWidth < NARROW_BREAKPOINT) return;
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
      savePosition(finalPos);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dragCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Resize handler for the bottom-right grip — mirrors handleDragStart's
  // structure: writes directly to the DOM during the drag (to avoid 60 fps
  // re-renders of the whole panel) and commits the final value to React
  // state + localStorage on mouseup.
  const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Resize disabled on narrow viewports — the panel is centered and the
    // grip is hidden anyway, but guard defensively.
    if (window.innerWidth < NARROW_BREAKPOINT) return;
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
      saveSize(finalSize);
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
        savePosition(finalPos);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    resizeCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Clean up drag + resize listeners on unmount
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
      resizeCleanupRef.current?.();
    };
  }, []);

  // Re-clamp position + size on window resize, update narrow-mode flag
  useEffect(() => {
    function handleResize() {
      setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
      // Re-clamp size first — a viewport shrink might force a smaller panel,
      // and the new dimensions feed into the position clamp below.
      setSize((prev) => {
        const clamped = clampSize(prev.width, prev.height);
        if (clamped.width !== prev.width || clamped.height !== prev.height) {
          saveSize(clamped);
        }
        return clamped;
      });
      const panelWidth = panelRef.current?.offsetWidth ?? 600;
      const panelHeight = panelRef.current?.offsetHeight ?? 600;
      setPosition((prev) => {
        const clamped = clampPosition(prev.top, prev.left, panelWidth, panelHeight);
        savePosition(clamped);
        return clamped;
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoadFromJson = useCallback((loaded: TweakState) => {
    // Replace the panel state with the loaded tweak, apply CSS vars, persist
    // to localStorage (v2). Unknown tokens have already been filtered out by
    // deserialize().
    applyFullState(loaded);
    savePersistedState(loaded);
    setState(loaded);
  }, []);

  const handleResetAll = useCallback(() => {
    clearPersistedState();
    clearAppliedStyles();
    // Always seed the secondary slice — every fresh-state path emits a
    // uniform envelope shape so persistence stays consistent.
    setState(freshTweakState());
  }, []);

  const handleApplied = useCallback(() => {
    // After a successful apply the on-disk CSS now matches the current tweak,
    // so drop the persisted override envelope and any inline overrides — the
    // page will re-render from the fresh stylesheet.
    clearPersistedState();
    clearAppliedStyles();
    // Always seed the secondary slice — every fresh-state path emits a
    // uniform envelope shape.
    setState(freshTweakState());
  }, []);

  // Build the active tab list from PanelConfig.tabs (now required).
  // useMemo with no deps is intentional — configurePanel is one-shot per
  // lifecycle, so the list never changes after mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeTabs = useMemo((): readonly { id: string; label: string }[] => {
    return getPanelConfig().tabs.map((t: TabConfig) => ({ id: t.id, label: t.label }));
  }, []);

  // Build an id→TabConfig lookup for GenericTab dispatch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tabConfigById = useMemo((): Record<string, TabConfig> => {
    const out: Record<string, TabConfig> = {};
    for (const t of getPanelConfig().tabs) {
      out[t.id] = t;
    }
    return out;
  }, []);

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

  if (!open) return null;

  const {
    width: panelW,
    height: panelH,
    narrow,
  } = computePanelSize(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
    typeof window !== 'undefined' ? window.innerHeight : 768,
    size,
  );

  // In narrow mode, ignore saved position — center safely near the top.
  const panelPos =
    narrow || isNarrow
      ? {
          position: 'fixed' as const,
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          right: 'auto' as const,
        }
      : { position: 'fixed' as const, top: position.top, left: position.left };

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
        {/* Header row (expert/reset) — draggable on desktop only */}
        <div
          className="tokenpanel-header"
          style={{ cursor: narrow || isNarrow ? 'default' : 'move' }}
          onMouseDown={handleDragStart}
        >
          <span className="tokenpanel-title">Design Tokens</span>
          <RoleButton
            onClick={() => setShowExport(true)}
            className="tokenpanel-action-link"
          >
            Export
          </RoleButton>
          <RoleButton
            onClick={() => setShowImport(true)}
            className="tokenpanel-action-link"
          >
            Load from JSON…
          </RoleButton>
          <RoleButton
            onClick={() => setShowApply(true)}
            className="tokenpanel-action-link"
          >
            Apply
          </RoleButton>
          <RoleButton onClick={handleResetAll} className="tokenpanel-action-link">
            Reset
          </RoleButton>
          <div className="tokenpanel-spacer" />
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
            role="tablist"
            aria-label="Design token categories"
            className="tokenpanel-tabbar-tabs"
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
                  id={`dtp-tab-${instanceId}-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`dtp-panel-${instanceId}-${tab.id}`}
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
              htmlFor={`dtp-density-${instanceId}`}
              className="tokenpanel-density-label"
              title="Tab grid density: dense / cozy / wide (forces 1 column)"
            >
              Density
            </label>
            <input
              id={`dtp-density-${instanceId}`}
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
                id={`dtp-panel-${instanceId}-${tab.id}`}
                aria-labelledby={`dtp-tab-${instanceId}-${tab.id}`}
                tabIndex={0}
                hidden={!isSelected}
              >
                {tab.id === 'color' && state && tabConfigById['color'] && (
                  <ColorTab
                    tab={tabConfigById['color']}
                    state={state.color}
                    persistColor={persistColor}
                    secondaryTab={tabConfigById['color-secondary'] ?? null}
                    secondaryState={state.secondary ?? initSecondaryFromConfig() ?? null}
                    persistSecondary={persistSecondary}
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
                {!isReserved && tabConfigById[tab.id] && state && (
                  <GenericTab
                    tab={tabConfigById[tab.id]}
                    overrides={state.tabs?.[tab.id] ?? {}}
                    onChange={(tierId, itemId, next) => {
                      persistTab(tab.id, (prev) => ({
                        ...prev,
                        [tierId]: {
                          ...(prev[tierId] ?? {}),
                          [itemId]: next,
                        },
                      }));
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom-right resize grip. Hidden in narrow (centered) mode where
            the panel is sized by CSS expressions and dragging would conflict
            with the touch-first layout.

            ARIA: `role="separator"` would imply a 1D resizer between two
            regions; this grip resizes the panel on both axes, which has no
            standard role. We keep just `aria-label` for SR users — keyboard
            resize is intentionally out of scope. */}
        {!(narrow || isNarrow) && (
          <div
            className="tokenpanel-resize-handle"
            onMouseDown={handleResizeStart}
            aria-label="Resize panel"
            title="Drag to resize"
          />
        )}
      </div>

      {showExport && state && (
        <ExportModal
          onClose={() => setShowExport(false)}
          state={state}
          colorDefaults={initColorFromScheme()}
        />
      )}

      {showImport && state && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onLoad={handleLoadFromJson}
          colorDefaults={initColorFromScheme()}
        />
      )}

      {showApply && state && (
        <ApplyModal
          state={state}
          open={showApply}
          onClose={() => setShowApply(false)}
          colorDefaults={initColorFromScheme()}
          onApplied={handleApplied}
        />
      )}
    </>
  );
}

export type { TweakState } from './state/tweak-state';
