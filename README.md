# zudo-design-token-panel

A live design-token tweak panel and companion bin server for modern web frameworks.

## What it is

`zudo-design-token-panel` is the OSS port of the design-token panel + bin
server originally developed inside `zmodular`. Released here as a standalone
public package, it lets designers and developers adjust design tokens (CSS
custom properties) live in the browser, while the bin process round-trips
those tweaks back into the source CSS files on disk.

The panel is a Preact island that mounts inside a host web app. The bin is a
small local server that watches edits from the panel and persists them. It is
designed to plug into modern host frameworks: Astro, Vite + React, Next.js,
zfb, and zfb + Tailwind v4 — see the [Examples](https://takazudomodular.com/pj/zudo-design-token-panel/getting-started/examples/)
doc page for live demos and source links.

## Status

**In-progress port.** Epic 1 (repo + doc-site bootstrap) has landed; the panel
package, the bin server, and the example apps are still being ported from
`zmodular`. Track progress on the
[super-epic issue #2](https://github.com/Takazudo/zudo-design-token-panel/issues/2).
The remaining work is split across Epics 2 through 7.

The **abstract token tiers** feature
([epic #69](https://github.com/Takazudo/zudo-design-token-panel/issues/69)) has
landed on the `base/abstract-token-tiers` branch and is pending merge. It
replaces the former `tokens` + `colorCluster` fields on `PanelConfig` with a
fully data-driven `tabs` array (`TabConfig` / `TierConfig` / `TierItem`).
Semantic tokens can reference base tokens via `TierConfig.referencesTier`,
and the apply pipeline emits `var(--base-cssvar)` for ref-tier items.
See `packages/zudo-design-token-panel/PORTABLE-CONTRACT.md` §3 and the package
`CHANGELOG.md` for details.

## Repository layout

```
zdtp/
├── packages/                       # workspace packages
│   └── zudo-design-token-panel/    # panel + bin
│                                   #   npm: @takazudo/zudo-design-token-panel
├── doc/                            # public doc site (zudo-doc framework)
└── LICENSE                         # MIT
```

- [`packages/`](./packages) — workspace packages (panel + bin live here once
  ported).
- [`doc/`](./doc) — public-facing documentation site, built with the
  [zudo-doc](https://github.com/Takazudo/zudo-doc) framework.

## Doc site

The documentation site lives in [`doc/`](./doc) and is built on the zudo-doc
framework. To preview it locally:

```sh
pnpm install
pnpm dev
```

The root `dev` script delegates to `pnpm --filter doc dev`, so the site is
served from the `doc` workspace directly.

The deployed doc site lives at `https://takazudomodular.com/pj/zudo-design-token-panel/` on the
public zudo doc-site host (path: `/pj/zudo-design-token-panel/`).

## Getting started

Requirements:

- Node.js 20 or newer
- pnpm 10 (the repo pins `packageManager` in `package.json`)

Install dependencies at the repo root:

```sh
pnpm install
```

Run the doc dev server:

```sh
pnpm dev
```

The panel package lives in this repo under `packages/zudo-design-token-panel/`.
The five example apps (Astro, Vite + React, Next.js, zfb, zfb + Tailwind v4)
have moved out of this monorepo into dedicated sibling repos — see the
[Examples](https://takazudomodular.com/pj/zudo-design-token-panel/getting-started/examples/)
doc page for live demos and source links to each external repo. The root
`pnpm build`, `pnpm test`, `pnpm typecheck`, and `pnpm lint` scripts fan out
across the remaining workspaces (the panel package and the doc site) via
`pnpm -r`.

## Verifying deploy sub-paths

The doc workspace is hosted at:

| Workspace | Deploy sub-path                    | Build output |
| --------- | ---------------------------------- | ------------ |
| `doc`     | `/pj/zudo-design-token-panel/`     | `doc/dist`   |

To verify that no emitted asset, link, script, or inlined string reference
escapes the doc workspace's sub-path, run:

```sh
pnpm check:deploy-paths
```

The script (`scripts/check-deploy-paths.sh`) builds the doc workspace (plus
the `@takazudo/zudo-design-token-panel` package as a precondition) and then
greps the bundle for:

- HTML attributes (`href`, `src`, `srcset`, `poster`, `<link rel="manifest">`,
  Open Graph and Twitter Card `<meta content>`, …) pointing to a root-relative
  path outside the workspace prefix.
- CSS `url(/...)` references outside the prefix.
- Embedded JS / JSON / XML literals that name an asset root such as
  `/_astro/`, `/assets/`, or `/pagefind/` without the workspace prefix in
  front. This catches bare leaks like `/_astro/foo.js` appearing inside the
  doc bundle, where the correct form is
  `/pj/zudo-design-token-panel/_astro/foo.js`.
- Manifest, sitemap, feed, and pagefind shard outputs (`*.webmanifest`,
  `manifest.json`, `sitemap*.xml`, `feed*.xml`, `pagefind-*.json`, …).
- Source-map information disclosure: a `*.map` file embedding an absolute
  build-host path (`/home/...`, `/Users/...`, `/runner/...`, …) or this
  worktree's root.
- Trailing-slash inconsistency on internal `<a>` links — flags any base URL
  that appears in BOTH the trailing-slash form and the non-trailing form.

The script exits non-zero on any escape so it can gate CI or pre-push. It
relies on GNU grep (PCRE with variable-width lookbehind, plus the
`--include` / `--exclude` flags) and refuses to run otherwise. On macOS,
install with `brew install grep` and put gnubin first on PATH, or alias
`grep=ggrep`.

## Contributing

Contributions are welcome — pull requests, issue reports, and reproductions
all help. The project is mid-port, so check the
[super-epic issue #2](https://github.com/Takazudo/zudo-design-token-panel/issues/2)
to see what is in flight before starting non-trivial work.

## License

MIT — see [LICENSE](./LICENSE).
