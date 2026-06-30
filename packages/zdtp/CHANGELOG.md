# Changelog

## 0.4.2

### Features

- **OKLCH color tab — the reserved `color` tab now honors `format: 'oklch'`.** A cluster-based color tab whose palette tier items declare `type: { kind: 'color', format: 'oklch' }` now edits its palette swatches through the lossless OKLCH `ColorField` (the `valueFormat: 'oklch'` picker added in 0.3.3) while keeping the full color-cluster feature set — base roles, semantic→palette mappings, the "Scheme…" preset dropdown, and the secondary cluster. The palette `format` is read from `tab.tiers` (the flattened cluster drops per-item format), and both the primary and secondary cluster palettes honor it. Absent / `'hex'` format keeps the existing native hex behavior, so existing consumers and the highlight popover are unchanged. ([#436](https://github.com/Takazudo/zudo-design-token-panel/issues/436), epic [#434](https://github.com/Takazudo/zudo-design-token-panel/issues/434), supersedes [#433](https://github.com/Takazudo/zudo-design-token-panel/issues/433)) (ab761b6)

- **Owner-only autoload.** A new `${storagePrefix}:autoload` `localStorage` flag lets the site owner load the panel in their own browser without touching general visitors. When the flag is set, the panel bundle loads eagerly on every page visit and mounts CLOSED — the **Alt+click element-path inspector** is armed immediately even while the panel UI stays hidden. General visitors (no flag) receive zero panel JS.

  New package-root exports: `enableAutoload()`, `disableAutoload()`, `shouldAutoload()`. The Astro host-adapter also installs `window[consoleNamespace].enableAutoload()` and `window[consoleNamespace].disableAutoload()` on the console API surface.

  The existing on-demand flow (`showDesignPanel()` / `hideDesignPanel()` / `toggleDesignPanel()`) is unchanged. Owner-autoload is an opt-in layer on top of it, not a replacement.

  **Auto-remember:** any action that opens the panel also writes `${storagePrefix}:autoload = '1'`. Once an owner opens the panel, subsequent page loads reload it automatically without another explicit `enableAutoload()` call.

  **Lazy-load gate updated from 2 to 4 signals:** the host-adapter gate now fires on `wasVisible() || hasPersistedOverrides() || shouldAutoload() || loadElementPathEnabled()`. The last two signals are new; the previous two-signal behavior is a strict subset of the new gate, so existing consumers see no change.

  ([#419](https://github.com/Takazudo/zudo-design-token-panel/issues/419), [#420](https://github.com/Takazudo/zudo-design-token-panel/issues/420), [#421](https://github.com/Takazudo/zudo-design-token-panel/issues/421), [#422](https://github.com/Takazudo/zudo-design-token-panel/issues/422), [#423](https://github.com/Takazudo/zudo-design-token-panel/issues/423))

### Fixed

- **Runtime preserves OKLCH through seed / apply / persist.** `initColorFromSchemeData` no longer eagerly normalizes the whole palette to sRGB hex via a canvas `fillStyle` round-trip — raw `oklch(...)` palette values now survive seeding (wide-gamut chroma intact; no collapse to `#000000` under jsdom / engines whose 2D canvas can't parse `oklch`), and `colorRefToIndex` is format-tolerant + alpha-aware. Non-`oklch` entries are still sanitized through `cssColorToHex`, so an invalid bundled-scheme string (e.g. `Default Dark`'s slot-9 `"18"`, referenced by `background: 9`) cannot leak into a CSS custom property. ([#435](https://github.com/Takazudo/zudo-design-token-panel/issues/435)) (162bf8e, 8d54e07)

- **Owner-autoload review fixes** — `disableAutoload()` now unmounts the panel, and element-path storage keys are per-instance. ([#424](https://github.com/Takazudo/zudo-design-token-panel/issues/424)) (ecfd745)

### Other Changes

- **Panel is draggable, movable & resizable on narrow windows**; `defaultSize()` is clamped to the `MIN_PANEL` floor on phone-width viewports; and Element-Path-Copy keeps working while the panel is closed. ([#415](https://github.com/Takazudo/zudo-design-token-panel/pull/415)) (2dc40a1, 8fb99b5, f163625)
- Wave-2 OKLCH cluster end-to-end test plus runtime / color-tab coverage. ([#437](https://github.com/Takazudo/zudo-design-token-panel/issues/437)) (8da36c6, 47e4d83, fad4ded)
- Bump the `@takazudo/*` toolchain (zfb next.72, zudo-doc 2.1.2). (d711839)
- Doc-site migration to zudo-doc v2 — doc-site only, no package impact. ([#432](https://github.com/Takazudo/zudo-design-token-panel/pull/432))

## 0.4.1

### Fixed

- **Palette tab no longer renders unstyled for self-injection consumers.** The 0.4.0 palette-tab CSS (`palette-chart` / `palette-edit` / `palette-readout`) reached `dist/zdtp.css` but was missing from the stylesheet the panel self-injects at runtime, so consumers using `import('@takazudo/zdtp')` + `configurePanel(...)` without importing `@takazudo/zdtp/styles` saw collapsed swatch bars and a missing curve-editor canvas. The two palette stylesheets are now `@import`ed into the single `panel.css` aggregate (matching `color-picker.css`) so both CSS delivery paths stay in sync, guarded by a new static `Invariant G` test. ([#413](https://github.com/Takazudo/zudo-design-token-panel/issues/413))

## 0.4.0

### Features

- **Palette tab — an OKLCH palette generator & checker built into the panel.** A new reserved `palette` tab (joining `color` / `font` / `spacing` / `size`) lets a host define grouped color scales as `{ kind: "color", format: "oklch" }` tier items (`--palette-{group}-{n}`) and edit/verify them in-panel with no lossy hex round-trip. Two modes:
  - **Edit mode** — a grouped step grid plus a `PrismChart` OKLCH L/C/H curve editor; dragging a curve re-derives every step in the group and commits the whole group in one batched write on pointer-up. ([#390](https://github.com/Takazudo/zudo-design-token-panel/issues/390), [#393](https://github.com/Takazudo/zudo-design-token-panel/issues/393), [#395](https://github.com/Takazudo/zudo-design-token-panel/issues/395))
  - **Check mode** — a WCAG contrast-checker view over the live palette. ([#394](https://github.com/Takazudo/zudo-design-token-panel/issues/394))
  - Backed by new OKLCH curve math + WCAG contrast helpers, and wired through the generic-tab apply path (`buildApplyOverrides` emits `state.tabs[*]`) so palette overrides apply, persist, and round-trip through Export/Load. ([#391](https://github.com/Takazudo/zudo-design-token-panel/issues/391), [#392](https://github.com/Takazudo/zudo-design-token-panel/issues/392))

### Fixed

- Palette flat-mode tier ids, persist-safe hue handling, and serialize arity (post-codex-review hardening). (f9c38f9)

### Other Changes

- Integration + serde + browser-confirm test coverage for the palette tab. ([#396](https://github.com/Takazudo/zudo-design-token-panel/issues/396))
- Add a grouped palette tab recipe + reference docs (EN + JA). ([#397](https://github.com/Takazudo/zudo-design-token-panel/issues/397))

## 0.3.3

### Features

- **OKLCH display & edit for opt-in GenericTab color items.** A `GenericTab` `{ kind: "color" }` tier item can now set `format: "oklch"` to route through the OKLCH/HSL `ColorPicker` instead of the native `<input type="color">`, so host/secondary panels can faithfully **display and edit** wide-gamut oklch/P3 palette values (e.g. a family-named `--palette-cool-700: oklch(...)`) with **no lossy hex round-trip on commit**. Additive and backward compatible — omitting `format` (or `"hex"`) keeps the native color input, so existing consumers, `ColorTab`, and the highlight popover are unchanged. ([#373](https://github.com/Takazudo/zudo-design-token-panel/issues/373), supersedes [#372](https://github.com/Takazudo/zudo-design-token-panel/issues/372))
  - Add a `cssToOklcha` CSS Color 4 `oklch()` parser (number/percentage L, chroma `%` = 0.4, deg/rad/grad/turn hue, `none`, alpha; strict — rejects malformed channels). ([#374](https://github.com/Takazudo/zudo-design-token-panel/issues/374))
  - Extend the public `{ kind: "color" }` tier-item type with optional `format?: "hex" | "oklch"`. ([#375](https://github.com/Takazudo/zudo-design-token-panel/issues/375))
  - Give `ColorPicker` a `valueFormat` contract: in oklch mode a canonical `Oklcha` is the source of truth and wide-gamut chroma survives prop→edit→emit without sRGB clamping. ([#376](https://github.com/Takazudo/zudo-design-token-panel/issues/376))
  - HSL/alpha/preset hardening: the OKLCH↔HSL mode toggle is emit-free; only an HSL slider edit is a (documented) sRGB-oriented path. ([#377](https://github.com/Takazudo/zudo-design-token-panel/issues/377))
  - Add a shared `ColorField` (swatch-button → picker popover) and route both generic item editors through it. ([#378](https://github.com/Takazudo/zudo-design-token-panel/issues/378))

### Fixed

- **Style the `ColorField` swatch and reject malformed oklch tokens.** The new opt-in swatch had no CSS (an empty `div` with only a background color → zero-size/invisible affordance); added sized swatch styles. The `cssToOklcha` tokenizer also accepted malformed channels (e.g. `oklch(50px 0.1 120)`) by silently extracting numeric substrings; it now requires exactly three fully-anchored channel tokens and rejects unknown suffixes. ([#380](https://github.com/Takazudo/zudo-design-token-panel/pull/380)) (2d045d0)

### Other Changes

- Add an end-to-end test asserting the oklch round-trip (panel `onChange` + apply path both emit `oklch(...)`) and wide-gamut P3 preservation. ([#379](https://github.com/Takazudo/zudo-design-token-panel/issues/379)) (0595f28)

## 0.3.2

### Fixed

- **Mount the real config on the toggle window event for single-instance non-Astro hosts.** The 0.3.0 multi-instance refactor binds the default instance's `toggle-design-token-panel` listener eagerly at module init, closed over the empty `DEFAULT_PANEL_CONFIG`; the post-`configurePanel()` rebind no-oped for the already-bound prefix, so window-event hosts mounted an empty-body panel (toolbar shell, no tabs). The toggle handler now re-resolves the instance config by prefix at dispatch time (falling back to the active instance for the reserved default event), and `panel.tsx`'s `tabConfigById` tracks `[instanceConfig]` so the tab-body dispatch map never goes stale. The console API was unaffected, so only non-Astro window-event hosts regressed. ([#370](https://github.com/Takazudo/zudo-design-token-panel/issues/370))

- **Dedupe the reserved toggle event across listeners.** When a custom-prefix host opts into the reserved `toggle-design-token-panel` name via `config.toggleEvent`, both the eager default listener and the instance's own listener fired on one dispatch and resolved to the same instance — toggling it twice (open, then immediately close). The handler now dedupes per dispatch by resolved instance id carried on the shared Event object, so the panel opens exactly once. ([#371](https://github.com/Takazudo/zudo-design-token-panel/pull/371))

## 0.3.1

### Fixed

- **Round-trip generic (custom-id) tab overrides through Export/Load.** The design-token serde only handled the four dedicated slices (color/spacing/font/size); overrides for host-coined generic (custom-id) tabs lived in `state.tabs` and were applied live but silently dropped from Export, so Load-from-JSON could not restore them. `serialize()` now emits each non-reserved configured tab's overrides under `tabs[id].raw` (cssVar-keyed) and `deserializeV2()` reads them back into `state.tabs[id]` via a tier-aware reverse lookup — symmetric with the existing apply path. ([#363](https://github.com/Takazudo/zudo-design-token-panel/issues/363))

- **Skip the bin integration test suite when `dist/bin/server.js` is absent.** `server.integration.test.ts` spawns the built bin and previously threw in `beforeAll` when it was missing, failing the `node` vitest project on a fresh checkout (before a build). It now gates the suite with `describe.skipIf` on build presence (with a console warning) instead of hard-failing; CI builds before testing, so the suite still runs there. ([#360](https://github.com/Takazudo/zudo-design-token-panel/issues/360))

## 0.3.0

### Features

- **Multi-instance support.** `configurePanel(config)` now returns a `PanelInstanceHandle` and supports multiple independent panel instances on one page. Calling it with a distinct `storagePrefix` registers a new instance (independent storage keys, DOM root, toggle event, apply target). Calling it again with the same prefix and structurally-equal config is a no-op that returns the same handle (covers Astro view-transition reruns). Calling it with the same prefix but a structurally-different config throws immediately (`RECONFIGURE_RULE = 'reject-with-error'`); call `handle.destroy()` first to re-configure a prefix. Additive and backward-compatible — single-panel hosts observe no change. ([#353](https://github.com/Takazudo/zudo-design-token-panel/issues/353))

- **`PanelInstanceHandle`.** `configurePanel` now returns a handle with `{ instanceId, open(), close(), toggle(), destroy() }`. `instanceId` equals `storagePrefix`. `destroy()` deregisters the instance, unmounts its Preact tree, removes its DOM root, and unbinds its toggle-event listener — freeing the prefix for re-configuration. ([#353](https://github.com/Takazudo/zudo-design-token-panel/issues/353))

- **Per-instance toggle events.** The default instance (the historical `storagePrefix`) keeps `toggle-design-token-panel` unchanged. Any instance with a non-default prefix listens on `config.toggleEvent` when supplied, or `toggle-${storagePrefix}` by default — giving each instance its own independent toggle channel. `PanelConfig.toggleEvent?: string` is a new optional field. ([#354](https://github.com/Takazudo/zudo-design-token-panel/issues/354))

- **`PanelConfig.applySink`.** An optional `{ apply(pairs), clear(names) }` sink routes this instance's CSS-var writes and clears through a caller-supplied object instead of `document.documentElement`. Useful for shadow DOM, iframe, or test-spy contexts. `apply` = upsert; `clear` = remove. Reset sends the full token-name set for the instance to `sink.clear` so the sink target is completely cleaned. Sink errors are non-fatal (`console.warn`). The host owns the sink target's lifecycle. `applySink` carries function references and must not be passed through the Astro inline JSON config. ([#355](https://github.com/Takazudo/zudo-design-token-panel/issues/355))

## 0.2.3

### Bug Fixes

- A host `color-scheme-changed` event (light/dark toggle) no longer wipes the user's `spacing` / `typography` / `size` tweaks from the live panel. The scheme-change handler now clears only the color cluster's inline `:root` vars and re-seeds only the `color` (and optional `secondary`) slices, leaving the scheme-independent non-color slices — and their applied inline vars — intact. Previously it called the full `clearAppliedStyles()` + `freshTweakState()`, which stripped every spacing/font/size var and emptied those live slices, so the next in-panel edit permanently persisted the loss. A new internal `clearAppliedColorStyles()` performs the color-only clear; full resets (Reset / Apply) keep using `clearAppliedStyles()`. ([#347](https://github.com/Takazudo/zudo-design-token-panel/issues/347))

### Features

- Make `ColorScheme.shikiTheme` optional so hosts can pass their color-scheme maps without a dummy `shikiTheme` or an `as unknown as` cast — the runtime already falls back to the cluster's `defaultShikiTheme`. The hydrated `ColorTweakState.shikiTheme` stays required (it is always defaulted, and `TweakState` is re-exported, so keeping it required avoids widening the public `state.color.shikiTheme` type). (e057388, fd87423, [#342](https://github.com/Takazudo/zudo-design-token-panel/issues/342))

### Other Changes

- docs: document the global (not scheme-scoped) tweak model in README §9 — on a host `color-scheme-changed` event the panel drops its inline overrides and re-seeds the live state from the new scheme, leaving `localStorage` untouched until the next edit. (238b4db, [#343](https://github.com/Takazudo/zudo-design-token-panel/issues/343))
- ci: drop the stale npm `next` dist-tag on stable releases when it lags `latest`, so `@takazudo/zdtp@next` can no longer silently resolve to an older prerelease. (215ec59, [#345](https://github.com/Takazudo/zudo-design-token-panel/issues/345))

## 0.2.2

### Other Changes

- Post-review internal cleanups for the Element Path Copy feature (no behavior change): single source of truth for the highlight / element-path portal-mount ids (`HIGHLIGHT_PORTAL_MOUNT_ID` / `ELPATH_PORTAL_MOUNT_ID`, folded into `PANEL_EXCLUSION_SELECTOR`); `ElementPathToast` now owns its own fixed top-center positioning and z-index; `buildSummary` escapes the id consistently with the selector line; the always-on `mousemove` listener is passive + non-capture; and the hover-label summary is memoized. (0fdcbd6)

## 0.2.1

### Features

- **Element Path Copy inspect mode.** A new crosshair toggle in the panel header arms an inspector: hold **Alt** and hover to draw a DevTools-style box + label over the host element under the cursor, then click to copy an annotated path block — unique CSS `selector`, human-readable `breadcrumb`, ARIA `role`, `text` snippet, identifying `attrs`, and rendered `size` — to the clipboard for precise human↔AI communication about the page. State persists in `localStorage`; the click is swallowed so host links/handlers don't fire. (e8bd453, 736d6d2, [#344](https://github.com/Takazudo/zudo-design-token-panel/pull/344))

### Other Changes

- Apply pre-release deep-review fixes: extract a shared `usePortalMount()` hook used by both the highlight and element-path orchestrators (removing ~80 lines of duplicated portal/`astro:after-swap` lifecycle), render the header toggle via the shared `RoleButton` control, add a persistent visually-hidden `aria-live` region so screen readers announce copy results, and harden the `cssEscapeIdent` fallback for control characters. (9b893f6, a64f4d3, [#344](https://github.com/Takazudo/zudo-design-token-panel/pull/344))
- Bump GitHub Actions off the deprecated Node 20 runtime: `checkout` / `setup-node` / pnpm-setup and the artifact actions to their Node-24-matched versions. (08d5b48, b46fd66, [#339](https://github.com/Takazudo/zudo-design-token-panel/pull/339), [#341](https://github.com/Takazudo/zudo-design-token-panel/pull/341))
- Add a web-env bootstrap for Claude Code on the web. (23f00c3)

## 0.2.0

First clean stable release on the `latest` dist-tag, promoting the
`0.2.0-next.1` / `0.2.0-next.2` prerelease line. A tagless
`pnpm add @takazudo/zdtp` now resolves this build.

### Breaking Changes

- **Removed the `min` and `max` properties from `TokenDef` and `TierValueKind` (`'length'` | `'number'` variants).** Numeric token rows are now plain unconstrained number inputs — the `<input type="range">` slider and the mid-keystroke / on-blur clamp logic (and the `aria-invalid` out-of-range styling) are gone; values commit as typed. Real-world use proved sliders too restrictive for a developer tool. **Migration**: remove every `min: ...` and `max: ...` field from your token manifests. The internal color-picker `SliderConfig.min` / `.max` (OKLCH/HSL axis bounds) is unrelated and unchanged. (a9b768e, [#325](https://github.com/Takazudo/zudo-design-token-panel/issues/325), [#328](https://github.com/Takazudo/zudo-design-token-panel/pull/328))

### Features

- **Token-name tooltip parity across all tabs (Size / Font / Spacing / Easing / GenericTab).** A new shared `TokenLabel` component renders the same `.tokenpanel-tooltip` primitive at every token-name display site (previously only the Color tab had the rich tooltip; others fell back to the native `title` attribute). `TooltipProvider` was lifted from `color-tab.tsx` to `panel.tsx` so all tabs share a single provider. (559c59f, 426e9c6, 84f5981, [#330](https://github.com/Takazudo/zudo-design-token-panel/issues/330), [#337](https://github.com/Takazudo/zudo-design-token-panel/pull/337))

### Other Changes

- Strip `min` / `max` from 35+ test fixture files and rewrite the [#313](https://github.com/Takazudo/zudo-design-token-panel/pull/313) clamp-regression tests to assert the new free-input contract. (b8ef56e, 9798e07)
- Drop slider-describing prose and min/max examples from `README.md`, `PORTABLE-CONTRACT.md`, and the doc-site reference pages (`token-manifest.mdx`, `architecture.mdx`, `configure-panel.mdx`). (e210a2d, 9262585)
- Resolve all `pnpm audit` advisories (1 critical, 3 high, 7 moderate, 1 low) in dev/doc-only tooling — none ship in the published package. (f3574e0)

## 0.2.0-next.2

### Features

- **Token-name tooltip parity across all tabs (Size / Font / Spacing / Easing / GenericTab).** The Color tab already showed a rich custom tooltip with the full token name on hover; every other tab fell back to the native HTML `title` attribute. A new shared `TokenLabel` component renders the same `.tokenpanel-tooltip` primitive at every token-name display site. `TooltipProvider` was lifted from `color-tab.tsx` to `panel.tsx` so all tabs share a single provider. (559c59f, 426e9c6, 84f5981, [#330](https://github.com/Takazudo/zudo-design-token-panel/issues/330), [#337](https://github.com/Takazudo/zudo-design-token-panel/pull/337))

## 0.2.0-next.1

### Breaking Changes

- **Removed the `min` and `max` properties from `TokenDef` and `TierValueKind` (`'length'` | `'number'` variants).** The panel no longer renders an `<input type="range">` slider on numeric token rows — they are now plain unconstrained number inputs. The mid-keystroke clamp and on-blur clamp logic added in [#313](https://github.com/Takazudo/zudo-design-token-panel/pull/313) are gone; values commit as typed, and the `aria-invalid` / red-border styling for out-of-range values is removed. Real-world use proved sliders too restrictive for a developer tool — devs want to type arbitrary values freely (including deliberately out-of-spec or experimental ones). **Migration**: remove every `min: ...` and `max: ...` field from your token manifests. The internal color-picker `SliderConfig.min` / `.max` (OKLCH/HSL axis bounds) is unrelated and unchanged. (a9b768e, [#325](https://github.com/Takazudo/zudo-design-token-panel/issues/325), [#328](https://github.com/Takazudo/zudo-design-token-panel/pull/328))

### Other Changes

- Strip `min` / `max` from 35+ test fixture files. (b8ef56e)
- Rewrite the [#313](https://github.com/Takazudo/zudo-design-token-panel/pull/313) clamp-regression tests to assert the new free-input contract — value commits as typed, no `aria-invalid` on out-of-range numeric input. (9798e07)
- Update `packages/zdtp/README.md` and `packages/zdtp/PORTABLE-CONTRACT.md` to drop slider-describing prose and the min/max examples. (e210a2d)
- Update doc-site reference pages (`token-manifest.mdx`, `architecture.mdx`, `configure-panel.mdx`) to drop the min/max examples and slider-UI prose. (9262585)

## 0.1.0-next.3

### Features

- **Tier-ref selector is now a native `<select>` and reflects live override values.** The custom `role="listbox"` dropdown (with its open/focusedIndex state machine, ARIA plumbing, click-outside handler, and keyboard-nav callbacks) was replaced by a native `<select>`, dropping ~250 lines of UI code. Each `<option>` label now shows `--var-name (resolved-value)` using `resolveTierItemValue()` from the apply pipeline — so when a referenced tier-1 token's value is overridden via its slider/text row, the tier-2 selector's option labels reflect the new value immediately instead of staying stuck on the manifest default. (570a1b1) ([#312](https://github.com/Takazudo/zudo-design-token-panel/issues/312))

### Fixed

- **Number inputs no longer overwrite the user's draft mid-keystroke.** `SliderRow` and the generic-tab item editor used to parse-and-clamp on every keystroke, immediately commit the clamped value, and round-trip it back into the input — so typing `2` then `2` (expecting `22`) snapped the input to `6` when the token's `max` was `6`. Out-of-range or empty drafts are now flagged with a `--invalid` red border and held without committing; on blur, an invalid draft reverts to the last known-good value. The slider thumb continues to scrub live. (21d3afa) ([#313](https://github.com/Takazudo/zudo-design-token-panel/issues/313))

## 0.1.0-next.2

### Fixed

- **Palette grids ignore the density slider again.** Palette swatch grids
  reflowed on `--tokenpanel-grid-min`, so the density slider (dense/cozy/wide →
  12rem/18rem/100%) stretched the fixed-size swatch chips into oversized /
  single-column cells. They now reflow on their natural `3.5rem` min, leaving the
  base/semantic rows that density is meant to control untouched.
- **Token-name tooltip is no longer transparent.** The shared tooltip portals to
  `document.body`, outside `.tokenpanel-shell`, so its chrome tokens resolved to
  nothing and it rendered transparent. `.tokenpanel-tooltip` is now part of the
  token-scope `:where(...)` selector — the same mechanism the color-picker and
  highlight-settings popovers use to resolve chrome tokens outside the shell.
- **Eye (highlight) toggle now appears on Base color rows.** The Base section's
  background/foreground rows never passed a `cssVar`, so the highlight toggle was
  omitted even though `cluster.baseRoles` maps those roles to real CSS vars. Each
  Base row's eye is now wired to `cluster.baseRoles.background`/`.foreground`, so
  base tokens get the same visibility toggle as palette and semantic tokens. The
  eye is omitted only when the cluster declares no `cssVar` for that role.

## 0.1.0-next.1

### Fixed — Astro consumers: `@takazudo/zdtp/astro` value import broke real npm installs ([#308](https://github.com/Takazudo/zudo-design-token-panel/issues/308))

- The documented Astro host import
  `import { DesignTokenPanelHost } from '@takazudo/zdtp/astro'` forced
  `dist/astro/index.js` to statically `import` the raw `.astro` component.
  Under a `file:` workspace link Vite compiled it, but as a real
  `node_modules` dependency it was externalized, so Node hit the raw `.astro`
  at prerender and threw `ERR_UNKNOWN_FILE_EXTENSION`. **Every real npm Astro
  consumer following the README crashed at build time.**
- **Fix**: the `@takazudo/zdtp/astro` entry is now JS-helpers-and-types only —
  it no longer re-exports the component value, so the crashing `.astro`
  literal can't appear in the bundled JS. Import the host component directly
  from its dedicated subexport, which the consumer's own Astro toolchain
  compiles natively:

  ```astro
  import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro';
  ```

  Type-only imports (`import type { PanelConfig } from '@takazudo/zdtp/astro'`)
  are unchanged — they are erased at build. The `./astro/host-adapter`
  side-effect import is unchanged. Docs (README, PORTABLE-CONTRACT, doc-site
  recipes) updated to the direct-subexport form.

## 0.1.0-next.0

### Renamed — npm package is now `@takazudo/zdtp`

- **Package name** changed from `@takazudo/zudo-design-token-panel` to
  `@takazudo/zdtp`. Update imports accordingly
  (`import { configurePanel } from '@takazudo/zdtp'`,
  `import '@takazudo/zdtp/styles'`, `@takazudo/zdtp/astro`, etc.).
- **CLI bin** renamed from `design-token-panel-server` to `zdtp-server`.
- First public prerelease is published to npm under the `next` dist-tag; install
  with `pnpm add @takazudo/zdtp@next preact`.

### Fixed (panel renders unstyled without a consumer CSS import — [#219](https://github.com/Takazudo/zudo-design-token-panel/issues/219))

- **Self-injected stylesheet** — the panel now injects its own bundled CSS as a
  `<style>` element on first mount (`ensurePanelStyles()` in `src/index.tsx`).
  Previously the panel painted unstyled unless the consumer manually added
  `import '@takazudo/zdtp/styles'` to its static module
  graph — Vite library mode strips the package-internal CSS side-effect import
  from `dist/index.js`, so the emitted JS never loaded its own CSS. The CSS is
  now also imported via `?inline` (a string constant that survives library-mode
  bundling) and injected at runtime. Because injection happens in
  `ensureMounted()`, the CSS loads exactly when the panel first opens — no eager
  cost on pages where the panel is never used. The `./styles` / `./styles.css`
  exports still resolve (the standalone `dist/zdtp.css` is
  still emitted) and remain valid but optional; the install doc's "Don't skip
  the styles import" warning is downgraded accordingly. Public API unchanged.

### Fixed (panel-singleton & first-toggle bugfixes — [#108](https://github.com/Takazudo/zudo-design-token-panel/issues/108), root PR [#113](https://github.com/Takazudo/zudo-design-token-panel/pull/113))

- **Cross-instance singleton sharing** — configuration singletons (`configuredConfig`,
  post-configure hooks) are now stored on `globalThis[Symbol.for('@takazudo/zudo-design-token-panel:singleton')]`
  instead of module-scope variables. When a bundler produces two separate module instances of
  `panel-config.ts` (e.g. Vite chunk-dedup in Astro consumers), both instances now share the same
  slot, so `configurePanel()` writes and `getPanelConfig()` reads from the same object regardless
  of which module instance each call landed in. Public API is bit-identical.
  ([#109](https://github.com/Takazudo/zudo-design-token-panel/issues/109))

- **Deferred reapply via post-configure hooks** — `reapplyPersistedOverrides()` and
  `reapplyFromStorage()` are no longer called at module-init time. They are now registered as a
  post-configure hook (via the new `registerPostConfigureHook` API) and fire only after
  `configurePanel()` supplies the host's storage prefix. This prevents a default-prefix Preact
  panel from mounting before the host's prefix is known, which was the root cause of the first
  `toggleDesignPanel()` call being a no-op when legacy default-prefix keys existed in localStorage.
  Late-registration semantics: if `configurePanel()` has already been called when a hook is
  registered, the hook fires immediately. View-transition re-run safety is preserved via a stable
  module-level hook constant. ([#111](https://github.com/Takazudo/zudo-design-token-panel/issues/111))

### Added (abstract-token-tiers epic — [#69](https://github.com/Takazudo/zudo-design-token-panel/issues/69), root PR [#91](https://github.com/Takazudo/zudo-design-token-panel/pull/91))

> **Note:** the package version is still `0.0.0` (pre-1.0, in active
> development). The changes below are unreleased additions tracked under the
> abstract-token-tiers epic.

- **Tier model types** (`TierValueKind`, `TierItem`, `TierConfig`, `TabConfig`,
  `ColorClusterExtras`) in `src/tokens/tier-model.ts` — the data model that
  backs the new tab-driven panel. Narrowing helpers (`isLengthKind`,
  `isNumberKind`, `isSelectKind`, `isTextKind`, `isColorKind`) are exported.
- **`TierRefSelector` control** — when a `TierConfig` carries `referencesTier`,
  each item's persisted value is the id of an item in the base tier, and the
  apply pipeline emits `var(--target-cssvar)`.
- **`GenericTab` component** — data-driven tab renderer that handles any
  host-coined tab id using kind-appropriate editors for `length`, `number`,
  `select`, `text`, and `color` kinds.
- **`PanelConfig.tabs` (required)** — replaces the previous `tokens` and
  `colorCluster` fields. Every visible tab, including the color tab, is
  expressed as a `TabConfig` entry. The color tab (id `'color'`) carries
  palette and semantic data as `TierItem` arrays inside its `tiers`, with
  structural metadata in `colorExtras`.
- **Persist envelope v3** (`${storagePrefix}-state-v3`) — adds a `tabs` map
  alongside the existing per-category slices so host-coined tabs can persist
  their overrides without schema changes.
- **JSON serde v2** (`$schema: 'zudo-design-tokens/v2'`) — `tabs`-keyed
  wrapper with cssVar-keyed leaves. `serialize()` always emits v2.
  `deserialize()` accepts both v1 and v2 and normalises to `TweakState`.
  Tier-2 ref values are stored as literal `var(--tier1-cssvar)` CSS strings.
- **Host-tabs validation** in `assertValidPanelConfig` — enforces tier-id
  uniqueness, item-id uniqueness across tiers, cssVar format, kind consistency
  within a tier, and `referencesTier` integrity (existence + kind
  compatibility).
- **v2 → v3 storage migration** in `loadPersistedState` — lifts existing
  per-category overrides into the v3 envelope on first load, then deletes the
  v2 key.
- Export `TweakState` (type) and `emptyOverrides` from main entry (#49) — external SerDe layers (e.g. zudo-doc's `design-token-serde.ts`) can now construct a fully-populated `TweakState` without reaching into the test-only `./testing` sub-export.
- Framework-agnostic `setLifecycleAdapter(adapter)` API for non-Astro hosts (zfb, vite, etc.) (#50). The astro `astro:before-swap` / `astro:page-load` fallback is preserved when no adapter is registered, and is actively unbound when a host installs an adapter so the internal handlers do not double-fire. A partial adapter (one that registers only `onBeforeSwap` or only `onPageLoad`) keeps the astro fallback for the unregistered channel and emits a `console.warn` so authors notice the silent gap.

### Changed (abstract-token-tiers epic — [#69](https://github.com/Takazudo/zudo-design-token-panel/issues/69))

- **`PanelConfig.tokens` dropped** — replaced by `PanelConfig.tabs`. This is a
  breaking change for any host that relied on the `tokens: TokenManifest` field.
  Wire per-tab token arrays as `TierItem[]` inside a `TierConfig` inside a
  `TabConfig` on `PanelConfig.tabs`.
- **`PanelConfig.colorCluster` / `secondaryColorCluster` dropped** — replaced
  by a `TabConfig` with `id: 'color'` (or `'color-secondary'`) and a
  `colorExtras` field. Palette and semantic tokens move into the tab's `tiers`
  as `TierItem` entries; `colorExtras` carries the structural metadata
  (`baseRoles`, `colorSchemes`, `panelSettings`, etc.).
- **`TokenManifest` / `TokenDef` types removed from the public surface** —
  superseded by the `TabConfig` / `TierConfig` / `TierItem` model.
- **`ColorClusterConfig`** — previously accepted as a top-level `PanelConfig`
  field. Now the equivalent data lives on `TabConfig.colorExtras`. The public
  alias `ColorClusterConfig` continues to re-export `ColorClusterDataConfig`
  for backward-compatible type imports.
- Make typography-id rename map configurable via `PanelConfig.legacyIdRenameMap` (#51). The default is an empty map (no renaming) so hosts whose manifest ids are stable (e.g. zudo-doc) are not corrupted. The historical zdtp-internal map is exported as `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP` for opt-in callers; the bundled astro host adapter wires it in automatically so existing zdtp deployments keep their behaviour. Map shape is `Record<string, string | null>` — a `null` value preserves the historical "drop this id" semantic for callers whose original behaviour dropped certain ids without replacement.
- After the typography migration runs (rename or null-drop), `loadPersistedState` rewrites the normalized envelope back to `localStorage` so legacy ids and dropped entries do not survive on disk indefinitely as dead data, and a host that later removes the opt-in rename map does not regress every user back to non-applying overrides.
