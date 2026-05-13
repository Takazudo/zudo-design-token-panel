/*
 * Second page of the Next.js example. Mirrors the home page's shape so token
 * tweaks can be verified across a Next.js soft-navigation.
 *
 * Soft-navigation note: this page is server-rendered (no `'use client'`
 * directive) — clicking the `<Link href="/">` below is a client-side
 * navigation that swaps the route without a full document reload. The
 * panel's host adapter installed by `app/_components/PanelBootstrap.tsx`
 * (rendered once in `app/layout.tsx`) is therefore NOT re-mounted on the
 * navigation; the layout component persists across the route swap, and
 * the panel's DOM root is appended outside the React tree by the panel
 * adapter, so the panel state survives the navigation intact. This is
 * the Next.js analog of the Astro example's `astro:before-swap` /
 * `astro:page-load` reapply path and the Vite + React example's
 * "verify across rerender" section.
 *
 * The page mirrors the home page's palette swatches so a side-by-side
 * comparison after a token tweak is trivial: tweak a palette colour on
 * `/`, follow the link to `/about`, confirm the swatches show the new
 * colour without an FOUT and without a console-API roundtrip.
 */

import Link from 'next/link';

import PanelOpenButton from '../_components/PanelOpenButton';

const PALETTE_INDICES = Array.from({ length: 16 }, (_, i) => i);

export default function AboutPage() {
  return (
    <main className="nx-stack">
      <header>
        <h1 className="nx-heading">About this example</h1>
        <p>
          <PanelOpenButton />
        </p>
        <p>
          The <code>examples/next</code> sub-package consumes
          <code> @takazudo/zudo-design-token-panel</code> through its built
          artifact only — there are no deep imports into <code>dist/</code>,
          no bundler aliases, and no framework integration beyond the
          <code> &apos;use client&apos;</code> bootstrap component.
        </p>
        <ul>
          <li>No Tailwind, no preflight stylesheet, no design-system dependency.</li>
          <li>
            Storage prefix <code>next-example-tokens</code>, console namespace
            <code> nx</code>.
          </li>
          <li>
            Palette CSS-var template <code>--nx-palette-{`{n}`}</code>.
          </li>
          <li>
            Apply endpoint <code>/api/dev/apply</code> handled by a Next API
            route (<code>app/api/dev/apply/route.dev.ts</code>) that forwards
            to the bin sidecar on port 24684.
          </li>
        </ul>
      </header>

      <section>
        <h2 className="nx-heading">Verify across navigation</h2>
        <div className="nx-card">
          Open the panel via{' '}
          <code>window.nx.toggleDesignPanel()</code>, change a token,
          then{' '}
          <Link className="nx-link" href="/">
            navigate back to home
          </Link>
          . The new value should still apply — proving the host adapter
          survives Next.js soft navigation end-to-end.
        </div>
        <p>
          See the{' '}
          <Link className="nx-link" href="/prose">
            prose demo page
          </Link>{' '}
          for typography tokens in action.
        </p>
      </section>

      <section>
        <h2 className="nx-heading">Palette swatches (mirrored)</h2>
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
        <p className="nx-meta">
          These swatches are identical to the home page so a side-by-side
          comparison after a token tweak is trivial.
        </p>
      </section>
    </main>
  );
}
