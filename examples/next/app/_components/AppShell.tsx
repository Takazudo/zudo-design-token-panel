/*
 * AppShell — server component for the Next.js example.
 *
 * Renders the topbar (with a panel-open button island) and a two-column
 * layout: fixed-width sidenav from token + main content area.
 *
 * Structure mirrors examples/zfb-tailwind/components/app-shell.tsx but
 * uses Next.js App Router idioms (server component, next/link, nx-* frozen
 * vocabulary classes) and the existing PanelOpenButton client island.
 *
 * Token consumption (via frozen vocabulary from tokens.css):
 *   .nx-topbar      → sticky header: height, bg, padding, border
 *   .nx-sidenav     → (delegated to <Sidenav />) sidebar container
 *   nx-* size vars  → sidenav width via inline style in the grid wrapper
 *
 * Grid note: the two-column layout mixes a CSS variable with 1fr; there is no
 * single utility class that can express this combination, so the grid-template
 * is set via an inline style referencing --nx-size-sidenav-w directly.
 */

import PanelOpenButton from './PanelOpenButton';
import Sidenav from './Sidenav';

interface AppShellProps {
  activePath?: string;
  children: React.ReactNode;
}

export default function AppShell({ activePath = '/', children }: AppShellProps) {
  return (
    <>
      {/* Topbar */}
      <header className="nx-topbar">
        <span className="nx-helper">
          Storage prefix: <code>next-example-tokens</code>
        </span>
        <PanelOpenButton />
      </header>

      {/* Two-column grid: sidenav (token width) + main content */}
      <div
        style={{
          display: 'grid',
          /* reason: grid template mixes --nx-size-sidenav-w token with 1fr;
             no single frozen-vocabulary class can express this combination */
          gridTemplateColumns: 'var(--nx-size-sidenav-w) 1fr',
          minHeight: 'calc(100vh - var(--nx-size-header-h))',
        }}
      >
        <aside style={{ background: 'var(--nx-color-surface)' }}>
          <Sidenav activePath={activePath} />
        </aside>
        <main
          style={{
            padding: 'var(--nx-vsp-lg) var(--nx-hsp-lg)',
            background: 'var(--nx-bg)',
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
