/*
 * Sidenav — server component for the Next.js example AppShell.
 *
 * Links: Home / Prose / About / Forms / Status / Widgets / Data.
 * Active-link state is determined by the `activePath` prop passed from each
 * page's AppShell usage. We use next/link (NOT raw anchors) so Next handles
 * basePath/assetPrefix automatically and uses soft client-side navigation —
 * raw anchors would 404 in the exported site under the deployed subpath and
 * would force full-page reloads (dropping any unsaved panel token tweaks).
 *
 * Token consumption (via frozen vocabulary from tokens.css):
 *   .nx-sidenav            → container: width, bg, padding, flex column
 *   .nx-sidenav-link       → link: size, color, padding, radius
 *   .nx-sidenav-link.is-active → active state: accent color, semibold weight
 */

import Link from 'next/link';

interface SidenavProps {
  activePath?: string;
}

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Prose', path: '/prose' },
  { label: 'About', path: '/about' },
  { label: 'Forms', path: '/components/forms' },
  { label: 'Status', path: '/components/status' },
  { label: 'Widgets', path: '/components/widgets' },
  { label: 'Data', path: '/components/data' },
];

export default function Sidenav({ activePath = '/' }: SidenavProps) {
  return (
    <nav className="nx-sidenav">
      {NAV_LINKS.map((link) => {
        const isActive = activePath === link.path;
        return (
          <Link
            key={link.path}
            href={link.path}
            className={isActive ? 'nx-sidenav-link is-active' : 'nx-sidenav-link'}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
