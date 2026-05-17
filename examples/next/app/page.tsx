/*
 * Home page for the Next.js example.
 *
 * Server component (no 'use client' directive) — AppShell is a server
 * component and cannot be imported from a 'use client' file. The only
 * interactive part (RerenderVerify) is extracted to its own 'use client'
 * island so this page itself can be server-rendered.
 *
 * Soft-navigation note: the Vite + React analog of "view-transitions don't
 * disturb panel state" is Next's client-side navigation between pages via
 * `next/link`. The link to `/about` — combined with `/about`'s link back
 * to `/` — proves the equivalence in the demo runtime.
 */

import Link from 'next/link';
import AppShell from './_components/AppShell';
import RerenderVerify from './_components/RerenderVerify';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export default function HomePage() {
  return (
    <AppShell activePath="/">
      <div className="nx-page">
        <header>
          <div role="heading" aria-level={1} className="nx-page-title">
            Live token tweaking, in plain Next.js + React
          </div>
          <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-md)' }}>
            Every visible element on this page is driven by a{' '}
            <code>--nx-*</code> CSS custom property. Open the panel from
            the button above and drag any slider — the change applies before
            the next paint, and survives React rerenders because the CSS vars
            live on <code>:root</code>, not in React state.
          </p>
          <p className="nx-helper" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
            Console API: <code>window.nx.toggleDesignPanel()</code>.
            Storage prefix: <code>next-example-tokens</code>.
          </p>
          <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
            Soft-navigation analog of view-transitions:{' '}
            <Link className="nx-link" href="/about">
              visit the /about page
            </Link>{' '}
            to verify panel state survives Next's client-routed navigation.
          </p>
          <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
            See the{' '}
            <Link className="nx-link" href="/prose">
              prose demo page
            </Link>{' '}
            for typography tokens in action.
          </p>
        </header>

        <section>
          <div role="heading" aria-level={2} className="nx-section-title" style={{ marginBottom: 'var(--nx-vsp-md)' }}>
            Cards (spacing + radius + surface)
          </div>
          <div className="nx-card">
            <strong>Card A.</strong> Padding driven by{' '}
            <code>--nx-hsp-md / --nx-vsp-md</code>, corners by{' '}
            <code>--nx-radius</code>, background by{' '}
            <code>--nx-color-surface</code>.
          </div>
          <div className="nx-card">
            <strong>Card B.</strong> Stack gap driven by{' '}
            <code>--nx-vsp-xl</code>; outline by{' '}
            <code>--nx-color-muted</code>.
          </div>
        </section>

        <section>
          <div role="heading" aria-level={2} className="nx-section-title" style={{ marginBottom: 'var(--nx-vsp-md)' }}>
            Buttons + links (accent / primary)
          </div>
          <p>
            <button className="nx-button" type="button">
              Action button
            </button>
          </p>
          <p style={{ marginTop: 'var(--nx-vsp-sm)' }}>
            The styled{' '}
            <a className="nx-link" href="#rerender-verify">
              rerender-verify section
            </a>{' '}
            below proves the panel's tokens persist across React state changes.
          </p>
        </section>

        <section>
          <div role="heading" aria-level={2} className="nx-section-title" style={{ marginBottom: 'var(--nx-vsp-md)' }}>
            Palette swatches
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
            Each swatch reads <code>--nx-palette-{'{n}'}</code>. The
            cluster's <code>paletteCssVarTemplate</code> is the only thing that
            decides this name.
          </p>
        </section>

        <RerenderVerify />
      </div>
    </AppShell>
  );
}
