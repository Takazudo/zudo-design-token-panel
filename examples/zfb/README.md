# zfb example — @takazudo/zudo-design-token-panel

Demonstrates `@takazudo/zudo-design-token-panel` inside a [zfb (zudo-front-builder)](https://github.com/Takazudo/zudo-front-builder) project. The panel is mounted as a Preact island via zfb's `<Island>` component, and the dev-time apply pipeline is wired through a small zfb plugin's `devMiddleware` hook.

## Prerequisites

zfb is a Rust-based build tool. Install it before running this example:

```sh
cargo install --git https://github.com/Takazudo/zudo-front-builder zfb
```

Or, if you have a local checkout:

```sh
# From the zudo-front-builder repo root
cargo install --path crates/zfb
```

Verify the install:

```sh
zfb --version
```

## Development

```sh
pnpm --filter zfb-example dev
```

This starts two processes in parallel via `concurrently`:

- `zfb dev` — the zfb dev server at `http://localhost:44327`
- `design-token-panel-server` — the bin sidecar at port `24685`

The panel is accessible from the browser console:

```js
window.zfbExample.toggleDesignPanel()
```

## Build

```sh
pnpm --filter zfb-example build
```

Output lands in `examples/zfb/dist/`. All asset URLs begin with `/pj/zudo-design-token-panel/examples/zfb/` (the configured `base`).

## Preview (after build)

```sh
pnpm --filter zfb-example preview
```

## Typecheck

```sh
pnpm --filter zfb-example typecheck
```

---

## Island choice

zfb's `<Island>` component marks a `"use client"` subtree for browser-side hydration. `pages/index.tsx` wraps `<PanelMount>` in `<Island when="visible" ssrFallback={null}>`:

```tsx
<Island when="visible" ssrFallback={null}>
  <PanelMount />
</Island>
```

`PanelMount` (`components/panel-mount.tsx`) returns `null` — it only runs a `useEffect` to bootstrap the panel adapter.

**Why `ssrFallback={null}` (the zfb `client:only` equivalent)?**

zfb's default `<Island>` SSR-renders the child and then hydrates it on the client. `PanelMount` uses `useEffect` from `preact/hooks`, which during SSR would fail with a Preact internal hooks error (`__H` undefined) because zfb's SSR renderer and the project's `preact` package are different instances — the Preact hooks options are only wired up in the SSR renderer's instance. Passing `ssrFallback` (even `null`) switches the island to skip-SSR mode, preventing the hooks from running during the server-side render pass. The component is then mounted client-side by the hydration runtime.

The `when="visible"` strategy defers hydration until the element is in the viewport. Because `<PanelMount>` sits at the end of `<body>`, the IntersectionObserver fires shortly after first paint — effectively an idle-ish load strategy that does not block the critical-path chunk.

---

## Dev-middleware plugin pattern

Unlike the other three examples (astro, vite-react, next) — which proxy `/api/dev/apply` through Vite's built-in `server.proxy` mechanism — zfb exposes the `devMiddleware` plugin hook instead.

The plugin at `plugins/dev-apply-proxy.mjs` registers a handler via `ctx.register(path, handler)` and forwards the POST body to the bin sidecar at `http://127.0.0.1:24685/apply`:

```js
// plugins/dev-apply-proxy.mjs
ctx.register(APPLY_ROUTE, async (req) => {
  const upstream = await fetch("http://127.0.0.1:24685/apply", {
    method: "POST",
    body: req.body,
  });
  // ...
});
```

The plugin is listed in `zfb.config.ts`:

```ts
plugins: [{ name: "./plugins/dev-apply-proxy.mjs" }]
```

---

## Apply-endpoint difference vs. the other three examples

**This is the most important difference to understand before modifying this demo.**

The astro, vite-react, and next examples all set `applyEndpoint` to the bare relative path `/api/dev/apply`. Their respective proxy mechanisms intercept this path **without a base prefix** — Vite's `server.proxy` and Next's API route both operate at the root.

**The zfb example uses the FULL base-prefixed URL:**

```ts
// config/panel-config.ts
applyEndpoint: '/pj/zudo-design-token-panel/examples/zfb/api/dev/apply',
```

Per zfb issue [#229](https://github.com/Takazudo/zudo-front-builder/issues/229) (fix commit `b1049ef`), zfb's dev server mounts `devMiddleware`-registered paths **under the project `base`**. A bare `/api/dev/apply` is never reached by the handler. The panel's POST must use the full prefixed path.

The plugin handler (`plugins/dev-apply-proxy.mjs`) registers at this same full path:

```js
const APPLY_ROUTE = "/pj/zudo-design-token-panel/examples/zfb/api/dev/apply";
ctx.register(APPLY_ROUTE, async (req) => { /* ... */ });
```

Do **not** try to "normalize" the `applyEndpoint` to a bare path — it will break the dev apply pipeline. This is a configuration requirement for this project, not a bug in zfb.

For full context, see [`PROBE-REPORT.md`](./PROBE-REPORT.md) and [zfb #229](https://github.com/Takazudo/zudo-front-builder/issues/229).

---

## Local-only build path (CI fallback)

If CI cargo-install proves flaky (see Sub #36's note), the fallback is a local build:

1. Build zfb locally from the repo:
   ```sh
   # From the zudo-front-builder repo root
   cargo install --path crates/zfb
   ```

2. Build this example:
   ```sh
   pnpm --filter zfb-example build
   ```

3. Deploy manually via wrangler:
   ```sh
   wrangler pages deploy examples/zfb/dist \
     --project-name zudo-design-token-panel \
     --branch main
   ```

The CI pipeline (Sub #36) handles this automatically when the environment is configured correctly.
