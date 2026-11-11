#!/usr/bin/env node
// Prune a stale npm `next` dist-tag for @takazudo/zdtp (#345).
//
// The package does not maintain a prerelease line, so a leftover `next` tag can
// silently lag `latest` (a consumer resolving `@takazudo/zdtp@next` would get an
// older build). This script drops `next` ONLY when it points behind `latest`;
// a legitimately-ahead prerelease `next` is preserved. It is idempotent — a
// no-op when there is no `next` tag (or no `latest`).
//
// Dependency-free on purpose: an earlier release-step used `npx semver`, which
// failed in CI with "semver: not found". This uses only `npm` (bundled with
// Node) plus a self-contained semver-precedence comparator.
//
// Auth: `npm dist-tag rm` authenticates through npm trusted publishing (OIDC) —
// the workflow grants `id-token: write` and pins npm >= 11.21.0, the first npm
// with OIDC dist-tag support. There is no long-lived npm token, and none should
// be added. Reading tags of this public package needs no auth, so --dry-run (and
// the no-op paths) work anywhere. See docs/releasing.md.

import { execFileSync } from 'node:child_process';

const PKG = '@takazudo/zdtp';
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Compare two semver strings by precedence (semver.org §11).
 * Returns <0 if a < b, 0 if equal, >0 if a > b.
 */
export function comparePrecedence(a, b) {
  const parse = (v) => {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(v.trim());
    if (!m) throw new Error(`Unparseable version: ${v}`);
    return { main: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa.main[i] !== pb.main[i]) return pa.main[i] - pb.main[i];
  }
  // Equal core: a version with NO prerelease has higher precedence than one with.
  if (pa.pre.length === 0 && pb.pre.length === 0) return 0;
  if (pa.pre.length === 0) return 1;
  if (pb.pre.length === 0) return -1;
  // Both prerelease: compare identifiers left to right.
  const n = Math.min(pa.pre.length, pb.pre.length);
  for (let i = 0; i < n; i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d;
    } else if (xn !== yn) {
      // Numeric identifiers have lower precedence than non-numeric.
      return xn ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  // All shared identifiers equal: the longer prerelease has higher precedence.
  return pa.pre.length - pb.pre.length;
}

function readDistTags() {
  const out = execFileSync('npm', ['dist-tag', 'ls', PKG], { encoding: 'utf8' });
  const tags = {};
  for (const line of out.split('\n')) {
    const m = /^([^:]+):\s*(\S+)/.exec(line.trim());
    if (m) tags[m[1]] = m[2];
  }
  return tags;
}

/**
 * Pure decision for a set of dist-tags. Returns { action: 'noop' | 'keep' | 'drop', message }.
 * `next` is dropped only when it is strictly behind `latest`.
 */
export function decidePrune(tags) {
  const { next, latest } = tags;
  if (!next) return { action: 'noop', message: `No 'next' dist-tag on ${PKG} — nothing to prune.` };
  if (!latest) {
    return { action: 'noop', message: `No 'latest' dist-tag on ${PKG} — refusing to prune 'next' (${next}).` };
  }
  if (next !== latest && comparePrecedence(next, latest) < 0) {
    return { action: 'drop', message: `Dropping stale '${PKG}@next' (${next} < latest ${latest})…` };
  }
  return { action: 'keep', message: `Keeping '${PKG}@next' (${next}) — not behind latest (${latest}).` };
}

/**
 * Unfinished release.yml runs. GitHub concurrency groups cancel *pending* jobs,
 * so this workflow does not share a group with release publishes (it could
 * displace a queued release). Instead it refuses to mutate while one is live.
 */
export function unfinishedReleaseRuns(runs) {
  return (runs ?? []).filter((r) => r.path === '.github/workflows/release.yml' && r.status !== 'completed');
}

function readReleaseRuns() {
  const out = execFileSync(
    'gh',
    ['api', 'repos/Takazudo/zudo-design-token-panel/actions/workflows/release.yml/runs?per_page=30', '--jq', '.workflow_runs'],
    { encoding: 'utf8' },
  );
  return JSON.parse(out || '[]');
}

function main() {
  const decision = decidePrune(readDistTags());
  console.log(decision.message);
  if (decision.action !== 'drop') return;
  if (DRY_RUN) {
    console.log('--dry-run: skipping `npm dist-tag rm`.');
    return;
  }
  const live = unfinishedReleaseRuns(readReleaseRuns());
  if (live.length) {
    console.error(`Refusing to change dist-tags while release.yml runs are unfinished: ${live.map((r) => r.html_url).join(', ')}. Re-run after they complete.`);
    process.exitCode = 1;
    return;
  }
  execFileSync('npm', ['dist-tag', 'rm', PKG, 'next'], { stdio: 'inherit' });
  console.log(`Dropped '${PKG}@next'.`);
}

// Only run when invoked directly (not when imported for testing).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
