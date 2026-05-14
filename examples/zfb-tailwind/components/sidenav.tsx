/**
 * Sidenav — side navigation component for the zfb-tailwind example.
 *
 * Token consumption:
 *   px-hsp-md py-vsp-md → padding container (--zfbtw-hsp-md / --zfbtw-vsp-md)
 *   bg-surface    → background (--zfbtw-color-surface)
 *   text-body     → link font size (--zfbtw-text-body)
 *   gap-vsp-xs    → gap between links (--zfbtw-vsp-xs)
 *   px-hsp-sm py-vsp-xs → per-link row padding
 *   text-accent   → active link color (--zfbtw-color-accent)
 *   rounded-md    → active link pill corner (--zfbtw-radius)
 */

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

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

export function Sidenav({ activePath = '/' }: SidenavProps) {
  return (
    <nav class="flex flex-col gap-vsp-xs px-hsp-md py-vsp-md bg-surface h-full">
      {NAV_LINKS.map((link) => {
        const isActive = activePath === link.path;
        return (
          <a
            key={link.path}
            href={link.path}
            class={
              isActive
                ? 'text-body px-hsp-sm py-vsp-xs rounded-md text-accent font-semibold'
                : 'text-body px-hsp-sm py-vsp-xs rounded-md text-fg hover:bg-bg'
            }
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
