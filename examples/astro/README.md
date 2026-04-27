# Astro example — `@takazudo/zudo-design-token-panel`

A minimal Astro 6 + Preact app that mounts the design-token panel via
`<DesignTokenPanelHost>`, demonstrates live token tweaking, and exercises the
full apply pipeline by round-tripping tweaks back to disk through the bin
sidecar (`design-token-panel-server`).

## Run

```bash
pnpm --filter astro-example dev
```

`pnpm dev` runs two processes via `concurrently`:

| process | port  | role                                                                      |
| ------- | ----- | ------------------------------------------------------------------------- |
| Astro   | 44324 | the example site                                                          |
| bin     | 24682 | `design-token-panel-server` — receives `/apply` POSTs, rewrites `tokens.css` |

The Astro dev server proxies `/api/dev/apply` to the bin (see
`astro.config.ts`), so the panel POSTs to a same-origin URL — no CORS
preflight, no hardcoded port in the runtime config.

Open [http://localhost:44324](http://localhost:44324) and run
`window.astroExample.toggleDesignPanel()` in the browser console to show the
panel. Drag any slider — the page repaints before the next frame.

## Apply-pipeline manual verification

The Playwright spec at `tests/e2e/apply-roundtrip.spec.ts` automates this; the
manual procedure is documented here so the round-trip is verifiable without
booting the e2e harness.

1. Start the dev environment:

   ```bash
   pnpm --filter astro-example dev
   ```

2. In a second shell, capture the current value of one token:

   ```bash
   grep -- '--astroexample-radius' examples/astro/src/styles/tokens.css
   #   --astroexample-radius: 0.5rem;
   ```

3. In the browser, open the panel via
   `window.astroExample.toggleDesignPanel()`. Switch to the **Size** tab, drag
   the **Border Radius** slider to a different value, then click **Apply**
   in the panel chrome and confirm the diff.

4. In the second shell, re-read the same line — it should now show the new
   value:

   ```bash
   grep -- '--astroexample-radius' examples/astro/src/styles/tokens.css
   #   --astroexample-radius: 1.25rem;
   ```

5. The next page reload picks up the new value from the file (the in-memory
   override is no longer needed because the source-of-truth on disk now
   matches).

For a non-interactive smoke check that bypasses the panel UI and POSTs
directly to the bin:

```bash
pnpm --filter astro-example test:apply-smoke
```

## What the example proves

- The panel package consumes ZERO project-specific defaults from its own
  bundle. Every identifier (`storagePrefix`, `consoleNamespace`,
  `paletteCssVarTemplate`, semantic CSS-var names, etc.) flows in from
  `src/config/panel-config.ts`.
- The apply pipeline routes by CSS-var prefix family: the
  `astroexample` prefix in `scaffold.routing.json` maps to
  `src/styles/tokens.css`, so any tweak to an `--astroexample-*` token
  rewrites that file.
- Astro view-transitions preserve panel state across soft navigations
  (`/` ↔ `/about`) — the host adapter listens for `astro:before-swap` /
  `astro:page-load` and re-materialises the shell when persisted overrides
  or visibility intent demand it.

## Layout

```
examples/astro/
├── astro.config.ts             # Astro + preact + /api/dev/apply proxy
├── package.json                # name: astro-example, dev = astro + bin
├── playwright.config.ts        # apply-roundtrip e2e config
├── scaffold.routing.json       # CSS-var prefix → file map (shared by panel + bin)
├── scripts/
│   └── smoke-apply.mjs         # non-UI smoke harness for the bin
├── src/
│   ├── config/
│   │   ├── default-cluster.ts  # `--astroexample-*` color cluster
│   │   ├── default-manifest.ts # `--astroexample-*` token rows
│   │   └── panel-config.ts     # PanelConfig assembly
│   ├── layouts/
│   │   └── Layout.astro        # mounts <DesignTokenPanelHost>
│   ├── pages/
│   │   ├── index.astro
│   │   └── about.astro
│   └── styles/
│       ├── reset.css
│       └── tokens.css          # `--astroexample-*` source of truth (apply target)
├── tests/
│   └── e2e/
│       └── apply-roundtrip.spec.ts
└── tsconfig.json
```
