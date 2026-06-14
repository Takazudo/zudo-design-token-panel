/**
 * ElementPathOrchestrator — integration layer for Element Path Copy.
 *
 * Responsibilities (mirrors HighlightOrchestrator):
 *   1. Lifts and persists the `enabled` flag.
 *   2. Provides ElementPathContext to all descendants (header toggle button).
 *   3. Mounts the InspectorOverlay in a portal at document.body so the box,
 *      label, and toast render above host content regardless of where the panel
 *      shell lives — and persist even while the panel is closed.
 *   4. Recreates the portal mount on `astro:after-swap` when Astro replaces body.
 *
 * panel.tsx wraps its tree in this component.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import {
  ElementPathContext,
  type ElementPathContextValue,
} from './element-path-context';
import { loadElementPathEnabled, saveElementPathEnabled } from './element-path-state';
import { InspectorOverlay } from './inspector-overlay';

// ---------------------------------------------------------------------------
// Portal mount
// ---------------------------------------------------------------------------

/** Must match the id added to PANEL_EXCLUSION_SELECTOR in find-elements.ts. */
const PORTAL_MOUNT_ID = 'tokenpanel-elpath-mount';

/**
 * Get or create the singleton portal mount <div> at document.body. Idempotent;
 * SSR-safe (returns null when document is unavailable).
 */
function getOrCreateMountNode(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(PORTAL_MOUNT_ID) as HTMLDivElement | null;
  if (existing) return existing;
  const node = document.createElement('div');
  node.id = PORTAL_MOUNT_ID;
  document.body.appendChild(node);
  return node;
}

interface OverlayPortalProps {
  enabled: boolean;
}

function OverlayPortal({ enabled }: OverlayPortalProps) {
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const [, setMountVersion] = useState(0);

  useEffect(() => {
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
  }, []);

  if (!mountNodeRef.current) return null;
  return createPortal(<InspectorOverlay enabled={enabled} />, mountNodeRef.current);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export function ElementPathOrchestrator({ children }: { children: ComponentChildren }) {
  const [enabled, setEnabledState] = useState<boolean>(loadElementPathEnabled);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    saveElementPathEnabled(next);
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      saveElementPathEnabled(next);
      return next;
    });
  }, []);

  const ctxValue = useMemo<ElementPathContextValue>(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle],
  );

  return (
    <>
      <ElementPathContext.Provider value={ctxValue}>{children}</ElementPathContext.Provider>
      <OverlayPortal enabled={enabled} />
    </>
  );
}
