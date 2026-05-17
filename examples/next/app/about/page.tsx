/*
 * About page — wired into AppShell (wave 3a #189).
 *
 * Server component — no 'use client' directive needed. Mirrors the
 * home page's palette swatches so a side-by-side comparison after a token
 * tweak is trivial: tweak a palette colour on `/`, follow the link to
 * `/about`, confirm the swatches show the new colour without an FOUT.
 *
 * Soft-navigation note: clicking `<Link href="/">` is a client-side navigation
 * that swaps the route without a full document reload. The panel's host adapter
 * installed by `app/_components/PanelBootstrap.tsx` is therefore NOT re-mounted;
 * the layout component persists across the route swap, and the panel's DOM root
 * lives outside the React tree so panel state survives the navigation intact.
 */

import Link from 'next/link';
import AppShell from '../_components/AppShell';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export default function AboutPage() {
  return (
    <AppShell activePath="/about">
      <div className="nx-page">
        <header>
          <div role="heading" aria-level={1} className="nx-page-title">
            About this example
          </div>
          <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-md)' }}>
            The <code>examples/next</code> sub-package consumes{' '}
            <code>@takazudo/zudo-design-token-panel</code> through its built
            artifact only — there are no deep imports into <code>dist/</code>,
            no bundler aliases, and no framework integration beyond the{' '}
            <code>&apos;use client&apos;</code> bootstrap component.
          </p>
          <ul style={{ marginTop: 'var(--nx-vsp-md)', paddingLeft: 'var(--nx-hsp-lg)' }}>
            <li className="nx-body">No Tailwind, no preflight stylesheet, no design-system dependency.</li>
            <li className="nx-body">
              Storage prefix <code>next-example-tokens</code>, console namespace{' '}
              <code>nx</code>.
            </li>
            <li className="nx-body">
              Palette CSS-var template <code>{`--nx-palette-{n}`}</code>.
            </li>
            <li className="nx-body">
              Apply endpoint <code>/api/dev/apply</code> handled by a Next API
              route (<code>app/api/dev/apply/route.dev.ts</code>) that forwards
              to the bin sidecar on port 24684.
            </li>
          </ul>
        </header>

        <section>
          <div role="heading" aria-level={2} className="nx-section-title" style={{ marginBottom: 'var(--nx-vsp-md)' }}>
            Verify across navigation
          </div>
          <div className="nx-card">
            Open the panel via{' '}
            <code>window.nx.toggleDesignPanel()</code>, change a token, then{' '}
            <Link className="nx-link" href="/">
              navigate back to home
            </Link>
            . The new value should still apply — proving the host adapter
            survives Next.js soft navigation end-to-end.
          </div>
          <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-md)' }}>
            See the{' '}
            <Link className="nx-link" href="/prose">
              prose demo page
            </Link>{' '}
            for typography tokens in action.
          </p>
        </section>

        <section>
          <div role="heading" aria-level={2} className="nx-section-title" style={{ marginBottom: 'var(--nx-vsp-md)' }}>
            Palette swatches (mirrored)
          </div>
          <div className="nx-swatch-row">
            {PALETTE_INDICES.map((i) => (
              <div
                key={i}
                className="nx-swatch"
                style={{ background: `var(--nx-palette-${i})` }}
              >
                {i}
              </div>
            ))}
          </div>
          <p className="nx-meta" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
            These swatches are identical to the home page so a side-by-side
            comparison after a token tweak is trivial.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
