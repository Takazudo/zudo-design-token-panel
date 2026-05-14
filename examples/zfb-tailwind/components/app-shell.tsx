/**
 * AppShell — full-page layout wrapper for the zfb-tailwind example.
 *
 * Renders the HTML document shell, a topbar with the panel-open button,
 * a fixed-width sidenav, and a main content area.
 *
 * Grid layout note
 * ----------------
 * The grid template uses an arbitrary value to mix a CSS variable with `1fr`.
 * A token-only Tailwind utility cannot express this two-column mix.
 *
 * Token consumption:
 *   grid-cols-[var(--zfbtw-size-sidenav-w)_1fr]
 *       → sidenav column width (--zfbtw-size-sidenav-w; added by #128)
 *   px-hsp-lg py-vsp-lg → main content outer padding (--zfbtw-hsp-lg / --zfbtw-vsp-lg)
 *   bg-bg        → main content background (--zfbtw-bg)
 *   bg-surface   → sidenav background (--zfbtw-color-surface)
 *   px-hsp-md py-vsp-md → sidenav inner padding (--zfbtw-hsp-md / --zfbtw-vsp-md)
 *   h-size-header-h → topbar height (--zfbtw-size-header-h; added by #128)
 *   bg-surface   → topbar background
 *   px-hsp-md → topbar inline padding
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

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

interface AppShellProps {
  title?: string;
  activePath?: string;
  children: preact.ComponentChildren;
}

export function AppShell({ title = 'zfb + Tailwind v4 — Design Token Panel', activePath = BASE_PATH, children }: AppShellProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
      </head>
      <body>
        {/* Topbar */}
        <header class="h-size-header-h flex items-center justify-between bg-surface px-hsp-md border-b border-muted">
          <span class="text-small text-muted">
            Storage prefix: <code>zfb-tailwind-example-tokens</code>
          </span>
          <button
            type="button"
            id="zfbtw-panel-open"
            class="px-hsp-sm py-vsp-xs rounded-md bg-accent text-bg border-none cursor-pointer hover:bg-primary text-small"
          >
            Open Design Token Panel
          </button>
          {/*
            Panel button click handler. Page body is SSR-only; the Island
            containing PanelMount runs client-side only. This inline script
            attaches a click listener at parse time, bridging the SSR/island gap.
            Once PanelMount's useEffect installs window.zfbTw.toggleDesignPanel,
            clicks invoke it.
          */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "document.getElementById('zfbtw-panel-open')?.addEventListener('click',function(){var a=window.zfbTw;if(a&&typeof a.toggleDesignPanel==='function')a.toggleDesignPanel();});",
            }}
          />
        </header>

        {/*
          Two-column grid: sidenav fixed-width from token, main fills remaining space.
          reason: grid template needs structural mix of a sidebar token and 1fr;
          no token-only utility expresses this combination
        */}
        <div class="grid grid-cols-[var(--zfbtw-size-sidenav-w)_1fr] min-h-screen">
          <aside class="bg-surface px-hsp-md py-vsp-md">
            <Sidenav activePath={activePath} />
          </aside>
          <main class="px-hsp-lg py-vsp-lg bg-bg">
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
