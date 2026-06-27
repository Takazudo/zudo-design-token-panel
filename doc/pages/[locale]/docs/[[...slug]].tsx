/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Host route entrypoint: /[locale]/docs/[[...slug]] — non-default-locale catch-all.
//
// Host-owned override of the package-injected route
// (.zudo-doc/routes-src/locale-docs-slug.tsx); see pages/docs/[[...slug]].tsx for
// the override rationale. paths() enumerates one route per (non-default locale,
// slug) with the locale-first + base-EN-fallback merge, then renders through the
// host pages/lib toolkit so the project color scheme applies.

import type { JSX } from "preact";
import type { DocPageEntryProps, DocPageAutoIndexProps } from "@takazudo/zudo-doc/doc-page-props";
import { settings } from "@/config/settings";
import { getLocaleConfig, type Locale } from "@/config/i18n";
import { resolveNavSource } from "../../lib/_nav-source-docs";
import { buildDocRouteEntries } from "../../lib/_doc-route-entries";
import { renderDocPage } from "../../lib/_doc-page-renderer";

export const frontmatter = { title: "Docs" };

interface LocaleDocPageExtra {
  contentDir: string;
  isFallback: boolean;
}

type DocPageProps =
  | (DocPageEntryProps & LocaleDocPageExtra)
  | (DocPageAutoIndexProps & LocaleDocPageExtra);

export function paths(): Array<{
  params: { locale: string; slug: string[] };
  props: DocPageProps;
}> {
  const result: Array<{
    params: { locale: string; slug: string[] };
    props: DocPageProps;
  }> = [];

  for (const locale of Object.keys(settings.locales)) {
    const contentDir = getLocaleConfig(locale)?.dir ?? settings.docsDir;
    const source = resolveNavSource(locale as Locale, undefined, {
      applyDefaultLocaleOnlyFilter: true,
      keepUnlisted: true,
    });

    for (const item of buildDocRouteEntries({
      source,
      locale,
      routeSig: `locale-docs;${locale}`,
    })) {
      const extra: LocaleDocPageExtra = {
        contentDir: item.isFallback ? settings.docsDir : contentDir,
        isFallback: item.isFallback,
      };
      result.push({
        params: { locale, slug: item.slugParams },
        props: { ...(item.props as DocPageProps), ...extra },
      });
    }
  }

  return result;
}

type PageArgs = DocPageProps & { params: { locale: string; slug: string[] } };

export default function LocaleDocsPage(props: PageArgs): JSX.Element {
  return renderDocPage(props, {
    locale: props.params.locale,
    isFallback: props.isFallback,
    docHistoryContentDir: props.contentDir,
  });
}
