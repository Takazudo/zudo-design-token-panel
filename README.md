# zudo-design-token-panel

A live design-token tweak panel and companion bin server for modern web frameworks.

## What it is

`zudo-design-token-panel` is the OSS port of the design-token panel + bin
server originally developed inside [Takazudo Modular](https://takazudomodular.com/). Released here as a standalone
public package, it lets designers and developers adjust design tokens (CSS
custom properties) live in the browser, while the bin process round-trips
those tweaks back into the source CSS files on disk.

The panel is a Preact island that mounts inside a host web app. The bin is a
small local server that watches edits from the panel and persists them. It is
designed to plug into modern host frameworks: Astro, Vite + React, Next.js,
zfb, and zfb + Tailwind v4 — see the [Examples](https://zdtp.zudolab.dev/docs/getting-started/examples/)
doc page for live demos and source links.

## Status

`@takazudo/zdtp` is published on npm and documented at
[zdtp.zudolab.dev](https://zdtp.zudolab.dev/). The public surfaces are split
deliberately: the docs site runs the pinned npm release, while two live demos
run this repo's workspace build and therefore lead it —
[zdtp-minimal.zudolab.dev](https://zdtp-minimal.zudolab.dev/) (the smallest
wiring that works, from `examples/minimal/`) and
[zdtp-playground.zudolab.dev](https://zdtp-playground.zudolab.dev/) (full size,
from `playground/`). Five external example apps (Astro, Vite + React, Next.js,
zfb, zfb + Tailwind v4) live in dedicated sibling repos; see the
[Examples](https://zdtp.zudolab.dev/docs/getting-started/examples/) doc page.
Release history is in the package `CHANGELOG.md`.

## Repository layout

```
zdtp/
├── packages/                       # workspace packages
│   └── zdtp/                       # panel + bin
│                                   #   npm: @takazudo/zdtp
├── doc/                            # public doc site (zudo-doc framework)
├── playground/                     # full-size demo on the workspace build
├── examples/
│   └── minimal/                    # smallest-wiring demo on the workspace build
├── scripts/                        # repo tooling (hooks, deploy audit, vendoring)
└── LICENSE                         # MIT
```

- [`packages/`](./packages) — workspace packages (panel + bin).
- [`doc/`](./doc) — public-facing documentation site, built with the
  [zudo-doc](https://github.com/Takazudo/zudo-doc) framework.
- [`playground/`](./playground) and [`examples/minimal/`](./examples/minimal) —
  the two live demos, both consuming the local workspace package.

## Doc site

The documentation site lives in [`doc/`](./doc) and is built on the zudo-doc
framework. To preview it locally:

```sh
pnpm install
pnpm dev
```

The root `dev` script delegates to `pnpm --filter doc dev`, so the site is
served from the `doc` workspace directly.

The deployed doc site lives at `https://zdtp.zudolab.dev/`,
served at the root of its Cloudflare Workers (static assets) deployment.

## Getting started

Requirements:

- Node.js 22.12 or newer
- pnpm 11 (the repo pins `packageManager` to `pnpm@11.3.0` in `package.json`)

Install dependencies at the repo root:

```sh
pnpm install
```

Run the doc dev server:

```sh
pnpm dev
```

The root `pnpm build`, `pnpm test`, `pnpm typecheck`, and `pnpm lint` scripts
fan out across every workspace (the panel package, the doc site, `playground/`,
and `examples/minimal/`) via `pnpm -r`.

## Verifying the deploy output

Three workspaces deploy, each served at the root of its own domain:

| Workspace          | Deploy root | Build output            |
| ------------------ | ----------- | ----------------------- |
| `doc`              | `/`         | `doc/dist`              |
| `playground`       | `/`         | `playground/dist`       |
| `examples/minimal` | `/`         | `examples/minimal/dist` |

Because each site lives at the root, there is no sub-path for an asset
reference to escape — root-relative URLs are correct by construction. What
still matters is information disclosure, so run:

```sh
pnpm check:deploy-paths
```

The script (`scripts/check-deploy-paths.sh`) builds the deployed workspaces
(plus the `@takazudo/zdtp` package as a precondition) and then greps each
bundle for:

- Source-map information disclosure: a `*.map` file embedding an absolute
  build-host path (`/home/...`, `/Users/...`, `/runner/...`, …) or this
  worktree's root.

The script exits non-zero on any leak so it can gate CI or pre-push. It
needs a PCRE-capable grep (`grep -P`): GNU grep works, and when the system
grep lacks `-P` (macOS BSD grep) it falls back to the ugrep bundled with the
Claude Code CLI if `claude` is on PATH, then to Homebrew's `ggrep`
(`brew install grep`).

## Contributing

Contributions are welcome — pull requests, issue reports, and reproductions
all help. Check the
[open issues](https://github.com/Takazudo/zudo-design-token-panel/issues)
to see what is in flight before starting non-trivial work.

## License

MIT — see [LICENSE](./LICENSE).

## Try the dashboard as an external package

Run `pnpm check:dashboard-consumer --keep` to build and install the current tarball
in an isolated temporary Preact app, compile TSX, render static HTML and verify it
in Chromium with JavaScript disabled. The retained app is editable and rebuilds
with `npm run build`; no npm publication is needed. See the
[consumer fixture guide](scripts/fixtures/dashboard-consumer/README.md) for CSS
copying, evidence output, cleanup and the boundary this test proves.
