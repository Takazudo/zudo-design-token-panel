import { getScope, type Child } from '@takazudo/zfb/zudo-react';
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
