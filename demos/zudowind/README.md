# demo-zudowind

ZFB demo of the workspace `@takazudo/zdtp` panel with zudo-wind.

Authored tokens live in `styles/tokens.css`. Wind tokens point at those variables
(`spacing.card = var(--demo-space-card)` and the surface, ink, and radius tokens).
Components use the complete utilities `p-card`, `rounded-card`, `bg-surface`, and
`text-ink`.

```sh
pnpm --filter demo-zudowind dev
```

The dev server is `http://localhost:44331`. The sidecar listens on port `24691`.
Apply writes `styles/tokens.css`. Add `?manifest=zudo-doc` on an interactive page
to load the vendored zudo-doc `PanelConfig`. `/dashboard/` is a static inventory
and does not mount the panel.

Production deploy:

```sh
pnpm --filter demo-zudowind build:deploy
pnpm --dir demos/zudowind exec wrangler deploy
```

Worker `zdtp-demo-zudowind`, domain `https://zdtp-demo-zudowind.zudolab.dev/`.
Deploy builds omit the Apply endpoint.
