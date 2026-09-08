# Dashboard chrome evidence

This directory records the manager-owned integration evidence for issue #917 on
`topic/917-chrome-confirm`, integrated at `f32b4159e83523a6157c85157109f89407bb6c69`.
The comparison baseline is `efc5a298d4fd4a8643ccc64f1c2f0a051dd7680c`.

## Visual artifacts

- `dashboard-light-1280.png`, `dashboard-light-360.png`
- `dashboard-dark-1280.png`, `dashboard-dark-360.png`
- `focus-light-1280.png`, `focus-light-360.png`
- `focus-dark-1280.png`, `focus-dark-360.png`
- `evidence.json` — guarded CSS-only toggle assertions and geometry samples

The overview shots cover the host light/dark toggle at 1280px and 360px. The
focus shots show a keyboard-focused `__scroll` region in each host scheme and
viewport width. Screenshots were captured from the built playground with
JavaScript disabled.

## Checks

Manager logs:

- Package build: `/tmp/zdtp-sweep-911/chrome-build.log`
- Workspace typecheck: `/tmp/zdtp-sweep-911/chrome-final-typecheck.log`
- Workspace lint: `/tmp/zdtp-sweep-911/chrome-final-lint.log`
- Playground build: `/tmp/zdtp-sweep-911/chrome-playground-build.log`
- Documentation build: `/tmp/zdtp-sweep-911/chrome-final-doc-build.log`
- Full package tests: `/tmp/zdtp-sweep-911/chrome-final-tests.log` — 189 files,
  3049 tests passed (the baseline had 188 files and 3034 tests).
- Packed consumer check: `/tmp/zdtp-sweep-911/chrome-final-consumer.log` and
  `/tmp/zdtp-sweep-911/consumer-evidence/evidence.json` — passed.
- Packed declaration/type proof: `/tmp/zdtp-sweep-911/review-915.md` — the
  #915 worker recorded the bundler, node16, nodenext, SSR, and mutation checks
  as passed.
- Dashboard screenshots: `/tmp/zdtp-sweep-911/dashboard-visual-result.md`,
  `/tmp/zdtp-sweep-911/dashboard-visual.mjs`, and the copied
  `evidence.json` — guarded exit 0 for both host schemes and widths, with
  stable visible specimens, no horizontal overflow, and focus rings. The
  later optional full-height overview recapture was cancelled while queued;
  the committed images are from the successful initial run.

The packed consumer evidence at `/tmp/zdtp-sweep-911/consumer-evidence/evidence.json`
reports `status: passed`, including the four JavaScript-disabled viewport checks,
the explicit-light versus dark OS-preference control, and the missing-CSS
mutation/recovery controls. Its two full-page host screenshots are 1280 × 17782
PNG files (about 1.8 MB each), so they remain in the manager evidence directory
instead of being copied into this permanent commit.

The final review log is `/tmp/zdtp-sweep-911/review-917.md`.
