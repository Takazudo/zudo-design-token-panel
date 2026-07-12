# proto-528-dom-tweaker — DOM Tweaker feasibility prototype

Feasibility prototype for [zudo-design-token-panel#528](https://github.com/Takazudo/zudo-design-token-panel/issues/528):
alt-click an element in the host page, edit its classNames live with Tailwind
suggestions, see the change instantly, export a diff for AI handoff.

**Verdict: FEASIBLE** — 15/15 automated checks pass. See "Findings" below.

## Run it

```sh
python3 -m http.server 8637 --directory .
# open http://localhost:8637/
```

1. Click "DOM Tweaker: OFF" (top right) → runtime loads (~100ms), status shows "ready".
2. Hold **Alt** and hover → elements highlight; **Alt+click** selects → ✎ icon appears.
3. Click ✎ → chip editor opens: × removes a class, input adds one (typed prefix
   filters ~1100 Tailwind suggestions; ArrowDown/Enter or click picks one).
4. Edits apply instantly; the bottom-right panel accumulates a copyable diff.

Automated verification (Playwright resolved from the zdtp repo's node_modules):

```sh
python3 -m http.server 8637 --directory . &   # then:
node verify.mjs
```

## Files

- `index.html` — fake host app; its CSS is a hand-written *purged* Tailwind v4
  dist (`host.css`): only the classes used in the markup exist, like real JIT output.
- `tweaker.js` — the whole DOM Tweaker prototype (vanilla JS, no build).
- `tailwind-browser.js` — vendored `@tailwindcss/browser@4.3.2` (276KB raw),
  Tailwind v4's official in-browser JIT compiler.
- `verify.mjs` — 15 computed-style assertions; screenshots `01-initial.png`, `02-after-edit.png`.

## Findings

### The purge problem is solved by `@tailwindcss/browser` (the issue's open question)

- Adding `px-24` without the runtime does nothing (proved: stays 8px) — the purge problem is real.
- With the runtime injected **on tweaker activation only**, `px-24`/`py-3`/`bg-brand`
  compile on the fly via MutationObserver and apply instantly (96px/12px/#7c3aed proved).
  No "fulldump CSS" needed — the runtime IS the full dump, computed lazily.
- Runtime ready in ~100ms; per-edit recompile is imperceptible.

### Preflight must NOT be imported — and it's avoidable

The theme bridge imports only `tailwindcss/theme.css` + `tailwindcss/utilities.css`
(granular imports work in the browser runtime). A bare `<h1>` canary kept its 2em
browser default after activation → no preflight double-reset of the host page.
`@import "tailwindcss"` (the default in the docs) would inject preflight — don't.

### Host theme tokens work via an injected `@theme` block

`--color-brand` defined in the `text/tailwindcss` style block makes `bg-brand`
compile. In the real feature zdtp already owns the host's design tokens, so it can
generate this block — that's the natural zdtp integration point.

### Conflicting utilities behave like real Tailwind (needs UX handling)

With both `rounded-md` (original) and `rounded-full` (added) on the element,
`rounded-md` wins — Tailwind's canonical sheet order decides, not class-attr order
(radius names sort full-before-md; spacing sorts ascending, so `py-3` did beat `py-1`).
The editor UX must handle conflicts: auto-remove the conflicting class on add
(tailwind-merge-style) or rely on chip removal (proved: removing the `rounded-md`
chip lets `rounded-full` apply).

### Caveats for the real implementation

- `@tailwindcss/browser` is **v4-only**; v3 hosts would need the old Play CDN (different integration).
- Host pages with strict CSP (`style-src` without `unsafe-inline`) will block the injected styles.
- The runtime re-emits utilities it sees in the DOM inside `@layer utilities`;
  identical declarations make this visually idempotent (proved: dist utilities and
  host body styles unchanged), but hosts that override utilities with unlayered CSS
  keep winning — acceptable, same as their normal Tailwind behavior.
- Suggestions here are a generated ~1100-class list; the real feature should derive
  from the host theme (zdtp tokens → spacing/color scales) instead of hard-coding.
- Shadow DOM hosts are out of scope (runtime watches the light DOM document).
- Production panel code must follow the repo's chrome-button/no-semantic-tags rules —
  this prototype's raw `<button>`s are prototype-only shortcuts.
