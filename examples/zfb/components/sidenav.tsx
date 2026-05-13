/**
 * Sidenav — side navigation component for the zfb example.
 *
 * Token consumption (§137.1):
 *   .zfb-sidenav__list  → gap: var(--zfb-vsp-xs)
 *   .zfb-sidenav__link  → font-size: var(--zfb-text-body)
 *                                 padding-inline: var(--zfb-spacing-sm)
 *                                 padding-block: var(--zfb-spacing-xs)
 *                                 color: var(--zfb-color-muted) (resting)
 *   .zfb-sidenav__link.is-active → color: var(--zfb-color-accent)
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
    <nav class="zfb-sidenav">
      <ul class="zfb-sidenav__list">
        {NAV_LINKS.map((link) => {
          const isActive = activePath === link.path;
          return (
            <li key={link.path}>
              <a
                href={link.path}
                class={
                  isActive
                    ? 'zfb-sidenav__link is-active'
                    : 'zfb-sidenav__link'
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
