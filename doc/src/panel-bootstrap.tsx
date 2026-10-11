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
const hostToggleEvent = "toggle-zdtp-doc-host";
let frame: number | undefined;
let task: ReturnType<typeof setTimeout> | undefined;

function buildDocPanelConfig(mode: Parameters<typeof buildDesignTokenPanelConfig>[0]) {
  return { ...buildDesignTokenPanelConfig(mode), toggleEvent: hostToggleEvent };
}

function cancelRelease() {
  if (frame !== undefined) cancelAnimationFrame(frame);
  if (task !== undefined) clearTimeout(task);
  frame = undefined;
  task = undefined;
}

function releaseAfterPaint(signal: AbortSignal) {
  cancelRelease();
  // The opaque panel renderer commits restored-open effects after paint.
  // Keep early clicks queued until that commit so closing also persists.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      frame = undefined;
      task = setTimeout(() => {
        task = undefined;
        if (activeSignal === signal && !signal.aborted) releaseClicks();
      }, 0);
    });
  });
}

function releaseClicks() {
  navigating = false;
  const replay = pendingToggle;
  pendingToggle = false;
  if (replay) window.dispatchEvent(new CustomEvent(hostToggleEvent));
}

function installNavigationQueue() {
  if (installed) return;
  installed = true;
  window.addEventListener(toggleEvent, (event) => {
    // The lazily imported package also binds a generic reserved-event listener.
    // Isolate this host from it, including when an aborted import finishes late.
    event.stopImmediatePropagation();
    if (navigating) pendingToggle = !pendingToggle;
    else window.dispatchEvent(new CustomEvent(hostToggleEvent));
  }, { capture: true });
  document.addEventListener("zfb:before-swap", () => {
    cancelRelease();
    navigating = true;
  });
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
    scope.abortSignal.addEventListener("abort", () => {
      if (activeSignal === scope.abortSignal) cancelRelease();
    }, { once: true });
    runDesignTokenPanelBootstrapOnce(buildDocPanelConfig, "default", scope.abortSignal);
    if (navigating) releaseAfterPaint(scope.abortSignal);
    else releaseClicks();
  });
  return null;
}
