# Docs migration reference config

Staged for the "Docs on zudo-doc 4.x" epic (issue #555, this sub-issue #556).
Records the settings that must be reproduced in the new `zfb.config.ts` once
`doc/` is reset onto the fresh zudo-doc 4.x scaffold, plus the dependency
pins the scaffold generator actually emitted.

## Current site settings (source: `doc/src/config/settings.ts`, zudo-doc 3.x API)

As requested by issue #556 — the essential values to carry forward:

- `siteName`: `Zudo Token Panel`
- `siteDescription`: `A Preact-based live design-token tweak panel and companion Node bin server for CSS custom properties.`
- `siteUrl`: `https://zudo-design-token-panel.takazudomodular.com`
- `base`: `/`
- `footer.copyright`: `Copyright © 2026 Takeshi Takatsudo. Built with zudo-doc.`
- `headerNav`: Getting Started / Reference / Recipes / Changelog — **NO Claude**
- `colorMode`: dark default; `lightScheme: "Default Light"`, `darkScheme: "Default Dark"`
- `locales`: `ja` → dir `src/content/docs-ja`

### Note on `headerNav`

The issue spec above intentionally lists 4 nav items with **no "Claude" entry**.
The *actual* current `doc/src/config/settings.ts` (copied verbatim below) has a
5th entry, `{ label: "Claude", path: "/docs/claude", categoryMatch: "claude" }`,
pointing at the `claudeResources`-generated `/docs/claude` section. Flagging
this discrepancy so a later wave doesn't silently drop or silently keep it —
follow the issue's explicit 4-item list unless told otherwise.

### Full current `settings` object (verbatim, for completeness)

```ts
export const settings = {
  colorScheme: "Default Dark",
  colorMode: {
    defaultMode: "dark",
    lightScheme: "Default Light",
    darkScheme: "Default Dark",
    respectPrefersColorScheme: true,
  } satisfies ColorModeConfig as ColorModeConfig | false,
  siteName: "Zudo Token Panel",
  siteDescription: "A Preact-based live design-token tweak panel and companion Node bin server for CSS custom properties." as string,
  base: "/",
  trailingSlash: false as boolean,
  noindex: false as boolean,
  editUrl: false as string | false,
  githubUrl: false as string | false,
  siteUrl: "https://zudo-design-token-panel.takazudomodular.com" as string,
  metaTags: {
    description: true,
    keywords: false,
    ogImage: false,
    ogSiteName: true,
    twitterCard: false,
  } satisfies MetaTagsConfig as MetaTagsConfig,
  docsDir: "src/content/docs",
  defaultLocale: "en" as const,
  locales: {
    ja: { label: "JA", dir: "src/content/docs-ja" },
  } satisfies Record<string, LocaleConfig>,
  mermaid: true,
  sitemap: false,
  docMetainfo: false,
  docTags: false,
  tagPlacement: "after-title" as TagPlacement,
  tagGovernance: "off" as TagGovernanceMode,
  tagVocabulary: false as boolean,
  frontmatterPreview: false as FrontmatterPreviewConfig | false,
  llmsTxt: true,
  math: false,
  cjkFriendly: true as boolean,
  onBrokenMarkdownLinks: "warn" as "warn" | "error" | "ignore",
  aiAssistant: false as boolean,
  aiChatDemoMode: false as boolean,
  aiChatAllowedOrigins: [] as string[],
  aiChatGlobalDailyLimit: false as number | false,
  docHistory: true,
  packageOwnedRoutes: true,
  bodyFootUtilArea: false as BodyFootUtilAreaConfig | false,
  designTokenPanel: true as boolean,
  tocMinDepth: 2 as number,
  tocMaxDepth: 4 as number,
  headingIdStrategy: "hierarchical" as "flat" | "hierarchical",
  sidebarResizer: true as boolean,
  sidebarToggle: true as boolean,
  imageEnlarge: false as boolean,
  dynamicPageTransition: false as boolean,
  htmlPreview: undefined as HtmlPreviewConfig | undefined,
  versions: [] satisfies VersionConfig[] as VersionConfig[] | false,
  claudeResources: {
    claudeDir: ".claude",
  } as { claudeDir: string; projectRoot?: string } | false,
  defaultLocaleOnlyPrefixes: [
    "/docs/claude-md/",
    "/docs/claude-skills/",
    "/docs/claude-agents/",
    "/docs/claude-commands/",
  ] as string[],
  footer: {
    links: [],
    copyright: "Copyright © 2026 Takeshi Takatsudo. Built with zudo-doc.",
  } satisfies FooterConfig as FooterConfig | false,
  headerNav: [
    { label: "Getting Started", path: "/docs/getting-started", categoryMatch: "getting-started" },
    { label: "Reference", path: "/docs/reference", categoryMatch: "reference" },
    { label: "Recipes", path: "/docs/recipes", categoryMatch: "recipes" },
    { label: "Changelog", path: "/docs/changelog", categoryMatch: "changelog" },
    { label: "Claude", path: "/docs/claude", categoryMatch: "claude" },
  ] satisfies HeaderNavItem[] as HeaderNavItem[],
  headerRightItems: [
    // design-token-panel trigger removed: panel is owner-only (opt-in via
    // window.zdtpDoc.enableAutoload() in the console). General visitors must
    // have no UI path that could accidentally arm the autoload flag.
    { type: "component", component: "version-switcher" },
    { type: "component", component: "github-link" },
    { type: "component", component: "theme-toggle" },
    { type: "component", component: "search" },
    { type: "component", component: "language-switcher" },
  ] satisfies HeaderRightItem[] as HeaderRightItem[],
};
```

## Scaffold generator run

```sh
npm create zudo-doc@latest -- --name doc --lang en --i18n --design-token-panel --changelog --no-install --no-git --yes
```

Resolved to `create-zudo-doc@4.1.0` (published `@latest` tag as of 2026-07-18;
newer than the `4.0.0` baseline named in the epic — re-check `@latest` again
before the reset wave runs if time has passed).

Generated into a throwaway temp dir outside the repo, then copied verbatim
into `_temp-resource/docs-migration/scaffold/`. Config now lives in
`zfb.config.ts` at the project root (zudo-doc 4.x moved settings out of
`src/config/settings.ts` into the zfb config pipeline) — see
`_temp-resource/docs-migration/scaffold/zfb.config.ts` for the generated
shape to merge the settings above into.

### Emitted dependency pins (`scaffold/package.json`)

```json
"dependencies": {
  "@takazudo/zfb": "0.1.0-next.89",
  "@takazudo/zfb-runtime": "0.1.0-next.89",
  "@takazudo/zfb-adapter-cloudflare": "0.1.0-next.89",
  "@takazudo/zfb-md-wasm": "0.1.0-next.89",
  "@takazudo/zudo-doc": "^4.1.0",
  "zod": "^4.3.6",
  "preact": "^10.29.1",
  "preact-render-to-string": "^6.6.6",
  "shiki": "^4.0.2",
  "@shikijs/transformers": "^4.0.0",
  "gray-matter": "^4.0.0",
  "mermaid": "^11.12.3",
  "remark-cjk-friendly": "^2.0.1",
  "remark-directive": "^3.0.0",
  "katex": "^0.16.38",
  "diff": "^8.0.3",
  "@takazudo/zdtp": "0.4.9",
  "minisearch": "^7.2.0"
},
"devDependencies": {
  "@tailwindcss/vite": "^4.2.0",
  "tailwindcss": "^4.2.0",
  "typescript": "^5.9.0",
  "@types/node": "^22.0.0",
  "@types/react": "^19.2.0",
  "pagefind": "^1.4.0"
}
```

Notable: `@takazudo/zdtp` pins `0.4.9` — matches this repo's current published
version at time of scaffold generation (see root `package.json` /
`packages/zdtp`), so no extra version-alignment work is implied here, but
re-verify at reset time since this repo may have released newer zdtp versions
by then.

## Directory contents of this staging dir

- `old-docs/docs/` — copy of `doc/src/content/docs/` (English content, current site)
- `old-docs/docs-ja/` — copy of `doc/src/content/docs-ja/` (Japanese content, current site)
- `old-docs/public/` — copy of `doc/public/` (static assets, current site)
- `scaffold/` — fresh `create-zudo-doc@4.1.0` output (`--name doc --lang en --i18n --design-token-panel --changelog --no-install --no-git --yes`)
- `reference-config.md` — this file

`doc/` itself was left untouched by this sub-issue; the next sub-task resets
it using `scaffold/` as the new baseline and `old-docs/` + this file as the
content/config migration reference.
