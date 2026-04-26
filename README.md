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
designed to plug into modern host frameworks: Astro, Vite + React, and
Next.js — each integration ships as an example app under `examples/`.

## Status

**In-progress port.** Epic 1 (repo + doc-site bootstrap) has landed; the panel
package, the bin server, and the example apps are still being ported from
`zmodular`. Track progress on the
[super-epic issue #2](https://github.com/Takazudo/zudo-design-token-panel/issues/2).
The remaining work is split across Epics 2 through 7.

## Repository layout

```
zdtp/
├── packages/                       # workspace packages
│   └── zudo-design-token-panel/    # (coming) panel + bin
│                                   #   npm: @takazudo/zudo-design-token-panel
├── doc/                            # public doc site (zudo-doc framework)
├── examples/                       # (coming) integration examples
│   ├── astro/
│   ├── vite-react/
│   └── next/
└── LICENSE                         # MIT
```

- [`packages/`](./packages) — workspace packages (panel + bin live here once
  ported).
- [`doc/`](./doc) — public-facing documentation site, built with the
  [zudo-doc](https://github.com/Takazudo/zudo-doc) framework.
- [`examples/`](./examples) — host-framework integration examples.

## Doc site

The documentation site lives in [`doc/`](./doc) and is built on the zudo-doc
framework. To preview it locally:

```sh
pnpm install
pnpm dev
```

The root `dev` script delegates to `pnpm --filter doc dev`, so the site is
served from the `doc` workspace directly.

The deployed doc site lives under the path `/pj/zudo-token-panel/` on the
public zudo doc-site host.

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

Once the panel package and example apps land, `pnpm build`, `pnpm test`,
`pnpm typecheck`, and `pnpm lint` will fan out across the workspace via
`pnpm -r`.

## Contributing

Contributions are welcome — pull requests, issue reports, and reproductions
all help. The project is mid-port, so check the
[super-epic issue #2](https://github.com/Takazudo/zudo-design-token-panel/issues/2)
to see what is in flight before starting non-trivial work.

## License

MIT — see [LICENSE](./LICENSE).
