// Host thin-stub — repointed to the unified ChromeContext factory layer
// (pages/lib/_chrome.ts), where the wired component is built once per build.
// This file preserves the historical export name + Props type so existing
// importers (pages/index.tsx, pages/[locale]/index.tsx, pages/404.tsx) resolve
// unchanged. See @takazudo/zudo-doc/head-with-defaults.
export { HeadWithDefaults } from "./_chrome";
export type { HeadWithDefaultsProps } from "@takazudo/zudo-doc/head-with-defaults";
