/**
 * AppShell — full-page layout wrapper for the Vite + React example.
 *
 * Renders the topbar (with Design Token Panel open button), a fixed-width
 * sidenav, and a main content area. The panel adapter is mounted here via
 * a `useEffect` so every route in the React tree gets the panel without
 * each page repeating the boilerplate.
 *
 * Grid layout
 * -----------
 * Two columns: sidenav width driven by --vr-size-sidenav-w, main area
 * fills the remaining space. The topbar spans both columns (full width).
 *
 * Token consumption:
 *   .vr-topbar         → height: --vr-size-header-h, bg: --vr-color-surface
 *   .vr-sidenav        → bg: --vr-color-surface, padding from tokens
 *   --vr-size-sidenav-w → inline grid-template-columns value
 *   --vr-bg            → main content background
 *   --vr-hsp-lg, --vr-vsp-lg → main content padding
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidenav } from './Sidenav';
import { mountPanel } from '../lib/mount-panel';

export function AppShell() {
  useEffect(() => {
    mountPanel();
    // No cleanup: the panel adapter installs window-level console handlers
    // and a singleton panel module. Both are intended to live for the page
    // lifetime. StrictMode double-invocation is handled inside mountPanel
    // via the per-storagePrefix bind flag.
  }, []);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      {/* Topbar */}
      <div className="vr-topbar">
        <span className="vr-helper">
          Storage prefix: <code>vite-react-example-tokens</code>
        </span>
        <button
          type="button"
          className="vr-button"
          onClick={() => {
            (
              window as unknown as {
                vr?: { toggleDesignPanel?: () => void };
              }
            ).vr?.toggleDesignPanel?.();
          }}
        >
          Open Design Token Panel
        </button>
      </div>

      {/* Two-column layout: sidenav + main */}
      <div
        style={{
          display: 'grid',
          // sidenav fixed width from token, main fills remaining space
          gridTemplateColumns: 'var(--vr-size-sidenav-w) 1fr',
          flex: 1,
        }}
      >
        <div className="vr-sidenav">
          <Sidenav />
        </div>
        <main
          style={{
            padding: 'var(--vr-vsp-lg) var(--vr-hsp-lg)',
            background: 'var(--vr-bg)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
