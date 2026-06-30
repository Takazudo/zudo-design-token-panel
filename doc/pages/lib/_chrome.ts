/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Unified page-chrome context (zudo-doc v2 — epic Collapse Wiring Shells #2420,
// FACTORIES #2424). v2 changed every page-chrome factory from `createX(deps-bag)`
// to `createX(ctx: ChromeContext<S>)`, guarded at SSG by `assertChromeContext`.
// This module reconstructs the unified context ONCE per build and threads it
// through every top-level factory, replacing the per-factory v1 host stubs.
//
// DESIGN FORK — host nav wrappers preserved (do NOT use `createChrome`).
// `createChrome(routeContext, hostBindings)` hardcodes `components = {}`, so the
// v2 MDX/nav renderer would rebuild the PACKAGE-default nav wrappers (which read
// the package's reconstructed `buildNavTree`) instead of the host's project-bound
// wrappers (`pages/lib/_category-nav` etc., which read the host content
// collections via `resolveNavSource`). To keep MDX/nav rendering byte-identical
// to the v1 baseline (doc/_parity-baseline/mdx-nav.txt) we HAND-BUILD the
// ChromeContext with a populated `components` allowlist (the host nav wrappers,
// re-exported from `pages/_mdx-components.ts`) and feed it to each factory
// directly. `deriveMdxComponents` reads CategoryNav/CategoryTreeNav/SiteTreeNav
// from `ctx.components` (preferred over the package rebuild) and the content
// overrides (Details/HtmlPreview/Island/PresetGenerator + showcase stubs) from
// `ctx.hostBindings.mdxExtras`.
//
// SINGLETON CAUTION: `routeContext` is built once per build; it must carry only
// stable GLOBAL config/docs data (settings, translations, color schemes, the
// identity-stable `stableDocs` content bridge). Per-route/per-locale variance is
// supplied at render time via the factory props (`lang`, `currentPath`, the
// render options), so locale/version rendering still varies correctly.
//
// IMPORTANT (island scanner): importing `mdxNavComponents` / `mdxExtras` from
// `../_mdx-components`, `BodyEndIslands` from `./_body-end-islands`, and
// `DocHistory` from the package keeps the static page → renderer → _chrome →
// real-component import chain intact, so zfb's island scanner still registers
// PresetGenerator / the body-end islands / DocHistory under their SSR markers.

import { createRouteContext } from "@takazudo/zudo-doc/route-context";
import { createHeadWithDefaults } from "@takazudo/zudo-doc/head-with-defaults";
import { createHeaderWithDefaults } from "@takazudo/zudo-doc/header-with-defaults";
import { createFooterWithDefaults } from "@takazudo/zudo-doc/footer-with-defaults";
import { createSidebarWithDefaults } from "@takazudo/zudo-doc/sidebar-with-defaults";
import { createRenderDocPage } from "@takazudo/zudo-doc/doc-page-renderer";
import { DocHistory } from "@takazudo/zudo-doc/doc-history";
import type {
  ChromeContext,
  ChromeHostBindings,
  RouteContextPayload,
} from "@takazudo/zudo-doc/factory-context";

import { settings } from "@/config/settings";
import { defaultLocale, translations } from "@/config/i18n";
import { tagVocabulary } from "@/config/tag-vocabulary";
import { colorSchemes } from "@/config/color-schemes";
import sidebars from "@/config/sidebars";
import { frontmatterRenderers } from "@/config/frontmatter-preview-renderers";
import { collectTags } from "@/utils/tags";
import { toRouteSlug } from "@/utils/slug";
import type { DocsEntry } from "@/types/docs-entry";

import { stableDocs, memoizeDerived } from "./_nav-source-cache";
import { mergeLocaleDocs } from "./locale-merge";
import { SearchWidget } from "./_search-widget";
import { BodyEndIslands } from "./_body-end-islands";
import { buildFrontmatterPreviewEntries } from "./_frontmatter-preview-data";
import { mdxNavComponents, mdxExtras } from "../_mdx-components";

// SSR author + date metadata comes from `.zfb/doc-history-meta.json` (a
// build-time manifest emitted by `scripts/zfb-prebuild.mjs`). The
// `#doc-history-meta` alias is defined in tsconfig.json and resolves to the
// absolute manifest path — needed because the zfb bundler builds pages from a
// shadow tree where relative paths would resolve to the wrong location.
import docHistoryMeta from "#doc-history-meta";

// ---------------------------------------------------------------------------
// Footer tag-list loader (relocated from the v1 `_footer-with-defaults.tsx`).
// Reads collections via stableDocs / memoizeDerived; passed as the
// `loadTagsForLocale` host binding.
// ---------------------------------------------------------------------------

function loadTagsForLocale(lang: string) {
  if (lang === defaultLocale) {
    const baseDocs = stableDocs("docs");
    return memoizeDerived([baseDocs], "footerTaglist;default", () => {
      const docs: DocsEntry[] = baseDocs.filter(
        (d) => !d.data.draft && !d.data.unlisted && !d.data.category_no_page,
      );
      const tagMap = collectTags(docs, (id, data) => data.slug ?? toRouteSlug(id));
      return [...tagMap.values()].sort((a, b) => a.tag.localeCompare(b.tag, lang));
    });
  }
  const baseDocs = stableDocs("docs");
  const localeDocs = stableDocs(`docs-${lang}`);
  return memoizeDerived([baseDocs, localeDocs], `footerTaglist;${lang}`, () => {
    const result = mergeLocaleDocs({
      baseDocs: baseDocs.filter((d) => !d.data.draft),
      localeDocs: localeDocs.filter((d) => !d.data.draft),
      applyDefaultLocaleOnlyFilter: true,
    });
    const docs: DocsEntry[] = result.docs.filter((d) => !d.data.category_no_page);
    const tagMap = collectTags(docs, (id, data) => data.slug ?? toRouteSlug(id));
    return [...tagMap.values()].sort((a, b) => a.tag.localeCompare(b.tag, lang));
  });
}

// ---------------------------------------------------------------------------
// Unified context — built ONCE per build.
// ---------------------------------------------------------------------------

const payload: RouteContextPayload<typeof settings> = {
  settings,
  translations,
  // Host vocabulary/palette types are structurally interchangeable with the
  // package types but nominally distinct; cast at the payload boundary (the host
  // owns the type knowledge), mirroring the #429 nav-builder stubs.
  tagVocabulary: tagVocabulary as RouteContextPayload<typeof settings>["tagVocabulary"],
  colorSchemes: colorSchemes as RouteContextPayload<typeof settings>["colorSchemes"],
};

export const routeContext = createRouteContext<typeof settings>(payload, {
  stableDocs,
});

const hostBindings: ChromeHostBindings = {
  SearchWidget: SearchWidget as ChromeHostBindings["SearchWidget"],
  // Host body-end islands (client-router + design-token-panel owner stub +
  // ai-chat + image/mermaid enlarge). MUST be passed so v2 does NOT fall back to
  // the package-island subset (which omits the host-only boots).
  BodyEndIslands: BodyEndIslands as ChromeHostBindings["BodyEndIslands"],
  DocHistory: DocHistory as ChromeHostBindings["DocHistory"],
  docHistoryMeta: docHistoryMeta as Record<string, unknown>,
  frontmatterRenderers: frontmatterRenderers as ChromeHostBindings["frontmatterRenderers"],
  buildFrontmatterPreviewEntries:
    buildFrontmatterPreviewEntries as ChromeHostBindings["buildFrontmatterPreviewEntries"],
  tagVocabulary,
  loadTagsForLocale: loadTagsForLocale as ChromeHostBindings["loadTagsForLocale"],
  // Host sidebar section config (doc/src/config/sidebars.ts). v1 plumbed this in
  // via @/utils/sidebar → buildSidebarForSection; v2 reads it off this binding.
  // Empty today (filesystem auto-gen), but wiring it preserves the capability so
  // future sidebars.ts entries are honored instead of silently ignored.
  sidebarsConfig: sidebars as ChromeHostBindings["sidebarsConfig"],
  mdxExtras,
};

const ctx: ChromeContext<typeof settings> = {
  ...routeContext,
  components: mdxNavComponents,
  hostBindings,
};

// ---------------------------------------------------------------------------
// Wired page-chrome surface — fed the SAME unified context.
// ---------------------------------------------------------------------------

export const HeadWithDefaults = createHeadWithDefaults(ctx);
export const HeaderWithDefaults = createHeaderWithDefaults(ctx);
export const FooterWithDefaults = createFooterWithDefaults(ctx);
export const SidebarWithDefaults = createSidebarWithDefaults(ctx);
export const renderDocPage = createRenderDocPage(ctx);

export { composeMetaTitle } from "./_compose-meta-title";
