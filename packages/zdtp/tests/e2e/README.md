# End-to-end test allocation

This directory owns one deterministic T1 walking-skeleton journey. It proves the
critical consumer path across the real playground, browser persistence, JSON
export/import, and the packaged `zdtp-server` write boundary.

Keep variants and edge cases in the faster unit and Vitest browser/component
suites. Do not multiply this journey by token kind, theme, manifest, viewport,
or framework; add an E2E only when a distinct process or packaging boundary
cannot be covered below this level.

Run after building the panel:

```sh
pnpm --filter @takazudo/zdtp build
pnpm --filter @takazudo/zdtp test:e2e
```

The Playwright config boots only the zfb playground. The spec itself starts the
real built server bin against a temporary copy of the playground stylesheet, so
the repository working copy is never rewritten.
