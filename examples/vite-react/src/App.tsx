/**
 * Root component for the Vite + React example.
 *
 * Mounts the design-token panel adapter from a `useEffect` (the React-shaped
 * equivalent of the `<script>` block the Astro example ships in
 * `DesignTokenPanelHost.astro`). The effect runs once after the first paint,
 * is StrictMode-safe via the per-`storagePrefix` bind flag pinned on
 * `window.__zudoDesignTokenPanelAdapter`, and has no cleanup function — the
 * panel adapter installs window-level state that lives for the page
 * lifetime, so a per-mount cleanup would be wrong.
 *
 * Sub-task 2 ships only this skeleton + the panel mount. The demo content
 * (cards, buttons, palette swatches, rerender section) is filled in by
 * sub-task 3, which replaces the placeholder body below.
 */

import { useEffect } from 'react';
import { mountPanel } from './lib/mount-panel';

export function App() {
  useEffect(() => {
    mountPanel();
    // No cleanup: the panel adapter installs window-level console handlers
    // and (lazily) a singleton panel module. Both are intended to live for
    // the page lifetime, so a tear-down on unmount would defeat the whole
    // contract. StrictMode double-invocation is handled inside mountPanel
    // via the per-storagePrefix bind flag.
  }, []);

  return (
    <main>
      <h1>Vite + React Example — Design Token Panel</h1>
      <p>
        Open the panel from the browser console:{' '}
        <code>window.viteReactExample.toggleDesignPanel()</code>.
      </p>
    </main>
  );
}
