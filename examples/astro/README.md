# Astro example — `@takazudo/zudo-design-token-panel`

A minimal Astro 6 + Preact app that mounts the design-token panel via
`<DesignTokenPanelHost>`, demonstrates live token tweaking, and exercises the
full apply pipeline by round-tripping tweaks back to disk through the bin
sidecar (`design-token-panel-server`).

## Deploy path

This example builds with `base: '/pj/zudo-design-token-panel/examples/astro/'` (see `astro.config.ts`), so
the produced static bundle is meant to be served from the URL prefix
`/pj/zudo-design-token-panel/examples/astro/` under the monorepo's docs site. In production the example
is reachable at:

```
https://<docs-site>/pj/zudo-design-token-panel/examples/astro/
```

Internal navigation links inside `src/pages` use
`import.meta.env.BASE_URL` so they remain correct under the prefix without
hardcoding it. The dev-only Vite proxy match (`/api/dev/apply`) is
deliberately NOT base-prefixed — Astro's `base` only affects served-asset
URLs, not Vite's internal proxy match path, and the panel's `applyEndpoint`
config stays the literal string `/api/dev/apply` for the same reason.

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
`window.astro.toggleDesignPanel()` in the browser console to show the
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
   grep -- '--astro-radius' examples/astro/src/styles/tokens.css
   #   --astro-radius: 0.5rem;
   ```

3. In the browser, open the panel via
   `window.astro.toggleDesignPanel()`. Switch to the **Size** tab, drag
   the **Border Radius** slider to a different value, then click **Apply**
   in the panel chrome and confirm the diff.

4. In the second shell, re-read the same line — it should now show the new
   value:

   ```bash
   grep -- '--astro-radius' examples/astro/src/styles/tokens.css
   #   --astro-radius: 1.25rem;
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
  `astro` prefix in `scaffold.routing.json` maps to
  `src/styles/tokens.css`, so any tweak to an `--astro-*` token
  rewrites that file.
- Astro view-transitions preserve panel state across soft navigations
  (`/` ↔ `/about`) — the host adapter listens for `astro:before-swap` /
  `astro:page-load` and re-materialises the shell when persisted overrides
  or visibility intent demand it.

## Routes

| Route | File | Description |
|---|---|---|
| `/` | `pages/index.astro` | Home — cards, buttons, palette swatches |
| `/prose` | `pages/prose.astro` | Prose demo — MDX content inside `.astro-prose` |
| `/about` | `pages/about.astro` | About this example |
| `/components/forms` | `pages/components/forms.astro` | Form controls shell (widgets in Wave 3b) |
| `/components/status` | `pages/components/status.astro` | Status surfaces shell (widgets in Wave 3b) |
| `/components/widgets` | `pages/components/widgets.astro` | Widgets shell (tabs, accordion, modal, avatar — Wave 3b) |
| `/components/data` | `pages/components/data.astro` | Data table shell (Wave 3b) |

All routes are wrapped in `AppLayout.astro`, which provides a topbar and a sidenav with links to all pages above.

## Host-class vocabulary

`src/styles/components.css` freezes the CSS class names that Wave 3b components must use. Every class targets only `--astro-*` CSS variables. The table below is the canonical reference:

| Surface | Frozen class |
|---|---|
| Page layout container | `astro-page` |
| Page heading | `astro-page-title` |
| Section heading | `astro-section-title` |
| Subsection heading | `astro-subsection-title` |
| Body paragraph | `astro-body` |
| Muted helper text | `astro-helper` |
| Card / surface panel | `astro-card` |
| Primary button | `astro-button` (+ `.is-primary`, `.is-accent`) |
| Sidenav container | `astro-sidenav` |
| Sidenav link | `astro-sidenav-link` (+ `.is-active`) |
| Topbar | `astro-topbar` |
| Tab list / tab / indicator | `astro-tabs`, `astro-tabs__list`, `astro-tabs__tab`, `astro-tabs__indicator` |
| Accordion item | `astro-accordion` |
| Modal dialog | `astro-modal` |
| Form input | `astro-input` |
| Alert / callout | `astro-alert` (+ `.is-info`, `.is-success`, `.is-warning`, `.is-danger`) |
| Badge | `astro-badge` (+ `.is-accent`, `.is-success`, `.is-warning`, `.is-danger`) |
| Tooltip | `astro-tooltip` |
| Avatar | `astro-avatar` (+ `.is-sm`, `.is-md`) |
| Data table | `astro-table` |

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
│   ├── components/
│   │   └── Sidenav.astro       # sidenav with links to all 7 routes
│   ├── config/
│   │   ├── default-cluster.ts  # `--astro-*` color cluster
│   │   ├── default-manifest.ts # `--astro-*` token rows
│   │   └── panel-config.ts     # PanelConfig assembly
│   ├── layouts/
│   │   ├── Layout.astro        # document shell: ClientRouter + DesignTokenPanelHost
│   │   └── AppLayout.astro     # app shell: topbar + sidenav + main slot
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── prose.astro
│   │   └── components/
│   │       ├── forms.astro     # shell only (Wave 3b adds widgets)
│   │       ├── status.astro    # shell only (Wave 3b adds widgets)
│   │       ├── widgets.astro   # shell only (Wave 3b adds widgets)
│   │       └── data.astro      # shell only (Wave 3b adds widgets)
│   └── styles/
│       ├── reset.css
│       ├── tokens.css          # `--astro-*` source of truth (apply target)
│       └── components.css      # frozen host-class vocabulary (Wave 3b consumes this)
├── tests/
│   └── e2e/
│       └── apply-roundtrip.spec.ts
└── tsconfig.json
```
