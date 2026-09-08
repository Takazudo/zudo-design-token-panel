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

The default URL uses the compact playground manifest. On the interactive pages, add
`?manifest=zudo-doc` to the page URL to exercise the real `PanelConfig` vendored
from the installed `@takazudo/zudo-doc/design-token-panel-config`. The exact
source version is recorded in `config/zudo-doc-manifest.generated.ts` and shown
in the page header. Refresh it after an intentional zudo-doc update with
`node scripts/vendor-consumer-manifest.mjs` from the repository root.

Useful console surfaces are `window.zfb` (consumer-specific controls and the
workspace panel version) and `window.zdtp` (the package's fixed global alias,
also annotated with its version by this playground).

Validate with `pnpm --filter playground typecheck` and
`pnpm --filter playground build`.

## Static token dashboard

Open [`/dashboard/`](https://zdtp-playground.zudolab.dev/dashboard/) for a plain
Preact page using the built `@takazudo/zdtp/dashboard` export. It renders the
existing `defaultTabs` twice (74 tokens in each mode) plus a narrow five-token
spacing instance, plus 16 dashboard-only examples in `config/dashboard-fixtures.ts`.
These show zero, a 1536px ruler, a local alias, an intentional missing variable,
an unsupported expression, a six-stop ramp, and custom English/Japanese reading
text. The custom `previewText` is static; there is no text editor. Rulers and
palette strips scroll locally, while typography uses wide multiline rows.
The same build-safe data feeds the interactive panel; the
page shows declared defaults, not current edits, saved state, or a selected
preset. `?manifest=zudo-doc` applies only to the interactive pages.

`pages/dashboard.tsx` owns a static shell and imports no controls island,
`configurePanel`, host adapter, or theme/storage script. Both shells share
`config/build-provenance.ts`, so the static page retains the generated,
git-derived release provenance. This feature is in the workspace build and
is not included in npm v0.6.0.

`plugins/dashboard-styles.mjs` resolves the public
`@takazudo/zdtp/dashboard/styles.css` export and copies it to the ignored
`public/_generated/` directory before builds and dev boot. The page links that
asset plus its independent `public/dashboard-page.css` chrome. After a package
CSS change, rebuild and restart dev to refresh the copy. No CSS import from the
component JavaScript is required.

The plugin also finalizes **only** the built dashboard HTML: zfb 2.13 injects a
sitewide islands loader and stylesheet even on routes with no islands, so the
plugin removes those generated tags and rejects any island or remaining
script. Other pages keep their interactive output. Development mode may still
include zfb's own development/runtime scripts; the static build is the
no-client-JavaScript artifact to verify.

The [integration recipe](https://zdtp.zudolab.dev/docs/recipes/static-token-dashboard/)
shows a small shared-data module, ordinary Preact TSX, and a portable CSS-copy
step for other static hosts.
