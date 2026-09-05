# zdtp workspace playground

This in-repo consumer is derived from the standalone
[`zudo-design-token-panel-example-zfb`](https://github.com/Takazudo/zudo-design-token-panel-example-zfb),
ported to the zfb 2.x version used by `doc/`. It deliberately depends on
`"@takazudo/zdtp": "workspace:*"`, so it exercises unpublished package changes.

From the repository root, run `pnpm play`. This starts zfb at
`http://localhost:44327` and the `zdtp-server` sidecar at port `24685`. The
panel's Apply action is proxied through zfb and rewrites
`playground/styles/global.css` according to `scaffold.routing.json`.

`build:deploy` prepares the workspace panel and emits the static bundle for the
`zdtp-playground` Worker configured in `playground/wrangler.toml`:

```sh
pnpm --filter playground build:deploy
pnpm --dir playground exec wrangler deploy
```

The production deploy target runs from the `main` push workflow; pull requests
use a version preview. Apply is disabled in the deployed build because it needs
the local `zdtp-server` sidecar, which a static host does not provide. Use
`pnpm play` for the local write-back flow described above.

The default URL uses the compact playground manifest. Add
`?manifest=zudo-doc` to any page URL to exercise the real `PanelConfig` vendored
from the installed `@takazudo/zudo-doc/design-token-panel-config`. The exact
source version is recorded in `config/zudo-doc-manifest.generated.ts` and shown
in the page header. Refresh it after an intentional zudo-doc update with
`node scripts/vendor-consumer-manifest.mjs` from the repository root.

Useful console surfaces are `window.zfb` (consumer-specific controls and the
workspace panel version) and `window.zdtp` (the package's fixed global alias,
also annotated with its version by this playground).

Validate with `pnpm --filter playground typecheck` and
`pnpm --filter playground build`.
