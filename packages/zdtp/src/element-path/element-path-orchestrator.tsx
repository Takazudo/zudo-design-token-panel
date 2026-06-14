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

import { useState, useCallback, useMemo } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import {
  ElementPathContext,
  type ElementPathContextValue,
} from './element-path-context';
import { loadElementPathEnabled, saveElementPathEnabled } from './element-path-state';
import { InspectorOverlay } from './inspector-overlay';
import { usePortalMount } from '../utils/use-portal-mount';

// ---------------------------------------------------------------------------
// Portal mount
// ---------------------------------------------------------------------------

/** Must match the id added to PANEL_EXCLUSION_SELECTOR in find-elements.ts. */
const PORTAL_MOUNT_ID = 'tokenpanel-elpath-mount';

interface OverlayPortalProps {
  enabled: boolean;
}

function OverlayPortal({ enabled }: OverlayPortalProps) {
  const mountNode = usePortalMount(PORTAL_MOUNT_ID);
  if (!mountNode) return null;
  return createPortal(<InspectorOverlay enabled={enabled} />, mountNode);
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
