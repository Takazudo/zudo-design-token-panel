/**
 * ProseDemo — renders the canonical prose-demo MDX content inside a
 * `.vitereact-prose` container so all prose tokens from tokens.css apply.
 *
 * The MDX module is imported statically (not lazily) because prose.html is
 * a dedicated Vite entry — it ships its own chunk and there is nothing left
 * to defer.
 */

import { useEffect } from 'react';
import ProseDemoContent from '../content/prose-demo.mdx';
import { mountPanel } from '../lib/mount-panel';

export function ProseDemo() {
  useEffect(() => {
    mountPanel();
    // No cleanup: panel adapter installs window-level singletons that must
    // persist for the page lifetime (same rationale as App.tsx).
  }, []);

  return (
    <>
      <nav className="vitereact-prose-nav">
        <a href={`${import.meta.env.BASE_URL}index.html`}>← Back to component gallery</a>
      </nav>
      <p>
        <button
          type="button"
          className="vitereact-button"
          onClick={() => {
            (
              window as unknown as {
                viteReactExample?: { toggleDesignPanel?: () => void };
              }
            ).viteReactExample?.toggleDesignPanel?.();
          }}
        >
          Open Design Token Panel
        </button>
      </p>
      <main className="vitereact-prose">
        <ProseDemoContent />
      </main>
    </>
  );
}
