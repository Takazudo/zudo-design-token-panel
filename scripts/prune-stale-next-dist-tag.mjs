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
// Auth: `npm dist-tag rm` needs a writable registry token. In CI that comes from
// NODE_AUTH_TOKEN + the .npmrc that actions/setup-node writes. Pass --dry-run to
// print the decision without mutating the registry (works without auth).

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

function main() {
  const tags = readDistTags();
  const next = tags.next;
  const latest = tags.latest;

  if (!next) {
    console.log(`No 'next' dist-tag on ${PKG} — nothing to prune.`);
    return;
  }
  if (!latest) {
    console.log(`No 'latest' dist-tag on ${PKG} — refusing to prune 'next' (${next}).`);
    return;
  }
  if (next !== latest && comparePrecedence(next, latest) < 0) {
    console.log(`Dropping stale '${PKG}@next' (${next} < latest ${latest})…`);
    if (DRY_RUN) {
      console.log('--dry-run: skipping `npm dist-tag rm`.');
      return;
    }
    execFileSync('npm', ['dist-tag', 'rm', PKG, 'next'], { stdio: 'inherit' });
    console.log(`Dropped '${PKG}@next'.`);
  } else {
    console.log(`Keeping '${PKG}@next' (${next}) — not behind latest (${latest}).`);
  }
}

// Only run when invoked directly (not when imported for testing).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
