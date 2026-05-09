# zfb Integration Probe Report

**Probe date:** 2026-05-09
**zfb commit verified against:** `3f58127`

This report documents the four zfb gaps surfaced during the planning probe for sub-issue #33 (epic #29: Examples Deploy + zfb Demo). All four were fixed upstream before the zfb demo implementation (sub-issue #35) began.

---

## Upstream fixes — resolved zfb issues

All four issues have been closed and re-verified against zfb commit `3f58127`:

| zfb # | Bug | Fix commit | Status |
|---|---|---|---|
| [#228](https://github.com/Takazudo/zudo-front-builder/issues/228) | `<a href="/foo">` not prefixed by `base` | `d6fc3fe` | ✅ verified |
| [#229](https://github.com/Takazudo/zudo-front-builder/issues/229) | Dev server served at root with `base`-prefixed asset URLs that 404 | `b1049ef` | ✅ verified |
| [#230](https://github.com/Takazudo/zudo-front-builder/issues/230) | `devMiddleware` rejected POST/PUT/DELETE | `f72d2ae` | ✅ verified |
| [#231](https://github.com/Takazudo/zudo-front-builder/issues/231) | `dist/.zfb-build/` build intermediates shipped in deploy | `e876681` | ✅ verified |

### Issue links

- https://github.com/Takazudo/zudo-front-builder/issues/228
- https://github.com/Takazudo/zudo-front-builder/issues/229
- https://github.com/Takazudo/zudo-front-builder/issues/230
- https://github.com/Takazudo/zudo-front-builder/issues/231

---

## Integration nuance for Sub 6 / #35 (NOT a zfb bug)

The panel's `applyEndpoint` in the zfb demo **must be the full base-prefixed URL**:

```
/pj/zudo-design-token-panel/examples/zfb/api/dev/apply
```

Do **not** use the bare relative path (`api/dev/apply`) that the other three examples (astro, vite-react, next) use. After fix #229, zfb's dev server mounts `devMiddleware` paths under `base`, so the apply endpoint is only reachable at the fully-prefixed path.

This is a configuration requirement for this project, not a bug in zfb.

---

## Process for new zfb issues

If a new zfb gap is discovered during the zfb demo implementation (#35 or later):

1. **File a minimal repro issue** on the zfb repo (https://github.com/Takazudo/zudo-front-builder/issues) with steps to reproduce, expected vs. actual behavior, and the zfb commit SHA being tested.
2. **Add a row** to the upstream-fix table in this report (and in `__inbox/zfb-probe-report.md`) with the issue number and a ⏳ status.
3. **Wait for the upstream fix** (or implement a workaround in the zdtp demo with a comment referencing the open issue) before completing the sub-issue.
4. **Update the row** to ✅ verified once the fix commit is confirmed and the issue is closed.
