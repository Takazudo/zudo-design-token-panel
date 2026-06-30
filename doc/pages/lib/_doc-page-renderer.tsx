// Host thin-stub — repointed to the unified ChromeContext factory layer
// (pages/lib/_chrome.ts), where `renderDocPage` is built once per build. The v2
// renderer rebuilds DocPageShell / DocContentHeader / DocMetainfoArea /
// DocHistoryArea and the locale-aware MDX components internally from the same
// context, so the former host sub-stubs are gone. This file preserves the
// historical export name + options type so the docs catch-all pages resolve
// unchanged. See @takazudo/zudo-doc/doc-page-renderer.
export { renderDocPage } from "./_chrome";
export type { RenderDocPageOptions } from "@takazudo/zudo-doc/doc-page-renderer";
