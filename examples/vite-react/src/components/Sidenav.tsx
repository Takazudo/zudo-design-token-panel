/**
 * Sidenav — side navigation component for the Vite + React example.
 *
 * Renders 7 navigation entries: Home, About, Forms, Status, Widgets, Data,
 * and Prose. Prose links to the separate prose.html MPA page (not a React
 * route). The remaining 6 items are React Router routes.
 *
 * Active highlighting uses useLocation() to compare the current pathname with
 * each route's path, and adds the .is-active modifier accordingly. We use
 * Link (not NavLink) to avoid type-compatibility issues between react-router-dom
 * v7 and @types/react 18.x.
 *
 * Token consumption (via components.css):
 *   .vr-sidenav       → bg: --vr-color-surface, padding: vsp-md / hsp-md
 *   .vr-sidenav-link  → font-size: --vr-text-body, padding: vsp-xs / hsp-sm
 *   .is-active        → color: --vr-color-accent, font-weight: 600
 */

import { Link, useLocation } from 'react-router-dom';

// Prose is a separate .html MPA page — not a React route.
// We construct its URL from BASE_URL so it works both in dev (/) and
// in the production deploy (/pj/zudo-design-token-panel/examples/vite-react/).
const PROSE_HREF = `${import.meta.env.BASE_URL}prose.html`;

const REACT_ROUTES = [
  { label: 'Home', to: '/', exact: true },
  { label: 'About', to: '/about', exact: false },
  { label: 'Forms', to: '/forms', exact: false },
  { label: 'Status', to: '/status', exact: false },
  { label: 'Widgets', to: '/widgets', exact: false },
  { label: 'Data', to: '/data', exact: false },
];

export function Sidenav() {
  const location = useLocation();

  return (
    <nav className="vr-sidenav" aria-label="Main navigation">
      {REACT_ROUTES.map(({ label, to, exact }) => {
        const isActive = exact
          ? location.pathname === to || location.pathname === to + '/'
          : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={isActive ? 'vr-sidenav-link is-active' : 'vr-sidenav-link'}
          >
            {label}
          </Link>
        );
      })}
      {/* Prose is a separate MPA page — plain anchor, not a React Router link */}
      <a className="vr-sidenav-link" href={PROSE_HREF}>
        Prose
      </a>
    </nav>
  );
}
