// Thin stub — doc-route-entries moved to the package (epic #2344, S6).
// Calls `createDocRouteEntries(ctx)` from @takazudo/zudo-doc/doc-route-entries
// with the host utilities injected, then re-exports the resulting builder
// function so all existing call sites continue to work unchanged.

import { createDocRouteEntries } from "@takazudo/zudo-doc/doc-route-entries";
import type {
  DocPageEntry,
  DocNavNode,
} from "@takazudo/zudo-doc/doc-route-entries";
export type { DocRouteEntry, BuildDocRouteEntriesArgs } from "@takazudo/zudo-doc/doc-route-entries";
import {
  buildNavTree,
  collectAutoIndexNodes,
  type NavNode,
  type CategoryMeta,
} from "@/utils/docs";
import { getNavSectionForSlug, getNavSubtree } from "@/utils/nav-scope";
import { toRouteSlug, toSlugParams } from "@/utils/slug";
import type { DocsEntry } from "@/types/docs-entry";
import { defaultLocale, type Locale } from "@/config/i18n";
import { docsUrl, withBase } from "@/utils/base";
import { extractHeadings } from "./_extract-headings";

export const { buildDocRouteEntries } = createDocRouteEntries({
  defaultLocale,
  docsUrl,
  withBase,
  // The factory describes its injected nav builders with the package's own
  // structural counterparts (DocPageEntry / DocNavNode / Map<string, unknown>)
  // and a plain `locale: string`. The host's buildNavTree is typed against the
  // concrete project types (DocsEntry / NavNode / the Locale union /
  // Map<string, CategoryMeta>). They are runtime-identical, so the stub adapts
  // them with thin wrappers that cast at the injection boundary where the host
  // owns the type knowledge.
  //
  // v2 passes `buildHref` as the 4th arg for category/tree href generation.
  // We forward it into the host's `options.buildHref` so nav URLs respect the
  // caller's URL space (e.g. versioned routes mint hrefs in their own space).
  buildNavTree: (
    docs: DocPageEntry[],
    locale: string,
    categoryMeta: Map<string, CategoryMeta> | undefined,
    buildHref: (slug: string, locale: string) => string,
  ) =>
    buildNavTree(
      docs as unknown as DocsEntry[],
      locale as Locale,
      categoryMeta as Map<string, CategoryMeta> | undefined,
      { buildHref: (slug, loc) => buildHref(slug, loc) },
    ) as DocNavNode[],
  collectAutoIndexNodes: (tree: DocNavNode[]) =>
    collectAutoIndexNodes(tree as NavNode[]) as DocNavNode[],
  getNavSectionForSlug,
  getNavSubtree,
  toRouteSlug,
  toSlugParams,
  extractHeadings,
});
