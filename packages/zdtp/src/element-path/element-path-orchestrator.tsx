/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * Element Path Copy orchestrator.
 *
 * Responsibilities (mirrors the highlight controller):
 *   1. Lifts and persists the `enabled` flag.
 *   2. Returns the controller the header toggle button reads.
 *   3. Mounts the InspectorOverlay in a portal at document.body so the box,
 *      label, and toast render above host content regardless of where the panel
 *      shell lives — and persist even while the panel is closed.
 *   4. Recreates the portal mount on `astro:after-swap` when Astro replaces body.
 */

import { signal, type Child } from '@takazudo/zfb/zudo-react';
import type { ElementPathController } from './element-path-context';
import { loadElementPathEnabled, saveElementPathEnabled } from './element-path-state';
import { InspectorOverlay } from './inspector-overlay';
import { useMountPortal } from '../zr/portal';
import { ELPATH_PORTAL_MOUNT_ID } from '../highlight/find-elements';

/** Run Element Path Copy for the calling component's lifetime. */
export function useElementPath(): ElementPathController {
  const enabled = signal<boolean>(loadElementPathEnabled());

  const setEnabled = (next: boolean) => {
    enabled.value = next;
    saveElementPathEnabled(next);
  };
  const toggle = () => setEnabled(!enabled.value);

  useMountPortal(ELPATH_PORTAL_MOUNT_ID, () => (
    <InspectorOverlay enabled={enabled} onArmingRevoked={() => setEnabled(false)} />
  ));

  return { enabled, setEnabled, toggle };
}

/** Component form of `useElementPath`, for isolated use. */
export function ElementPathOrchestrator(props: {
  children?: (controller: ElementPathController) => Child;
}) {
  const controller = useElementPath();
  return props.children ? props.children(controller) : null;
}
