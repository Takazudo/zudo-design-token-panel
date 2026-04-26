# zudo-token-panel doc site

Documentation site for the zudo-design-token-panel project, built with
[zudo-doc](https://github.com/zudolab/zudo-doc).

- Site URL (production): `https://takazudo.github.io/pj/zudo-token-panel/`
- Astro `base`: `/pj/zudo-token-panel/` (configured in `src/config/settings.ts`)

## Develop

```sh
pnpm --filter doc dev
```

Astro dev server defaults to port 4321.

## Build

```sh
pnpm --filter doc build
```

Outputs static HTML to `doc/dist/`. All internal asset URLs are prefixed with
`/pj/zudo-token-panel/`.

## Scaffolded by

This site was scaffolded with the
[`create-zudo-doc`](https://github.com/zudolab/zudo-doc/tree/main/packages/create-zudo-doc)
CLI using the issue-1 preset. The `create-zudo-doc` package is not yet
published to npm — invoke it locally from a checkout of `zudo-doc`.

The exact invocation (run from the workspace root):

```sh
node $HOME/repos/myoss/zudo-doc/packages/create-zudo-doc/bin/create-zudo-doc.js \
  --preset /path/to/preset.json \
  --yes
```

The CLI scaffolds a directory named after `projectName` (so `zudo-token-panel/`
in our case). The directory was then renamed to `doc/` so the doc site lives
at the conventional `<repo-root>/doc/` path inside the pnpm workspace, and
`package.json#name` was changed from `zudo-token-panel` to `doc` so
`pnpm --filter doc <script>` works.

`src/config/settings.ts` was post-edited to set `base` and `siteUrl` after
scaffold (the CLI does not expose these as preset fields).

### Preset

```json
{
  "projectName": "zudo-token-panel",
  "defaultLang": "en",
  "colorSchemeMode": "light-dark",
  "lightScheme": "Default Light",
  "darkScheme": "Default Dark",
  "defaultMode": "dark",
  "respectPrefersColorScheme": true,
  "features": [
    "search",
    "sidebarFilter",
    "i18n",
    "claudeResources",
    "claudeSkills",
    "sidebarResizer",
    "sidebarToggle",
    "versioning",
    "docHistory",
    "llmsTxt",
    "skillSymlinker",
    "footerCopyright",
    "changelog"
  ],
  "cjkFriendly": true,
  "packageManager": "pnpm"
}
```

### Reproducing

1. Save the preset JSON above to a file (e.g. `/tmp/preset.json`).
2. From the repo root: `node $HOME/repos/myoss/zudo-doc/packages/create-zudo-doc/bin/create-zudo-doc.js --preset /tmp/preset.json --yes`
3. `mv zudo-token-panel doc`
4. In `doc/package.json`, change `"name": "zudo-token-panel"` to `"name": "doc"`.
5. In `doc/src/config/settings.ts`, set `base: "/pj/zudo-token-panel/"` and `siteUrl: "https://takazudo.github.io/pj/zudo-token-panel/"`.
6. In `doc/astro.config.ts`, ensure the config passes `site: settings.siteUrl || undefined` to `defineConfig` (alongside the existing `base: settings.base`).
