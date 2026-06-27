/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Host route entrypoint: /404 — static route, emitted as dist/404.html.
//
// Host-owned override of the package-injected 404 route
// (.zudo-doc/routes-src/404.tsx); see pages/docs/[[...slug]].tsx for the override
// rationale. Mirrors the package stub's markup but wires the host chrome
// (HeadWithDefaults / BodyEndIslands from pages/lib) so the page renders with the
// project color scheme and the real body-end islands, exactly like pages/index.tsx.

import type { JSX } from "preact";
import { DocLayoutWithDefaults } from "@takazudo/zudo-doc/doclayout";
import { settings } from "@/config/settings";
import { defaultLocale } from "@/config/i18n";
import { withBase } from "@/utils/base";
import { HeadWithDefaults } from "./lib/_head-with-defaults";
import { HeaderWithDefaults } from "./lib/_header-with-defaults";
import { FooterWithDefaults } from "./lib/_footer-with-defaults";
import { BodyEndIslands } from "./lib/_body-end-islands";
import { composeMetaTitle } from "./lib/_compose-meta-title";

export const frontmatter = { title: "404" };

export default function NotFoundPage(): JSX.Element {
  const locale = defaultLocale;
  const title = "Page Not Found";

  return (
    <DocLayoutWithDefaults
      title={composeMetaTitle(title)}
      head={<HeadWithDefaults title={title} />}
      lang={locale}
      noindex={true}
      hideSidebar={true}
      hideToc={true}
      sidebarOverride={<></>}
      headerOverride={<HeaderWithDefaults lang={locale} />}
      footerOverride={<FooterWithDefaults lang={locale} />}
      bodyEndComponents={<BodyEndIslands basePath={settings.base ?? "/"} />}
      enableClientRouter={settings.dynamicPageTransition}
    >
      <div class="min-h-[60vh] flex flex-col items-center justify-center px-hsp-2xl py-vsp-xl">
        <h1 class="text-display font-bold mb-vsp-md">404</h1>
        <p class="text-title text-muted mb-vsp-xl">Page not found.</p>
        <a
          href={withBase("/")}
          class="bg-accent px-hsp-lg py-vsp-xs font-medium text-bg hover:bg-accent-hover"
        >
          Back to Home
        </a>
      </div>
    </DocLayoutWithDefaults>
  );
}
