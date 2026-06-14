/**
 * usePortalMount — shared singleton portal-mount lifecycle for body-level portals.
 *
 * Both the highlight overlay and the element-path inspector render into a
 * singleton `<div id="…">` appended to `document.body` (so they sit above host
 * content and persist while the panel is closed). This hook owns that lifecycle
 * in one place:
 *
 *   1. Get-or-create the mount node by id (idempotent, SSR-safe).
 *   2. Re-create it on `astro:after-swap` when Astro replaces `document.body`.
 *   3. Force a re-render once the node exists so `createPortal` can attach.
 *
 * Returns the mount node, or `null` until it is available (SSR / before the
 * first effect run) — callers should early-return `null` in that case.
 *
 * The `mountId` MUST also appear in `find-elements.ts` PANEL_EXCLUSION_SELECTOR
 * so the panel's own portal surface is never treated as a host element.
 */

import { useState, useEffect, useRef } from 'preact/hooks';

export function usePortalMount(mountId: string): HTMLDivElement | null {
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const [, setMountVersion] = useState(0);

  useEffect(() => {
    function getOrCreateMountNode(): HTMLDivElement | null {
      if (typeof document === 'undefined') return null;
      const existing = document.getElementById(mountId) as HTMLDivElement | null;
      if (existing) return existing;
      const node = document.createElement('div');
      node.id = mountId;
      document.body.appendChild(node);
      return node;
    }

    if (!mountNodeRef.current || !mountNodeRef.current.isConnected) {
      mountNodeRef.current = getOrCreateMountNode();
      setMountVersion((v) => v + 1);
    }
    function handleAfterSwap() {
      if (!mountNodeRef.current || !mountNodeRef.current.isConnected) {
        mountNodeRef.current = getOrCreateMountNode();
        setMountVersion((v) => v + 1);
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('astro:after-swap', handleAfterSwap);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('astro:after-swap', handleAfterSwap);
      }
    };
  }, [mountId]);

  return mountNodeRef.current;
}
