import type { Metadata } from 'next';

import '../src/styles/reset.css';
import '../src/styles/tokens.css';
import '@takazudo/zudo-design-token-panel/styles';

import PanelBootstrap from './_components/PanelBootstrap';

/*
 * Root layout for the Next.js example.
 *
 * Stylesheets land first because layout.tsx is the canonical Next App Router
 * entry for global CSS — the order matters because `tokens.css` defines the
 * `--nextexample-*` custom properties the panel rewrites at runtime, and the
 * panel package's own chrome CSS (`/styles`) lands afterwards so its rules
 * cascade above the host's reset.
 *
 * <PanelBootstrap /> is the `'use client'` island that calls `mountPanel()`
 * from a `useEffect`. It returns `null` — the panel adapter appends its own
 * DOM root outside the React tree — and rendering it once here wires the
 * adapter for every route in the app (the per-`storagePrefix` bind flag
 * inside mountPanel short-circuits StrictMode's double-invoke and any
 * subsequent layout re-renders).
 */
export const metadata: Metadata = {
  title: 'Next.js Example — Design Token Panel',
  description:
    'Next.js 15 + React 19 example app for @takazudo/zudo-design-token-panel — host-config-driven panel mounted as a Preact island via a "use client" boundary.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PanelBootstrap />
      </body>
    </html>
  );
}
