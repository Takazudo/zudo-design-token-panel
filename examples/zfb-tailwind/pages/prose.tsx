/**
 * Prose page for the zfb-tailwind example. Renders the "prose" content
 * collection entry inside a `.zfbtailwindexample-prose` container that
 * applies the flow-space pattern and element styles defined in
 * `styles/global.css`.
 *
 * Content collection wiring
 * -------------------------
 * `getCollection("prose")` reads from `content/prose/` (declared in
 * `zfb.config.ts` as `collections: [{ name: "prose", path: "content/prose" }]`).
 * The first entry is rendered via `entry.Content`. The `components` prop
 * passes element overrides — we extend `defaultComponents` with a custom
 * `h2` override that adds the heading separator style while keeping all
 * other elements as passthroughs.
 *
 * Prose container strategy
 * ------------------------
 * Per `doc/.claude/prose-token-contract.md`:
 * For zfb demos that do not use framework-level MDX component overrides,
 * container-scoped CSS with `:where()` is acceptable. The `styles/global.css`
 * file defines the `.zfbtailwindexample-prose` container rules inside
 * `@layer components`, which keeps them correctly positioned below Tailwind
 * utility classes in the cascade.
 *
 * Panel mount
 * -----------
 * Same `<Island when="visible" ssrFallback={null}>` pattern as index.tsx.
 * The panel adapter is shared via the `panelConfig` import from
 * `../config/panel-config`.
 */

import { Island, type IslandProps } from '@takazudo/zfb';
import { getCollection } from '@takazudo/zfb/content';
import PanelMount from '../components/panel-mount';
import '../styles/global.css';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

export default function ProsePage() {
  const entries = getCollection("prose");
  const entry = entries[0];

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Prose Demo — zfb + Tailwind v4 — Design Token Panel</title>
      </head>
      <body class="p-spacing-lg">
        <nav class="mb-vsp-lg">
          <a href={BASE_PATH} class="text-accent underline text-small">
            Back to showcase
          </a>
        </nav>

        <main class="max-w-[48rem] mx-auto">
          <h1 class="text-heading font-bold mb-vsp-xl text-primary leading-tight">
            Prose Demo
          </h1>
          <p class="text-small text-muted mb-vsp-xl">
            All typography and spacing tokens are from the{' '}
            <code>--zfbtailwindexample-*</code> namespace.
            Open the panel (<code>window.zfbTailwindExample.toggleDesignPanel()</code>){' '}
            to tweak them live.
          </p>

          {entry ? (
            <article class="zfbtailwindexample-prose">
              <entry.Content />
            </article>
          ) : (
            <p class="text-danger">
              No prose content found. Expected a file at{' '}
              <code>content/prose/index.md</code>.
            </p>
          )}
        </main>

        <Island when="visible" ssrFallback={null}>
          {(<PanelMount />) as unknown as IslandProps['children']}
        </Island>
      </body>
    </html>
  );
}
