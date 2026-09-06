# @takazudo/zdtp

A live-tweak design-token panel for Astro sites. Drop a single `<DesignTokenPanelHost>` component into your layout, hand it a `PanelConfig`, and your users get an in-page UI for adjusting CSS custom properties (spacing, typography, sizing, color palette + semantic roles). Changes apply instantly to the default `:root` target (or to a configured `applySink`), persist to `localStorage`, and survive view transitions and hard reloads.

The package is portable: every project-specific identifier is driven by the host's `PanelConfig`. Storage keys, console namespace, modal class prefix, schema id, and the entire tab configuration (tiers, items, color cluster extras) are all configured by the consumer. Every config field except the function-valued `applySink` is JSON-serializable, so the configuration crosses the Astro frontmatter → client island boundary without losing fidelity.

The panel uses an **abstract token tier model**: all token categories — spacing, typography, size, and color — are expressed as `TabConfig` / `TierConfig` / `TierItem` structures on `PanelConfig.tabs`. A "ref tier" mechanism lets semantic tokens reference base tokens, and the apply pipeline emits `var(--base-cssvar)` for ref-tier items. See `PORTABLE-CONTRACT.md` §3 for the full tier model spec.

The authoritative API spec is [`PORTABLE-CONTRACT.md`](./PORTABLE-CONTRACT.md). This README is the consumer-oriented translation. When the two disagree, the contract wins — please file an issue against this README.

---

## Features

- Token tabs and tiers for spacing, typography, sizing, color, and host-defined
  token families, with reference-tier aliases and kind-specific editors.
- Fuzzy token search, cross-tab counts, and a `Cmd/Ctrl+K` command palette.
- Changed-row markers, per-row revert, tab badges, **Changed only**, **Copy
  diff**, and **Revert all**.
- Undo/redo history plus persisted A/B snapshots.
- Numeric ramp selection and bulk multiply, add, round-to-step, or set-all
  operations.
- Resolution-chain popovers with dependents, ramp siblings, blast radius, and
  on-demand used-on-page counts.
- Ten-slot token-user highlights, element inspect, element path, and the
  optional DOM Tweaker, coordinated around one Alt+click owner.
- In-panel type, line-height, family, weight, bar, radius, and duration
  previews, plus a host-page specimen rendered with the site's real font.
- Float, right-dock, bottom-dock, mini-pill, ghost-idle, and optional
  body-margin reflow modes.
- Debounced apply previews with file digests and hunks, stale-write protection,
  partial reconciliation, and JSON export/import when disk apply is not
  configured.
- Owner autoload for developer-only loading across page visits.

See the [Panel UX tour](/docs/recipes/panel-ux-tour) for a feature-by-feature
walkthrough and the shortcut table.

---

## 0. Architecture at a glance

The design-token panel is a browser-based UI that writes token overrides to
`:root` by default (or through `PanelConfig.applySink`), with an optional
**apply pipeline** for persisting those overrides back to disk source files.

```
┌─ Your dev server (Astro / Vite / any host) ──────┐
│                                                  │
│  Panel UI (browser)  ←─────────────────────────> │  Host adapter (side-effect import)
│  ↓ (user tweaks)                                  │
│  POST /apply (preview, then confirmed write)     │  Apply endpoint (routes tokens to files)
│  ↓                                                │
└──────────────────────────────────────────────────┘
         │
         │ (HTTP)
         ↓
┌─ design-token-panel bin server ───────────────┐
│ Receives POST /apply preview/write requests    │
│ Validates tokens & paths                      │
│ Rewrites source CSS files atomically          │
│ (respects --write-root sandbox)               │
└──────────────────────────────────────────────┘
```

The **host adapter** import (`@takazudo/zdtp/astro/host-adapter`) is a separate concern: it reads the inline config, installs `window.<namespace>.*`, and gates lazy-load of the panel module. The **apply pipeline** (bin server + endpoint) is optional — hosts that only want export/import omit `applyEndpoint` and `applyRouting` from `PanelConfig`.

---

## 1. What it is

A Preact-rendered side panel that:

- Reads a host-supplied **tab configuration** (`PanelConfig.tabs`) — an array of `TabConfig` entries where each tab owns one or more `TierConfig` objects, each holding an array of `TierItem` entries. Sliders (`length` / `number`), selects, text inputs, color pickers, and pill toggles are all supported via a discriminated `TierValueKind`.
- Supports **abstract tier references**: a `TierConfig` can carry `referencesTier` to point at a base tier; the apply pipeline emits `var(--base-cssvar)` for each ref-tier item, encoding semantic → base token aliasing in the config data model.
- Renders a **color tab** (id `'color'`) from the same tab model — palette and semantic tokens are `TierItem` arrays, and the structural metadata (base roles, scheme registry, panel settings) lives in `TabConfig.colorExtras`.
- Writes every override to the default `document.documentElement.style.setProperty(...)` target (or to the configured `applySink`) against the consumer-supplied CSS-var names — so your stylesheet can be plain CSS, CSS Modules, Tailwind, or anything else.
- Persists state to `localStorage` under a host-chosen prefix and re-applies overrides synchronously on next page load (no FOUT — this is a hard requirement of the contract).
- Exposes a small console API (`window.<namespace>.showDesignPanel()` etc.) so a developer can pop the panel without it being mounted on every page.
- Plugs into Astro's view-transition lifecycle (`astro:before-swap` / `astro:page-load`) so soft navigation does not double-mount the panel.

The package builds against Preact (declared as a `peerDependency`) and ships its own bundled CSS scoped under the `--tokentweak-*` namespace. **It does not require Tailwind** in the consumer; see §11.

> Visual: a screenshot or short capture would go here. Skipped in the v1 README — a placeholder is worse than nothing. See the external example repos linked in §15 for live demos.

**Browser floor:** the panel's own header/tabbar chrome adapts to the panel's *width* (not the viewport) via CSS container queries, which are Baseline 2023 (Safari 16+). The panel is a developer tool used on evergreen browsers, so older browsers simply keep the wide-layout chrome with no JS fallback.

---

## 2. Install

Install from npm. Preact is a peer dependency — bring your own copy so the panel shares one runtime with any other Preact islands you mount.

```sh
pnpm add @takazudo/zdtp preact
```

```jsonc
// consumer/package.json
{
  "dependencies": {
    "@takazudo/zdtp": "^0.1.0",
  },
  "peerDependencies": {
    "preact": "^10.29.1",
  },
}
```

### Peer dependencies

| Peer     | Range      | Why                                                                                                                                     |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `preact` | `^10.29.1` | The panel UI is rendered with Preact. The consumer must bring its own copy so the panel and any other Preact islands share one runtime. |

The package's CSS is self-contained — it ships its own bundled stylesheet under the panel-private `--tokentweak-*` namespace and does not depend on any host design-system package.

---

## 3. Apply pipeline (the bin)

The **bin server** is the recommended — and only supported — way to apply panel tweaks back to disk. When a user clicks "Apply" in the panel UI, the token diff POSTs to a small loopback HTTP server that the bin runs alongside your dev server. The bin computes every file rewrite in memory first and only then commits to disk via atomic temp-file renames, so a failed apply never leaves a half-rewritten CSS file behind.

### 3.1 CLI usage

Install the package alongside your existing dev tooling:

```sh
pnpm add -D @takazudo/zdtp
```

The package ships an executable named `zdtp-server`. Print the help text from inside your consumer repo with either:

```sh
npx zdtp-server --help
# or, with pnpm:
pnpm exec zdtp-server --help
```

**Flags:**

| Flag | Required | Purpose | Default |
|---|---|---|---|
| `--routing <path>` | yes | Path to the routing JSON file (CSS-var prefix family → repo-relative CSS file path). Absolute, or relative to `--root`. See §3.2. | — |
| `--write-root <dir>` | yes | Required write boundary: the only directory tree the bin is allowed to write into. Absolute, or relative to `--root`. | — |
| `--root <dir>` | no | CWD/resolution base used to resolve `--routing` and `--write-root`. | `process.cwd()` |
| `--port <number>` | no | TCP port to bind. `0` asks the OS for an ephemeral port (the bin logs the assigned port on startup). | `24681` |
| `--host <addr>` | no | Bind address. Use `0.0.0.0` to expose on the LAN (off by default). | `127.0.0.1` |
| `--allow-origin <origin>` | repeatable | Origin allowed to POST to `/apply` (scheme + host + port, no trailing slash). At least one is required for any browser to apply. | none (all origins denied) |
| `--quiet` | no | Suppress the startup banner, no-allow-origin warning, and per-request summary logs. | off |
| `--help`, `-h` | no | Print usage and exit 0. | — |

Generic invocation, run from your consumer repo root:

```sh
npx zdtp-server \
  --routing ./panel-routing.json \
  --write-root ./tokens \
  --allow-origin http://localhost:5173
```

The bin reads the routing JSON once at startup and does not hot-reload it. Restart the bin if you edit the routing file.

### 3.2 Routing configuration

The routing JSON is a top-level object mapping a **CSS-var prefix family** (without the leading `--` and trailing `-`) to a **repo-relative CSS file path**. Each path receives the apply pipeline's serialised writes for that prefix family. The keys must match the keys used in your `PanelConfig.applyRouting` (the panel UI loads from this same JSON file — see §5).

Generic example:

```json
{
  "main": "tokens/tokens.css",
  "secondary": "tokens/secondary-tokens.css"
}
```

Each path is resolved against `--root` (which defaults to `process.cwd()`) and must end up inside `--write-root` after resolution — see §3.3.

The host imports the same file as a static JSON module so the panel UI and the bin agree on the routing without two declarations to keep in sync:

```ts
import routing from './panel-routing.json' assert { type: 'json' };
import type { PanelConfig } from '@takazudo/zdtp';

export const panelConfig: PanelConfig = {
  // ... other fields ...
  applyRouting: routing,
  applyEndpoint: 'http://127.0.0.1:24681/apply',
};
```

`applyEndpoint` is the URL the **browser** POSTs to. By default the bin listens on `http://127.0.0.1:24681`, so the panel default of `http://127.0.0.1:24681/apply` "just works" when you keep the bin's defaults. Change `--port` or `--host` and you must update `applyEndpoint` to match.

For the full token-overrides payload schema and the `PanelConfig` shape, see §5 and §6.

**Which CSS blocks the rewriter scans.** Each routed file's rewrite only reaches two locations: the FIRST top-level `:root { ... }` block and the FIRST top-level `@theme { ... }` block (bare `@theme`, or with one modifier such as `@theme inline` — the shape Tailwind v4 prescribes when theme values reference other variables). Later blocks of either kind, and anything nested under `@media` / `@layer` / `@supports`, are not scanned. A cssVar declared in BOTH blocks is rewritten only in `:root` (`:root`-first-match-wins). A file with neither block returns a 409 — see §11 for the Tailwind `@theme` worked example, and [Apply pipeline reference](/docs/reference/apply-pipeline) for the full response-field contract, including the `unknownOutsideBlockCssVars` diagnostic for a cssVar that's declared somewhere in the file but outside both scanned blocks.

### 3.3 Security model

The bin is **dev-only** and is built with three independent guards:

- **Loopback default.** Binds to `127.0.0.1` so only requests from the same machine are accepted. Override with `--host` if you actually want LAN access.
- **Write sandbox (`--write-root`).** `--write-root` is required and defines the narrow directory tree the bin is allowed to write into. Every routing entry is resolved against `--root` and verified to sit strictly inside `--write-root` before any file I/O happens. An entry whose resolved path escapes the sandbox — via `..` segments or an absolute path that points elsewhere — fails the apply with a 400 and a descriptive error message. `--root` is the CWD/resolution base for relative `--routing` and `--write-root` paths and defaults to `process.cwd()`.
- **CORS allow-list.** By default, **all origins are denied**. To let a browser POST to `/apply` you must list its origin explicitly with `--allow-origin <url>` (repeatable). Without a matching `--allow-origin`, the OPTIONS preflight returns 403 and POST returns 403 — no `Access-Control-Allow-Origin` header is emitted. Origin matching is **verbatim** on the full scheme + host + port string: `http://localhost:5173` and `http://127.0.0.1:5173` are different origins.

**Atomic writes.** The bin serialises per-file writes through a small mutex and uses a write-temp-file-then-rename strategy, so a failure mid-write never leaves a half-rewritten CSS file on disk. If any file in a multi-file apply fails to write, every file that was already persisted is restored from the in-memory snapshot taken before the apply started.

### 3.4 Lifecycle & signal handling

While the bin is running it exposes a tiny HTTP surface:

- **`GET /healthz`** — returns `200 OK` with `{"ok":true,"writeRoot":"…","routing":"…","port":…}` once the listener is up. Useful for dev-server readiness checks.
- **`OPTIONS /apply`** — CORS preflight. Returns `204` with `Access-Control-Allow-{Origin,Methods,Headers,Max-Age}` headers when the request's `Origin` is on the allow-list, and `403` otherwise.
- **`POST /apply`** — applies a token-overrides payload via the apply pipeline. The body is `application/json` with a top-level `tokens` object whose keys are CSS-var names (e.g. `--brand-primary`) and whose values are CSS values. See §6 for the full token-manifest schema and §6.5 for apply-time behaviour. A non-JSON content type returns `415`; an unallowed origin returns `403`.
- **Anything else** — `404` for unknown paths and `405` for unsupported methods on `/apply`.

The bin is intended to run as a subprocess of your dev server (`concurrently`, `npm-run-all`, a custom Node wrapper, etc.) and exits cleanly under host control:

- **SIGINT / SIGTERM.** The HTTP server stops accepting new connections, in-flight requests are allowed to drain, then the process exits 0. A 5-second belt-and-suspenders timeout force-exits if `close` hangs on a lingering keep-alive socket.
- **EADDRINUSE.** If the requested `--port` is already bound, the bin writes a friendly `port <n> already in use` line to stderr and exits with code 1, so the host supervisor can decide whether to retry or escalate.

### 3.5 Running the bin from a non-Astro host (Vite, Next, Rollup, anything)

The bin is framework-agnostic. Any consumer that has a long-running dev server can launch the bin alongside it. Two common shapes:

**A) `concurrently` (or `npm-run-all`) in `package.json`:**

```json
{
  "scripts": {
    "dev": "concurrently --kill-others-on-fail --names dev,panel \"vite\" \"zdtp-server --routing panel-routing.json --write-root ./tokens --allow-origin http://localhost:5173\""
  }
}
```

`--kill-others-on-fail` (or `concurrently -k`) ensures SIGINT propagates from the host runner to the bin when you Ctrl-C the dev server.

**B) A small Node wrapper that spawns the bin as a child process and proxies `SIGINT`:**

```ts
// scripts/dev-with-panel.ts
import { spawn } from 'node:child_process';

const bin = spawn(
  'zdtp-server',
  [
    '--routing', 'panel-routing.json',
    '--write-root', './tokens',
    '--allow-origin', 'http://localhost:5173',
  ],
  { stdio: 'inherit', shell: false },
);

const forward = (signal: NodeJS.Signals): void => {
  bin.kill(signal);
};
process.on('SIGINT', forward);
process.on('SIGTERM', forward);

bin.on('exit', (code) => process.exit(code ?? 0));
```

Whichever shape you pick, the wiring is the same: the bin listens on `http://127.0.0.1:24681/apply` by default, and the panel runtime POSTs to `PanelConfig.applyEndpoint`. Keep the bin's defaults and the default endpoint matches; if you change `--port` or `--host`, update `applyEndpoint` accordingly.

---

## 4. Consumer recipes

The panel package is portable — every config field is host-supplied. Below are worked integration paths for different contexts.

### 4.1 Consumer recipes — Astro

Minimal end-to-end wiring — five steps, drop-in for a new Astro project.

### 4.1.1 Define your panel config

`PanelConfig.tabs` is the required data field. Each `TabConfig` carries one or
more `TierConfig` objects, each holding an array of `TierItem` entries. The
color tab (id `'color'`) additionally requires a `colorExtras` field.

```ts
// src/lib/my-panel-config.ts
import type { PanelConfig, TabConfig, TierConfig, TierItem } from '@takazudo/zdtp/astro';

const spacingTier: TierConfig = {
  id: 'base',
  label: 'Base spacing',
  items: [
    {
      id: 'spacing-md',
      cssVar: '--myapp-spacing-md',
      label: 'Spacing M',
      default: '1rem',
      type: { kind: 'length', step: 0.0625, unit: 'rem' },
    },
  ],
};

const spacingTab: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [spacingTier],
};

export const myPanelConfig: PanelConfig = {
  storagePrefix: 'myapp-design-token-panel',
  consoleNamespace: 'myapp',
  modalClassPrefix: 'myapp-design-token-panel-modal',
  schemaId: 'myapp-design-tokens/v1', // display-only label — see §5.3; import/export always use the canonical SCHEMA_V1/V2/V3
  exportFilenameBase: 'myapp-design-tokens',
  tabs: [spacingTab /*, fontTab, sizeTab, colorTab, ... */],
};
```

For a full worked color tab example (palette tier + semantic tier +
`colorExtras`), see the external example repos linked in §15.

### 4.1.2 Drop the host into your layout

The `<DesignTokenPanelHost>` component AND a paired `<script>` block that loads the host adapter are a **single unit** — both lines are required, always together. Do not omit the script tag.

```astro
---
// src/layouts/Layout.astro
import { ClientRouter } from 'astro:transitions';
import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro';
import { myPanelConfig } from '../lib/my-panel-config';
// No CSS import needed — the panel self-injects its stylesheet on first mount.
// import '@takazudo/zdtp/styles'; // optional: pull CSS into your own pipeline
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <ClientRouter />
  </head>
  <body>
    <slot />
    <DesignTokenPanelHost config={myPanelConfig} />
  </body>
</html>

<script>
  // Required side-effect load — see §12.1 for the rationale. Use a dynamic
  // `void import(...)` here, NOT a top-level `import '...';` statement.
  void import('@takazudo/zdtp/astro/host-adapter');
</script>
```

That is the entire integration. `<DesignTokenPanelHost>` emits a JSON `<script>` with the serialized config; the paired `<script>` block above loads the host adapter — which reads that JSON, calls `configurePanel(...)` synchronously, installs `window.myapp.{showDesignPanel, hideDesignPanel, toggleDesignPanel}`, and lazy-loads the panel module only when the user has saved overrides or opens it via the console API.

### 4.1.3 Open the panel

```js
// In the browser devtools console
window.myapp.toggleDesignPanel();
```

Or use the fixed-name `zdtp` global — no need to remember your own
`consoleNamespace`:

```js
// In the browser devtools console — works regardless of consoleNamespace
zdtp.show();
zdtp.hide();
zdtp.toggle();
```

`zdtp.show()` / `hide()` / `toggle()` are console sugar for the exact same
open/close verbs `window.myapp.*` exposes (see §10 for the full contract) —
`window.myapp.*` keeps working unchanged. On an Astro page, `zdtp.*` is
available as soon as the host-adapter script has run, even before the panel
bundle itself has loaded.

Or wire a hidden keyboard shortcut / dev-only button to call the same helper.

### 4.1.4 Stylesheet (self-injected — no consumer import required)

The panel injects its own stylesheet at runtime. When the panel first mounts, `ensurePanelStyles()` (called from `ensureMounted()` in `src/index.tsx`) appends a `<style>` element to `document.head` carrying the bundled CSS. The CSS is embedded in the JS bundle as a string via a `?inline` import, so it survives Vite library mode's build step and reaches the browser without any consumer-side stylesheet import.

**You do not need to import `@takazudo/zdtp/styles`** — the panel is visually self-contained out of the box.

The `./styles` (alias `./styles.css`) sub-export still resolves to `./dist/zdtp.css` and remains available if you prefer to pull the CSS into your own stylesheet pipeline (e.g. for SSR hydration, PostCSS processing, or bundler-level deduplication). This import is now optional:

```ts
// Optional — pull CSS into your own pipeline if needed
import '@takazudo/zdtp/styles';
```

If the panel looks unstyled after mounting, the most likely cause is that the panel module itself failed to load (network error, bundler misconfiguration, missing `preact` peer). The stylesheet is self-injected by the same JS that mounts the panel — if the JS ran, the CSS is present. See §12 for further notes on bundler behaviour.

### 4.1.5 Why the host-adapter import lives in your wrapper

The host-adapter `<script>` block in §4.1.2 is the second half of the paired-unit contract. It must live in YOUR layout, not inside the package's `<DesignTokenPanelHost>` component.

The package's distributed Astro surface ships built `dist/astro/*` files, and the package-side hoisted `<script>` from those built files does not reliably reach production page bundles — Vite/Rollup processes the import, recognizes it as resolving to a file outside the consumer's source tree, emits an empty chunk, and never links it from any page entry. Owning the host-adapter import in the consumer wrapper sidesteps that pipeline issue.

The recommended form is a dynamic `void import('...')` — it loads the host-adapter chunk off the critical path (mirroring the existing color-presets lazy-loader pattern) and is robust to future packaging changes. A top-level `import '...';` also works because the package's `sideEffects` list explicitly includes `dist/astro/host-adapter.js` so Rollup preserves the import.

For the regression-guard tests that pin this contract, see `package-exports.test.ts` under the package's test suite.

### 4.2 Consumer recipes — any framework / Rust SSG

The Astro recipe above shows the case where a host owns the config import and the host-adapter side-effect import. For non-Astro hosts (Vite SPA, Rust SSG, custom framework) the pattern is the same, just without Astro-specific syntax.

**Worked example:** the [Astro](https://github.com/Takazudo/zudo-design-token-panel-example-astro), [Vite + React](https://github.com/Takazudo/zudo-design-token-panel-example-vite-react), and [Next.js](https://github.com/Takazudo/zudo-design-token-panel-example-nextjs) example repos prove the contract end-to-end. Each ships:

- A host-side config file with deliberately different names (e.g. explicit `--astro-palette-0` / `--astro-palette-1` items, `astro` namespace).
- A routing JSON file at the example's root.
- A bin invocation via `concurrently` in the dev script, pointing at that routing file.

Copy an example's structure when porting the panel into a new host.

If you are building a **Rust SSG** or other non-Node host, the bin still runs as a sidecar Node.js subprocess (started by your host's build orchestration). The same routing JSON and host-adapter setup applies — the only difference is your host ships its own config format (not TypeScript) and you invoke the bin via your build system's subprocess spawner rather than npm scripts.

#### Pre-import activation from a custom host

The side-effect-free `@takazudo/zdtp/constants` subpath exposes
`DEFAULT_STORAGE_PREFIX`, `DEFAULT_TOGGLE_EVENT`, and
`resolveToggleEventName` without importing the panel. It also exports the
machine-readable eager-load metadata (`EAGER_LOAD_GATE_KEY_SUFFIXES` and
`EAGER_LOAD_GATE_STATE_FAMILY`); the exact gate contract lives in
[`PORTABLE-CONTRACT.md`](./PORTABLE-CONTRACT.md) §6.2.

A custom host can use those constants to register its toggle listener in the
initial bundle and fetch the panel only when activated. Keep the stylesheet
setup from §4.2 (or import `@takazudo/zdtp/styles` in your host stylesheet
pipeline):

```ts
import type { PanelConfig } from '@takazudo/zdtp';
import { resolveToggleEventName } from '@takazudo/zdtp/constants';

// Call once with your complete config (for example myPanelConfig in §4.1.1).
export function installLazyPanel(config: PanelConfig): void {
  const toggleEvent = resolveToggleEventName(config);
  let loading: Promise<void> | undefined;

  function loadOnToggle(): void {
    if (loading) return;
    loading = import('@takazudo/zdtp')
      .then(({ configurePanel }) => {
        configurePanel(config);
        window.removeEventListener(toggleEvent, loadOnToggle);
        window.dispatchEvent(new CustomEvent(toggleEvent));
      })
      .catch((error: unknown) => {
        loading = undefined;
        console.error('Failed to load @takazudo/zdtp', error);
      });
  }

  window.addEventListener(toggleEvent, loadOnToggle);
}
```

The default `DEFAULT_STORAGE_PREFIX` is
`'zudo-design-token-panel'`, and its `DEFAULT_TOGGLE_EVENT` is
`'toggle-design-token-panel'`. `resolveToggleEventName` preserves that
historical event even when a default-prefix config supplies `toggleEvent`; a
non-default prefix uses its supplied `toggleEvent`, or derives
`toggle-${storagePrefix}` when the override is omitted. The same config
resolves the listener event and configures the loaded panel. This activation-only
example does not implement the saved-state eager-load gate; see §6.2 of the
contract when building a complete host adapter.

### 4.3 Recipe — Rust SSG (zfb)

Worked example for the case where the host is a Rust dev server (e.g. [zfb / zudo-front-builder](https://github.com/Takazudo/zudo-front-builder)) rather than a Node-based runner. The bin itself is unchanged — it remains a Node.js subprocess invoked as `node path/to/dist/bin/server.js ...`. The Rust host's only job is to spawn that Node process, forward shutdown signals to it, and configure `--allow-origin` so the browser POST from the panel UI is accepted.

The actual flag surface is `--routing`, `--write-root`, and `--allow-origin` (required), plus optional `--root`, `--host`, `--port`, `--quiet`. See `src/bin/parse-args.ts` for the authoritative list. **`--allow-origin` is repeatable and is required for any browser to issue the apply POST**, so pass your dev server's exact origin (scheme + host + port, no trailing slash).

#### Async (preferred): `tokio::process::Command`

```rust
use std::process::Stdio;
use tokio::process::{Child, Command};
use tokio::signal::unix::{signal, SignalKind};

async fn spawn_design_token_panel_bin() -> std::io::Result<Child> {
    // Resolve the bin path however your host prefers — e.g. `node_modules/.bin`
    // discovery, a config-supplied absolute path, or a fixed workspace layout.
    let bin = "node_modules/@takazudo/zdtp/dist/bin/server.js";

    // (Path is shown explicitly; in practice your host's npm script runner
    // resolves the bin via the package's `bin` field and `node_modules/.bin`.)

    let mut child = Command::new("node")
        .arg(bin)
        .arg("--routing").arg("./design-tokens.routing.json")
        .arg("--write-root").arg("./src/styles")
        // Repeat --allow-origin for each origin your dev UI runs on.
        .arg("--allow-origin").arg("http://localhost:8080")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        // Important: do NOT set `kill_on_drop(true)` here — we forward signals
        // explicitly below so the bin can finish in-flight writes cleanly.
        .spawn()?;

    // Forward Ctrl-C / SIGTERM so the bin shuts down gracefully when the
    // Rust dev server exits.
    let pid = child.id().map(|p| p as i32);
    tokio::spawn(async move {
        let mut sigint = signal(SignalKind::interrupt()).expect("sigint handler");
        let mut sigterm = signal(SignalKind::terminate()).expect("sigterm handler");
        tokio::select! {
            _ = sigint.recv() => {}
            _ = sigterm.recv() => {}
        }
        if let Some(pid) = pid {
            // SAFETY: we only signal a child we just spawned, and `kill(2)` with
            // SIGTERM is the documented graceful-shutdown path for the bin.
            unsafe { libc::kill(pid, libc::SIGTERM); }
        }
    });

    Ok(child)
}
```

#### Sync fallback: `std::process::Command`

If your host is sync (no Tokio runtime), `std::process::Command` works the same way — spawn the Node process with identical args, then handle SIGINT / SIGTERM on whatever signal-handling primitive your host already uses (e.g. `ctrlc::set_handler` or a hand-rolled `signal_hook` listener), and call `libc::kill(child.id() as i32, libc::SIGTERM)` from the handler. The flag surface and lifecycle contract are identical to the async case.

#### Note on origin matching

`--allow-origin` is matched verbatim against the `Origin` request header — `http://localhost:8080` and `http://127.0.0.1:8080` are different origins. Pass each dev origin you actually serve from. Cross-origin POSTs without a matching `--allow-origin` value receive a 403 with no `Access-Control-Allow-Origin` header.

#### Upstream tracking

The zfb (zudo-front-builder) integration is documented in that project's own repository; this README is docs-only and does not require any zfb repo changes.

---

## 5. `configurePanel()` and the `PanelConfig` shape

`configurePanel(config)` is the multi-instance init. It returns a `PanelInstanceHandle`. The Astro host adapter calls it for you (it reads the inline JSON config emitted by `<DesignTokenPanelHost>` and forwards it). For a non-Astro host, you would call `configurePanel(myPanelConfig)` yourself before the panel adapter is dynamically imported.

```ts
import { configurePanel, type PanelConfig } from '@takazudo/zdtp';

const handle = configurePanel(myPanelConfig);
// handle.instanceId === myPanelConfig.storagePrefix
// handle.open() / close() / toggle() / destroy()
```

### 5.1 Behaviour

- **Multi-instance.** Call `configurePanel` with a **distinct** `storagePrefix` to register an independent panel instance (independent storage keys, DOM root, toggle event, and apply target). No throw.
- **Idempotent for same prefix+config.** Calling `configurePanel` again with the same `storagePrefix` and structurally-equal config values is a no-op and returns the same handle. This covers Astro view-transition reruns that re-parse the inline JSON config.
- **Same-prefix-different-config THROWS.** Calling `configurePanel` with an already-registered prefix but a different config throws immediately. To re-configure a prefix, call `handle.destroy()` first, then `configurePanel` again.
- **Synchronous, no I/O.** The call must be cheap enough to run inline at module init.
- **JSON-serializable input (except `applySink`).** Every nested field other than `applySink` MUST round-trip through `JSON.stringify` / `JSON.parse` without loss. `applySink` carries function references and must not be passed through the Astro inline JSON config.

### 5.2 `PanelInstanceHandle`

```ts
export interface PanelInstanceHandle {
  /** Stable instance id — equal to the instance's `storagePrefix`. */
  readonly instanceId: string;
  open(): void;   // show this instance's panel
  close(): void;  // hide this instance's panel
  toggle(): void; // toggle open/closed
  /**
   * Deregister this instance. Unmounts Preact tree, removes DOM root,
   * unbinds toggle-event listener. Prefix can then be re-configured.
   */
  destroy(): void;
}
```

`open()` / `close()` / `toggle()` are the same primitives both
`window.myapp.*` (§10) and the fixed-name `window.zdtp.*` global (§10) wrap
for the **default** (most-recently-configured) instance. On a page with more
than one instance, call `handle.open()` / `.close()` / `.toggle()` directly
on the specific instance's handle — `window.zdtp.*` always targets the
default instance only.

### 5.3 Field summary

| Field                | Type                           | Purpose                                                                                                                                                                |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storagePrefix`      | `string`                       | Base for every derived `localStorage` key. Also the instance id. See §9.                                                                                               |
| `consoleNamespace`   | `string`                       | Global object the package installs `showDesignPanel` / `hideDesignPanel` / `toggleDesignPanel` on (e.g. `consoleNamespace: 'myapp'` → `window.myapp.showDesignPanel`). |
| `modalClassPrefix`   | `string`                       | BEM root class for every modal the panel owns (export, import, apply). Emits `${prefix}__overlay`, `${prefix}__panel`, etc.                                            |
| `schemaId`           | `string`                       | **Display-only** label returned by `getDesignTokenSchema()`. The built-in import/export UI does not read it; `serialize()` emits canonical `SCHEMA_V2`/`SCHEMA_V3` and `deserialize()` validates canonical `SCHEMA_V1`/`V2`/`V3`. See §14's migration recipe. |
| `exportFilenameBase` | `string`                       | Default download filename base — exports save as `${exportFilenameBase}.json`.                                                                                         |
| `toggleEvent`        | `string` (optional)            | Window-event name that toggles THIS instance. Defaults to `toggle-${storagePrefix}` for non-default instances; the default instance keeps `toggle-design-token-panel`. |
| `tabs`               | `readonly TabConfig[]`         | **Required.** Tab strip data — each entry is a tab with one or more `TierConfig` objects. The color tab (id `'color'`) additionally requires `colorExtras`. See §6.    |
| `colorPresets`       | `Record<string, ColorScheme>` (optional) | Optional named scheme presets surfaced in the Color tab "Scheme..." dropdown. Defaults to `{}`. See §7.4.                                              |
| `applyEndpoint`      | `string` (optional)            | Browser POST target for apply previews and confirmed writes. See §3 and [Apply pipeline reference](/docs/reference/apply-pipeline).                                          |
| `applyRouting`       | `Record<string, string>` (optional) | CSS-var prefix-family to repo-relative CSS-file routing map used by the apply endpoint.                                                                                   |
| `applySink`          | `ApplySink` (optional)         | Optional sink that routes this instance's CSS-var writes off `:root`. See §5.4. Not JSON-serializable — do not include in Astro inline config.                        |
| `domTweaker`         | `DomTweakerConfig` (optional)  | Enables the development-only Tailwind class editor and its Alt+click owner. See [DOM Tweaker reference](/docs/reference/dom-tweaker).                                      |
| `dock`               | `PanelDockConfig` (optional)   | Controls right/bottom host reflow. Defaults to `{ reflow: 'body-margin' }`; see [configurePanel](/docs/reference/configure-panel#dock--optional-host-reflow).                    |
| `legacyIdRenameMap`  | `Record<string, string \| null>` (optional) | Maps renamed persisted ids to new ids, or drops ids with `null`, during load.                                                                                              |
| `autoRememberOnOpen` | `boolean` (optional)           | Whether opening the panel (any of the auto-remember call sites — see §10.1) writes the `:autoload` flag with `'auto'` provenance. Defaults to `true`. Set `false` for a public site that wants a panel-open button visible to every visitor without arming owner-mode for whoever clicks it. `enableAutoload()`'s explicit `'1'` write is unaffected either way. See §10.1's Auto-remember footgun. |

### 5.4 `applySink` — optional write target

When `PanelConfig.applySink` is set for an instance, all CSS-var writes and clears for that instance route through the sink rather than `document.documentElement`. This enables embedding the panel in a shadow root, iframe, or test spy without touching `:root`.

```ts
export interface ApplySink {
  /** Upsert the given var name→value pairs on the sink target. */
  apply(pairs: ReadonlyArray<readonly [string, string]>): void;
  /** Remove the given var names from the sink target. */
  clear(names: readonly string[]): void;
}
```

Key behaviours:

- `apply` = **upsert**: set each named CSS var on the sink target.
- `clear` = **remove**: remove each named CSS var from the sink target.
- **Reset clears the full token set**: when the user clicks Reset, `sink.clear` receives every var the instance can own (not just dirty vars) so the sink target is fully cleaned.
- **Sink errors are non-fatal**: `console.warn` is emitted and the apply pipeline continues.
- **The host owns the sink target's lifecycle.** Keep the sink target alive as long as the panel instance is alive.
- **Not JSON-serializable.** Supply it after `configurePanel` via a custom adapter or by constructing the config object with the sink already attached.

```ts
// Example: routing to a shadow root
const shadow = shadowHost.attachShadow({ mode: 'open' });

const handle = configurePanel({
  storagePrefix: 'myapp-shadow-panel',
  // ...other required fields...
  applySink: {
    apply(pairs) {
      for (const [name, value] of pairs) {
        (shadow.host as HTMLElement).style.setProperty(name, value);
      }
    },
    clear(names) {
      for (const name of names) {
        (shadow.host as HTMLElement).style.removeProperty(name);
      }
    },
  },
});
```

### 5.5 Mount strategy & auto-mount

The Astro entry point (`<DesignTokenPanelHost>`) handles mounting for you. Internally:

- The console API (`showDesignPanel` etc.) is **always installed eagerly**, even when the panel module has not loaded — calling them is what triggers the lazy import for cold-start users.
- The panel module is **dynamically imported on first need**: when the user calls a console helper, OR when first-paint detects any of these gate signals in `localStorage` — `${storagePrefix}:visible` set to `1` or its `${storagePrefix}-open` mirror set to `1`, persisted overrides (a content check across the `${storagePrefix}-state` family — `-state` (v1) through every `-state-vN` — rather than a presence check on a specific version key; see §9), the owner-autoload flag (`${storagePrefix}:autoload` set to `'1'` or `'auto'`), or the element-path inspector enabled. `${storagePrefix}-domtweaker-enabled` is also a gate signal when `domTweaker` is configured.
- This gating keeps the panel bundle out of the initial JS payload for first-time visitors while still re-applying overrides on hard reload for users who have tweaked things. **General visitors** (none of these signals set) pay no panel-bundle cost; the small host adapter/config bootstrap still runs.

For a Vite-only / non-Astro host, mount it yourself by importing the adapter module after `configurePanel(...)`. See §8.5.

### 5.6 First-open geometry

The first time an instance opens with no persisted position, the panel picks its position and size together as one coherent rectangle, not as two independently-computed values:

- **Size first, position from that size.** The default size follows the historical `min(1200, 0.8·vw) × min(800, 0.8·vh)` rule, clamped to a minimum floor and the viewport. The default position then centers _that same clamped rectangle_. Position and size can no longer disagree about the panel's width — they used to be computed separately, which could center a wider phantom panel than the one actually rendered and spawn it partly off-screen on a narrow viewport.
- **Always contained in the viewport.** The centered position is run through a containment clamp before use, so the whole panel — not just a grabbable strip of it — sits inside `[0, innerWidth]` × `[0, innerHeight]`. This holds at every viewport width, including phone widths, and it holds for a *persisted* size too: an instance that has a saved size but no saved position (the user resized the panel without ever dragging it) is centered and contained against that saved size, not against the default one.
- **Instance-aware: concurrent panels cascade apart.** Each additional concurrently-mounted instance offsets its own fresh-open position by 24px on both axes. Each `storagePrefix` persists its allocated ordinal, so an Astro body swap restores the same cascade position even when remount order differs from original open order. With no valid stored ordinal, allocation uses mount order with lowest-free-slot reuse and then records the result. Unmounting always releases the live claim: a departed instance's retained identity does not reserve a slot, and a later panel may reuse it. If two prefixes contain the same ordinal, the already-live holder keeps it and the later claimant takes and persists the lowest free slot. Two instances opened at once therefore don't spawn stacked exactly on top of each other.
- **A persisted position always wins.** The cascade offset applies only to the fallback used when an instance has no saved position yet. A panel the user has dragged (and which got saved) reopens exactly where it was left, regardless of how many sibling instances happen to be mounted.
- **Containment beats distinctness.** These two guarantees are not both promised unconditionally — on a viewport with no spare room, the 24px cascade shrinks toward whatever slack is left, down to a 0px offset, rather than pushing a panel outside the viewport. Two instances' first-open positions may then coincide. Each axis degrades independently: at a 320px viewport width the horizontal offset collapses to 0 once the minimum-width floor eats all the spare width, while the vertical offset may still cascade its full 24px if vertical slack remains.
- **A different, stricter rule than the drag-recovery clamp.** Once a panel has been dragged, its position is governed by a separate, deliberately permissive clamp: it only guarantees a small grip of the panel's header stays on-screen so the user can drag it back, and otherwise allows the panel to hang off any edge. That drag clamp is unchanged and keeps applying after a drag; the full-containment guarantee above is specific to the first-open fallback position and does not carry over once the user has moved the panel.

---

## 6. Tab / tier model schema

All token categories are expressed through the tab/tier model on
`PanelConfig.tabs`. See `PORTABLE-CONTRACT.md` §3 for the authoritative
spec; this section is the consumer-oriented summary.

### 6.1 `TierItem`

```ts
export type TierValueKind =
  | { kind: 'length'; step: number; unit: string; units?: readonly string[] }
  | { kind: 'number'; step: number; unit?: string }
  | { kind: 'select'; options: readonly string[] }
  | { kind: 'text' }
  | { kind: 'cursor' }
  | { kind: 'content' }
  | { kind: 'mask-image' }
  | { kind: 'color'; format?: 'hex' | 'oklch' };

export interface TierItem {
  /** Stable id used as the key in persisted state (e.g. `hsp-2xs`). */
  id: string;
  /** CSS custom property written to the default root or configured apply sink (e.g. `--myapp-spacing-md`). */
  cssVar: string;
  /** Display label shown in the panel row. */
  label: string;
  /** Default value as a CSS string (`0.125rem`, `12px`, etc.). */
  default: string;
  /** Discriminated union describing the control kind and its metadata. */
  type: TierValueKind;
  /** Opt-in pill toggle. */
  pill?: { value: string; customDefault: string };
  /** Read-only items are displayed but not editable. */
  readonly?: true;
}
```

### 6.2 `TierConfig` and `TabConfig`

```ts
export interface TierConfig {
  id: string;
  label: string;
  items: readonly TierItem[];
  /**
   * When set, this tier's items hold references — each item's `default` is
   * the id of an item in the tier whose id matches `referencesTier`. The
   * apply pipeline emits `var(--target-cssvar)` for ref-tier items.
   */
  referencesTier?: string;
  /** Marks a color tier as semantic data rather than a palette tier. */
  semantic?: true;
  /** Allowed ramp sources for per-row semantic references on color tabs. */
  referencesRamps?: readonly { tab?: string; tier: string }[];
  /** Optional visual preview rendered for this tier in the panel. */
  preview?: 'size' | 'line-height' | 'family' | 'weight' | 'bar' | 'radius' | 'duration';
  /** CSS variable used as the base for a preview, when supplied. */
  previewBase?: string;
}

export interface TabConfig {
  id: string;
  label: string;
  tiers: readonly TierConfig[];
  /** Required on color tabs (id 'color' / 'color-secondary'). */
  colorExtras?: ColorClusterExtras;
  /** Required on the reserved 'notes' tab; forbidden on other tabs. */
  notesExtras?: NotesExtras;
}

export interface NotesExtras {
  title: string;
  html: string;
}
```

### 6.3 Worked example — spacing tab

```ts
// src/lib/my-tabs/spacing-tab.ts
import type { TabConfig } from '@takazudo/zdtp';

export const spacingTab: TabConfig = {
  id: 'spacing',
  label: 'Spacing',
  tiers: [
    {
      id: 'base',
      label: 'Base spacing',
      items: [
        {
          id: 'spacing-md',
          cssVar: '--myapp-spacing-md',
          label: 'Spacing M',
          default: '1rem',
          type: { kind: 'length', step: 0.0625, unit: 'rem' },
        },
      ],
    },
  ],
};
```

### 6.4 Helpers (re-exported)

| Helper              | Signature                                                                        | Purpose                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `parseNumericValue` | `(value: string) => number \| null`                                              | Strip the numeric portion from a CSS length string (`'1.5rem'` → `1.5`). Returns `null` for unparseable input (e.g. `clamp(...)`). |
| `formatValue`       | `(n: number, unit: string) => string`                                            | Re-format a numeric slider value back into the stored string form (`(1.5, 'rem')` → `'1.5rem'`).                               |
| `isLengthKind` / `isNumberKind` / `isSelectKind` / `isTextKind` / `isColorKind` / `isCursorKind` / `isContentKind` / `isMaskImageKind` | `(v: TierValueKind) => boolean` | Kind narrowing helpers for `TierValueKind`. |

### 6.5 Apply behaviour

The panel walks each `TierItem` on apply:

- If `readonly`, the row is display-only — no writes.
- For a **base tier item**: if the override map has a non-empty string for
  `id`, the panel writes `item.cssVar` ← value. Otherwise it removes the
  inline property so the consumer's stylesheet default wins.
- For a **ref-tier item** (`referencesTier` set): the persisted value is the id
  of an item in the referenced base tier. The apply pipeline emits
  `var(--base-tier-cssvar)` as the written value.

The default write target is `:root` (`document.documentElement`). An instance
with `PanelConfig.applySink` set routes writes through the sink instead — see
§5.4 for the full sink contract.

---

## 7. Color tab schema

The color tab — palette + base roles + semantic table + scheme registry — is
expressed as a `TabConfig` with `id: 'color'` and a `colorExtras` field.
Palette and semantic tokens are `TierItem` entries in the tab's `tiers`;
`colorExtras` carries the structural metadata. See `PORTABLE-CONTRACT.md` §4
for the authoritative spec; this section is the consumer-oriented summary.

### 7.1 `ColorClusterExtras`

```ts
export type BaseRoleKey = 'background' | 'foreground' | 'cursor' | 'selectionBg' | 'selectionFg';

export interface ColorClusterExtras {
  /** Stable id — used for debugging / logging only. */
  id: string;
  /** Optional human-visible label for the Color tab section headings. */
  label?: string;
  /** base-role name → CSS custom-property name. A cluster MAY declare a subset. */
  baseRoles: Partial<Record<BaseRoleKey, string>>;
  /** Fallback palette indices when a scheme omits a base role. */
  baseDefaults: Partial<Record<BaseRoleKey, number>>;
  /** Fallback `shikiTheme` when a scheme lacks one. */
  defaultShikiTheme: string;
  /**
   * Bundled scheme registry — keyed by display name. The Scheme… dropdown
   * lists these. Pass `{}` for clusters that don't use schemes.
   */
  colorSchemes: Record<string, ColorScheme>;
  /** Panel-level scheme settings (seed scheme name + optional light/dark pairing). */
  panelSettings: {
    colorScheme: string;
    colorMode: false | { defaultMode: 'light' | 'dark'; lightScheme: string; darkScheme: string };
  };
  /**
   * Optional config-time override map for a semantic tier's derived defaults,
   * keyed by semantic item id. This is the ONLY way to ship a `{ literal }` /
   * `{ literal: { light, dark } }` / `{ ref }` default — `TierItem.default`
   * itself stays a plain string, consumed generically by every tab kind.
   */
  semanticDefaults?: Record<string, SemanticValue>;
}

export interface ColorScheme {
  background: number | string;
  foreground: number | string;
  cursor: number | string;
  selectionBg: number | string;
  selectionFg: number | string;
  palette: readonly string[]; // the public type requires exactly 16 entries
  shikiTheme?: string;
  semantic?: Record<string, number | string>;
}
```

> **Public alias** — the runtime type in `src/config/` is
> `ColorClusterDataConfig`. `ColorClusterConfig` is the public-facing alias
> re-exported from the package root:
> `import type { ColorClusterConfig } from '@takazudo/zdtp'`.

**`colorExtras.semanticDefaults`.** Without this field, a semantic tier's default `SemanticValue` is DERIVED from each `TierItem.default` string (palette-index lookup, or a literal fallback). `semanticDefaults` lets a host override that derivation for specific semantic item ids and ship a default the plain-string `default` field can't express — most usefully a per-mode literal that resolves via CSS `light-dark()`:

```ts
const colorTab: TabConfig = {
  id: 'color',
  label: 'Color',
  tiers: [paletteTier, semanticTier],
  colorExtras: {
    id: 'myapp',
    baseRoles: { background: '--myapp-bg', foreground: '--myapp-fg' },
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: { /* ... */ },
    panelSettings: { colorScheme: 'Default', colorMode: false },
    semanticDefaults: {
      // Keyed by the semantic TierItem's `id`, not its cssVar.
      danger: { literal: { light: '#b91c1c', dark: '#f87171' } },
    },
  },
};
```

A key present in `semanticDefaults` wins verbatim over the derived value; keys not listed fall back to the normal derivation from `TierItem.default`.

### 7.2 JSON-serializable constraint (important)

**Every field on the color `TabConfig` (including `colorExtras` and every
`ColorScheme` it nests) MUST be JSON-serializable.** No function fields, no
class instances. The Astro adapter stringifies the whole config into a
`<script type="application/json">` element and `JSON.parse`s it back at
runtime.

Palette CSS-var names are expressed as `TierItem.cssVar` strings (one per
palette slot), not as a function template — functions silently disappear under
the JSON round-trip.

### 7.3 Apply behaviour

For each palette `TierItem` in the palette tier, the panel writes
`item.cssVar` ← `palette[i]` from the active scheme / user override. For
each declared base role, the live DOM apply path writes the role's CSS-var ←
`palette[state[roleKey]]`. The disk `buildApplyOverrides` payload
intentionally contains palette and semantic CSS variables only; base roles are
runtime wiring and are not emitted into source-file rewrites.
For each semantic `TierItem`, it resolves the mapping and writes the emitted
CSS value: `var(...)` for a palette/reference mapping, a literal string for a
literal mapping, or `light-dark(light, dark)` for a per-mode literal.

Roles absent from `colorExtras.baseRoles` are not written, so a minimalist
cluster (just `background` + `foreground`) is fine.

### 7.4 Host-supplied scheme presets — `colorPresets`

The Color tab's "Scheme..." dropdown surfaces named `ColorScheme` entries. Two sources feed it:

1. **`colorExtras.colorSchemes`** — the color tab's bundled scheme registry. Always present, typically holds your default scheme(s) (`"Default"`, `"Default Light"` / `"Default Dark"`).
2. **`PanelConfig.colorPresets`** — an optional, host-supplied preset map for an additional, larger preset library. Defaults to `{}` — the package itself ships zero presets.

This split exists so a host that just wants the panel for a single scheme (zero or one cluster scheme) does not pay for a long preset blob, while a host that wants to ship a "playground" of curated schemes (Dracula / Solarized / Tokyo Night / etc.) drops them into a single config field.

```ts
// src/lib/my-panel-config.ts
import type {
  PanelConfig,
  ColorScheme,
} from '@takazudo/zdtp/astro';

const myPresets: Record<string, ColorScheme> = {
  Dracula: {
    background: '#282a36',
    foreground: 7,
    cursor: 7,
    selectionBg: '#44475a',
    selectionFg: '#ffffff',
    palette: [
      // 16 hex strings — the ColorScheme type's fixed palette length
      '#21222c',
      '#ff5555',
      '#50fa7b',
      '#f1fa8c',
      '#bd93f9',
      '#ff79c6',
      '#8be9fd',
      '#f8f8f2',
      '#6272a4',
      '#ff6e6e',
      '#69ff94',
      '#ffffa5',
      '#d6acff',
      '#ff92df',
      '#a4ffff',
      '#ffffff',
    ],
    shikiTheme: 'dracula',
    semantic: { primary: 4, accent: 5 },
  },
  // ... more presets
};

export const myPanelConfig: PanelConfig = {
  // ... storagePrefix, tabs (including the color tab), etc.
  colorPresets: myPresets,
};
```

**Dropdown layout** — `<option>`s render in this order:

1. The disabled `Scheme...` placeholder.
2. Each `colorExtras.colorSchemes` entry (from the color `TabConfig`), in insertion order.
3. An `<hr />` separator.
4. Each `colorPresets` entry, sorted alphabetically.

**Key collision** — if a `colorPresets` key matches a `colorExtras.colorSchemes` key, the bundled scheme wins for `handleLoadPreset`. Rename one of the keys if you want both to be selectable.

**JSON-serializable** — every `ColorScheme` is plain JSON, same as the rest of the config (§8.2). The host-supplied preset map crosses the Astro frontmatter → island boundary as part of the serialised `PanelConfig`.

> **Note on preset libraries.** The package ships zero baked-in scheme presets — the long preset blob (Dracula / Solarized / Tokyo Night / etc.) historically baked into earlier internal versions has been moved out of the package so consumers do not pay for a preset library they do not use. Hosts that want a curated preset list ship it themselves through `panelConfig.colorPresets`.

---

## 8. Astro wiring

```astro
---
import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro';
import { myPanelConfig } from '../lib/my-panel-config';
---

<DesignTokenPanelHost config={myPanelConfig} />
```

### 8.1 The `config` prop

`<DesignTokenPanelHost>` accepts the full `PanelConfig` from §5. The component renders two sibling `<script>` blocks:

1. An inline `<script type="application/json" id="tokenpanel-config">` carrying `JSON.stringify(config)` (with `<` defensively escaped to `<` for HTML-parsing safety).
2. An Astro `<script>` that imports the host adapter side-effect-style. The consumer's Astro toolchain bundles this into the page's client JS.

The adapter reads the JSON, calls `configurePanel(...)`, installs the console API, and gates the lazy import.

### 8.2 JSON-serializability constraint

Astro stringifies props at render time. **Functions, class instances, and `undefined` values silently disappear** when the config crosses the SSR → client boundary. Always design your `PanelConfig` with `JSON.parse(JSON.stringify(config))` round-trip in mind. Every `TierItem.cssVar` field must be a plain string — no template-function patterns survive the JSON boundary.

### 8.3 View-transition lifecycle

When the consumer site renders Astro's `<ClientRouter />`, the panel's host adapter automatically wires:

- `astro:before-swap` → unmount the Preact tree (`render(null, root)`), remove the host node, snapshot visibility intent so the remount decision survives the body swap.
- `astro:page-load` → re-apply persisted overrides + re-materialise the shell when any visibility, autoload, enabled-feature, or non-empty persisted-state signal is set.

No additional wiring needed in your layout beyond importing `<ClientRouter />` from `astro:transitions`.

### 8.4 Where to mount

The conventional placement is **at the end of `<body>`** in your shared layout. Mounting it earlier still works but the render order looks better when the panel is the last child of `<body>`.

### 8.5 Non-Astro hosts (Vite-only)

The `./astro` sub-export is the only place that imports anything Astro-flavoured. The package's main entry (`@takazudo/zdtp`) is framework-agnostic: call `configurePanel(...)` yourself, then `import('@takazudo/zdtp')` to materialise the panel. The `astro:before-swap` / `astro:page-load` listeners no-op outside an Astro context but the storage / mount / apply paths work identically.

#### Soft-nav lifecycle for non-Astro hosts (`setLifecycleAdapter`)

For hosts that own a client-side router (zfb, custom SPA, etc.), persisted overrides need to re-apply after every soft navigation. Register a `LifecycleAdapter` so the panel's internal handlers route through your router's hooks instead of Astro's document events:

```ts
import {
  setLifecycleAdapter,
  type LifecycleAdapter,
} from '@takazudo/zdtp';

// Example: a zfb-style host that emits 'zfb:before-swap' / 'zfb:page-load'
// CustomEvents on the document.
const adapter: LifecycleAdapter = {
  onBeforeSwap(callback) {
    document.addEventListener('zfb:before-swap', callback);
    return () => document.removeEventListener('zfb:before-swap', callback);
  },
  onPageLoad(callback) {
    document.addEventListener('zfb:page-load', callback);
    return () => document.removeEventListener('zfb:page-load', callback);
  },
};

setLifecycleAdapter(adapter);
```

Each installer must return a cleanup fn that unbinds the listener — the panel calls it on re-registration and on `setLifecycleAdapter(null)`.

Behaviour notes:

- When NO adapter is registered (initial state, or after `setLifecycleAdapter(null)`), the panel falls back to its built-in `astro:before-swap` / `astro:page-load` document listeners. Backwards-compatible — existing Astro consumers see zero behaviour change.
- When an adapter IS registered, the astro fallback is **actively unbound** so the internal handlers never double-fire on hosts that emit both event sets.
- `setLifecycleAdapter(null)` re-installs the astro fallback. Useful for tests and re-init scenarios.
- Re-registration (calling `setLifecycleAdapter` twice with different adapters) drains the previous adapter's cleanup fns before binding the new one — no listener leaks.

---

## 9. Storage-key derivation

`storagePrefix` is the single knob that controls every persisted key. The panel derives keys from this base at runtime.

| Logical key | Derivation                  | Purpose                                                                                                                 |
| ----------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `state-v4`  | `${storagePrefix}-state-v4` | Current unified envelope. Same top-level slices as v3, EXCEPT `color` (and optional `secondary`) is an identity-keyed map — one `ColorTweakState` slot per active-scheme identity — instead of a single flat object. See "Per-scheme color persistence" below. |
| `state-v3`  | `${storagePrefix}-state-v3` | Legacy pre-v4 format (flat, single-slot `color`). Migrated into `state-v4` on first load; the v3 key itself is left in place (not deleted) so a downgrade can still read it. |
| `state-v2`  | `${storagePrefix}-state-v2` | Legacy pre-v3 format. Migrated into `state-v3` (and from there into `state-v4`) on first load, then deleted.            |
| `state-v1`  | `${storagePrefix}-state`    | Legacy pre-v2 flat-state format (Color-only). Migrated into `state-v3` (and from there into `state-v4`) on first load, then deleted. |
| `open`      | `${storagePrefix}-open`     | Mirror of the panel's `open` boolean, read synchronously at mount so user intent survives reloads. |
| `position`  | `${storagePrefix}-position` | Drag position `{ top, left }` so the panel reappears where the user left it. |
| `spawn-ordinal` | `${storagePrefix}-spawn-ordinal` | Instance cascade identity: a JSON integer from 0 through 31, retained by Reset and restored across Astro body swaps. Invalid values fall back to lowest-free allocation. |
| `size`      | `${storagePrefix}-size`     | Floating shell dimensions `{ width, height }` in pixels. |
| `dock`      | `${storagePrefix}-dock`     | Presentation mode: `'float'`, `'right'`, `'bottom'`, or `'mini'`. |
| `dock-size` | `${storagePrefix}-dock-size` | Right/bottom dock dimensions `{ right, bottom }`, defaulting to `{ right: 440, bottom: 340 }`. |
| `density`   | `${storagePrefix}-density`  | Tab-grid density preference (`0`, `1`, or `2`). |
| `ghost`     | `${storagePrefix}-ghost`    | Ghost-when-idle preference (`'1'` when enabled). |
| `specimen`  | `${storagePrefix}-specimen` | Font specimen toolbar JSON `{ text, preset, overridden, width }`; width is clamped to 240–720. |
| `snapshot-a` | `${storagePrefix}-snapshot-a` | Persisted A snapshot `{ state, identity, savedAt, edits }`. |
| `snapshot-b` | `${storagePrefix}-snapshot-b` | Persisted B snapshot `{ state, identity, savedAt, edits }`. |
| `last-applied` | `${storagePrefix}-last-applied` | Flat comparison baseline; a successful apply resets it to `{}` while unconfirmed overrides remain in live state. |
| `visible`   | `${storagePrefix}:visible`  | Adapter-level visibility-intent flag, owned by the lazy-load gate. |
| `autoload`  | `${storagePrefix}:autoload` | Owner-mode autoload flag: `'1'` for explicit opt-in or `'auto'` for auto-remember. |
| `elpath-enabled` | `${storagePrefix}-elpath-enabled` | Element-path picker enabled bit. |
| `domtweaker-enabled` | `${storagePrefix}-domtweaker-enabled` | DOM Tweaker enabled bit; meaningful only when `domTweaker` is configured. |
| `highlight-slots` | `${storagePrefix}-highlight-slots` | Ten highlight slot colors in local storage. |
| `highlight-outline-width` | `${storagePrefix}-highlight-outline-width` | Global highlight outline width in local storage, clamped to 1–20. |
| `highlight-active` | `${storagePrefix}-highlight-active` | Active CSS-variable-to-slot map in session storage. |

For example, with `storagePrefix: 'myapp-design-token-panel'`:

```
myapp-design-token-panel-state-v4
myapp-design-token-panel-state-v3
myapp-design-token-panel-state-v2
myapp-design-token-panel-state
myapp-design-token-panel-open
myapp-design-token-panel-position
myapp-design-token-panel-spawn-ordinal
myapp-design-token-panel-size
myapp-design-token-panel-dock
myapp-design-token-panel-dock-size
myapp-design-token-panel-density
myapp-design-token-panel-ghost
myapp-design-token-panel-specimen
myapp-design-token-panel-snapshot-a
myapp-design-token-panel-snapshot-b
myapp-design-token-panel-last-applied
myapp-design-token-panel:visible
myapp-design-token-panel:autoload
myapp-design-token-panel-elpath-enabled
myapp-design-token-panel-domtweaker-enabled
myapp-design-token-panel-highlight-slots
myapp-design-token-panel-highlight-outline-width
myapp-design-token-panel-highlight-active  # sessionStorage
```

### Note: colon vs dash — `visible` and `autoload`

The `visible` and `autoload` keys use a literal `:` separator, not `-`. Every other derived key uses `-`. The colon form is intentional for these adapter-level flags — see [`PORTABLE-CONTRACT.md`](./PORTABLE-CONTRACT.md) §2 for the historical reason. Don't try to "normalize" them; the unit tests assert this specific shape.

### Per-scheme color persistence (v4 envelope)

Color/secondary tweaks are persisted **per (scheme, mode) identity**, inside the single `state-v4` storage key — there is no per-scheme key fan-out. The identity is exactly the active scheme name the panel already resolves for seeding (`getActiveSchemeName`): a cluster without `colorMode` resolves one constant identity (one slot, effectively the old global behavior); a cluster with light/dark `colorMode` resolves a distinct identity per side, so a light tweak and a dark tweak occupy independent slots in the same envelope:

```jsonc
{
  "color": {
    "Default Light": { "palette": [...], "semanticMappings": {...}, /* ... */ },
    "Default Dark":  { "palette": [...], "semanticMappings": {...}, /* ... */ }
  },
  "secondary": { "Default Light": { /* ... */ } }, // optional, same identity keying
  "spacing": { /* ... */ },
  "typography": { /* ... */ },
  "size": { /* ... */ }
}
```

The `spacing` / `typography` / `size` (and generic `tabs`) slices stay **global and unkeyed**, exactly as in v1–v3 — a scheme/mode toggle never touches them.

When the host dispatches a `color-scheme-changed` event (e.g. a light/dark toggle), the panel re-seeds its live color state for the newly active identity:

- If that identity already has a persisted slot, the slot's stored `color` (and `secondary`) state is loaded and re-applied — a per-scheme tweak now **survives** a round-trip through another scheme and back.
- If the identity has no slot yet (never tweaked under this scheme before), the panel cold-seeds from that scheme's defaults instead — the pre-existing "adopt the new scheme's palette" behavior for a scheme you haven't touched.

Editing color under scheme A only ever overwrites scheme A's slot (`writeMergedV4` merge-saves: it reads the existing envelope, replaces just the active identity's slot, and preserves every other identity's slot untouched) — it never mutates scheme B's stored state. A full panel reset (Reset) still wipes every slice via `clearAppliedStyles`; a disk Apply only reconciles confirmed-written variables and does not reset other identities or slices.

**Migration.** On first load with no `state-v4` key, the legacy v1/v2/v3 chain runs unchanged (v3 wins over v2 over v1, exactly as before); v2 and v1 are normalised to v3 as that chain requires, and the resulting single flat `TweakState` is filed into `state-v4` under whichever identity is active at that moment — every subsequent load reads `state-v4` first. The legacy v3 key is left in place by the v4 migration step so a host that needs to downgrade can still read it; the lower v2/v1 keys follow the legacy chain's deletion rules.

**Host-owned `color-scheme` is never touched.** A host that manages its own `<html style="color-scheme">` (e.g. a site-level light/dark toggle) has that inline style tracked separately from the panel's own writes; the panel's mount/clear paths only ever remove a `color-scheme` value that the panel itself applied, never a host-owned one.

Two consequences worth knowing as a host integrator:

- The event handler does not rewrite `localStorage` directly beyond what's described above — it reads/re-seeds the live (in-memory) state and clears the inline overrides for the previous identity. The next in-panel edit (or a full reload via `loadPersistedState`) is what persists the current identity's state.
- Do **not** manually delete the tweak keys on a scheme toggle. The panel already handles per-identity persistence on the event, and a manual envelope delete would also discard the scheme-independent `spacing` / `typography` / `size` overrides.

---

## 10. Console API contract

Once `configurePanel` has run, the package installs async helpers on the global `window[consoleNamespace]` object:

```ts
window.myapp.showDesignPanel();   // open the panel (lazy-loads the bundle on first call)
window.myapp.hideDesignPanel();   // close the panel
window.myapp.toggleDesignPanel(); // toggle open/closed

// Owner-autoload (see §10.1)
window.myapp.enableAutoload();  // arm owner-mode; panel loads CLOSED with Alt+click ready
window.myapp.disableAutoload(); // disarm owner-mode; unmounts the panel
```

All helpers are **async** — the first call lazy-imports the panel module. Subsequent calls share the memoised module promise and resolve synchronously after the first import completes.

### Fixed-name global: `window.zdtp`

`consoleNamespace` is a **required** field on `PanelConfig` — every consumer picks its own value, so `window[consoleNamespace].*` needs the host's chosen namespace before you can open the panel from the console. `window.zdtp` is an additive, fixed-name alias that needs none:

```ts
zdtp.show();   // open the panel (lazy-loads the bundle on first call, same as showDesignPanel())
zdtp.hide();   // close the panel
zdtp.toggle(); // toggle open/closed
```

- **`show` / `hide` / `toggle` only.** There is no `zdtp.enableAutoload()` — owner-autoload (§10.1) stays on `window[consoleNamespace].*` and the package-root `enableAutoload()` / `disableAutoload()` exports.
- **`window[consoleNamespace].*` is unchanged** — `window.zdtp` is sugar layered on top of it, not a replacement. Both stay available side by side.
- **Targets the default instance**, exactly like the package-root `showDesignTokenPanel()` / `hideDesignTokenPanel()` / `toggleDesignPanel()` exports and `window[consoleNamespace].*` itself. On an Astro host specifically, the alias binds to whichever instance's adapter script installs it first, rather than re-resolving "the current default" on every call — see `PORTABLE-CONTRACT.md` §6.5 for the exact per-install-site rule. For a page with more than one panel instance, use `configurePanel(cfg)`'s returned handle (§5.2) instead — it is unambiguous regardless of install order.
- **Available on both integration paths:**
  - Non-Astro hosts get it as soon as `@takazudo/zdtp`'s package-root module has loaded (it installs the alias at module init).
  - Astro hosts get it as soon as the host-adapter `<script>` has run — **before** the panel bundle itself has loaded. The first `zdtp.*` call lazy-imports the bundle, exactly like `window[consoleNamespace].*`.
- **Never clobbers a host-defined `window.zdtp`.** If the existing value exposes callable `show`, `hide`, and `toggle` methods, the package treats it as an intentional host alias and stays silent — enabling hosts to pre-claim the alias before lazily loading the panel bundle. Other existing values are still left untouched and produce a `console.warn`, including the edge case of choosing `consoleNamespace: 'zdtp'` yourself.
- **Auto-remember applies too** — `zdtp.show()` arms the `:autoload` flag with `'auto'` provenance exactly like `showDesignPanel()` (§10.1's Auto-remember footgun note applies here as well).

See `PORTABLE-CONTRACT.md` §6.5 for the full install-site and no-clobber/no-double-install contract.

### Backward-compatible: the on-demand flow is unchanged

The pre-existing on-demand usage — calling `window.<consoleNamespace>.showDesignPanel()` / `hideDesignPanel()` / `toggleDesignPanel()` to lazy-import and initialize the panel — is **unchanged and fully supported**. Owner-autoload (§10.1) is an opt-in layered on top, not a replacement. If you never call `enableAutoload()`, the panel behaves exactly as it always did: nothing loads for any visitor until the first console call.

### Co-existing helpers on the same namespace

The adapter **merges** its helpers into any existing object at `window[namespace]` rather than overwriting the namespace wholesale. This means a host can share a namespace between multiple dev tools (e.g. `window.myapp.ogpDebug.show()` from a separate package, alongside `window.myapp.showDesignPanel()` from this one) without collisions.

### Default

There is no default `consoleNamespace` exposed to consumers — the field is required on `PanelConfig`. Pick a short, unambiguous string (typically your app's slug).

---

### 10.1 Owner-autoload — loading the panel only for you

**Use case:** you are deploying a public site and want the design-token panel available to yourself (the site owner) without fetching the panel bundle or injecting its stylesheet for general visitors. The small host adapter/config bootstrap still runs. Once armed, every page load fetches the bundle eagerly and mounts the panel CLOSED — the Alt+click element-path inspector is ready immediately, and you can open the panel UI at any time.

#### API surface

Both the Astro host-adapter (`window[consoleNamespace].*`) and the package-root exports expose the same interface:

| Call | Effect |
|------|--------|
| `window.myapp.enableAutoload()` | Sets `${storagePrefix}:autoload` to `'1'`, arms the element-path inspector (`-elpath-enabled`), loads the panel bundle, mounts CLOSED. |
| `window.myapp.disableAutoload()` | Removes `:autoload`, writes `'0'` to `:visible` and `-elpath-enabled`, removes the open-state key, and unmounts the panel. |
| `enableAutoload()` (package-root export) | Same as the console form — for non-Astro hosts. |
| `disableAutoload()` (package-root export) | Same as the console form — for non-Astro hosts. |
| `shouldAutoload()` (package-root export) | Returns `true` iff the flag is currently set. |

#### The `${storagePrefix}:autoload` flag

Stored in `localStorage` as `'1'` (explicit — set by `enableAutoload()`) or `'auto'` (auto-remembered — set by opening the panel; see "Auto-remember on open" below), removed or `'0'` otherwise. The host-adapter's lazy-load gate honours **either** value — when the flag is `'1'` or `'auto'`, the panel bundle loads eagerly (the same as when the panel was previously visible, via either the `:visible` flag or its `-open` mirror, or overrides are persisted, checked as a content check across the `${storagePrefix}-state` family rather than a presence check on a specific version key — see §9). **General visitors** who have never opened the panel or called `enableAutoload()` have no flag and pay no panel-bundle cost; the small host adapter/config bootstrap still runs.

**Downstream-host recipe.** A host that writes its own lazy-load probe (e.g. to decide whether to eagerly fetch something else alongside the panel) can read the flag directly and test `=== '1'` to match only the explicit-owner population, excluding visitors who merely opened the panel once.

**Legacy caveat.** Browsers that auto-remembered *before* this provenance split shipped already hold `'1'` — the split value was never stored for them, so there is nothing to reclassify. An `=== '1'` probe therefore sheds the auto-remembered population only for opens made from this version onward; it does not retroactively shed the pre-existing legacy population still holding `'1'`.

#### Auto-remember on open

Opening the panel by any means — `showDesignPanel()`, `toggleDesignPanel()`, the instance handle's `open()` / `toggle()`, the fixed-name `zdtp.show()` / `zdtp.toggle()` global, or an instance toggle event — **automatically sets the `:autoload` flag to `'auto'`** (auto-remembered provenance, distinct from the `'1'` that `enableAutoload()` writes). This means once you open the panel you will be in owner-mode on subsequent page loads without calling `enableAutoload()` explicitly. An existing explicit `'1'` is never downgraded — an owner who armed autoload deliberately keeps that provenance even after opening the panel again.

#### Element-path coupling

`enableAutoload()` arms the Alt+click element-path inspector by writing `-elpath-enabled = '1'`. The inspector runs inside the Preact shell; mounting the shell CLOSED (rather than unmounted) keeps the inspector functional even while the panel UI is hidden. You can still turn the inspector off via the in-panel toggle — `disableAutoload()` writes `'0'` as part of full teardown.

#### Auto-remember footgun

Because **any open trigger sets `:autoload`** (to `'auto'`), a visible "open panel" button, keyboard shortcut, or similar affordance on your site becomes a de-facto owner-mode opt-in for anyone who clicks it. On an owner-only public site:

- Gate or omit such triggers (hide them behind a login check, remove them from the production build, etc.).
- Rely on the console `enableAutoload()` call as the owner's explicit opt-in.
- See the [Load the panel only for you](/docs/recipes/owner-autoload) recipe for a safe worked example.

**If your site wants a visible panel button for every visitor** (not just the owner) — hiding the trigger isn't an option — set `autoRememberOnOpen: false` on `PanelConfig` (§5.3). Opening the panel then never persists owner-mode for anyone; `enableAutoload()` remains available as the explicit, owner-only opt-in regardless of this setting.

---

### 10.2 Shared Alt+click picker ownership

Element path, DOM Tweaker, and element inspect use one per-window coordinator
for the Alt+click gesture. Enabling or arming one feature revokes the previous
owner; the three features do not run simultaneously. Panel surfaces and the
on-page specimen are excluded from picker hits.

| Feature | Activation | Result |
| --- | --- | --- |
| Element path | Owner autoload or its panel toggle, then `Alt+click` a host element | Copies the annotated selector/path block. |
| DOM Tweaker | Enable the configured DOM Tweaker, then `Alt+click` a host element | Opens the Tailwind class editor and live utility preview. |
| Element inspect | Toggle inspect or press `I`, then click a host element; `Alt` also arms the shared picker | Opens the reserved inspect tab with token-backed and inherited rows. |

The most recently armed feature owns the gesture and receives subsequent page
clicks. Owner autoload's element-path arm therefore does not block a later DOM
Tweaker or element-inspect arm.

---

## 11. Tailwind not required

The panel ships its own bundled CSS scoped under a panel-private namespace. The
chrome palette is a self-contained OKLCH ramp; it does not read host
`--color-*` or `--font-mono` variables. A host can opt into a different chrome
theme by assigning the same `--tokentweak-*` variables on a listed scope.

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  /* base-0 is the darkest ground; stops ascend toward the foreground. */
  --tokentweak-palette-base-0: oklch(0.18 0 0);
  --tokentweak-palette-base-1: oklch(0.25 0 0);
  --tokentweak-palette-base-2: oklch(0.34 0 0);
  --tokentweak-palette-base-3: oklch(0.536 0 0);
  --tokentweak-palette-base-4: oklch(0.66 0 0);
  --tokentweak-palette-base-5: oklch(0.8 0 0);
  --tokentweak-palette-base-6: oklch(0.91 0 0);
  --tokentweak-color-fg: var(--tokentweak-palette-base-5);
  --tokentweak-color-bg: var(--tokentweak-palette-base-0);
  --tokentweak-color-muted: var(--tokentweak-palette-base-4);
  --tokentweak-color-border: var(--tokentweak-palette-base-3);
  --tokentweak-color-surface: var(--tokentweak-palette-base-1);
  --tokentweak-color-accent: #d69a66;
  --tokentweak-color-accent-bar: #efb477;
  --tokentweak-color-accent-hover: #a7c0e3;
  --tokentweak-color-code-bg: var(--tokentweak-palette-base-2);
  --tokentweak-color-code-fg: var(--tokentweak-palette-base-6);
  --tokentweak-color-success: #93bb77;
  --tokentweak-color-danger: #da6871;
  --tokentweak-color-warning: #dfbb77;
  --tokentweak-font-mono: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  /* pad-*, gap-*, text-*, radius, and z-* tokens are also declared here. */
}
```

Hosts may override a `--tokentweak-palette-base-*` stop to move all semantic
roles that alias it, or continue assigning a `--tokentweak-color-*` role
directly. The direct semantic assignment still wins. Borders now use
`--tokentweak-color-border`; a host that previously assigned
`--tokentweak-color-muted` to recolor both secondary text and 1px dividers must
also assign the border role.

- **Naming:** panel-private color, font, spacing, typography, and z-index variables use the `--tokentweak-*` prefix; the shared radius token is `--radius-tokentweak`. Consumer-namespaced identifiers do not appear in the panel chrome — `panel.css` reads only package-owned tokens and component-local layout hints.
- **Files:** `panel.css` (chrome layout / typography / controls) + `panel-tokens.css` (the `--tokentweak-*` declarations). Both ship from the package and the consumer pulls them in via `sideEffects`.
- **No Tailwind dependency in the consumer.** The panel chrome uses hand-authored CSS classes backed by `--tokentweak-*` variables. You can integrate the panel into a Tailwind site, a CSS Modules site, a vanilla CSS site, or anything in between.

### 11.1 Chrome scopes and host overrides

The declarations cover `.tokenpanel-shell`, `.tokenpanel-mini-pill`,
`[data-design-token-panel-modal]`, the highlight-settings and chain popovers,
the color picker, tooltip, element-path label/toast, and element-inspect box,
label, and view. `:where()` keeps their specificity at zero, so a host can
override a token with a single-class rule on the relevant surface. The host
theme variables are never read by the panel chrome.

The CSS variables the panel **writes to** (the `cssVar` field on each
`TierItem`, palette/base-role names, and semantic CSS names) are entirely
consumer-controlled. The package only writes those variables through the
default `document.documentElement` target or a configured `applySink`.

Dock integration publishes `--zdtp-dock-inset-right` and
`--zdtp-dock-inset-bottom` on the host root while a claim is active. The
page-level specimen uses the `.tokenpanel-on-page-specimen` class and
`[data-zdtp-specimen]` marker; it is host-page content, not panel chrome.

### 11.2 Apply-to-disk for a Tailwind v4 `@theme` block

The section above is about the panel's OWN chrome — it never needed Tailwind. This section is about the opposite direction: a Tailwind v4 **consumer** whose design tokens live inside `@theme { ... }` (so Tailwind can generate utility classes from them) rather than `:root`.

The apply-to-disk rewriter (§3.2) scans the first top-level `:root` block AND the first top-level `@theme` block, so a Tailwind v4 token file like this applies out of the box:

```css
:root {
  --palette-cool-700: oklch(0.21 0.03 264);
}

@theme {
  --spacing-md: 0.75rem;
  --color-ink: light-dark(var(--palette-cool-700), var(--palette-cool-50));
}
```

POSTing overrides for `--palette-cool-700` (in `:root`), `--spacing-md`, or `--color-ink` (both in `@theme`) all land in `changed` — no indirection required. A file that is 100% `@theme` (no `:root` block at all) also applies cleanly; only a file with **neither** block 409s.

**Legacy workaround (no longer required).** Before the rewriter learned to scan `@theme`, the only way to make a Tailwind-`@theme` token editable was to declare the editable value in `:root` and have `@theme` alias it via `var(...)`:

```css
:root {
  --spacing-md-editable: 0.75rem; /* apply pipeline writes here */
}

@theme {
  --spacing-md: var(--spacing-md-editable); /* Tailwind reads the alias */
}
```

This indirection is no longer necessary — declare the token directly inside `@theme` as shown above. The alias pattern still works (it's just two ordinary top-level blocks), so existing consumers are not required to migrate.

---

## 12. Bundler notes

The package builds in **Vite library mode**. Normally, Vite library mode extracts every `import './something.css'` from the source and emits a combined stylesheet (`dist/zdtp.css`), removing the import statements from the emitted JS files. This package works around that limitation via a `?inline` import:

```ts
// src/index.tsx (shipped in dist/index.js)
import panelCss from './styles/panel.css?inline'; // string — survives Vite library build
```

The `?inline` import is NOT stripped by Vite library mode — it emits the CSS as a JavaScript string constant inside `dist/index.js`. When `ensureMounted()` is called, `ensurePanelStyles()` uses that string to append a `<style>` element to `document.head`. **The panel is therefore visually self-contained: consumers do not need to import the stylesheet.**

The `./styles` sub-export (`dist/zdtp.css`) is still emitted alongside the JS bundle (via a retained side-effect import in `src/index.tsx`). It remains available for consumers who prefer to pull the CSS into their own pipeline (SSR hydration, PostCSS, bundler deduplication):

```ts
// Optional — only needed if you want the CSS in your own pipeline
import '@takazudo/zdtp/styles';
// Alias with explicit extension:
import '@takazudo/zdtp/styles.css';
```

If the panel appears unstyled, the JS module itself failed to load — the stylesheet is self-injected by the same code that mounts the panel. Adding a styles import will not fix a module-load failure.

### 12.1 Host-adapter side-effect import (paired-unit contract)

The package's distributed Astro surface ships built `dist/astro/*` files. The host-adapter (`dist/astro/host-adapter.js`) is the runtime that reads the inline JSON config emitted by `<DesignTokenPanelHost>` and installs `window.<consoleNamespace>.*`. Earlier package versions emitted a hoisted `<script>import './host-adapter';</script>` block from inside `DesignTokenPanelHost.astro` to load it; that block did not reliably reach production page bundles — Vite/Rollup processed the import, recognized it as resolving to a sibling JS file outside the consumer's source tree, emitted an empty chunk, and never linked it from any page entry.

For consumer-side imports, the package's `package.json` lists `dist/astro/host-adapter.js` in the `sideEffects` array so Rollup preserves the import even when its result is discarded (the host adapter has top-level execution that registers the console API — Rollup's tree-shaker has no way to know that without the metadata hint).

Net effect: the consumer MUST own the host-adapter import in their wrapper layout. Use the dynamic `void import('...')` form below — it loads the host-adapter chunk off the critical path (mirrors the existing color-presets lazy-loader) and is robust to future packaging changes that could miss-configure `sideEffects`. A top-level `import '...';` works too with the current `sideEffects` list, but the dynamic form is the recommended canonical wiring.

```astro
<script>
  void import('@takazudo/zdtp/astro/host-adapter');
</script>
```

This is the second half of the paired-unit contract from §4.1.2 (`<DesignTokenPanelHost>` AND the host-adapter `<script>` block — always together). If you forget it, the `<DesignTokenPanelHost>` JSON config payload still ships, but no JS reads it, so calling `window.<consoleNamespace>.showDesignPanel()` throws `ReferenceError`.

For the regression-guard tests that pin this contract, see `package-exports.test.ts` under the package's test suite.

---

## 13. Troubleshooting

### 13.1 FOUT (flash of unstyled tokens) on hard navigation

**Symptom:** on first paint after a hard reload, the page renders with the consumer's default token values for a beat before snapping to the user's saved overrides.

**Resolution:** the host adapter eagerly re-applies persisted overrides during the lazy-load gate (it content-checks the exact `${storagePrefix}-state` / `${storagePrefix}-state-vN` family and the visibility, autoload, and enabled-feature signals synchronously from `localStorage`). If you still see a flash, your `<DesignTokenPanelHost>` is being rendered too late in the document (e.g. inside a deferred island) — move it to the layout's `<body>` and verify the inline `<script type="application/json" id="tokenpanel-config">` is in the initial HTML.

### 13.2 Auto-mount race on first reload

**Symptom:** the panel does not re-open on the first reload after the user closed it, even though `${storagePrefix}-open` is set in `localStorage`.

**Resolution:** the open boolean is mirrored to `localStorage` synchronously and read at mount time so the next mount opens directly into the user's last state without a post-render toggle dispatch. If the symptom persists, confirm the storage key matches what the contract derives (§9) and that nothing else in the page is clearing the key on load.

### 13.3 Live-apply regression test approach

**Symptom:** after a panel-package change, you want to confirm the live-apply pipeline (storage → adapter → default `:root` or `applySink`) is unbroken end-to-end.

**Resolution:** the canonical regression test is each external example repo's `apply-roundtrip.spec.ts` Playwright spec under `tests/e2e/`. It boots the example's preview build, seeds a compatible state envelope under the example's storage prefix, hard-reloads, and asserts the adapter rehydrated and applied the override against the example's palette and semantic CSS variable names. The contract: storage prefix, `TierItem.cssVar` names, semantic CSS names — change one of those and this spec fails first. See §15 for links to the five external example repos.

---

## 14. Migration recipe — adopting the panel into an existing consumer

This recipe walks through wiring the panel into a project that does not currently use it. If you previously consumed an internal pre-OSS snapshot of the panel where storage keys, console namespace, modal class prefix, and token identifiers were hardcoded literals, the same steps apply — lift those literals into a `PanelConfig` value and a host-owned tab manifest.

1. **Install the package.**

   ```sh
   pnpm add @takazudo/zdtp preact
   ```

2. **Define your `PanelConfig` literals.**

   Pick identifiers for `storagePrefix`, `consoleNamespace`, `modalClassPrefix`, `schemaId`, and `exportFilenameBase`. Pull these into a host-side config file (e.g. `src/lib/panel-config.ts`). If you are migrating from an internal snapshot fork and want to preserve users' saved state across the migration, keep the legacy values verbatim; otherwise pick fresh, neutral identifiers (e.g. `myapp-design-token-panel`).

   `schemaId` is display-only (see §5.3) — it never gates import/export, so picking any string here is safe. If a host-facing label should name the actual schema your export/import round-trips through, import `SCHEMA_V1` / `SCHEMA_V2` / `SCHEMA_V3` from the package root and set `schemaId` to one of them instead of an arbitrary string:

   ```ts
   import { SCHEMA_V3 } from '@takazudo/zdtp';

   export const myPanelConfig: PanelConfig = {
     // ...
     schemaId: SCHEMA_V3, // truthful label — matches what serialize()/deserialize() actually validate against
   };
   ```

3. **Author your token manifest in the host project.**

   The package itself ships zero baked-in manifest data. Define `TabConfig`
   values in your project and place them in `PanelConfig.tabs`. Every
   `TierItem.cssVar` is an explicit string, including one string per palette
   slot; there is no palette-name callback to survive the Astro JSON boundary.
   Add `preview` / `previewBase` to tiers that should render specimen or glyph
   previews.

4. **Author the color tab in the host project.**

   Build a `TabConfig` with `id: 'color'`, palette and semantic `TierItem`
   entries, and the `colorExtras` structural metadata (base roles, scheme
   registry, and panel settings). If you need a secondary color cluster, add
   a companion `TabConfig` with `id: 'color-secondary'` and its own
   `colorExtras`. Keep all of this metadata plain JSON data.

5. **Drop `<DesignTokenPanelHost>` into your layout.**

   ```astro
   ---
   import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro';
   import { myPanelConfig } from '../lib/panel-config';
   ---

   <DesignTokenPanelHost config={myPanelConfig} />
   ```

   The host adapter does the rest (calls `configurePanel`, installs the console API, gates lazy-load). Don't forget the paired host-adapter `<script>` block — see §4.1.2.

6. **Verify storage keys derive to the expected literals.**

   Open devtools → Application → Local Storage. Confirm you see keys derived under your `storagePrefix` and that any pre-existing user state (under the legacy prefix, if you preserved it) is migrated through the v1/v2/v3 → v4 compatibility path on first load.

7. **Run the live-apply e2e spec.**

   Use any of the external example repos' Playwright spec at `tests/e2e/apply-roundtrip.spec.ts` (see §15 for the five repo links) as a template: seed a compatible `${storagePrefix}-state-v4` payload, hard-reload, and assert your palette and semantic CSS variables on the default `:root` (or your configured `applySink`) reflect the seeded values.

For edge cases hit during the migration, see CONTRIBUTING and the doc-site reference pages for each `PanelConfig` field.

---

## 15. Worked examples

The canonical worked examples live in five dedicated sibling repos. Each is an independent consumer app that demonstrates the panel against a different host framework. Each renders a tiny page with cards, buttons, and palette swatches whose styles reference its own demo CSS variables, and each ships a Playwright spec at `tests/e2e/apply-roundtrip.spec.ts` that asserts the live-apply pipeline.

- [`zudo-design-token-panel-example-astro`](https://github.com/Takazudo/zudo-design-token-panel-example-astro) — Astro + Preact island. Uses `storagePrefix: 'astro-example-tokens'`, `consoleNamespace: 'astro'`, and explicit `TierItem.cssVar` names such as `--astro-palette-0`.
- [`zudo-design-token-panel-example-vite-react`](https://github.com/Takazudo/zudo-design-token-panel-example-vite-react) — Vite + React (panel mounted as a Preact island, React tree untouched). Uses the `vr` namespace.
- [`zudo-design-token-panel-example-nextjs`](https://github.com/Takazudo/zudo-design-token-panel-example-nextjs) — Next.js (App Router) + React, panel as a `'use client'` boundary. Uses the `nx` namespace.
- [`zudo-design-token-panel-example-zfb`](https://github.com/Takazudo/zudo-design-token-panel-example-zfb) — [zfb](https://github.com/Takazudo/zudo-front-builder) (Preact host). Uses the `devMiddleware` plugin hook for the apply proxy.
- [`zudo-design-token-panel-example-zfb-tailwind`](https://github.com/Takazudo/zudo-design-token-panel-example-zfb-tailwind) — zfb + Tailwind v4. Extends the zfb example by registering panel tokens into Tailwind's design-system namespaces via an `@theme` block.

To run any example locally, clone the repo and follow its README — typically:

```sh
git clone https://github.com/Takazudo/zudo-design-token-panel-example-astro.git
cd zudo-design-token-panel-example-astro
pnpm install
pnpm dev
# open the printed dev URL
# in devtools console: window.<consoleNamespace>.toggleDesignPanel()
```

Use the closest example as a copy-paste template when wiring the panel into your own project — they are the smallest end-to-end consumers that exercise every contract surface.
