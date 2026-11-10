# demo-cssmodules

ZFB demo of the workspace `@takazudo/zdtp` panel with CSS Modules and `wind: false`.

Authored tokens live in `styles/tokens.css` and are imported by `styles/global.css`.
Component rules live in `*.module.css` and read those variables, including
`--demo-surface`, `--demo-ink`, `--demo-space-card`, and `--demo-radius-card`.

```sh
pnpm --filter demo-cssmodules dev
```

The dev server is `http://localhost:44341`. The `zdtp-server` sidecar listens on
port `24693` and the dev Apply proxy allows `http://localhost:44331`'s sibling
origin `http://localhost:44341`. Apply writes `styles/tokens.css`.

Production deploy:

```sh
pnpm --filter demo-cssmodules build:deploy
pnpm --dir demos/cssmodules exec wrangler deploy
```

Worker `zdtp-demo-cssmodules`, domain `https://zdtp-demo-cssmodules.zudolab.dev/`.
Deploy builds omit the Apply endpoint.
