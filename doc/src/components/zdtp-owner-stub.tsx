"use client";

// Tiny always-present stub that ships to all visitors but loads the heavy
// design-token panel only for the opted-in site owner.
//
// Owner opt-in path (console only — no UI button for general visitors):
//   window.zdtpDoc.enableAutoload()   → sets localStorage flag, loads panel
//   window.zdtpDoc.disableAutoload()  → clears flags, unmounts panel
//   window.zdtpDoc.toggleDesignPanel()→ open/close the panel once mounted
//
// Owner autoload path (subsequent page loads):
//   localStorage['zdtp-doc-tweak:autoload'] === '1' triggers the dynamic
//   import on this island's mount, which calls configurePanel → reapplyFromStorage
//   → shouldAutoload check → mounts the panel CLOSED automatically.
//   Open it with window.zdtpDoc.toggleDesignPanel() or alt+click any element.
//
// General visitors receive none of the panel JS / CSS — only this stub island.

import type { JSX } from "preact";
import { useEffect } from "preact/hooks";

// The localStorage key used by the doc site's zdtp instance.
// storagePrefix is 'zdtp-doc-tweak' (see design-token-panel-config.ts).
const AUTOLOAD_KEY = "zdtp-doc-tweak:autoload";

declare global {
  interface Window {
    zdtpDoc?: {
      enableAutoload: () => Promise<void>;
      disableAutoload: () => Promise<void>;
      /** Open/close the panel UI (delegates to package-root toggleDesignPanel). */
      toggleDesignPanel: () => Promise<void>;
    };
  }
}

function ZdtpOwnerStub(): JSX.Element | null {
  useEffect(() => {
    // Install the console API namespace for all visitors. Dynamic imports are
    // used so the heavy modules are never fetched until actually needed.
    window.zdtpDoc = {
      /**
       * Opt this browser in as the site owner.
       * Loads the design-token panel bootstrap, then delegates to the package-root
       * enableAutoload() which sets the flag, arms the element-path inspector, and
       * mounts the panel CLOSED (no page reload required).
       * Open it with window.zdtpDoc.toggleDesignPanel() or alt+click any element.
       */
      enableAutoload: async () => {
        // Load the bootstrap chain — calls configurePanel(designTokenPanelConfig)
        // which registers the doc's config with the zdtp package.
        await import("@/lib/design-token-panel-bootstrap");
        // Delegate to the package-root: sets flag (quota-tolerant), arms
        // element-path inspector, and mounts CLOSED.
        const { enableAutoload } = await import("@takazudo/zdtp");
        enableAutoload();
      },

      /**
       * Opt this browser out of owner mode.
       * Ensures the panel is configured first (safe to call even when the panel
       * is already loaded), then delegates to the package-root disableAutoload()
       * which clears all flags and unmounts the Preact shell.
       */
      disableAutoload: async () => {
        // Ensure the panel is configured before teardown so getPanelConfig()
        // inside disableAutoload() returns the doc's config, not the default.
        await import("@/lib/design-token-panel-bootstrap");
        const { disableAutoload } = await import("@takazudo/zdtp");
        disableAutoload();
      },

      /**
       * Toggle the design-token panel open/closed.
       * Delegates to the package-root toggleDesignPanel(); bootstraps the panel
       * first if it hasn't been loaded yet (safe to call before enableAutoload).
       */
      toggleDesignPanel: async () => {
        await import("@/lib/design-token-panel-bootstrap");
        const { toggleDesignPanel } = await import("@takazudo/zdtp");
        toggleDesignPanel();
      },
    };

    // Owner autoload gate: read localStorage directly — no package import —
    // so general visitors incur zero extra network requests.
    try {
      if (localStorage.getItem(AUTOLOAD_KEY) === "1") {
        // Dynamically import the bootstrap chain. bootstrapDesignTokenPanel
        // calls configurePanel → reapplyFromStorage → shouldAutoload check
        // which mounts the panel CLOSED automatically.
        // .catch prevents an unhandled rejection if the chunk fails to load
        // (e.g. 404 after redeploy while owner has an old page open).
        import("@/lib/design-token-panel-bootstrap").catch(() => {});
      }
    } catch {
      // localStorage unavailable — stay silent.
    }
  }, []);

  return null;
}
ZdtpOwnerStub.displayName = "ZdtpOwnerStub";

export default ZdtpOwnerStub;
