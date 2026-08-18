# Doc

Documentation site for **zdtp** (`@takazudo/zdtp`, the zudo design token panel), built with [zudo-doc](https://github.com/zudolab/zudo-doc) — a zfb-based documentation framework with MDX, Tailwind CSS v4, and Preact islands. This project is intentionally minimal: one config file (`zfb.config.ts`) plus markdown content — layout, chrome, and islands all ship from `@takazudo/zudo-doc` in `node_modules`.

## Tech Stack

- **zfb** — documentation build framework
- **MDX** — content format, authored under `src/content/`
- **Tailwind CSS v4** — via `@tailwindcss/vite`
- **Preact** — for interactive islands only (with compat mode for React API)
- **Shiki** — package-owned code highlighting with the configured light/dark theme pair
- **@takazudo/zudo-doc** — the package that owns everything: layout, chrome, islands, default `@theme` design tokens, and (via `packageOwnedRoutes`, on by default) the doc routes themselves

## Commands

- `pnpm dev` — zfb dev server (port 4321)
- `pnpm build` — static HTML export to `dist/`
- `pnpm check` / `pnpm typecheck` — TypeScript type checking
- `pnpm preview` — serve the built `dist/`
- `pnpm check:html` — validate the built HTML (`html-validate`)
- `pnpm check:links` — check for broken links in the built `dist/` (`linkinator`). linkinator serves
  local paths over an internal `http://localhost:<port>` server even when crawling disk files, so a
  naive `--skip '^https?://'` (meant to skip only real external URLs) also matches that internal
  server URL and silently skips everything, including the entry point — the check then reports
  `Successfully scanned 0 links` and exits 0 without validating anything. The `(?!localhost)`
  negative lookahead in the script excludes the local crawl server from the skip so external URLs
  are still skipped but the site itself actually gets scanned.

## Key Directories

```
zfb.config.ts             # THE one config file — zudoDoc({ ...only fields you chose })
pages/
├── index.tsx             # 1-line re-export of the package home route
└── docs/[[...slug]].tsx  # self-contained doc-route stub (required for `pnpm dev`)
  [locale]/docs/[[...slug]].tsx  # same, for the ja locale
src/
├── chrome-bindings.tsx   # optional typed primary chrome / named header / MDX bindings (not present by default)
├── content/
│   ├── docs/             # MDX content (English, default locale)
│   └── docs-ja/          # Japanese MDX content (mirrors docs/)
└── styles/
    └── global.css        # @import chain + a token-override slot — that's it
```

Everything else — layout, header, sidebar, footer, doc chrome, islands, and the default design tokens — lives in `node_modules/@takazudo/zudo-doc`. There is **no host `pages/lib` route pipeline** to maintain here: all routing, layout, and chrome is preset-owned. The two `pages/**/[[...slug]].tsx` stubs exist only so `pnpm dev` doesn't 404 (a zfb dev-mode limitation on package-injected dynamic routes) — don't delete them, and don't add routing logic to them. For supported markup replacement, create `src/chrome-bindings.tsx` with `defineChromeBindings` and use the primary `Header` / `Footer` / `Sidebar` / `Toc` / `Breadcrumb` / `DocPager` slots or the named `headerRightComponents` registry — don't fork a route stub for presentational customization. Configuration is a single `zudoDoc({...})` call in `zfb.config.ts` — there is no `src/config/settings.ts`. Settings not set explicitly there use the package's documented defaults — hover `zudoDoc`'s `ZudoDocConfig` argument in your editor to see every field and its `@default`.

## Content Conventions

### Frontmatter

- Required: `title` (string)
- Optional: `description`, `sidebar_position` (number), `category`
- Sidebar order is driven by `sidebar_position`

### Admonitions

Available in all MDX files with **no import**, in two equivalent forms:

- Directive syntax: `:::note`, `:::tip`, `:::info`, `:::warning`, `:::danger`, `:::caution`, `:::details` — each accepts an optional `{title="..."}` attribute.
- JSX component syntax: `<Note>`, `<Tip>`, `<Info>`, `<Warning>`, `<Danger>`, `<Caution>`, `<Details>` — each accepts an optional `title` prop.

Both forms are globally available; use whichever reads better in the surrounding MDX.

### Headings

Do NOT use h1 (`#`) in doc content — the page title from frontmatter is rendered as h1. Start content headings from h2 (`##`).

### Built-in MDX components

`@takazudo/zudo-doc` ships a few **globally-available MDX components** — usable in any `.mdx` file with **no import**. The seeded `getting-started/index.mdx` already uses one:

- `<CategoryNav category="..." />` — a card-grid list of the pages in a docs category (this is the one seeded into `getting-started/index.mdx`).
- `<CategoryTreeNav category="..." />` — the same listing as a compact nested tree, better for deeper hierarchies.
- `<SiteTreeNavDemo />` — a full-site documentation tree (the MDX-available wrapper of the `SiteTreeNav` island).

Admonitions (above), tabbed content (`<Tabs>` / `<TabItem>`, `<CodeGroup>`), and block math (`<MathBlock>`) work the same way — no import. Full component reference: https://zudo-doc.takazudomodular.com/docs/components/

## i18n

- English (default): `/docs/...` — content in `src/content/docs/`
- Japanese: `/ja/docs/...` — content in `src/content/docs-ja/`
- Japanese docs should mirror the English directory structure
- Both `pages/docs/[[...slug]].tsx` and `pages/[locale]/docs/[[...slug]].tsx` are self-contained doc-route stubs shipped by the generator — required so `pnpm dev` doesn't 404 on doc pages. Don't delete them.

## Enabled Features

- **search** — Full-text search via Pagefind
- **designTokenPanel** — Interactive tabbed panel (built into zudo-doc; see the relationship section below for how its `@takazudo/zdtp` version is managed)
- **changelog** — Changelog page at `/docs/changelog`

## zdtp ↔ zudo-doc relationship

> Source of truth for how this docs site's design-token-panel relates to the `@takazudo/zdtp` package developed in this same monorepo (`packages/zdtp`). Read this before touching `doc/package.json`'s `@takazudo/zdtp` entry or `pnpm-workspace.yaml`.

- The `designTokenPanel` feature (`zfb.config.ts` → `designTokenPanel: true`) is **built into `@takazudo/zudo-doc`**. It is powered by zudo-doc's OWN pinned/released copy of `@takazudo/zdtp` (currently `0.4.9`) — the panel you see on this site is exactly the published package, the same one any zudo-doc consumer outside this repo gets.
- `doc/package.json` also pins `@takazudo/zdtp` directly at a released semver (currently `0.4.9`), matching zudo-doc's own pin, so the docs' `styles.css` import and version references stay in sync with what zudo-doc actually renders.
- **Never point either of those at `workspace:*`, a `link:`/`file:` spec, or otherwise force-link this repo's local/in-progress `packages/zdtp`.** `pnpm-workspace.yaml` sets `linkWorkspacePackages: false` for exactly this reason — pnpm would otherwise silently symlink the local workspace package over the registry-published one, and the docs would stop reflecting what real host apps install. `doc/` must always build against a real published `@takazudo/zdtp`.
- Keep the panel current via this cycle: **release a new zdtp version → bump zudo-doc's pinned zdtp dependency (upstream, in the zudo-doc repo) → confirm the new zudo-doc release resolves it → bump `doc/package.json`'s `@takazudo/zdtp` (and `@takazudo/zudo-doc`) pins here to match → the docs consume it as the live token-preview example.** Don't skip straight from "zdtp released" to "bump `doc/`'s pin" — zudo-doc's own upstream pin has to move first, since that's what actually determines which panel build renders.
- See the root `CLAUDE.md` for the pointer to this section, and the `l-make-release` skill for the zdtp release step itself.
