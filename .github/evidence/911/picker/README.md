# Reference-aware color picker evidence

This directory records the manager-owned integration evidence for issue #922 on
`topic/922-picker-confirm`. The verified implementation tip was
`27fbc70ac70910d9e91eccf67624fa299142ac36`. The comparison baseline was
`a9e14adb907407312cce512e321c9f780ecb9cd3` (`base/sweep-260908-3`), which had
189 package test files and 3049 passing tests.

## Visual artifacts

- `expression-disclosure.png` — the readable disclosure banner in the picker;
  captured at 321 × 663 pixels.
- `evidence.json` — the live playground assertions for host resolution,
  disclosure gating, no-op open/close and conversion, re-arming on reopen, and
  preserving the dark `var()` reference after editing the light side.

## Checks

Manager logs:

- Package build: `/tmp/zdtp-sweep-911/picker-build.log`
- Playground build: `/tmp/zdtp-sweep-911/picker-playground-build.log`
- Workspace typecheck: `/tmp/zdtp-sweep-911/picker-typecheck.log`
- Workspace lint: `/tmp/zdtp-sweep-911/picker-lint.log`
- Full package tests: `/tmp/zdtp-sweep-911/picker-full-tests.log` — 192 files,
  3099 tests passed.
- Playwright visual suite: `/tmp/zdtp-sweep-911/picker-vrt.log` — 18 passed;
  light/dark color-picker popover snapshots were unchanged.
- Live playground confirmation: `/tmp/zdtp-sweep-911/picker-visual.log` —
  host expression resolution, disclosure gating, unchanged export before the
  first edit, and dark reference preservation passed.

The manager also recorded an independent guarded browser session exiting 0 and
visually inspected the disclosure screenshot. The initial integration run
exposed an invalid CSS declaration fallback in the browser resolver; the
follow-up jsdom run exposed the inherited invalid-syntax variant. The resolver
guard and empty/whitespace regression cases were fixed in the verified
implementation tip before the passing rerun.
