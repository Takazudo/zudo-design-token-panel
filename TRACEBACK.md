# Epic #99 — Confirm Verification Traceback

Sub-issue: #106  
Branch: `doc-tweak-0512/confirm-verify`  
Date: 2026-05-13

---

## Build Status

**PASS** — `pnpm --filter doc build` completed with no errors.

```
59 page(s) built in 14.93s
[build] Complete!
```

One informational Vite warning about chunk size (>500 kB after minification) is pre-existing and not introduced by this epic. Not a build error.

---

## v1-Leak Sweeps

### tokens: { leak (excluding expected files)

Command: `grep -RIn '\btokens:\s*{' doc/src/content/docs/ | grep -v -E '(multi-tier-tokens|custom-token-manifest)\.mdx'`

**PASS** — empty output.

### colorCluster: leak

Command: `grep -RIn 'colorCluster:' doc/src/content/docs/ | grep -v 'colorExtras\|cluster'`

**PASS** — empty output.

### Claude headerNav entry in settings.ts

Command: `grep -n 'Claude' doc/src/config/settings.ts`

**PASS** — line 82:
```
{ label: "Claude", path: "/docs/claude", categoryMatch: "claude" },
```

### changelog/ contains only index.mdx

Command: `ls doc/src/content/docs/changelog/`

**PASS** — only `index.mdx` present. Both `v0.1.0.mdx` and `v0.2.0.mdx` were deleted by #101.

### claude/ and docs-ja/claude/ each contain index.mdx

```
docs/claude/: index.mdx   ✓
docs-ja/claude/: index.mdx   ✓
```

**PASS**

---

## Preservation Re-check (sub-task #101)

### setLifecycleAdapter — hits outside changelog/

**PASS** — `doc/src/content/docs/reference/configure-panel.mdx` lines 297–310.

### ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP — hits outside changelog/

**PASS** — `doc/src/content/docs/reference/configure-panel.mdx` lines 148–159.

### TweakState / emptyOverrides — hits outside changelog/

**PASS** — `doc/src/content/docs/reference/configure-panel.mdx` lines 165–179.

### state-v2 must be absent from architecture.mdx

**PASS** — `grep -n 'state-v2' doc/src/content/docs/architecture.mdx` returned empty.

---

## JA Stub Uniformity (sub-task #103)

### All docs-ja/*.mdx contain the stub phrase

Command:
```
find doc/src/content/docs-ja -name '*.mdx' | while read f; do
  grep -q 'このページは現在英語のみです' "$f" || echo "MISSING_STUB: $f"
done
```

**PASS** — empty output.

### JA file count = 11 (10 deflated + 1 new claude landing)

Command: `find doc/src/content/docs-ja -name '*.mdx' | wc -l`

**PASS** — result: `11`

Files:
- architecture.mdx
- changelog/index.mdx
- claude/index.mdx  ← new landing added by #103
- getting-started/index.mdx
- recipes/custom-token-manifest.mdx
- recipes/index.mdx
- recipes/multi-tier-tokens.mdx
- reference/apply-pipeline.mdx
- reference/color-cluster.mdx
- reference/configure-panel.mdx
- reference/token-manifest.mdx

---

## Requirement Traceback Against Issue #98

Issue #98: "tweak doc 05/12" — https://github.com/Takazudo/zudo-design-token-panel/issues/98

- [x] **Top page uses intro block + SiteTreeNav** (#98 § "what I want") — delivered by #100.
  - `doc/src/pages/index.astro` has a hero intro section (lines 81–89) and `<SiteTreeNav>` (lines 92–97).

- [x] **Claude category enabled** (#98 § "Claude") — delivered by #100 (headerNav entry) + #103 (JA stub).
  - `settings.ts` line 82: `{ label: "Claude", path: "/docs/claude", categoryMatch: "claude" }`
  - English landing at `docs/claude/index.mdx` (pre-plan).
  - JA stub at `docs-ja/claude/index.mdx` (added by #103).

- [x] **Changelog reduced to "almost empty"** (#98 § "Changelog") — delivered by #101 (English) + #103 (JA).
  - Both `v0.1.0.mdx` and `v0.2.0.mdx` deleted.
  - `changelog/index.mdx` remains as a thin page linking to `CHANGELOG.md` on GitHub.
  - JA changelog stub present.

- [x] **v0.2.0 concrete specs moved to other docs** (#98 § "the concrete specs should be written in other docs") — delivered by #101 (preservation) + #102 (reference index signpost).
  - `setLifecycleAdapter`, `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP`, `TweakState`, `emptyOverrides` all documented in `reference/configure-panel.mdx`.
  - `state-v2` removed from architecture.mdx (replaced by `state-v3` content).

- [x] **Structured-data documented + proposal** (#98 § "About other pages") — delivered by #102 (token-manifest admonition + reference index bullet) + #104 + #105 (examples migrated).
  - `reference/token-manifest.mdx` has `<Info>` admonition linking to architecture tier-model section.
  - `reference/index.mdx` line 14: bullet entry for Token manifest with concept cross-link.
  - Getting-started examples and recipes pages migrated from v1 `tokens/colorCluster` to v0.2.0 `tabs: TabConfig[]` shape.

- [x] **JA pages stubbed** (user instruction during planning) — delivered by #103.
  - All 11 JA pages contain `このページは現在英語のみです` stub phrase.

All six requirement threads: **SATISFIED**.

---

## Out-of-Scope Follow-ups

None requiring a new GitHub issue. The JA docs are intentionally English-only stubs — full translation is deferred and tracked as future work at the author's discretion, not as a defect from this epic.

---

## Verdict

**All green.** No in-place fixes were required. Build passes, all grep checks pass, JA uniformity confirmed (11 files, all stubbed), all six #98 requirement threads satisfied.
