import { defineConfig } from "zfb/config";
import { zudoDoc } from "@takazudo/zudo-doc/config";

export default defineConfig(
  zudoDoc({
    siteName: "Zudo Token Panel",
    siteDescription:
      "A Preact-based live design-token tweak panel and companion Node bin server for CSS custom properties.",
    siteUrl: "https://zudo-design-token-panel.takazudomodular.com",
    locales: {
      ja: {
        label: "JA",
        dir: "src/content/docs-ja",
      },
    },
    // zudo-doc 4.x defaults cjkFriendly to false, but the retained Japanese
    // content relies on it: emphasis/bold adjacent to CJK text and full-width
    // parens (e.g. `**…（lone semantic tier）**`) renders literal `*` without it.
    cjkFriendly: true,
    designTokenPanel: true,
    imageEnlarge: true,
    dynamicPageTransition: true,
    footer: {
      links: [],
      copyright: "Copyright © 2026 Takeshi Takatsudo. Built with zudo-doc.",
    },
    headerNav: [
      {
        label: "Getting Started",
        path: "/docs/getting-started",
        categoryMatch: "getting-started",
      },
      {
        label: "Reference",
        path: "/docs/reference",
        categoryMatch: "reference",
      },
      {
        label: "Recipes",
        path: "/docs/recipes",
        categoryMatch: "recipes",
      },
      {
        label: "Changelog",
        path: "/docs/changelog",
        categoryMatch: "changelog",
      },
    ],
    adapter: "@takazudo/zfb-adapter-cloudflare",
    headerRightItems: [
      {
        type: "trigger",
        trigger: "design-token-panel",
      },
      {
        type: "component",
        component: "theme-toggle",
      },
      {
        type: "component",
        component: "search",
      },
      {
        type: "component",
        component: "language-switcher",
      },
    ],
  }),
);
