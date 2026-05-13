/**
 * Sidenav — side navigation component for the zfb example.
 *
 * Token consumption (§137.1):
 *   .zfbexample-sidenav__list  → gap: var(--zfbexample-vsp-xs)
 *   .zfbexample-sidenav__link  → font-size: var(--zfbexample-text-body)
 *                                 padding-inline: var(--zfbexample-spacing-sm)
 *                                 padding-block: var(--zfbexample-spacing-xs)
 *                                 color: var(--zfbexample-color-muted) (resting)
 *   .zfbexample-sidenav__link.is-active → color: var(--zfbexample-color-accent)
 */

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

const NAV_LINKS = [
  { label: 'Home', path: BASE_PATH },
  { label: 'Prose', path: `${BASE_PATH}prose/` },
  { label: 'Forms', path: `${BASE_PATH}components/forms/` },
  { label: 'Status', path: `${BASE_PATH}components/status/` },
  { label: 'Widgets', path: `${BASE_PATH}components/widgets/` },
  { label: 'Data', path: `${BASE_PATH}components/data/` },
];

interface SidenavProps {
  activePath?: string;
}

export function Sidenav({ activePath = BASE_PATH }: SidenavProps) {
  return (
    <nav class="zfbexample-sidenav">
      <ul class="zfbexample-sidenav__list">
        {NAV_LINKS.map((link) => {
          const isActive = activePath === link.path;
          return (
            <li key={link.path}>
              <a
                href={link.path}
                class={
                  isActive
                    ? 'zfbexample-sidenav__link is-active'
                    : 'zfbexample-sidenav__link'
                }
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
