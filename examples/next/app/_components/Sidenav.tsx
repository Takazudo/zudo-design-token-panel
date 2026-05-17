/*
 * Sidenav — server component for the Next.js example AppShell.
 *
 * Links: Home / Prose / About / Forms / Status / Widgets / Data.
 * Active-link state is determined by the `activePath` prop passed from each
 * page's AppShell usage. `href` values are unprefixed — Next.js auto-prepends
 * the configured `basePath` so links work under the deployed subpath without
 * hardcoding it here.
 *
 * Token consumption (via frozen vocabulary from tokens.css):
 *   .nx-sidenav            → container: width, bg, padding, flex column
 *   .nx-sidenav-link       → link: size, color, padding, radius
 *   .nx-sidenav-link.is-active → active state: accent color, semibold weight
 */

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
          <a
            key={link.path}
            href={link.path}
            className={isActive ? 'nx-sidenav-link is-active' : 'nx-sidenav-link'}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
