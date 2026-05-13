'use client';

/*
 * Visible entry-point button for the design-token panel.
 *
 * Rendered at the top of every demo page. The home page (`app/page.tsx`)
 * is itself `"use client"`, but `app/about/page.tsx` and `app/prose/page.mdx`
 * are server-rendered — they can only embed an `onClick` listener through a
 * client component, hence this small wrapper.
 *
 * The click handler calls the host's namespaced console API
 * (`window.nextExample.toggleDesignPanel()`). The namespace function is
 * installed inside `PanelBootstrap`'s `useEffect`, which runs on first
 * client mount of the root layout. By the time the user can click this
 * button, the function exists; if not (rare race), the optional-chain
 * silently no-ops and the user can click again.
 */

type NextExampleConsoleApi = {
  nextExample?: { toggleDesignPanel?: () => void };
};

export default function PanelOpenButton() {
  return (
    <button
      type="button"
      className="nextexample-button"
      onClick={() => {
        (window as unknown as NextExampleConsoleApi).nextExample?.toggleDesignPanel?.();
      }}
    >
      Open Design Token Panel
    </button>
  );
}
