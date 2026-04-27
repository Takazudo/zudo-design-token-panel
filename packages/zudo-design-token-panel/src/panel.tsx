import { useState, useEffect, useCallback, useRef, useId } from 'preact/compat';
import { ExportModal } from './export-modal';
import { ImportModal } from './import-modal';
import { ApplyModal } from './apply-modal';
import ColorTab from './tabs/color-tab';
import FontTab from './tabs/font-tab';
import SizeTab from './tabs/size-tab';
import SpacingTab from './tabs/spacing-tab';
import { getPanelConfig } from './config/panel-config';
import { usePersist } from './state/persist';
import {
  type TweakState,
  type PanelPosition,
  DEFAULT_POSITION,
  applyFullState,
  clampPosition,
  clearAppliedStyles,
  clearPersistedState,
  emptyOverrides,
  getOpenKey,
  initColorFromScheme,
  initSecondaryFromConfig,
  loadPersistedState,
  loadPosition,
  savePersistedState,
  savePosition,
} from './state/tweak-state';

// --- Tab configuration ---

type TabId = 'spacing' | 'font' | 'size' | 'color';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: readonly TabDef[] = [
  { id: 'spacing', label: 'Spacing' },
  { id: 'font', label: 'Font' },
  { id: 'size', label: 'Size' },
  { id: 'color', label: 'Color' },
] as const;

const DEFAULT_TAB: TabId = 'color';

// --- Panel sizing ---

/** Below this width the panel switches to narrow mode (non-draggable, centered, capped width). */
const NARROW_BREAKPOINT = 900;

function computePanelSize(
  viewportW: number,
  _viewportH: number,
): {
  width: string;
  height: string;
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
  return {
    width: `min(1200px, 80vw)`,
    height: `min(800px, 80vh)`,
    narrow,
  };
}

// --- Empty-state UI ---
//
// Friendly affordance shown in the tab body when a host has not registered
// any tokens for the active tab's category (i.e. `getPanelConfig().tokens.<cat>`
// is an empty array). Without this, the tab renders a blank pane — opaque to
// a developer integrating the panel for the first time. The copy points the
// reader at `configurePanel({ tokens })` and the package README quick-start
// section.
//
// Scope: spacing / typography / size tabs only. The color tab is driven by
// the host-supplied `colorCluster`, NOT by `tokens.color` — this package's
// default manifest deliberately ships `color: []` because the cluster does
// the work. Showing the empty-state under the color tab on the strength of
// an empty `tokens.color` array would surface a spurious "configure tokens
// please" message on every cluster-driven host, which is exactly the
// regression to avoid.
//
// The `<a>` points at the package README anchor for the quick-start section.
// It is rendered as an absolute GitHub URL so the link still resolves when
// the panel is bundled into a consumer that ships none of the README
// alongside the panel runtime.
const README_QUICK_START_URL =
  'https://github.com/Takazudo/zudo-design-token-panel#quick-start-astro';

function EmptyState() {
  return (
    <div className="tokenpanel-empty-state" role="status">
      <p className="tokenpanel-empty-state-text">
        No tokens are registered for this tab. Pass a <code>TokenManifest</code> to{' '}
        <code>configurePanel({'{ tokens }'})</code> — see the{' '}
        <a
          className="tokenpanel-empty-state-link"
          href={README_QUICK_START_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          package README §3
        </a>
        .
      </p>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);
  const [position, setPosition] = useState<PanelPosition>(DEFAULT_POSITION);
  const [isNarrow, setIsNarrow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    spacing: null,
    font: null,
    size: null,
    color: null,
  });
  const positionRef = useRef<PanelPosition>(DEFAULT_POSITION);
  // Keep ref in sync with state for use in drag handlers (avoids stale closure)
  positionRef.current = position;
  // Track active drag listeners for cleanup on unmount
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const { persistColor, persistSpacing, persistFont, persistSize, persistSecondary } =
    usePersist(setState);

  // Restore open state and position from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      if (localStorage.getItem(getOpenKey()) === '1') setOpen(true);
    } catch {
      /* ignore */
    }
    const loaded = loadPosition();
    setPosition(loaded);
    positionRef.current = loaded;
    // Initial narrow-check
    setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
  }, []);

  // Persist open state
  useEffect(() => {
    try {
      const openKey = getOpenKey();
      if (open) localStorage.setItem(openKey, '1');
      else localStorage.removeItem(openKey);
    } catch {
      /* ignore */
    }
  }, [open]);

  // Toggle panel via custom event from header icon (new name + deprecated alias)
  useEffect(() => {
    function handleToggle() {
      setOpen((prev) => !prev);
    }
    window.addEventListener('toggle-design-token-panel', handleToggle);
    window.addEventListener('toggle-color-tweak-panel', handleToggle);
    return () => {
      window.removeEventListener('toggle-design-token-panel', handleToggle);
      window.removeEventListener('toggle-color-tweak-panel', handleToggle);
    };
  }, []);

  // Re-initialize when the color scheme or light/dark mode changes
  useEffect(() => {
    function handleSchemeChange() {
      // Clear all inline style overrides so the new scheme's <style> tag takes effect
      clearAppliedStyles();
      setState({
        color: initColorFromScheme(),
        spacing: emptyOverrides(),
        typography: emptyOverrides(),
        size: emptyOverrides(),
        secondary: initSecondaryFromConfig(),
      });
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
    setState({
      color: initColorFromScheme(),
      spacing: emptyOverrides(),
      typography: emptyOverrides(),
      size: emptyOverrides(),
      secondary: initSecondaryFromConfig(),
    });
  }, [open, state]);

  // Drag handler for panel header (stable — reads position from ref)
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Drag disabled on narrow viewports.
    if (window.innerWidth < NARROW_BREAKPOINT) return;
    // Skip if target is a button, select, or inside one
    const target = e.target as HTMLElement;
    if (target.closest("button, select, option, [role='tab']")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRight = positionRef.current.right;
    const startTop = positionRef.current.top;
    const panelWidth = panelRef.current?.offsetWidth ?? 600;
    const panelHeight = panelRef.current?.offsetHeight ?? 600;

    function onMouseMove(ev: MouseEvent) {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      const clamped = clampPosition(
        startTop + deltaY,
        startRight - deltaX,
        panelWidth,
        panelHeight,
      );
      setPosition(clamped);
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      dragCleanupRef.current = null;
      savePosition(positionRef.current);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dragCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Clean up drag listeners on unmount
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  // Re-clamp position on window resize + update narrow-mode flag
  useEffect(() => {
    function handleResize() {
      setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
      const panelWidth = panelRef.current?.offsetWidth ?? 600;
      const panelHeight = panelRef.current?.offsetHeight ?? 600;
      setPosition((prev) => {
        const clamped = clampPosition(prev.top, prev.right, panelWidth, panelHeight);
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
    setState({
      color: initColorFromScheme(),
      spacing: emptyOverrides(),
      typography: emptyOverrides(),
      size: emptyOverrides(),
      secondary: initSecondaryFromConfig(),
    });
  }, []);

  const handleApplied = useCallback(() => {
    // After a successful apply the on-disk CSS now matches the current tweak,
    // so drop the persisted override envelope and any inline overrides — the
    // page will re-render from the fresh stylesheet.
    clearPersistedState();
    clearAppliedStyles();
    // Always seed the secondary slice — every fresh-state path emits a
    // uniform envelope shape.
    setState({
      color: initColorFromScheme(),
      spacing: emptyOverrides(),
      typography: emptyOverrides(),
      size: emptyOverrides(),
      secondary: initSecondaryFromConfig(),
    });
  }, []);

  // --- Tab keyboard navigation (WAI-ARIA tablist pattern) ---
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const idx = TABS.findIndex((t) => t.id === activeTab);
      if (idx === -1) return;
      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = TABS.length - 1;
      if (nextIdx === null) return;
      e.preventDefault();
      const next = TABS[nextIdx];
      setActiveTab(next.id);
      // Move focus to the newly selected tab so SR announces it
      window.requestAnimationFrame(() => {
        tabRefs.current[next.id]?.focus();
      });
    },
    [activeTab],
  );

  if (!open) return null;

  const {
    width: panelW,
    height: panelH,
    narrow,
  } = computePanelSize(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
    typeof window !== 'undefined' ? window.innerHeight : 768,
  );

  // Read host token manifest so we can swap in <EmptyState/> for tabs whose
  // category has zero tokens registered. The manifest is
  // pinned by `configurePanel`'s one-shot contract, so re-reading per render
  // is cheap and never goes stale mid-session.
  const tokens = getPanelConfig().tokens;

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
      : { position: 'fixed' as const, top: position.top, right: position.right };

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
        }}
      >
        {/* Header row (expert/reset) — draggable on desktop only */}
        <div
          className="tokenpanel-header"
          style={{ cursor: narrow || isNarrow ? 'default' : 'move' }}
          onMouseDown={handleDragStart}
        >
          <span className="tokenpanel-title">Design Tokens</span>
          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="tokenpanel-action-link"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="tokenpanel-action-link"
          >
            Load from JSON…
          </button>
          <button
            type="button"
            onClick={() => setShowApply(true)}
            className="tokenpanel-action-link"
          >
            Apply
          </button>
          <button type="button" onClick={handleResetAll} className="tokenpanel-action-link">
            Reset
          </button>
          <div className="tokenpanel-spacer" />
          <button
            type="button"
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
          </button>
        </div>

        {/* Tab bar */}
        <div role="tablist" aria-label="Design token categories" className="tokenpanel-tabbar">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`dtp-tab-${instanceId}-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`dtp-panel-${instanceId}-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleTabKeyDown}
                className={isSelected ? 'tokenpanel-tab-button is-active' : 'tokenpanel-tab-button'}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        <div className="tokenpanel-body">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                role="tabpanel"
                id={`dtp-panel-${instanceId}-${tab.id}`}
                aria-labelledby={`dtp-tab-${instanceId}-${tab.id}`}
                tabIndex={0}
                hidden={!isSelected}
              >
                {tab.id === 'color' && state && (
                  <ColorTab
                    state={state.color}
                    persistColor={persistColor}
                    secondaryState={state.secondary ?? initSecondaryFromConfig() ?? null}
                    persistSecondary={persistSecondary}
                  />
                )}
                {tab.id === 'spacing' &&
                  state &&
                  (tokens.spacing.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <SpacingTab state={state.spacing} persistSpacing={persistSpacing} />
                  ))}
                {tab.id === 'font' &&
                  state &&
                  (tokens.typography.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <FontTab state={state.typography} persistFont={persistFont} />
                  ))}
                {tab.id === 'size' &&
                  state &&
                  (tokens.size.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <SizeTab state={state.size} persistSize={persistSize} />
                  ))}
              </div>
            );
          })}
        </div>
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
