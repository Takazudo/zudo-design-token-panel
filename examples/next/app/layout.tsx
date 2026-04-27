import type { Metadata } from 'next';

import '../src/styles/reset.css';
import '../src/styles/tokens.css';
import '@takazudo/zudo-design-token-panel/styles';

// TODO (sub-task 2): wire <PanelBootstrap /> here as a 'use client' island so
// the design-token panel adapter binds on every route. Stylesheets land first
// because layout.tsx is the canonical Next App Router entry for global CSS.

export const metadata: Metadata = {
  title: 'Next.js Example — Design Token Panel',
  description:
    'Next.js 15 + React 19 example app for @takazudo/zudo-design-token-panel — host-config-driven panel mounted as a Preact island via a "use client" boundary.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
