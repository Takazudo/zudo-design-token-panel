# zfb First-Toggle Diagnosis (#110)

## Build state
- Package SHA: ac894aa8b54c88c249874f84de22af87583f4f8e
- zfb sibling: aa8e9ac7c68786ac90b2ca1628dea3bae54dc57f
- Build commands run:
  - `pnpm -F @takazudo/zudo-design-token-panel build` (success)
  - `pnpm -F zfb-example build` (success, 2 SSG pages)

## Preview setup note
The zfb example is built with `base: '/pj/zudo-design-token-panel/examples/zfb/'`. The `zfb preview` server serves from root without remounting at that base, so a symlink-tree static server was used at port 4173 to serve the dist at the correct path: `http://localhost:4173/pj/zudo-design-token-panel/examples/zfb/`.

## Scenario 1 — clean localStorage

| Capture point | localStorage keys (zudo*/zfb* prefix) | DOM root exists | Panel open? | Notes |
|---|---|---|---|---|
| Pre-call | (empty) | zfb-root: false, panel-root: false | No | window.zfbExample already exists (console API is eager) |
| After 1st toggle (immediate) | zfb-example-tokens-open=1, zfb-example-tokens:visible=1 | zfb-root: true (24399 chars), panel-root: false | YES (zfb panel) | Panel opened correctly on first call |
| After 1st toggle (200ms) | same | same (24399) | YES | State stable |
| After 2nd toggle | zfb-example-tokens:visible=0 | zfb-root: true (40 chars = empty div) | No | Panel closed correctly |

**Scenario 1 verdict: No bug with clean localStorage. First toggle works correctly.**

## Scenario 2 — pre-seeded default-prefix localStorage

Keys seeded before reload:
- `zudo-design-token-panel:visible = "1"`
- `zudo-design-token-panel-state-v3 = {"color":{},"spacing":{},"typography":{},"size":{},"position":{},"tabs":{}}`

| Capture point | localStorage keys present | zfb-root len | panel-root len | Panel open? | Notes |
|---|---|---|---|---|---|
| Pre-call (after reload) | zudo-design-token-panel:visible=1, zudo-design-token-panel-state-v3 | 0 (absent) | 0 (absent) | No | Module not yet imported; console API present but lazy load not triggered |
| After 1st toggle (immediate) | zfb-example-tokens-open=1, zudo-design-token-panel-open=1, zfb-example-tokens:visible=1, zudo-design-token-panel:visible=1, zudo-design-token-panel-state-v3 | 40 (empty div) | 1094 (default panel open!) | DEFAULT panel open; ZFB panel closed | BUG: zfb-root exists but renders null; default-prefix root mounts and renders open |
| After 1st toggle (200ms) | same keys, same values | 40 | 1094 | Same - zfb still closed | Bug persists through rAF |
| After 1st toggle (1000ms) | same | 40 | 1094 | Same | zfb panel never opens |
| After 2nd toggle (500ms) | zudo-design-token-panel-open=1, zfb-example-tokens:visible=0, zudo-design-token-panel:visible=1, zudo-design-token-panel-state-v3 | 40 | 45 (default panel closing) | Both closing | 2nd toggle closes both; zfb never opened |
| After 3rd toggle (500ms) | zfb-example-tokens-open=1, zudo-design-token-panel-open=1, zfb-example-tokens:visible=1, zudo-design-token-panel:visible=1, zudo-design-token-panel-state-v3 | 24399 (ZFB open!) | 1094 | YES - zfb panel finally open | 3rd toggle finally opens the correct panel |

Console warnings at first toggle:
```
[WARNING] [tweak] Malformed zudo-design-token-panel-state-v3, attempting v2 migration
[WARNING] [tweak] Malformed zudo-design-token-panel-state-v2, attempting v1 migration
```
(These appear twice — once from module-init `reapplyPersistedOverrides()`, once from `reapplyFromStorage()` → `showDesignTokenPanel()` → eventual panel mount read.)

## Hypothesis selected
**H2**

## Evidence reasoning

**Why H1 is ruled out:** Scenario 1 (clean localStorage) shows zero bug — the first toggle opens the panel immediately. H1 predicts the bug would *not* appear even with contaminated localStorage once the globalThis fix is applied. But the globalThis fix is not relevant here because the bug appears in Scenario 2 where contaminated localStorage causes `reapplyFromStorage()` at module-init to act on stale default-prefix keys. H1 cannot explain why contaminated localStorage causes the first toggle to be a no-op even before any astro-fix is applied.

**The H2 mechanism (observed directly):** The module-init top-level block in `src/index.tsx` (lines 661–663) runs `reapplyPersistedOverrides()` and `reapplyFromStorage()` synchronously when the module is first imported — which is inside the `.then()` callback of the dynamic `import('@takazudo/zudo-design-token-panel')` call, BEFORE `configurePanel(panelConfig)` is called in `panel-mount.tsx`'s `loadPanelModule()`. At this point the singleton is still at DEFAULT config (`storagePrefix: 'zudo-design-token-panel'`).

With contaminated localStorage (`zudo-design-token-panel:visible=1`), `reapplyFromStorage()` calls `showDesignTokenPanel()` with the DEFAULT config. This (a) seeds `zudo-design-token-panel-open=1`, (b) mounts a `#zudo-design-token-panel-root` Preact component, and (c) sets `zudo-design-token-panel:visible=1`.

Then `configurePanel(zfb)` runs in the same `.then()` callback, switching the singleton to prefix `zfb-example-tokens`. Now the user's `toggleDesignPanel()` call runs and seeds `zfb-example-tokens-open=1` and mounts `#zfb-example-tokens-root`.

**Why the ZFB panel's mount-effect gets null:** Both Preact trees share the SAME config singleton. The DEFAULT panel mounts first (step 2 above) and in the same rAF batch, its `useEffect([open], persist)` fires with `open=false` (initial state) and calls `localStorage.removeItem(getOpenKey())` where `getOpenKey()` NOW returns `zfb-example-tokens-open` (config already switched). This removes the seed that `toggleDesignPanel()` had just written. The ZFB panel's `useEffect([], mount)` then reads `zfb-example-tokens-open = null` and never calls `setOpen(true)`. The ZFB panel renders `null` (closed).

This is confirmed by the 3rd toggle working: by then, the default-prefix panel's re-render cycle has restored `zfb-example-tokens-open=1` (its open=true re-render triggers the persist effect), and the "steady state" `notifyPanelOpenChanged()` path (not fresh-mount) works correctly.

**Lines in src/index.tsx responsible (H2 root cause):**
- Line 661: `reapplyPersistedOverrides()` — runs with default config at module init
- Line 663: `reapplyFromStorage()` — runs with default config at module init; when `zudo-design-token-panel:visible=1` is in storage, this mounts a default-prefix panel BEFORE configurePanel has been called

## Recommended fix for #111
**H2 confirmed:** Move the top-level `reapplyPersistedOverrides()` (line 661) and `reapplyFromStorage()` (line 663) calls out of the module-init block and into `configurePanel()` (or a deferred init function called from configurePanel) so they run AFTER the host has supplied the correct `storagePrefix`.

Specifically:
- In `src/config/panel-config.ts`, at the end of `configurePanel()`, call `reapplyPersistedOverrides()` and `reapplyFromStorage()` (or expose an `initPanelRuntime()` that configurePanel calls internally).
- Remove the top-level calls at lines 661 and 663 of `src/index.tsx` (keep the `if (!state.bound)` guard structure, but remove those two function calls from inside it).
- The toggle-event listener installation (lines 649–650) and `bindAstroFallback` (line 654) should STAY in the module-init block — they are config-agnostic and should be installed eagerly.
- Consumer impact: zero — non-Astro hosts already call `configurePanel()` before any panel interaction (see `panel-mount.tsx` in zfb, vite-react mount-panel.ts in vite-react/next). Astro's host-adapter calls `configurePanel` from `loadPanelModule()` before any toggle too.
- Optionally add a regression test: seed default-prefix localStorage keys, then call `configurePanel(zfb config)` + `toggleDesignPanel()`, assert `#zfb-example-tokens-root` has non-empty children after one rAF.

## Escalation flag
Not required. Evidence consistently matches H2 across both scenarios. The mechanism is unambiguous.
