# External dashboard consumer tryout

From the repository root, after installing dependencies and Playwright Chromium:

```sh
pnpm check:dashboard-consumer --keep --output-dir test-results/dashboard-consumer
```

The command builds the current package, packs it, and installs that exact tarball
with the locally resolved exact Preact, SSR renderer and TypeScript versions in a
unique OS temporary directory outside the workspace. The installed compiler emits
this TSX fixture; plain Node renders the HTML and copies the stylesheet resolved
through `@takazudo/zdtp/dashboard/styles.css`. No source aliases, panel bootstrap,
workspace runtime dependencies or browser JavaScript are involved.

The printed retained directory is an editable small app. Open `dist/index.html`
directly, or use the printed loopback static-server command. Edit `token-data.ts`
or `page.tsx` and run `npm run build` there. Remove that temporary directory when
done. Without `--keep`, it is removed on success and failure. `--skip-build` is
only for callers such as CI that just built the package; it does not check freshness.
Unknown/incomplete options fail. Each subprocess has a five-minute timeout.

`--output-dir` writes only generated HTML, two CSS assets, two screenshots and a
bounded evidence JSON (including tarball/CSS hashes, installed resolutions,
subprocess tails and cleanup status). It never copies the installed node_modules.
Do not use a directory containing unrelated artifacts for CI uploads.

This is one walking skeleton: real tarball → isolated install → strict TSX compile
→ Node SSR → public CSS delivery → JavaScript-disabled browser. Desktop, mobile
and compact embeds check actual ruler lengths and keyboard scrolling, grouped
palette order, light/dark aliases, long escaped CJK specimens and computed font
styles. A fresh page with the public stylesheet deliberately missing must fail
the same style assertion, then a restored fresh page must pass. Network failures
are checked separately, so a random browser error cannot satisfy that control.
Local launches honor the existing machine-wide Playwright guard when available.

This proves the generic Preact/static HTML boundary, not a particular host
framework, actual app configuration, live editing, or published npm availability.
The package's model/renderer tests own token edge-case matrices; existing packed
consumer checks own declaration modes. Add a new browser step only for a new
integration boundary, rather than duplicating those cheaper suites.
