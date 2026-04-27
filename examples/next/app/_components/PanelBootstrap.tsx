'use client';

/*
 * Client-only bootstrap for the design-token panel adapter.
 *
 * This is the React-19 client-component analog of the Vite + React example's
 * `useEffect`-from-`App.tsx` pattern. Next.js App Router renders the tree as
 * RSC by default, and side-effecting browser code (panel adapter, console
 * API installation, lazy panel-module dynamic import) is only allowed under
 * a `'use client'` boundary — hence this file.
 *
 * Rendering this component once in `app/layout.tsx` wires the panel for
 * every route in the app: the layout component renders on each navigation
 * and `<PanelBootstrap />` is a sibling of `{children}`, so the effect
 * mounts on the first SSR-hydration handoff and the per-`storagePrefix`
 * bind flag inside `mountPanel()` short-circuits subsequent calls. The
 * RSC ↔ client-component boundary stays clean because PanelBootstrap
 * returns `null` — it owns no DOM of its own; the panel adapter appends
 * the panel root element directly to `document.body` via the panel
 * module, fully outside the React render tree.
 *
 * StrictMode safety: `next.config.ts` enables `reactStrictMode: true`
 * (the App Router default) so this `useEffect` runs twice in dev. The
 * `mountPanel()` body is StrictMode-safe via the per-`storagePrefix`
 * `bound` flag pinned on `window.__zudoDesignTokenPanelAdapter`. We also
 * deliberately ship NO cleanup function: the panel adapter installs
 * window-level state that lives for the page lifetime, so a per-mount
 * cleanup would be wrong.
 */

import { useEffect } from 'react';
import { mountPanel } from '../../src/lib/mount-panel';

export default function PanelBootstrap() {
  useEffect(() => {
    mountPanel();
  }, []);
  return null;
}
