// Host thin-stub — repointed to the unified ChromeContext factory layer
// (pages/lib/_chrome.ts), where the wired component is built once per build.
// This file preserves the historical export name + Props type so existing
// importers resolve unchanged. See @takazudo/zudo-doc/header-with-defaults.
export { HeaderWithDefaults } from "./_chrome";
export type { HeaderWithDefaultsProps } from "@takazudo/zudo-doc/header-with-defaults";
