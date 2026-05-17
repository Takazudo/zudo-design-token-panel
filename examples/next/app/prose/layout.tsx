/*
 * Prose route layout — wraps the MDX page content in AppShell.
 *
 * Using a route-segment layout instead of converting page.mdx to page.tsx
 * preserves the MDX pipeline intact while allowing the shell chrome
 * (topbar + sidenav) to be injected at the layout level.
 *
 * The MDX content renders inside the `nx-prose` container so flow-space
 * rhythm and heading/block styles are applied from tokens.css.
 */

import AppShell from '../_components/AppShell';

export default function ProseLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell activePath="/prose">
      <div className="nx-prose">
        {children}
      </div>
    </AppShell>
  );
}
