import { getScope, type Child } from '@takazudo/zfb/zudo-react';
import { isDocumentUsable } from '../utils/document-liveness';
import { mountOwnedRoot, type RootHandle } from './root';

/**
 * Render `render()` into its own root on `document.body` for the lifetime of
 * the calling component — zudo-react's stand-in for a portal. Call during
 * component setup; returns nothing to place in the caller's own tree.
 */
export function usePortal(render: () => Child, className = 'tokenpanel-zr-portal'): void {
  const scope = getScope();
  scope.onActivate(() => {
    if (typeof document === 'undefined' || !document.body) return;
    const host = document.createElement('div');
    host.className = className;
    host.style.display = 'contents';
    document.body.append(host);
    let root: RootHandle | null = mountOwnedRoot(host, function PortalRoot() { return render(); }, {});
    return () => {
      root?.unmount();
      root = null;
      host.remove();
    };
  });
}

/**
 * Render `render()` into the shared body-level mount `#mountId` (created on
 * demand) for the lifetime of the calling component. Each caller gets its own
 * child wrapper, so several panels can share one mount. When an Astro swap
 * replaces `<body>`, the mount is recreated and the root moved into it.
 *
 * The `mountId` MUST also appear in `find-elements.ts`
 * PANEL_EXCLUSION_SELECTOR so the panel's own portal surface is never treated
 * as a host element.
 */
export function useMountPortal(mountId: string, render: () => Child): void {
  getScope().onActivate(() => {
    let root: RootHandle | null = null;
    let host: HTMLDivElement | null = null;
    const attach = () => {
      if (host?.isConnected) return;
      if (!isDocumentUsable() || !document.body) return;
      root?.unmount();
      host?.remove();
      let mount = document.getElementById(mountId);
      if (!mount) {
        mount = document.createElement('div');
        mount.id = mountId;
        document.body.appendChild(mount);
      }
      host = document.createElement('div');
      host.style.display = 'contents';
      mount.append(host);
      root = mountOwnedRoot(host, function MountPortalRoot() { return render(); }, {});
    };
    attach();
    window.addEventListener('astro:after-swap', attach);
    return () => {
      window.removeEventListener('astro:after-swap', attach);
      root?.unmount();
      root = null;
      host?.remove();
      host = null;
    };
  });
}
