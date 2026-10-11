"use client";

import { getScope } from "@takazudo/zfb/zudo-react";
import { runDesignTokenPanelBootstrapOnce } from "@takazudo/zudo-doc/design-token-panel-bootstrap";
import { buildDesignTokenPanelConfig } from "@takazudo/zudo-doc/design-token-panel-config";

// zudo-doc 6.0.0's initial-load shim is one-shot. Preserve clicks on the
// incoming header between the native DOM swap and bootstrap activation too.
// The public controller still owns lazy loading, cancellation and panel state.
let installed = false;
let navigating = false;
let pendingToggle = false;
let activeSignal: AbortSignal | undefined;
const toggleEvent = "toggle-design-token-panel";

function releaseClicks() {
  navigating = false;
  const replay = pendingToggle;
  pendingToggle = false;
  if (replay) window.dispatchEvent(new CustomEvent(toggleEvent));
}

function installNavigationQueue() {
  if (installed) return;
  installed = true;
  window.addEventListener(toggleEvent, (event) => {
    if (!navigating) return;
    // Capture before either an outgoing configured listener or an incoming
    // listener can apply the same intent. Two queued clicks cancel each other.
    event.stopImmediatePropagation();
    pendingToggle = !pendingToggle;
  }, { capture: true });
  document.addEventListener("zfb:before-swap", () => { navigating = true; });
  document.addEventListener("zfb:navigation-aborted", () => {
    // Rejected navigation before disposal can safely resume the outgoing host.
    // Once disposed, only activation of a live incoming scope may replay.
    if (activeSignal && !activeSignal.aborted) releaseClicks();
  });
}

export function DocPanelBootstrap() {
  const scope = getScope();
  scope.onActivate(() => {
    installNavigationQueue();
    activeSignal = scope.abortSignal;
    runDesignTokenPanelBootstrapOnce(buildDesignTokenPanelConfig, "default", scope.abortSignal);
    releaseClicks();
  });
  return null;
}
