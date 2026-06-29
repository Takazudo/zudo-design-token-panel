// Host thin-stub — repointed to the unified ChromeContext factory layer
// (pages/lib/_chrome.ts), where the wired component is built once per build.
// The `loadTagsForLocale` host helper that used to live here was relocated into
// `_chrome.ts` and is now wired via `hostBindings.loadTagsForLocale`. This file
// preserves the historical export name so existing importers resolve unchanged.
// See @takazudo/zudo-doc/footer-with-defaults.
export { FooterWithDefaults } from "./_chrome";
