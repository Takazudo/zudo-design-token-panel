// Host thin-stub — repointed to the unified ChromeContext factory layer
// (pages/lib/_chrome.ts), where the wired component is built once per build.
// This file preserves the historical export name + Props type so existing
// importers resolve unchanged. See @takazudo/zudo-doc/sidebar-with-defaults.
export { SidebarWithDefaults } from "./_chrome";
export type { SidebarWithDefaultsProps } from "@takazudo/zudo-doc/sidebar-with-defaults";
