# @takazudo/zudo-design-token-panel

A live-tweak design-token panel for Astro sites. Drop a single `<DesignTokenPanelHost>` component into your layout, hand it a `PanelConfig`, and your users get an in-page UI for adjusting CSS custom properties (spacing, typography, sizing, color palette + semantic roles). Changes apply to `:root` instantly, persist to `localStorage`, and survive view transitions and hard reloads.

The package is portable: every project-specific identifier is driven by the host's `PanelConfig`. Storage keys, console namespace, modal class prefix, schema id, the editable token list, and the entire color cluster (palette + semantics + scheme registry) are all configured by the consumer. Every config field is JSON-serializable so the configuration crosses the Astro frontmatter → client island boundary without losing fidelity.

The authoritative API spec is [`PORTABLE-CONTRACT.md`](./PORTABLE-CONTRACT.md). This README is the consumer-oriented translation. When the two disagree, the contract wins — please file an issue against this README.

---

## 0. Architecture at a glance

The design-token panel is a browser-based UI that writes token overrides to `:root`, with an optional **apply pipeline** for persisting those overrides back to disk source files.

```
┌─ Your dev server (Astro / Vite / any host) ──────┐
│                                                  │
│  Panel UI (browser)  ←─────────────────────────> │  Host adapter (side-effect import)
│  ↓ (user tweaks)                                  │
│  POST /apply (JSON diff)                         │  Apply endpoint (routes tokens to files)
│  ↓                                                │
└──────────────────────────────────────────────────┘
         │
         │ (HTTP)
         ↓
┌─ design-token-panel bin server ───────────────┐
│ Receives POST /apply with token diff          │
│ Validates tokens & paths                      │
│ Rewrites source CSS files atomically          │
│ (respects --write-root sandbox)               │
└──────────────────────────────────────────────┘
```

The **host adapter** import (`@takazudo/zudo-design-token-panel/astro/host-adapter`) is a separate concern: it reads the inline config, installs `window.<namespace>.*`, and gates lazy-load of the panel module. The **apply pipeline** (bin server + endpoint) is optional — hosts that only want export/import omit `applyEndpoint` and `applyRouting` from `PanelConfig`.

---

## 1. What it is

A Preact-rendered side panel that:

- Reads a host-supplied **token manifest** (spacing, typography, size, color groups) and renders one row per editable token. Sliders, selects, text inputs, and pill toggles are all supported.
- Reads a host-supplied **color cluster** (palette, base roles like `background`/`foreground`, semantic tokens like `primary`/`accent`, and a registry of named color schemes) and renders a color tab for picking schemes and tweaking palette slots / semantics.
- Writes every override to `document.documentElement.style.setProperty(...)` against the consumer-supplied CSS-var names — so your stylesheet can be plain CSS, CSS Modules, Tailwind, or anything else.
- Persists state to `localStorage` under a host-chosen prefix and re-applies overrides synchronously on next page load (no FOUT — this is a hard requirement of the contract).
- Exposes a small console API (`window.<namespace>.showDesignPanel()` etc.) so a developer can pop the panel without it being mounted on every page.
- Plugs into Astro's view-transition lifecycle (`astro:before-swap` / `astro:page-load`) so soft navigation does not double-mount the panel.

The package builds against Preact (declared as a `peerDependency`) and ships its own bundled CSS scoped under the `--tokentweak-*` namespace. **It does not require Tailwind** in the consumer; see §11.

> Visual: a screenshot or short capture would go here. Skipped in the v1 README — a placeholder is worse than nothing. Run any of the example apps ((§15)15) to see the panel live.

---

## 2. Install

Install from npm. Preact is a peer dependency — bring your own copy so the panel shares one runtime with any other Preact islands you mount.

```sh
pnpm add @takazudo/zudo-design-token-panel preact
```

```jsonc
// consumer/package.json
{
  "dependencies": {
    "@takazudo/zudo-design-token-panel": "^0.1.0",
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

The **bin server** is the recommended — and only supported — way to apply panel tweaks back to disk. When a user clicks "Apply" in the panel UI, the token diff POSTs to your dev-API endpoint, which the bin processes atomically (all-or-nothing write, never a half-rewritten state).

### 3.1 CLI usage

The bin ships as an executable in the `design-token-panel` package. Start it with:

```bash
# After pnpm install, the bin is available via:
node dist/bin/server.js \
  --routing <routing-file.json> \
  --write-root <dir> \
  --allow-origin <origin> \
  [--root <dir>] [--host <addr>] [--port <number>] [--quiet]

# Or use the npm bin field:
design-token-panel-server \
  --routing <routing-file.json> \
  --write-root <dir> \
  --allow-origin <origin>
```

**Flags** (authoritative source: [`src/bin/parse-args.ts`](./src/bin/parse-args.ts)):

| Flag | Required | Purpose | Example |
|---|---|---|---|
| `--routing` | yes | Path to JSON file mapping CSS-var prefixes → source files. See §3.2. | `./apply.routing.json` |
| `--write-root` | yes | The single directory the bin is allowed to write into. All resolved routing paths must sit inside this tree. Absolute, or relative to `--root`. | `sub-packages/design-system` |
| `--allow-origin` | yes (≥ 1) | Origin allowed to POST to `/apply`. Repeatable — pass once per dev origin (scheme + host + port, no trailing slash). At least one is required for any browser to apply. | `--allow-origin http://localhost:34434` |
| `--root` | no | Repo root used as the CWD reference for routing/write-root paths. Default: the bin's current working directory. | `--root /path/to/repo` |
| `--host` | no | Bind address. Default: `127.0.0.1` (loopback). Use `0.0.0.0` to expose on the LAN (off by default). | `--host 0.0.0.0` |
| `--port` | no | TCP port to bind. Default: `24681`. The example apps in this repo use `24682`/`24683`/`24684` to avoid collision when running multiple bins side by side. | `--port 9876` |
| `--quiet` | no | Suppress per-request logs. | `--quiet` |
| `--help` / `-h` | no | Print usage and exit 0. | `--help` |

The bin reads the routing JSON once at startup and does not hot-reload it. Restart the bin if you edit the routing file.

### 3.2 Routing configuration

Both the **panel UI** (for preview and button state) and the **bin** (for actual write) must agree on which CSS-var prefixes write to which files. The canonical way to enforce this is a shared JSON file:

```json
{
  "myapp": "src/styles/tokens.css",
  "myapp-extra": "src/styles/extra-tokens.css"
}
```

The host imports this file as a static JSON module; the bin reads it via `--routing`:

```ts
// host/src/lib/panel-config.ts
import routing from './apply.routing.json' assert { type: 'json' };
import type { PanelConfig } from '@takazudo/zudo-design-token-panel';

export const panelConfig: PanelConfig = {
  // ... other fields ...
  applyRouting: routing,  // UI uses this for routing validation + button state
  applyEndpoint: '/api/dev/design-tokens-apply',
};
```

```bash
# bin invocation uses the same file
design-token-panel-server \
  --routing /absolute/path/to/apply.routing.json \
  --write-root src/styles \
  --allow-origin http://localhost:34434
```

Note: `applyEndpoint` above is the **panel UI config** — the URL the browser POSTs to (typically a dev-only API route on your host server that forwards to the bin). It is unrelated to the bin's CLI flags. The bin itself binds its own loopback HTTP listener at `--host`/`--port` and accepts POSTs from origins listed via `--allow-origin`.

See [`PORTABLE-CONTRACT.md` §5.4](./PORTABLE-CONTRACT.md#54-routing-config--single-source-of-truth) for the authoritative routing schema.

### 3.3 Security model

The bin is **dev-only** and intended for use only on `localhost` (loopback by default):

- **Loopback default:** binds to `127.0.0.1:24681` so only local requests are accepted. Token diffs are never exposed over the network by default. Override with `--host`/`--port` if needed.
- **Sandbox (`--write-root`):** the bin enforces a strict write sandbox via the explicit `--write-root` flag. Every resolved routing path must sit inside that directory tree. Attempts to escape (`../../etc/passwd`) are rejected with a 400 and a descriptive error.
- **Path sanitization:** every token name is validated (`--` prefix, no spaces, no slashes). Invalid names are rejected before any file I/O.
- **Atomic writes:** computed changes are kept in memory. Only after every file is validated and computed is any file written. If a write fails partway, previously-written files are restored from the in-memory snapshot — disk cannot land in a half-rewritten state.

**CORS:** the bin requires explicit `--allow-origin <origin>` (repeatable) for any browser POST to `/apply`. Each request's `Origin` header is matched **verbatim** against the configured allow-list — `http://localhost:8080` and `http://127.0.0.1:8080` are different origins, and trailing slashes matter, so pass each dev origin you actually serve from. Requests without a matching `--allow-origin` value receive a 403 with no `Access-Control-Allow-Origin` header. Same-origin requests (e.g. when host and bin share a port behind a reverse proxy) still need the origin listed; no special-case bypass exists.

### 3.4 Lifecycle & signal handling

The **host owns the supervisor.** The bin is a subprocess of the dev server (typically started via `concurrently` in the host's build script). When the host dev server shuts down, the bin should exit cleanly.

- **SIGTERM / SIGINT:** when the host sends `SIGTERM` or `SIGINT`, the bin exits gracefully (existing connections allowed to finish, no new requests accepted).
- **EADDRINUSE:** if the port is already bound, the bin logs a clear error and exits with code 1. The host's supervisor (e.g. `concurrently`) can then retry or escalate as configured.

Example setup with `concurrently` (mirrors the canonical example-app form — see the example apps under `examples/` in this repo):

```json
{
  "scripts": {
    "dev": "concurrently -k -n astro,tokens-bin -c blue,green \"astro dev --port 44324\" \"design-token-panel-server --write-root . --routing ./apply.routing.json --port 24682 --allow-origin http://localhost:44324\""
  }
}
```

`concurrently -k` ensures that when one process exits the others are killed too, so SIGTERM propagates from the host runner to the bin.

The example apps under `examples/` (Astro, Vite + React, Next.js) demonstrate this wiring live.

---

## 4. Consumer recipes

The panel package is portable — every config field is host-supplied. Below are worked integration paths for different contexts.

### 4.1 Consumer recipes — Astro

Minimal end-to-end wiring — five steps, drop-in for a new Astro project.

### 4.1.1 Define your panel config

```ts
// src/lib/my-panel-config.ts
import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';
import { myTokens } from './my-tokens';
import { myColorCluster } from './my-color-cluster';

export const myPanelConfig: PanelConfig = {
  storagePrefix: 'myapp-design-token-panel',
  consoleNamespace: 'myapp',
  modalClassPrefix: 'myapp-design-token-panel-modal',
  schemaId: 'myapp-design-tokens/v1',
  exportFilenameBase: 'myapp-design-tokens',
  tokens: myTokens,
  colorCluster: myColorCluster,
};
```

### 4.1.2 Drop the host into your layout

The `<DesignTokenPanelHost>` component AND a paired `<script>` block that loads the host adapter are a **single unit** — both lines are required, always together. Do not omit the script tag.

```astro
---
// src/layouts/Layout.astro
import { ClientRouter } from 'astro:transitions';
import { DesignTokenPanelHost } from '@takazudo/zudo-design-token-panel/astro';
import { myPanelConfig } from '../lib/my-panel-config';
import '@takazudo/zudo-design-token-panel/styles';
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
  // Required side-effect load — see §3.5 for the rationale. Use a dynamic
  // `void import(...)` here, NOT a top-level `import '...';` statement.
  void import('@takazudo/zudo-design-token-panel/astro/host-adapter');
</script>
```

That is the entire integration. `<DesignTokenPanelHost>` emits a JSON `<script>` with the serialized config; the paired `<script>` block above loads the host adapter — which reads that JSON, calls `configurePanel(...)` synchronously, installs `window.myapp.{showDesignPanel, hideDesignPanel, toggleDesignPanel}`, and lazy-loads the panel module only when the user has saved overrides or opens it via the console API.

### 4.1.3 Open the panel

```js
// In the browser devtools console
window.myapp.toggleDesignPanel();
```

Or wire a hidden keyboard shortcut / dev-only button to call the same helper.

### 4.1.4 Bundled CSS

The package builds in Vite library mode, which extracts every CSS side-effect import from the source into a single emitted stylesheet at `dist/design-token-panel.css` and **strips the `import './styles/panel.css'` line from the emitted JS**. That means the consumer's bundler has no static reference to follow and the CSS will not arrive on its own — you MUST import the bundled stylesheet exactly once from somewhere on the consumer's static module graph (typically next to where you mount `<DesignTokenPanelHost>`):

```ts
// Astro frontmatter, Vite entry, anywhere on the static import chain
import '@takazudo/zudo-design-token-panel/styles';
```

The `./styles` (alias `./styles.css`) sub-export resolves to `./dist/design-token-panel.css` — the single combined chrome + tokens file Vite emits at build time. `package.json` still declares `sideEffects: ["**/*.css"]` so production bundlers don't tree-shake the import away.

If you skip this line, the panel's JS will still run, `window.<ns>.showDesignPanel()` will mount `#…-design-token-panel-root`, and the shell DOM will render — but with no chrome rules applied (transparent background, default page font), so it appears invisible. See §13 for further notes on bundler behaviour.

### 4.1.5 Why the host-adapter import lives in your wrapper

The host-adapter `<script>` block in §4.1.2 is the second half of the paired-unit contract. It must live in YOUR layout, not inside the package's `<DesignTokenPanelHost>` component.

The package's distributed Astro surface ships built `dist/astro/*` files, and the package-side hoisted `<script>` from those built files does not reliably reach production page bundles — Vite/Rollup processes the import, recognizes it as resolving to a file outside the consumer's source tree, emits an empty chunk, and never links it from any page entry. Owning the host-adapter import in the consumer wrapper sidesteps that pipeline issue.

The recommended form is a dynamic `void import('...')` — it loads the host-adapter chunk off the critical path (mirroring the existing color-presets lazy-loader pattern) and is robust to future packaging changes. A top-level `import '...';` also works because the package's `sideEffects` list explicitly includes `dist/astro/host-adapter.js` so Rollup preserves the import.

For the regression-guard tests that pin this contract, see `package-exports.test.ts` under the package's test suite.

### 4.2 Consumer recipes — any framework / Rust SSG

The Astro recipe above shows the case where a host owns the config import and the host-adapter side-effect import. For non-Astro hosts (Vite SPA, Rust SSG, custom framework) the pattern is the same, just without Astro-specific syntax.

**Worked example:** the example apps under [`examples/astro/`](../../examples/astro/), [`examples/vite-react/`](../../examples/vite-react/), and [`examples/next/`](../../examples/next/) prove the contract end-to-end. Each ships:

- A host-side config file with deliberately different names (e.g. `--astroexample-palette-{n}`, `astroExample` namespace).
- A routing JSON file at the example's root.
- A bin invocation via `concurrently` in the dev script, pointing at that routing file.

Copy the example's structure when porting the panel into a new host.

If you are building a **Rust SSG** or other non-Node host, the bin still runs as a sidecar Node.js subprocess (started by your host's build orchestration). The same routing JSON and host-adapter setup applies — the only difference is your host ships its own config format (not TypeScript) and you invoke the bin via your build system's subprocess spawner rather than npm scripts.

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
    let bin = "node_modules/@takazudo/zudo-design-token-panel/dist/bin/server.js";

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

`configurePanel(config)` is the configure-once init. The Astro host adapter calls it for you (it reads the inline JSON config emitted by `<DesignTokenPanelHost>` and forwards it). For a non-Astro host, you would call `configurePanel(myPanelConfig)` yourself before the panel adapter is dynamically imported.

```ts
import { configurePanel, type PanelConfig } from '@takazudo/zudo-design-token-panel';

configurePanel(myPanelConfig);
```

### 5.1 Behaviour

- **One-shot per page lifecycle.** Calling `configurePanel` twice with identical values is a no-op. Calling it twice with different values throws — silently overwriting a previously-configured cluster mid-session is the failure mode the contract explicitly rules out.
- **Synchronous, no I/O.** The call must be cheap enough to run inline at module init.
- **JSON-serializable input.** Every nested field MUST round-trip through `JSON.stringify` / `JSON.parse` without loss. No function fields, no class instances, no `Symbol` keys, no `undefined`-where-`null`-is-meant. This is the hard precondition for the Astro frontmatter → client island handoff (§8).

### 5.2 Field summary

| Field                | Type                 | Purpose                                                                                                                                                                |
| -------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storagePrefix`      | `string`             | Base for every derived `localStorage` key. See §11.                                                                                                                     |
| `consoleNamespace`   | `string`             | Global object the package installs `showDesignPanel` / `hideDesignPanel` / `toggleDesignPanel` on (e.g. `consoleNamespace: 'myapp'` → `window.myapp.showDesignPanel`). |
| `modalClassPrefix`   | `string`             | BEM root class for every modal the panel owns (export, import, apply). Emits `${prefix}__overlay`, `${prefix}__panel`, etc.                                            |
| `schemaId`           | `string`             | `$schema` value emitted into export JSON and required on import.                                                                                                       |
| `exportFilenameBase` | `string`             | Default download filename base — exports save as `${exportFilenameBase}.json`.                                                                                         |
| `tokens`             | `TokenManifest`      | Editable design tokens grouped per-tab. See §6.                                                                                                                        |
| `colorCluster`       | `ColorClusterConfig` | Palette + base roles + semantic table + scheme registry. See §6.                                                                                                       |
| `colorPresets`       | `Record<string, ColorScheme>` (optional) | Optional named scheme presets surfaced in the Color tab "Scheme..." dropdown. Defaults to `{}`. See §6.5.                                              |

### 5.3 Mount strategy & auto-mount

The Astro entry point (`<DesignTokenPanelHost>`) handles mounting for you. Internally:

- The console API (`showDesignPanel` etc.) is **always installed eagerly**, even when the panel module has not loaded — calling them is what triggers the lazy import for cold-start users.
- The panel module is **dynamically imported on first need**: either when the user calls a console helper, OR when first-paint detects either a `${storagePrefix}:visible` flag set to `1` or any `${storagePrefix}-state-v2` payload in `localStorage`.
- This gating keeps the panel out of the initial JS bundle for first-time visitors while still re-applying overrides on hard reload for users who have tweaked things.

For a Vite-only / non-Astro host, mount it yourself by importing the adapter module after `configurePanel(...)`. See §11.5.

---

## 6. Token manifest schema

The token manifest is the host-supplied list of editable design tokens. The panel iterates it to render rows in the spacing / typography / size / color tabs.

### 6.1 `TokenDef`

```ts
export type TokenGroup = string;
export type TokenControl = 'slider' | 'select' | 'text';

export interface TokenDef {
  /** Stable id used as the key in persisted state (e.g. `hsp-2xs`). */
  id: string;
  /** CSS custom property written to `:root` (e.g. `--myapp-spacing-md`). */
  cssVar: string;
  /** Display label shown in the panel row. */
  label: string;
  /** Manifest group — tab components use this for section headers. */
  group: TokenGroup;
  /** Default value as a CSS string (`0.125rem`, `12px`, etc.). */
  default: string;
  /** Slider min, in `unit`. Unused for non-slider controls. */
  min: number;
  /** Slider max, in `unit`. */
  max: number;
  /** Slider step, in `unit`. */
  step: number;
  /** Unit suffix (`rem`, `px`, `%`, …). May be empty for unitless tokens. */
  unit: string;
  /** Read-only tokens are displayed but not editable. */
  readonly?: true;
  /** Which control renders this token. Defaults to `'slider'` when absent. */
  control?: TokenControl;
  /** Select options — only used when `control === 'select'`. */
  options?: readonly string[];
  /** Hide behind the per-tab Advanced `<details>` disclosure. */
  advanced?: true;
  /** Opt-in pill toggle (e.g. for `--radius-full` 9999px sentinel). */
  pill?: { value: string; customDefault: string };
}
```

### 6.2 `TokenManifest`

```ts
export interface TokenManifest {
  spacing: readonly TokenDef[];
  typography: readonly TokenDef[];
  size: readonly TokenDef[];
  color: readonly TokenDef[];
  /** Optional — group ordering & titles. Panels render in declaration order if absent. */
  groupOrder?: {
    spacing?: readonly TokenGroup[];
    typography?: readonly TokenGroup[];
    size?: readonly TokenGroup[];
    color?: readonly TokenGroup[];
  };
  groupTitles?: Readonly<Record<TokenGroup, string>>;
}
```

The four arrays are required even if some are empty. Hosts whose color tab is driven entirely by the cluster (the common case) ship `color: []` and let the cluster do the work.

### 6.3 Worked example

```ts
// src/lib/my-tokens.ts
import type { PanelConfig } from '@takazudo/zudo-design-token-panel/astro';

type TokenManifest = PanelConfig['tokens'];

export const myTokens: TokenManifest = {
  spacing: [
    {
      id: 'spacing-md',
      cssVar: '--myapp-spacing-md',
      label: 'Spacing M',
      group: 'hsp',
      default: '1rem',
      min: 0,
      max: 4,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  typography: [
    {
      id: 'text-base',
      cssVar: '--myapp-text-base',
      label: 'Body Text',
      group: 'font-size',
      default: '1rem',
      min: 0.75,
      max: 1.5,
      step: 0.0625,
      unit: 'rem',
    },
  ],
  size: [],
  color: [],
};
```

### 6.4 Helpers (re-exported)

Three utility functions are part of the public surface — call them when authoring a manifest:

| Helper              | Signature                                                                   | Purpose                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `parseNumericValue` | `(value: string) => number \| null`                                         | Strip the leading numeric portion from a CSS length string (`'1.5rem'` → `1.5`). Returns `null` for unparseable input (e.g. `clamp(...)`). |
| `formatValue`       | `(n: number, unit: string) => string`                                       | Re-format a numeric slider value back into the stored string form (`(1.5, 'rem')` → `'1.5rem'`).                                           |
| `buildTokenIndex`   | `(...groups: readonly (readonly TokenDef[])[]) => Record<string, TokenDef>` | Build a flat lookup keyed by `TokenDef.id`.                                                                                                |

### 6.5 Empty manifest — the empty-state UI

When a tab's category in `tokens` is an empty array, the panel surfaces a friendly empty-state inside that tab body instead of a blank pane:

> No tokens are registered for this tab. Pass a `TokenManifest` to `configurePanel({ tokens })` — see the package README §3.

This is intentionally scoped to the **spacing**, **typography**, and **size** tabs — the categories whose tab body is driven by `tokens.<category>` directly. The **color** tab is NOT covered by the empty-state branch because it is driven by `colorCluster`, not by `tokens.color`. Cluster-driven hosts deliberately ship `color: []` for that reason; surfacing the empty-state under the color tab on the strength of an empty `tokens.color` would fire on every cluster-driven host.

If you want the empty-state to disappear on first integration, supply at least one `TokenDef` in the relevant category — the `<EmptyState>` only fires when the array is literally empty.

### 6.6 Apply behaviour

The panel walks each `TokenDef` on apply:

- If `readonly`, the row is display-only — no writes.
- If the override map has a non-empty string for `id`, the panel calls `document.documentElement.style.setProperty(t.cssVar, value)`.
- Otherwise, the panel removes the inline property so the consumer's stylesheet default wins.

The write target is always `:root`. No shadow DOM, no scoped overrides — the panel ships a global tweak intentionally.

---

## 7. Color cluster schema

The color tab — palette + base roles + semantic table + scheme registry — is parameterized through a `ColorClusterConfig` so any host can ship a different palette size, CSS-var family, or semantic vocabulary without touching the panel internals.

### 7.1 `ColorClusterConfig`

```ts
export type BaseRoleKey = 'background' | 'foreground' | 'cursor' | 'selectionBg' | 'selectionFg';

export interface ColorClusterConfig {
  /** Stable id — used for debugging / logging only. */
  id: string;
  /** Expected palette length. Drives init + persisted-state validation. */
  paletteSize: number;
  /**
   * Palette-slot CSS var template. The panel substitutes `{n}` with the
   * palette index at apply time.
   *
   *   '--myapp-palette-{n}'  →  --myapp-palette-0, --myapp-palette-1, ...
   */
  paletteCssVarTemplate: string;
  /** base-role name → CSS custom-property name. A cluster MAY declare a subset. */
  baseRoles: Partial<Record<BaseRoleKey, string>>;
  /** Semantic token name → default palette index. */
  semanticDefaults: Record<string, number>;
  /** Semantic token name → CSS custom-property name. */
  semanticCssNames: Record<string, string>;
  /** Fallback palette indices when a scheme omits a base role. */
  baseDefaults: Partial<Record<BaseRoleKey, number>>;
  /** Fallback `shikiTheme` when a scheme lacks one. */
  defaultShikiTheme: string;
  /**
   * Bundled scheme registry — keyed by display name. The Scheme… dropdown in
   * the color tab lists these. Pass `{}` for clusters that don't use schemes.
   */
  colorSchemes: Record<string, ColorScheme>;
  /**
   * Panel-level scheme settings. Drives `getActiveSchemeName` and the seed
   * scheme used by `initColorFromScheme`.
   */
  panelSettings: {
    /** Scheme name to seed state from when `colorMode` is `false`. */
    colorScheme: string;
    /**
     * Optional light/dark pairing. When set to an object, the panel honours
     * `<html data-theme>` and switches schemes accordingly on init. Set to
     * `false` to disable the light/dark UI.
     */
    colorMode: false | { defaultMode: 'light' | 'dark'; lightScheme: string; darkScheme: string };
  };
}

export interface ColorScheme {
  background: number | string;
  foreground: number | string;
  cursor: number | string;
  selectionBg: number | string;
  selectionFg: number | string;
  palette: readonly string[]; // length must match paletteSize
  shikiTheme: string;
  semantic?: Record<string, number | string>;
}
```

> **Note** — the runtime type that ships in the package source is
> `ColorClusterDataConfig` (in `src/config/`). `ColorClusterConfig` is
> the public-facing alias re-exported from the package root:
> `import type { ColorClusterConfig } from '@takazudo/zudo-design-token-panel'`.
> The two names are interchangeable.

### 7.2 JSON-serializable constraint (important)

**Every field on `ColorClusterConfig` MUST be JSON-serializable.** No function fields, no class instances. The Astro adapter stringifies the whole config into a `<script type="application/json">` element on the server side and `JSON.parse`s it back at runtime. Functions silently disappear under that round-trip and would surface as cryptic runtime errors.

This is why the palette CSS-var name is a string template (`'--myapp-palette-{n}'`) and not a function `(i) => ...`. The panel substitutes `{n}` for the palette index by plain string replacement.

### 7.3 Worked example

```ts
// src/lib/my-color-cluster.ts
import type { ColorClusterConfig } from '@takazudo/zudo-design-token-panel';

export const myColorCluster: ColorClusterConfig = {
  id: 'myapp-cluster',
  paletteSize: 16,
  paletteCssVarTemplate: '--myapp-palette-{n}',
  baseRoles: {
    background: '--myapp-bg',
    foreground: '--myapp-fg',
  },
  semanticDefaults: { primary: 1, accent: 3, surface: 0, muted: 8, danger: 5 },
  semanticCssNames: {
    primary: '--myapp-color-primary',
    accent: '--myapp-color-accent',
    surface: '--myapp-color-surface',
    muted: '--myapp-color-muted',
    danger: '--myapp-color-danger',
  },
  baseDefaults: { background: 0, foreground: 15 },
  defaultShikiTheme: 'github-dark',
  colorSchemes: {
    Default: {
      background: 0,
      foreground: 15,
      cursor: 4,
      selectionBg: 1,
      selectionFg: 15,
      palette: [
        '#1e1e1e',
        '#2d6cdf',
        '#3aa676',
        '#d97706',
        '#9b5de5',
        '#e63946',
        '#1d3557',
        '#06b6d4',
        '#475569',
        '#94a3b8',
        '#cbd5e1',
        '#e2e8f0',
        '#f1f5f9',
        '#fef3c7',
        '#bbf7d0',
        '#f8fafc',
      ],
      shikiTheme: 'github-dark',
    },
  },
  panelSettings: {
    colorScheme: 'Default',
    colorMode: false,
  },
};
```

### 7.4 Apply behaviour

For each palette slot `i` in `0..paletteSize`, the panel writes `paletteCssVarTemplate.replace('{n}', String(i))` ← `palette[i]`. For each declared base role, it writes the role's CSS-var ← `palette[state[roleKey]]`. For each declared semantic, it resolves the mapping (handles `'bg'`/`'fg'` shorthand) and writes the semantic CSS-var ← resolved hex.

Roles absent from `baseRoles` are not written, so a minimalist cluster (just `background` + `foreground`) is fine.

### 7.5 Host-supplied scheme presets — `colorPresets`

The Color tab's "Scheme..." dropdown surfaces named `ColorScheme` entries. Two sources feed it:

1. **`colorCluster.colorSchemes`** — the cluster's bundled scheme registry. Always present, typically holds your default scheme(s) (`"Default"`, `"Default Light"` / `"Default Dark"`).
2. **`PanelConfig.colorPresets`** — an optional, host-supplied preset map for an additional, larger preset library. Defaults to `{}` — the package itself ships zero presets.

This split exists so a host that just wants the panel for a single scheme (zero or one cluster scheme) does not pay for a long preset blob, while a host that wants to ship a "playground" of curated schemes (Dracula / Solarized / Tokyo Night / etc.) drops them into a single config field.

```ts
// src/lib/my-panel-config.ts
import type {
  PanelConfig,
  ColorScheme,
} from '@takazudo/zudo-design-token-panel/astro';

const myPresets: Record<string, ColorScheme> = {
  Dracula: {
    background: '#282a36',
    foreground: 7,
    cursor: 7,
    selectionBg: '#44475a',
    selectionFg: '#ffffff',
    palette: [
      // 16 hex strings — length must match colorCluster.paletteSize
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
  // ... storagePrefix, tokens, colorCluster, etc.
  colorPresets: myPresets,
};
```

**Dropdown layout** — `<option>`s render in this order:

1. The disabled `Scheme...` placeholder.
2. Each `colorCluster.colorSchemes` entry, in insertion order.
3. An `<hr />` separator.
4. Each `colorPresets` entry, sorted alphabetically.

**Key collision** — if a `colorPresets` key matches a `colorCluster.colorSchemes` key, the cluster scheme wins for `handleLoadPreset`. The bundled cluster scheme is the cluster owner's documented default and overrides the optional host preset list. Rename one of the keys if you want both to be selectable.

**JSON-serializable** — every `ColorScheme` is plain JSON, same as the cluster (§6.2). The host-supplied preset map crosses the Astro frontmatter → island boundary as part of the serialised `PanelConfig`.

> **Note on preset libraries.** The package ships zero baked-in scheme presets — the long preset blob (Dracula / Solarized / Tokyo Night / etc.) historically baked into earlier internal versions has been moved out of the package so consumers do not pay for a preset library they do not use. Hosts that want a curated preset list ship it themselves through `panelConfig.colorPresets`.

---

## 8. Astro wiring

```astro
---
import { DesignTokenPanelHost } from '@takazudo/zudo-design-token-panel/astro';
import { myPanelConfig } from '../lib/my-panel-config';
---

<DesignTokenPanelHost config={myPanelConfig} />
```

### 8.1 The `config` prop

`<DesignTokenPanelHost>` accepts the full `PanelConfig` from §6. The component renders two sibling `<script>` blocks:

1. An inline `<script type="application/json" id="tokenpanel-config">` carrying `JSON.stringify(config)` (with `<` defensively escaped to `<` for HTML-parsing safety).
2. An Astro `<script>` that imports the host adapter side-effect-style. The consumer's Astro toolchain bundles this into the page's client JS.

The adapter reads the JSON, calls `configurePanel(...)`, installs the console API, and gates the lazy import.

### 8.2 JSON-serializability constraint

Astro stringifies props at render time. **Functions, class instances, and `undefined` values silently disappear** when the config crosses the SSR → client boundary. Always design your `PanelConfig` with `JSON.parse(JSON.stringify(config))` round-trip in mind. The biggest gotcha is the palette CSS-var template — keep it a string template (`'--myapp-palette-{n}'`), never a `(i) => ...` function.

### 8.3 View-transition lifecycle

When the consumer site renders Astro's `<ClientRouter />`, the panel's host adapter automatically wires:

- `astro:before-swap` → unmount the Preact tree (`render(null, root)`), remove the host node, snapshot visibility intent so the remount decision survives the body swap.
- `astro:page-load` → re-apply persisted overrides + re-materialise the shell when either the visibility flag or the persisted-overrides flag is set.

No additional wiring needed in your layout beyond importing `<ClientRouter />` from `astro:transitions`.

### 8.4 Where to mount

The conventional placement is **at the end of `<body>`** in your shared layout. Mounting it earlier still works but the render order looks better when the panel is the last child of `<body>`.

### 8.5 Non-Astro hosts (Vite-only)

The `./astro` sub-export is the only place that imports anything Astro-flavoured. The package's main entry (`@takazudo/zudo-design-token-panel`) is framework-agnostic: call `configurePanel(...)` yourself, then `import('@takazudo/zudo-design-token-panel')` to materialise the panel. The `astro:before-swap` / `astro:page-load` listeners no-op outside an Astro context but the storage / mount / apply paths work identically.

---

## 9. Storage-key derivation

`storagePrefix` is the single knob that controls every persisted key. The panel derives keys from this base at runtime.

| Logical key | Derivation                  | Purpose                                                                                                                 |
| ----------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `state-v2`  | `${storagePrefix}-state-v2` | Unified envelope (color + spacing + typography + size + panelPosition + optional secondary cluster).                    |
| `state-v1`  | `${storagePrefix}-state`    | Legacy pre-v2 flat-state format. Migrated into `state-v2` on first load, then deleted.                                  |
| `open`      | `${storagePrefix}-open`     | Mirror of the panel's `open` boolean (synchronous mount-time read — preserves user intent across reloads, fixes #1549). |
| `position`  | `${storagePrefix}-position` | Drag position `{ top, right }` so the panel reappears where the user left it.                                           |
| `visible`   | `${storagePrefix}:visible`  | Adapter-level visibility-intent flag, owned by the lazy-load gate.                                                      |

For example, with `storagePrefix: 'myapp-design-token-panel'`:

```
myapp-design-token-panel-state-v2
myapp-design-token-panel-state
myapp-design-token-panel-open
myapp-design-token-panel-position
myapp-design-token-panel:visible
```

### Note: colon vs dash on the `visible` key

The `visible` key uses a literal `:` separator, not `-`. Every other derived key uses `-`. This is intentional — see [`PORTABLE-CONTRACT.md`](./PORTABLE-CONTRACT.md) §2 for the historical reason. Don't try to "normalize" it; the unit tests assert this specific shape.

---

## 10. Console API contract

Once `configurePanel` has run, the package installs three async helpers on the global `window[consoleNamespace]` object:

```ts
window.myapp.showDesignPanel(); // open the panel
window.myapp.hideDesignPanel(); // close the panel
window.myapp.toggleDesignPanel(); // toggle
```

All three are **async** — the first call lazy-imports the panel module. Subsequent calls share the memoised module promise and resolve synchronously after the first import completes.

### Co-existing helpers on the same namespace

The adapter **merges** its three helpers into any existing object at `window[namespace]` rather than overwriting the namespace wholesale. This means a host can share a namespace between multiple dev tools (e.g. `window.myapp.ogpDebug.show()` from a separate package, alongside `window.myapp.showDesignPanel()` from this one) without collisions.

### Default

There is no default `consoleNamespace` exposed to consumers — the field is required on `PanelConfig`. Pick a short, unambiguous string (typically your app's slug).

---

## 11. Tailwind not required

The panel ships its own bundled CSS scoped under a panel-private namespace:

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  --tokentweak-color-fg: var(--color-fg, oklch(87% 0.01 60));
  --tokentweak-color-bg: var(--color-bg, oklch(18% 0.01 50));
  --tokentweak-color-surface: var(--color-surface, oklch(22% 0.01 50));
  --tokentweak-color-accent: var(--color-accent, oklch(65% 0.2 45));
  --tokentweak-font-mono: var(--font-mono, Menlo, Monaco, Consolas, …);
  --tokentweak-pad-md: …;
  --tokentweak-gap-sm: …;
  --tokentweak-text-body: …;
  --radius-tokentweak: …;
  /* …one custom property per panel-chrome value */
}
```

- **Naming:** every panel-private CSS variable uses the `--tokentweak-*` prefix. Consumer-namespaced identifiers do not appear in the panel chrome — `panel.css` reads only `--tokentweak-*`.
- **Files:** `panel.css` (chrome layout / typography / controls) + `panel-tokens.css` (the `--tokentweak-*` declarations). Both ship from the package and the consumer pulls them in via `sideEffects`.
- **No Tailwind dependency in the consumer.** The panel chrome uses hand-authored CSS classes backed by `--tokentweak-*` variables. You can integrate the panel into a Tailwind site, a CSS Modules site, a vanilla CSS site, or anything in between.

### 11.1 Two-layer override model for chrome colors

The panel-chrome color tokens (`--tokentweak-color-fg`, `--tokentweak-color-bg`, `--tokentweak-color-muted`, `--tokentweak-color-surface`, `--tokentweak-color-accent`, `--tokentweak-color-accent-hover`, `--tokentweak-color-code-bg`, `--tokentweak-color-code-fg`, `--tokentweak-color-success`, `--tokentweak-color-danger`, `--tokentweak-color-warning`, `--tokentweak-font-mono`) are declared as a `var(--host, fallback)` ladder. This gives hosts two override layers and works out-of-the-box when neither is supplied:

| Host declares | Outcome |
|---|---|
| Nothing | Built-in fallback paints the panel (a sensible neutral dark theme). |
| `--color-fg` (and friends) at `:root` | Host theme cascades into the panel — no panel-side change needed. |
| `--tokentweak-color-fg` directly | Panel-only override that bypasses the host's `--color-*` theme. Useful when you want the panel to look different from your site shell (e.g., a brand-neutral inspector overlay). |

Because the fallback ladder is host-CSS-var-driven, a brand-new consumer can mount the panel without declaring any `--color-*` tokens and still get readable chrome.

The CSS variables the panel **writes to** (the `cssVar` field on each `TokenDef`, the cluster's `paletteCssVarTemplate`, base-role names, and semantic CSS names) are entirely consumer-controlled. The package never reads those consumer CSS variables; it only writes through `setProperty` on `:root`.

---

## 12. Bundler notes

The package builds in **Vite library mode**, which has a quirk that's important to understand: it extracts every `import './something.css'` from the source and emits a single combined stylesheet (`dist/design-token-panel.css`), but **removes the import statements from the emitted JS files**. The `dist/index.js` and `dist/astro/host-adapter.js` therefore have no static reference back to the CSS — `sideEffects: ["**/*.css"]` in `package.json` only protects existing imports from tree-shaking; it cannot resurrect an import the build step has already deleted.

Net effect: the consumer MUST add a one-line side-effect import to their static module graph, as described in §3.4. The `./styles` sub-export is the canonical entry:

```ts
import '@takazudo/zudo-design-token-panel/styles';
```

`./styles.css` is provided as an alias for clarity in tooling that prefers explicit extensions:

```ts
import '@takazudo/zudo-design-token-panel/styles.css';
```

If you forget the import, the JS layer still works — `window.<ns>.showDesignPanel()` mounts the shell DOM correctly — but every chrome rule is missing, so the panel appears invisible against the host page background. The fix is the import, not bundler reconfiguration.

(Historical note: an earlier draft of this section claimed `sideEffects` alone was sufficient and consumers did not need to import CSS. That was incorrect — Vite library mode's CSS-extraction behaviour means `sideEffects` is necessary but not sufficient. The §3.4 + this section now reflect the actual contract.)

### 12.1 Host-adapter side-effect import (paired-unit contract)

The package's distributed Astro surface ships built `dist/astro/*` files. The host-adapter (`dist/astro/host-adapter.js`) is the runtime that reads the inline JSON config emitted by `<DesignTokenPanelHost>` and installs `window.<consoleNamespace>.*`. Earlier package versions emitted a hoisted `<script>import './host-adapter';</script>` block from inside `DesignTokenPanelHost.astro` to load it; that block did not reliably reach production page bundles — Vite/Rollup processed the import, recognized it as resolving to a sibling JS file outside the consumer's source tree, emitted an empty chunk, and never linked it from any page entry.

For consumer-side imports, the package's `package.json` lists `dist/astro/host-adapter.js` in the `sideEffects` array so Rollup preserves the import even when its result is discarded (the host adapter has top-level execution that registers the console API — Rollup's tree-shaker has no way to know that without the metadata hint).

Net effect: the consumer MUST own the host-adapter import in their wrapper layout. Use the dynamic `void import('...')` form below — it loads the host-adapter chunk off the critical path (mirrors the existing color-presets lazy-loader) and is robust to future packaging changes that could miss-configure `sideEffects`. A top-level `import '...';` works too with the current `sideEffects` list, but the dynamic form is the recommended canonical wiring.

```astro
<script>
  void import('@takazudo/zudo-design-token-panel/astro/host-adapter');
</script>
```

This is the second half of the paired-unit contract from §3.2 (`<DesignTokenPanelHost>` AND the host-adapter `<script>` block — always together). If you forget it, the `<DesignTokenPanelHost>` JSON config payload still ships, but no JS reads it, so calling `window.<consoleNamespace>.showDesignPanel()` throws `ReferenceError`.

For the regression-guard tests that pin this contract, see `package-exports.test.ts` under the package's test suite.

---

## 13. Troubleshooting

### 13.1 FOUT (flash of unstyled tokens) on hard navigation

**Symptom:** on first paint after a hard reload, the page renders with the consumer's default token values for a beat before snapping to the user's saved overrides.

**Resolution:** the host adapter eagerly re-applies persisted overrides during the lazy-load gate (probes `${storagePrefix}-state-v2` and `${storagePrefix}:visible` synchronously from `localStorage`). If you still see a flash, your `<DesignTokenPanelHost>` is being rendered too late in the document (e.g. inside a deferred island) — move it to the layout's `<body>` and verify the inline `<script type="application/json" id="tokenpanel-config">` is in the initial HTML.

### 13.2 Auto-mount race on first reload

**Symptom:** the panel does not re-open on the first reload after the user closed it, even though `${storagePrefix}-open` is set in `localStorage`.

**Resolution:** the open boolean is mirrored to `localStorage` synchronously and read at mount time so the next mount opens directly into the user's last state without a post-render toggle dispatch. If the symptom persists, confirm the storage key matches what the contract derives (§8) and that nothing else in the page is clearing the key on load.

### 13.3 Live-apply regression test approach

**Symptom:** after a panel-package change, you want to confirm the live-apply pipeline (storage → adapter → `:root`) is unbroken end-to-end.

**Resolution:** the canonical regression test is each example app's `apply-roundtrip.spec.ts` Playwright spec under `examples/<framework>/tests/e2e/`. It boots the example's preview build, seeds a v2 state under the example's storage prefix, hard-reloads, and asserts the adapter rehydrated and applied the override against the example's palette and semantic CSS variable names. The contract: storage prefix, palette template, semantic CSS names — change one of those and this spec fails first.

---

## 14. Migration recipe — adopting the panel into an existing consumer

This recipe walks through wiring the panel into a project that does not currently use it. If you previously consumed an internal pre-OSS snapshot of the panel where storage keys, console namespace, modal class prefix, and cluster identifiers were hardcoded literals, the same steps apply — your job is to lift those literals into a `PanelConfig` value.

1. **Install the package.**

   ```sh
   pnpm add @takazudo/zudo-design-token-panel preact
   ```

2. **Define your `PanelConfig` literals.**

   Pick identifiers for `storagePrefix`, `consoleNamespace`, `modalClassPrefix`, `schemaId`, `exportFilenameBase`, and your palette CSS-var family (`paletteCssVarTemplate`). Pull these into a host-side config file (e.g. `src/lib/panel-config.ts`). If you are migrating from an internal snapshot fork and want to preserve users' saved state across the migration, keep the legacy values verbatim; otherwise pick fresh, neutral identifiers (e.g. `myapp-design-token-panel`).

3. **Author your token manifest in the host project.**

   The package itself ships zero baked-in manifest data. Define `SPACING_TOKENS`, `FONT_TOKENS`, `SIZE_TOKENS`, `COLOR_TOKENS` (or whatever names you prefer) in your project and wire them up as `tokens.spacing`, `tokens.typography`, `tokens.size`, `tokens.color`. The host is the source of truth.

4. **Author your color cluster in the host project.**

   Build a `ColorClusterConfig` value with your palette, base roles, semantic table, and scheme registry. **The palette CSS-var name MUST be a string template, not a function:**

   ```ts
   // wrong (function — does not survive Astro frontmatter → island handoff)
   // paletteCssVar: (i) => `--myapp-p${i}`,

   // right (string template, JSON-serializable)
   paletteCssVarTemplate: '--myapp-p{n}',
   ```

   Every other field on the cluster is a plain value already.

5. **Drop `<DesignTokenPanelHost>` into your layout.**

   ```astro
   ---
   import { DesignTokenPanelHost } from '@takazudo/zudo-design-token-panel/astro';
   import { myPanelConfig } from '../lib/panel-config';
   ---

   <DesignTokenPanelHost config={myPanelConfig} />
   ```

   The host adapter does the rest (calls `configurePanel`, installs the console API, gates lazy-load). Don't forget the paired host-adapter `<script>` block — see §4.1.2.

6. **Verify storage keys derive to the expected literals.**

   Open devtools → Application → Local Storage. Confirm you see keys derived under your `storagePrefix` and that any pre-existing user state (under the legacy prefix, if you preserved it) is migrated forward through the v1 → v2 path on first load.

7. **Run the live-apply e2e spec.**

   Use any of the example apps' Playwright spec under `examples/<framework>/tests/e2e/apply-roundtrip.spec.ts` as a template: seed a `${storagePrefix}-state-v2` payload, hard-reload, assert your palette and semantic CSS variables on `:root` reflect the seeded values.

For edge cases hit during the migration, see CONTRIBUTING and the doc-site reference pages for each `PanelConfig` field.

---

## 15. Worked examples

The canonical worked examples live under [`examples/`](../../examples/) at the repo root. Three independent consumer apps demonstrate the panel across different host frameworks:

- [`examples/astro/`](../../examples/astro/) — Astro + Preact island consumer. Uses `storagePrefix: 'astro-example-tokens'`, `consoleNamespace: 'astroExample'`, `paletteCssVarTemplate: '--astroexample-palette-{n}'`.
- [`examples/vite-react/`](../../examples/vite-react/) — Vite + React consumer (panel mounted as a Preact island, React tree untouched). Uses the `viteReactExample` namespace.
- [`examples/next/`](../../examples/next/) — Next.js (App Router) + React consumer, panel as a `'use client'` boundary. Uses the `nextExample` namespace.

Each example renders a tiny page with cards, buttons, and palette swatches whose styles reference its own demo CSS variables, so panel tweaks update the page in real time. Each ships a Playwright spec at `tests/e2e/apply-roundtrip.spec.ts` that asserts the live-apply pipeline.

To run any example locally:

```sh
pnpm install
pnpm --filter @takazudo/zudo-design-token-panel build
pnpm --filter astro-example dev
# open http://localhost:44324
# in devtools console: window.astroExample.toggleDesignPanel()
```

Use the closest example as a copy-paste template when wiring the panel into your own project — they are the smallest end-to-end consumers that exercise every contract surface.
