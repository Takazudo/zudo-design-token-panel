# Next.js example — `@takazudo/zudo-design-token-panel`

A minimal Next.js 15 (App Router) + React 19 app that mounts the
design-token panel as a Preact island via a `'use client'` boundary,
demonstrates live token tweaking, and exercises the full apply pipeline by
round-tripping tweaks back to disk through the bin sidecar
(`design-token-panel-server`).

## Run

```bash
pnpm --filter next-example dev
```

`pnpm dev` runs two processes via `concurrently`:

| process | port  | role                                                                            |
| ------- | ----- | ------------------------------------------------------------------------------- |
| Next    | 44326 | the example site                                                                |
| bin     | 24684 | `design-token-panel-server` — receives `/apply` POSTs, rewrites `tokens.css`    |

The Next API route at `app/api/dev/apply/route.dev.ts` forwards
`/api/dev/apply` to the bin (see "Apply pipeline — proxy choice" below), so
the panel POSTs to a same-origin URL — no CORS preflight, no hardcoded port
in the runtime config. The `.dev.ts` suffix is what keeps this route out of
the static export build (see "Static export — dev-only API route exclusion"
below).

The dev server itself is served under the configured `basePath`, so open
[http://localhost:44326/pj/zudo-design-token-panel/next/](http://localhost:44326/pj/zudo-design-token-panel/next/)
and run `window.nextExample.toggleDesignPanel()` in the browser console to
show the panel. Drag any slider — the page repaints before the next frame.

## Production build (static export)

```bash
pnpm --filter next-example build
```

Emits a static `out/` directory with all assets prefixed by `/pj/zudo-design-token-panel/next/`
(matching the production deploy path on `takazudomodular.com`). Configured by:

| `next.config.ts` field | value                  | rationale                                                              |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `basePath`             | `/pj/zudo-design-token-panel/next`        | site is hosted under that subpath; do NOT add a trailing slash         |
| `assetPrefix`          | `/pj/zudo-design-token-panel/next`        | rewrites `_next/static/...` references to absolute deploy-path URLs    |
| `trailingSlash`        | `true`                 | emits `<route>/index.html` so plain static hosts work without rewrites |
| `output`               | `'export'` (gated)     | static export — only set when `NEXT_BUILD_TARGET=export`               |
| `pageExtensions`       | gated (see next table) | controls whether the dev-only API route is visible to the build       |

`output: 'export'` and `pageExtensions` are both gated on
`NEXT_BUILD_TARGET=export` so `next dev` keeps full dev-server behaviour
(API routes, on-demand routing) while `next build` (which sets the env var
via `package.json`) emits the static export.

Production URL: <https://takazudomodular.com/pj/zudo-design-token-panel/next/>.

## Static export — dev-only API route exclusion

`output: 'export'` rejects dynamic API routes — POST handlers cannot be
statically rendered — so the dev-only proxy at `app/api/dev/apply/` MUST
NOT be visible to the exporter. The strategy:

| mode               | `pageExtensions`                   | result                                                  |
| ------------------ | ---------------------------------- | ------------------------------------------------------- |
| `next dev`         | `['ts', 'tsx', 'dev.ts', 'dev.tsx']` | `route.dev.ts` IS picked up — POST proxy works         |
| `next build` (export) | `['ts', 'tsx']`                  | `route.dev.ts` is INVISIBLE — exporter never sees it   |

The route file is therefore named `route.dev.ts` (not `route.ts`). The
filename gate is enforced by `next.config.ts` reading the
`NEXT_BUILD_TARGET` env var; `package.json`'s `build` script sets the
variable. As defence-in-depth, the handler also short-circuits to `404`
when `NODE_ENV === 'production'`.

Verification (run after `pnpm --filter next-example build`):

```bash
# the static export must contain NO trace of the dev-only API route
find examples/next/out -path '*api/dev/apply*'
#   (returns nothing)

# every absolute href / src must already carry the /pj/zudo-design-token-panel/next/ prefix
grep -rE 'href="/[^p]|src="/[^p]' examples/next/out | grep -v '/pj/zudo-design-token-panel/next/'
#   (returns nothing)
```

## Apply pipeline — proxy choice (Next API route vs CORS-allowed fetch)

The Epic #9 brief left this open: route the panel's apply POST through a
**Next API route** (`app/api/dev/apply/route.dev.ts`) or have the panel fetch
the bin **directly with CORS**. This example picks the API route. Why:

1. **Same-origin POST means no CORS preflight.** The panel issues a JSON
   POST to `/api/dev/apply` on the same origin Next is serving the page
   on; the browser issues no `OPTIONS` request, the bin never has to
   reason about cross-origin headers, and the runtime config in
   `src/config/panel-config.ts` carries no port number — exactly the
   shape the Vite + React sibling example uses. Keeps the panel config
   identical (`applyEndpoint: '/api/dev/apply'`) across both examples.
2. **App Router has no built-in dev-server proxy.** Vite ships
   `server.proxy` so the Vite + React example runs the proxy from
   `vite.config.ts`. Next has nothing equivalent at the framework level —
   an API route is the canonical "talk to a backend without CORS" surface
   in App Router and ships in production builds too.
3. **Bin Origin validation stays simple.** The route forwards the POST
   with `Origin: http://localhost:44326` (or the value of the
   `ZDTP_BIN_ORIGIN` environment variable) regardless of what the
   incoming request has, so the bin's `--allow-origin` gate matches one
   stable origin only. Override when the example is served on a
   non-default port: `ZDTP_BIN_ORIGIN=http://localhost:3001 pnpm dev`.

The route is a transport-level adapter: it forwards the body bytes
verbatim and the upstream status code verbatim. The bin owns the schema.

**Dev-only**: the file is named `route.dev.ts`, and `next.config.ts` only
includes `dev.ts` in `pageExtensions` outside of export builds — so the
static export emitted by `pnpm build` (which sets
`NEXT_BUILD_TARGET=export`) NEVER contains the dev-only API route. As a
defence in depth the handler also short-circuits to `404` when
`NODE_ENV === 'production'`. This matches Vite's `server.proxy` semantics:
proxies apply only to the dev server, not to production builds. See the
"Static export — dev-only API route exclusion" section above for the full
gating mechanism.

## Apply-pipeline manual verification

The Playwright spec at `tests/e2e/apply-roundtrip.spec.ts` automates this; the
manual procedure is documented here so the round-trip is verifiable without
booting the e2e harness.

1. Start the dev environment:

   ```bash
   pnpm --filter next-example dev
   ```

2. In a second shell, capture the current value of one token:

   ```bash
   grep -- '--nextexample-radius' examples/next/src/styles/tokens.css
   #   --nextexample-radius: 0.5rem;
   ```

3. In the browser, open the panel via
   `window.nextExample.toggleDesignPanel()`. Switch to the **Size** tab,
   drag the **Border Radius** slider to a different value, then click
   **Apply** in the panel chrome and confirm the diff.

4. In the second shell, re-read the same line — it should now show the new
   value:

   ```bash
   grep -- '--nextexample-radius' examples/next/src/styles/tokens.css
   #   --nextexample-radius: 1.25rem;
   ```

5. The next page reload picks up the new value from the file (the in-memory
   override is no longer needed because the source-of-truth on disk now
   matches).

For a non-interactive smoke check that bypasses the panel UI and the Next
API route — POSTing directly to the bin on port 24684 — run:

```bash
pnpm --filter next-example test:apply-smoke
```

## What the example proves

- The panel package consumes ZERO project-specific defaults from its own
  bundle. Every identifier (`storagePrefix`, `consoleNamespace`,
  `paletteCssVarTemplate`, semantic CSS-var names, etc.) flows in from
  `src/config/panel-config.ts`.
- The apply pipeline routes by CSS-var prefix family: the `nextexample`
  prefix in `scaffold.routing.json` maps to `src/styles/tokens.css`, so
  any tweak to a `--nextexample-*` token rewrites that file.
- The panel works inside a real React 19 + Next 15 App Router app
  **without** a `react -> preact/compat` alias. The host React tree never
  owns the panel's render surface — `mountPanel()` lazy-imports the
  panel module and Preact mounts inside its own root element, fully
  isolated from React reconciliation.
- React 19 StrictMode is enabled (the App Router default;
  `next.config.ts` makes it explicit). The host adapter is StrictMode-safe
  via the per-`storagePrefix` bind flag pinned on
  `window.__zudoDesignTokenPanelAdapter` — the `useEffect` in
  `app/_components/PanelBootstrap.tsx` is invoked twice in dev, but the
  second call short-circuits.
- Panel state survives soft navigation. `next/link` between `/` and
  `/about` is a client-routed swap; the layout component persists across
  it, the `PanelBootstrap` adapter binds once, and the panel's DOM root
  lives outside the React tree (appended to `document.body` by the panel
  module), so no part of the route swap can disturb panel state.
- Panel state survives React rerenders. The "Verify across rerender"
  section on the home page exposes a counter button + a child-subtree
  toggle so the panel's persistence across React reconciliation is
  observable in the UI.

## Identifier family

The host-agnosticism contract for this example pins these identifiers:

| field                 | value                                       |
| --------------------- | ------------------------------------------- |
| `storagePrefix`       | `next-example-tokens`                       |
| `consoleNamespace`    | `nextExample`                               |
| `modalClassPrefix`    | `next-example-design-token-panel-modal`     |
| `schemaId`            | `next-example-design-tokens/v1`             |
| `exportFilenameBase`  | `next-example-design-tokens`                |
| CSS-var family        | `--nextexample-*`                           |
| routing prefix        | `nextexample`                               |
| Next dev port         | `44326`                                     |
| bin sidecar port      | `24684`                                     |

The console-API call is `window.nextExample.toggleDesignPanel()`.

## Apply pipeline — flow

```
┌───────────────┐   POST /api/dev/apply    ┌────────────────────────────┐
│   Panel UI    │ ───────────────────────▶ │   Next API route           │
│ (Preact)      │   { tokens: {…} }        │   app/api/dev/apply        │
└───────────────┘                          │   /route.dev.ts (dev-only) │
                                           │                            │
                                           │   forwards verbatim with   │
                                           │   Origin: localhost:44326  │
                                           ▼                            ▼
                                  ┌────────────────────────────────────────┐
                                  │   bin sidecar  (port 24684)            │
                                  │   design-token-panel-server            │
                                  │   --routing scaffold.routing.json      │
                                  │   --write-root .                       │
                                  └────────────────────────────────────────┘
                                           │   atomic temp-rename write
                                           ▼
                                  ┌────────────────────────────────────────┐
                                  │   examples/next/src/styles/tokens.css  │
                                  └────────────────────────────────────────┘
```

## Layout

```
examples/next/
├── README.md                     # this file
├── next-env.d.ts                 # standard Next 15 type-reference file
├── next.config.ts                # reactStrictMode, basePath/assetPrefix, output: 'export' (gated), pageExtensions (gated)
├── package.json                  # name: next-example, dev = next + bin
├── playwright.config.ts          # apply-roundtrip e2e config
├── scaffold.routing.json         # CSS-var prefix → file map (shared by panel + bin)
├── tsconfig.json                 # Next 15 strict TS, resolveJsonModule on
├── app/
│   ├── about/
│   │   └── page.tsx              # second route — soft-navigation analog
│   ├── api/
│   │   └── dev/
│   │       └── apply/
│   │           └── route.dev.ts  # POST /api/dev/apply → bin proxy (dev-only; .dev.ts excludes from static export)
│   ├── _components/
│   │   └── PanelBootstrap.tsx    # 'use client' island — useEffect → mountPanel
│   ├── layout.tsx                # global CSS + <PanelBootstrap />
│   └── page.tsx                  # demo content + rerender-verify section
├── scripts/
│   └── smoke-apply.mjs           # non-UI smoke harness for the bin
├── src/
│   ├── config/
│   │   ├── default-cluster.ts    # `--nextexample-*` color cluster
│   │   ├── default-manifest.ts   # `--nextexample-*` token rows
│   │   └── panel-config.ts       # PanelConfig assembly
│   ├── lib/
│   │   └── mount-panel.ts        # adapter (console API + lazy-load + StrictMode bind flag)
│   └── styles/
│       ├── reset.css
│       └── tokens.css            # `--nextexample-*` source of truth (apply target)
└── tests/
    └── e2e/
        └── apply-roundtrip.spec.ts
```
