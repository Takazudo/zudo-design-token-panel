# Vite + React example — `@takazudo/zudo-design-token-panel`

A minimal Vite 6 + React 18 app that mounts the design-token panel as a Preact
island from a `useEffect`, demonstrates live token tweaking, and exercises the
full apply pipeline by round-tripping tweaks back to disk through the bin
sidecar (`design-token-panel-server`).

## Run

```bash
pnpm --filter vite-react-example dev
```

`pnpm dev` runs two processes via `concurrently`:

| process | port  | role                                                                            |
| ------- | ----- | ------------------------------------------------------------------------------- |
| Vite    | 44325 | the example site                                                                |
| bin     | 24683 | `design-token-panel-server` — receives `/apply` POSTs, rewrites `tokens.css`    |

The Vite dev server proxies `/api/dev/apply` to the bin (see `vite.config.ts`),
so the panel POSTs to a same-origin URL — no CORS preflight, no hardcoded port
in the runtime config.

Open [http://localhost:44325](http://localhost:44325) and run
`window.viteReactExample.toggleDesignPanel()` in the browser console to show
the panel. Drag any slider — the page repaints before the next frame.

## Production build & deploy path

```bash
pnpm --filter vite-react-example build
```

`vite.config.ts` sets `base: '/pj/zdtp/vite-react/'`, so every CSS/JS/asset
reference in `dist/` is prefixed with that path. The build output is intended
to be hosted under
[https://&lt;host&gt;/pj/zdtp/vite-react/](https://example.com/pj/zdtp/vite-react/).

Note: Vite's `base` only affects the production build — the dev server keeps
serving at `/`, so the dev-only `/api/dev/apply` proxy is unaffected.
`panelConfig.applyEndpoint` deliberately stays as the bare `/api/dev/apply`
relative path: it is a dev-only endpoint that does not exist in the production
deploy and must not be base-prefixed.

## Apply-pipeline manual verification

The Playwright spec at `tests/e2e/apply-roundtrip.spec.ts` automates this; the
manual procedure is documented here so the round-trip is verifiable without
booting the e2e harness.

1. Start the dev environment:

   ```bash
   pnpm --filter vite-react-example dev
   ```

2. In a second shell, capture the current value of one token:

   ```bash
   grep -- '--vitereact-radius' examples/vite-react/src/styles/tokens.css
   #   --vitereact-radius: 0.5rem;
   ```

3. In the browser, open the panel via
   `window.viteReactExample.toggleDesignPanel()`. Switch to the **Size** tab,
   drag the **Border Radius** slider to a different value, then click
   **Apply** in the panel chrome and confirm the diff.

4. In the second shell, re-read the same line — it should now show the new
   value:

   ```bash
   grep -- '--vitereact-radius' examples/vite-react/src/styles/tokens.css
   #   --vitereact-radius: 1.25rem;
   ```

5. The next page reload picks up the new value from the file (the in-memory
   override is no longer needed because the source-of-truth on disk now
   matches).

For a non-interactive smoke check that bypasses the panel UI and POSTs
directly to the bin:

```bash
pnpm --filter vite-react-example test:apply-smoke
```

## What the example proves

- The panel package consumes ZERO project-specific defaults from its own
  bundle. Every identifier (`storagePrefix`, `consoleNamespace`,
  `paletteCssVarTemplate`, semantic CSS-var names, etc.) flows in from
  `src/config/panel-config.ts`.
- The apply pipeline routes by CSS-var prefix family: the `vitereact` prefix
  in `scaffold.routing.json` maps to `src/styles/tokens.css`, so any tweak to
  a `--vitereact-*` token rewrites that file.
- The panel works inside a real React 18 app **without** a `react ->
  preact/compat` alias. The host React tree never owns the panel's render
  surface — `mountPanel()` lazy-imports the panel module and Preact mounts
  inside its own root element, fully isolated from React reconciliation.
- React 18 StrictMode is enabled (the new-Vite default). The host adapter is
  StrictMode-safe via the per-`storagePrefix` bind flag pinned on
  `window.__zudoDesignTokenPanelAdapter` — the `useEffect` that calls
  `mountPanel()` is invoked twice in dev, but the second call short-circuits.
- Panel state survives React rerenders. The "Verify across rerender" section
  on the home page exposes a counter button + a child-subtree toggle so the
  panel's persistence across React reconciliation is observable in the UI.

## Layout

```
examples/vite-react/
├── index.html                  # Vite entry (#root + /src/main.tsx)
├── package.json                # name: vite-react-example, dev = vite + bin
├── playwright.config.ts        # apply-roundtrip e2e config
├── scaffold.routing.json       # CSS-var prefix → file map (shared by panel + bin)
├── scripts/
│   └── smoke-apply.mjs         # non-UI smoke harness for the bin
├── src/
│   ├── App.tsx                 # demo content + useEffect mount
│   ├── config/
│   │   ├── default-cluster.ts  # `--vitereact-*` color cluster
│   │   ├── default-manifest.ts # `--vitereact-*` token rows
│   │   └── panel-config.ts     # PanelConfig assembly
│   ├── lib/
│   │   └── mount-panel.ts      # adapter (console API + lazy-load + StrictMode bind flag)
│   ├── main.tsx                # configurePanel(...) THEN ReactDOM.createRoot(...).render
│   └── styles/
│       ├── reset.css
│       └── tokens.css          # `--vitereact-*` source of truth (apply target)
├── tests/
│   └── e2e/
│       └── apply-roundtrip.spec.ts
├── tsconfig.json
└── vite.config.ts              # React plugin + /api/dev/apply proxy → 24683
```
