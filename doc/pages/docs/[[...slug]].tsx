/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Host route entrypoint: /docs/[[...slug]] — default-locale (EN) catch-all.
//
// This is the host-owned override of the package-injected docs catch-all
// (.zudo-doc/routes-src/docs-slug.tsx). With `packageOwnedRoutes: true` the
// @takazudo/zudo-doc routes plugin injects this route bound to the package's
// grey-ramp DEFAULT_SCHEME chrome (_chrome.tsx); zfb drops that injected route
// wherever a host pages/ file claims the same URL shape ("user pages/ wins"),
// so rendering here flows through the host pages/lib toolkit and the project
// color scheme — exactly as pages/index.tsx overrides the injected `/` route.
// The zudo-doc 1.1.0 rescaffold scaffolded the pages/lib toolkit but omitted
// this entrypoint, leaving docs pages on the package stub scheme.

import type { JSX } from "preact";
import type { DocPageEntryProps, DocPageAutoIndexProps } from "@takazudo/zudo-doc/doc-page-props";
import { settings } from "@/config/settings";
import { defaultLocale } from "@/config/i18n";
import { resolveNavSource } from "../lib/_nav-source-docs";
import { buildDocRouteEntries } from "../lib/_doc-route-entries";
import { renderDocPage } from "../lib/_doc-page-renderer";

export const frontmatter = { title: "Docs" };

type DocPageProps = DocPageEntryProps | DocPageAutoIndexProps;

export function paths(): Array<{ params: { slug: string[] }; props: DocPageProps }> {
  const locale = defaultLocale;
  const source = resolveNavSource(locale, undefined);
  return buildDocRouteEntries({
    source,
    locale,
    routeSig: `docs;${locale}`,
  }).map((item) => ({
    params: { slug: item.slugParams },
    props: item.props as DocPageProps,
  }));
}

type PageArgs = DocPageProps & { params: { slug: string[] } };

export default function DocsPage(props: PageArgs): JSX.Element {
  return renderDocPage(props, {
    locale: defaultLocale,
    docHistoryContentDir: settings.docsDir,
  });
}
