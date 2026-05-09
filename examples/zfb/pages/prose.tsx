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
 * Panel mount
 * -----------
 * Re-uses the same <Island> / <PanelMount> pattern as index.tsx so the panel
 * is available on this page too — token tweaks on the panel immediately reach
 * the prose subtree via the :root CSS-var overrides.
 */

import { defaultComponents, getCollection, type CollectionEntry } from '@takazudo/zfb/content';
import { Island, type IslandProps } from '@takazudo/zfb';
import PanelMount from '../components/panel-mount';
import '../styles/global.css';

type ProseFrontmatter = {
  title?: string;
};

export default function ProsePage() {
  const entries = getCollection<ProseFrontmatter>('prose');
  const post = entries[0] as CollectionEntry<ProseFrontmatter> | undefined;

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
          {post ? (
            <post.Content components={{ ...defaultComponents }} />
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
