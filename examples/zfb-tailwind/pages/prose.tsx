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
 * Content-bridge fallback
 * -----------------------
 * Upstream zfb only embeds the content snapshot into the SSG bundle when
 * the project has at least one dynamic route whose `paths()` is deferred
 * to runtime (see `crates/zfb/src/commands/build.rs` — the
 * `content_snapshot_json` branch gated on `!still_deferred.is_empty()`).
 * This demo has only static `/` and `/prose`, so the embedded snapshot
 * ships as `{ "collections": {} }` and `getCollection("prose")` returns
 * `[]` during render — triggering the "No prose content found" fallback.
 *
 * The compiled MDX is still registered with the runtime bridge
 * (`globalThis.__zfb.content.get("mdx://prose/index")`) regardless of the
 * snapshot, so we ask the bridge directly when `getCollection` is empty.
 * Once zfb always emits the snapshot for declared collections, this
 * fallback becomes a no-op and can be deleted — `getCollection` will
 * return the entry and the bridge path is never reached.
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
import {
  getCollection,
  type ContentElement,
  type ContentProps,
} from '@takazudo/zfb/content';
import PanelMount from '../components/panel-mount';
import '../styles/global.css';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

// Shape of the runtime content bridge installed in the SSG bundle.
interface ContentBridge {
  get(specifier: string): ((props: ContentProps) => ContentElement) | undefined;
}

function resolveProseContent(): ((props: ContentProps) => ContentElement) | null {
  const fromSnapshot = getCollection('prose')[0];
  if (fromSnapshot) return fromSnapshot.Content;

  // Snapshot is empty (zfb embeds an empty snapshot when no dynamic routes
  // exist). Fall back to the always-populated runtime bridge.
  const bridge = (globalThis as unknown as { __zfb?: { content?: ContentBridge } }).__zfb?.content;
  const Content = bridge?.get('mdx://prose/index');
  return typeof Content === 'function' ? Content : null;
}

export default function ProsePage() {
  const ProseContent = resolveProseContent();

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

          {ProseContent ? (
            <article class="zfbtailwindexample-prose">
              <ProseContent />
            </article>
          ) : (
            <p class="text-danger">
              No prose content found. Expected a file at{' '}
              <code>content/prose/index.mdx</code>.
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
