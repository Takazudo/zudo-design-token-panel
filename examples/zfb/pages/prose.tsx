/**
 * Prose demo page — /prose
 *
 * Renders the single "prose" content-collection entry (content/prose/index.mdx)
 * inside a `.zfbexample-prose` container so that the --zfbexample-* prose tokens
 * (vsp-*, hsp-*, text-*, leading-*, code-*) and the :where() flow-space rules
 * in styles/global.css apply to all markdown-generated HTML.
 *
 * `getCollection` is synchronous per zfb ADR-004. The prose collection
 * contains one static entry so we grab index 0; a missing entry renders
 * nothing rather than crashing.
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
 * Panel mount
 * -----------
 * Re-uses the same <Island> / <PanelMount> pattern as index.tsx so the panel
 * is available on this page too — token tweaks on the panel immediately reach
 * the prose subtree via the :root CSS-var overrides.
 */

import {
  defaultComponents,
  getCollection,
  type CollectionEntry,
  type ContentElement,
  type ContentProps,
} from '@takazudo/zfb/content';
import { Island, type IslandProps } from '@takazudo/zfb';
import PanelMount from '../components/panel-mount';
import '../styles/global.css';

type ProseFrontmatter = {
  title?: string;
};

// Shape of the runtime content bridge installed in the SSG bundle.
interface ContentBridge {
  get(specifier: string): ((props: ContentProps) => ContentElement) | undefined;
}

function resolveProseContent(): ((props: ContentProps) => ContentElement) | null {
  const fromSnapshot = getCollection<ProseFrontmatter>('prose')[0] as
    | CollectionEntry<ProseFrontmatter>
    | undefined;
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
        <title>Prose Demo — zfb Example</title>
      </head>
      <body>
        <nav style="padding: 1rem 2rem; border-bottom: 1px solid var(--zfbexample-color-muted);">
          <a
            href="/pj/zudo-design-token-panel/examples/zfb/"
            class="zfbexample-link"
          >
            ← Back to home
          </a>
        </nav>

        <main class="zfbexample-prose">
          {ProseContent ? (
            <ProseContent components={{ ...defaultComponents }} />
          ) : (
            <p>No prose content found.</p>
          )}
        </main>

        <Island when="visible" ssrFallback={null}>
          {(<PanelMount />) as unknown as IslandProps['children']}
        </Island>
      </body>
    </html>
  );
}
