import { defineConfig } from "zfb/config";
import { zudoDoc } from "@takazudo/zudo-doc/config";

export default defineConfig(
  zudoDoc({
    siteName: "Zudo Token Panel",
    siteDescription:
      "A Preact-based live design-token tweak panel and companion Node bin server for CSS custom properties.",
    siteUrl: "https://zudo-design-token-panel.takazudomodular.com",
    logo: "/img/logo.svg",
    githubUrl: "https://github.com/Takazudo/zudo-design-token-panel",
    favicon: {
      ico: "/favicon.ico",
      png32: "/favicon-32x32.png",
      png16: "/favicon-16x16.png",
    },
    locales: {
      ja: {
        label: "JA",
        dir: "src/content/docs-ja",
      },
    },
    metaTags: {
      description: true,
      keywords: "design token, developer tool, dev tool",
      ogImage: "/img/social-card.png",
      ogSiteName: true,
      twitterCard: "summary",
      twitterCreator: "@Takazudo",
    },
    llmsTxt: true,
    changelogs: [
      {
        sourceDir: "src/content/docs/changelog",
        outputFile: "../packages/zdtp/CHANGELOG.md",
        packageName: "@takazudo/zdtp",
      },
    ],
    cjkFriendly: true,
    designTokenPanel: true,
    sidebarResizer: true,
    sidebarToggle: true,
    tocToggle: true,
    imageEnlarge: true,
    dynamicPageTransition: true,
    docHistory: true,
    versions: [],
    claudeResources: {
      claudeDir: ".claude",
    },
    defaultLocaleOnlyPrefixes: [
      "/docs/claude-md/",
      "/docs/claude-skills/",
      "/docs/claude-agents/",
      "/docs/claude-commands/",
    ],
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
    headerRightItems: [
      {
        type: "component",
        component: "github-link",
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
      {
        type: "component",
        component: "version-switcher",
      },
      {
        type: "trigger",
        trigger: "design-token-panel",
      },
    ],
    adapter: "@takazudo/zfb-adapter-cloudflare",
  }),
);
