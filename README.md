# zudo-design-token-panel

`zudo-design-token-panel` is an OSS port of a Preact-based live design-token
tweak panel and its companion bin server. The panel mounts inside a host web
app to let designers and developers adjust design tokens (CSS custom
properties) live in the browser, while the bin process round-trips those
tweaks back into the source CSS files on disk.

It is designed to plug into modern host frameworks: Astro, Vite + React, and
Next.js. Each integration ships as an example app under `examples/`.

## Repository layout

```
zdtp/
├── packages/
│   └── zudo-design-token-panel/   # the panel + bin (npm: @takazudo/zudo-design-token-panel)
├── doc/                            # doc site (zudo-doc framework)
├── examples/
│   ├── astro/
│   ├── vite-react/
│   └── next/
└── LICENSE (MIT)
```

The doc site under `doc/` is the public-facing documentation, built with the
zudo-doc framework. It explains how to install and integrate the panel into
each supported host framework.

## Status

This monorepo is being ported in stages. The workspace skeleton is in place,
but the panel package and example apps are still being ported. Track progress
on the [super-epic issue #2](https://github.com/Takazudo/zudo-design-token-panel/issues/2).
The remaining work is split across Epics 2 through 7.

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

## License

MIT — see [LICENSE](./LICENSE).
