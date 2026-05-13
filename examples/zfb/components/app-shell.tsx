/**
 * AppShell — full-page layout wrapper for the zfb example.
 *
 * Renders the HTML document shell, a topbar with the panel-open button,
 * a fixed-width sidenav, and a main content area.
 *
 * Grid layout note (§137.1)
 * -------------------------
 * `.zfbexample-app-shell` uses CSS grid with columns driven by
 * `--zfbexample-size-sidenav-w` and `1fr`:
 *   grid-template-columns: var(--zfbexample-size-sidenav-w) 1fr
 *
 * Token consumption:
 *   .zfbexample-app-shell         → grid-template-columns: var(--zfbexample-size-sidenav-w) 1fr; min-height: 100vh
 *   .zfbexample-app-shell__sidenav → background: var(--zfbexample-color-surface); padding: var(--zfbexample-spacing-md)
 *   .zfbexample-app-shell__main    → background: var(--zfbexample-bg); padding: var(--zfbexample-spacing-lg)
 *   .zfbexample-topbar             → height: var(--zfbexample-size-header-h); padding-inline: var(--zfbexample-spacing-md)
 *
 * Panel Mount
 * -----------
 * AppShell includes <PanelMount> wrapped in <Island> so every page gets the
 * panel adapter without repeating the boilerplate.
 */

import { Island, type IslandProps } from '@takazudo/zfb';
import PanelMount from './panel-mount';
import { Sidenav } from './sidenav';
import '../styles/global.css';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

interface AppShellProps {
  title?: string;
  activePath?: string;
  children: preact.ComponentChildren;
}

export function AppShell({ title = 'zfb — Design Token Panel', activePath = BASE_PATH, children }: AppShellProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
      </head>
      <body>
        {/* Topbar */}
        <header class="zfbexample-topbar">
          <span class="zfbexample-topbar__label">
            Storage prefix: <code>zfb-example-tokens</code>
          </span>
          <button
            type="button"
            id="zfbexample-panel-open"
            class="zfbexample-button"
          >
            Open Design Token Panel
          </button>
          {/*
            Panel button click handler. Page body is SSR-only; the Island
            containing PanelMount runs client-side only. This inline script
            attaches a click listener at parse time, bridging the SSR/island gap.
            Once PanelMount's useEffect installs window.zfbExample.toggleDesignPanel,
            clicks invoke it.
          */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "document.getElementById('zfbexample-panel-open')?.addEventListener('click',function(){var a=window.zfbExample;if(a&&typeof a.toggleDesignPanel==='function')a.toggleDesignPanel();});",
            }}
          />
        </header>

        {/* Two-column grid: sidenav fixed-width from token, main fills remaining space. */}
        <div class="zfbexample-app-shell">
          <aside class="zfbexample-app-shell__sidenav">
            <Sidenav activePath={activePath} />
          </aside>
          <main class="zfbexample-app-shell__main">
            {children}
          </main>
        </div>

        {/*
          PanelMount is the `"use client"` island that bootstraps the panel adapter.
          Uses `ssrFallback={null}` (the zfb equivalent of Astro's `client:only`)
          so the island's internals are NOT evaluated at SSR time.
        */}
        <Island when="visible" ssrFallback={null}>
          {(<PanelMount />) as unknown as IslandProps['children']}
        </Island>
      </body>
    </html>
  );
}
