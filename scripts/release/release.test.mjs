import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, test } from 'node:test';
import * as cmd from './commands.mjs';
import {
  SETUP_NODE_PLACEHOLDER_TOKEN,
  assertNoLongLivedNpmToken,
  classifyVersion,
  decidePublish,
  decideResume,
  extractReleaseNotes,
  planRun,
  selectCiRun,
  selectWorkflowRun,
} from './lib.mjs';

const REPO = 'Takazudo/zudo-design-token-panel';
const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const NOW = new Date('2026-11-12T10:00:00Z');

const ciRun = (over = {}) => ({
  id: 1,
  path: '.github/workflows/ci.yml',
  head_sha: SHA,
  event: 'push',
  head_branch: 'main',
  status: 'completed',
  conclusion: 'success',
  created_at: '2026-11-12T09:00:00Z',
  html_url: 'https://example.test/run/1',
  ...over,
});

const MDX = `---
title: "0.9.5"
description: Release notes for 0.9.5.
sidebar_position: 40
---

Released: 2026-11-12

### Fixed

- fix something (abc1234)
`;

function tarball(version) {
  const bytes = Buffer.from(`tarball-${version}`);
  const digest = createHash('sha512').update(bytes).digest();
  return { integrity: `sha512-${digest.toString('base64')}`, hex: digest.toString('hex') };
}

function attestation({ version, sha = SHA, runId = '777', hex, repo = `https://github.com/${REPO}`, path = '.github/workflows/release.yml' }) {
  const statement = {
    subject: [{ name: `pkg:npm/%40takazudo/zdtp@${version}`, digest: { sha512: hex } }],
    predicate: {
      buildDefinition: {
        externalParameters: { workflow: { ref: `refs/tags/v${version}`, repository: repo, path } },
        resolvedDependencies: [{ uri: `git+${repo}@refs/tags/v${version}`, digest: { gitCommit: sha } }],
      },
      runDetails: { metadata: { invocationId: `${repo}/actions/runs/${runId}/attempts/1` } },
    },
  };
  return {
    attestations: [
      { predicateType: 'https://slsa.dev/provenance/v1', bundle: { dsseEnvelope: { payload: Buffer.from(JSON.stringify(statement)).toString('base64') } } },
    ],
  };
}

function publishedDoc(version, { oidc = true, runId = '777', sha = SHA } = {}) {
  const t = tarball(version);
  const url = `https://registry.example/att/${version}`;
  return {
    doc: {
      version,
      dist: { integrity: t.integrity, tarball: `https://registry.example/${version}.tgz`, attestations: { url } },
      _npmUser: oidc ? { name: 'GitHub Actions', trustedPublisher: { id: 'github', oidcConfigId: 'x' } } : { name: 'takazudo' },
    },
    attUrl: url,
    att: attestation({ version, sha, runId, hex: t.hex }),
  };
}

/** In-memory io: git, GitHub, registry, processes. Records every mutation. */
function fakeIo(over = {}) {
  const s = {
    pkgAt: { [SHA]: '0.9.5', HEAD: '0.9.5' },
    changelog: { [`${SHA}:0.9.5`]: MDX },
    onMain: new Set([SHA]),
    remoteTags: {},
    remoteHeads: { 'feat/x': OTHER },
    ciRuns: [ciRun()],
    releaseRuns: [],
    registry: { versions: ['0.9.4'], distTags: { latest: '0.9.4' }, docs: {} },
    attestations: {},
    releases: [],
    env: {},
    publishResult: { status: 0, output: '+ @takazudo/zdtp@0.9.5' },
    ...over,
  };
  const calls = { git: [], gh: [], run: [], outputs: {}, registryReads: 0 };
  const io = {
    state: s,
    calls,
    env: s.env,
    now: () => NOW,
    sleep: async () => {},
    log: () => {},
    warn: () => {},
    summary: () => {},
    setOutput: (k, v) => (calls.outputs[k] = v),
    git(args) {
      calls.git.push(args);
      if (args[0] === 'show') {
        const [ref, path] = args[1].split(':');
        if (path === 'packages/zdtp/package.json') {
          if (!(ref in s.pkgAt)) throw new Error(`no ${ref}`);
          return JSON.stringify({ version: s.pkgAt[ref] });
        }
        const v = /changelog\/(.+)\.mdx$/.exec(path)?.[1];
        const c = s.changelog[`${ref}:${v}`];
        if (!c) throw new Error('missing changelog');
        return c;
      }
      if (args[0] === 'tag') {
        s.localTags = { ...(s.localTags ?? {}), [args[1]]: args[2] };
        return '';
      }
      if (args[0] === 'push') {
        const tag = args[2].replace('refs/tags/', '');
        s.remoteTags[tag] = s.localTags[tag];
        return '';
      }
      throw new Error(`unexpected git ${args.join(' ')}`);
    },
    gitOk(args) {
      if (args[0] === 'fetch') return true;
      if (args[0] === 'merge-base') return s.onMain.has(args[2]);
      return false;
    },
    tryExec: (c, args) => {
      if (c === 'git' && args[0] === 'rev-parse' && args[1] === '--verify') {
        const t = s.localTags?.[args[3].replace(/^refs\/tags\//, '').replace('^{commit}', '')];
        return t ? { ok: true, out: t } : { ok: false, out: '', err: '' };
      }
      return { ok: false, out: '', err: '' };
    },
    remoteTagSha: (tag) => s.remoteTags[tag] ?? null,
    remoteHeadSha: (b) => s.remoteHeads[b] ?? null,
    async githubGet(path) {
      if (path.includes('/workflows/ci.yml/runs')) return { workflow_runs: s.ciRuns };
      if (path.includes('/workflows/release.yml/runs')) return { workflow_runs: s.releaseRuns };
      if (path.startsWith(`repos/${REPO}/releases`)) {
        return s.releases.map((r) => ({ tag_name: r.tagName, draft: r.isDraft, prerelease: r.isPrerelease, html_url: `https://gh/${r.tagName}` }));
      }
      throw new Error(`unexpected GET ${path}`);
    },
    gh(args) {
      calls.gh.push(args);
      if (args[0] === 'release' && args[1] === 'create') {
        s.releases.push({ tagName: args[2], isDraft: false, isPrerelease: args.includes('--prerelease') });
        return '';
      }
      if (args[0] === 'workflow' && args[1] === 'run') {
        const ref = args[args.indexOf('--ref') + 1];
        s.releaseRuns.push({ id: 900 + s.releaseRuns.length, path: '.github/workflows/release.yml', head_branch: ref, head_sha: s.remoteTags[ref] ?? s.remoteHeads[ref], event: 'workflow_dispatch', created_at: NOW.toISOString() });
        return '';
      }
      if (args[0] === 'api' && args.includes('POST')) {
        const ref = args.find((a) => a.startsWith('ref=')).slice(4).replace('refs/tags/', '');
        s.remoteTags[ref] = args.find((a) => a.startsWith('sha=')).slice(4);
        return '';
      }
      throw new Error(`unexpected gh ${args.join(' ')}`);
    },
    async githubGetAll(path) {
      return this.githubGet(path);
    },
    async readRegistry() {
      calls.registryReads++;
      if (s.registryErrors > 0) {
        s.registryErrors--;
        throw new Error('HTTP 503');
      }
      return structuredClone(s.registry);
    },
    async fetchJson(url) {
      return s.attestations[url] ?? null;
    },
    run(c, args) {
      calls.run.push([c, ...args]);
      if (c === 'pnpm') {
        if (s.publishResult.status === 0 && !/Skipped OIDC/.test(s.publishResult.output)) {
          const p = publishedDoc('0.9.5');
          s.registry.versions.push('0.9.5');
          s.registry.docs['0.9.5'] = p.doc;
          s.attestations[p.attUrl] = p.att;
        }
        return s.publishResult;
      }
      if (c === 'npm' && args[0] === 'install') {
        if (s.installFails) return { status: 1, output: 'ETARGET' };
        calls.installed = true;
        return { status: 0, output: '' };
      }
      return { status: 0, output: '' };
    },
    mkTemp: () => '/tmp/fake',
    join: (...p) => p.join('/'),
    writeFile: (p, c) => (calls.written = { ...(calls.written ?? {}), [p]: c }),
    readFile: () => JSON.stringify({ packages: { 'node_modules/@takazudo/zdtp': { integrity: tarball('0.9.5').integrity } } }),
    exists: () => true,
  };
  return io;
}

const mutations = (io) => ({
  gh: io.calls.gh.filter((a) => !(a[0] === 'api' && !a.includes('POST'))),
  pushes: io.calls.git.filter((a) => a[0] === 'push' || a[0] === 'tag'),
  publishes: io.calls.run.filter((a) => a[0] === 'pnpm'),
});

describe('exact CI workflow/SHA selection', () => {
  test('selects the ci.yml push run on main for exactly the candidate SHA', () => {
    const runs = [
      ciRun({ id: 2, path: '.github/workflows/main-deploy.yml' }),
      ciRun({ id: 3, head_sha: OTHER }),
      ciRun({ id: 4, event: 'pull_request', head_branch: 'feat/x' }),
      ciRun({ id: 5 }),
    ];
    assert.deepEqual([selectCiRun(runs, SHA).state, selectCiRun(runs, SHA).run.id], ['success', 5]);
  });

  test('a green deploy workflow or a green run for another commit is not CI evidence', () => {
    const runs = [ciRun({ path: '.github/workflows/main-deploy.yml' }), ciRun({ head_sha: OTHER })];
    assert.equal(selectCiRun(runs, SHA).state, 'missing');
  });

  test('a cancelled candidate run is reported with a re-run hint, not as "fix with a new commit"', async () => {
    assert.equal(selectCiRun([ciRun({ conclusion: 'cancelled' })], SHA).state, 'cancelled');
    const io = fakeIo({ ciRuns: [ciRun({ id: 42, conclusion: 'cancelled' })] });
    await assert.rejects(cmd.gateCandidate(io, { sha: SHA }), (e) => e.code === 'CI_NOT_GREEN' && /gh run rerun 42/.test(e.message));
  });

  test('pending and failed states are reported, never treated as success', () => {
    assert.equal(selectCiRun([ciRun({ status: 'in_progress', conclusion: null })], SHA).state, 'pending');
    assert.equal(selectCiRun([ciRun({ conclusion: 'failure' })], SHA).state, 'failed');
  });

  test('the gate refuses when only a deploy workflow succeeded for the SHA', async () => {
    const io = fakeIo({ ciRuns: [ciRun({ path: '.github/workflows/main-deploy.yml' })] });
    await assert.rejects(cmd.gateCandidate(io, { sha: SHA }), { code: 'CI_NOT_GREEN' });
  });

  test('the gate refuses a SHA that is not on main', async () => {
    const io = fakeIo({ onMain: new Set() });
    await assert.rejects(cmd.gateCandidate(io, { sha: SHA }), { code: 'NOT_ON_MAIN' });
  });
});

describe('tag / package-version identity', () => {
  test('Actions gate refuses a tag that does not match package.json at the SHA', async () => {
    const io = fakeIo({ env: { GITHUB_REF: 'refs/tags/v0.9.6', GITHUB_SHA: SHA, DRY_RUN: 'false' }, remoteTags: { 'v0.9.6': SHA } });
    await assert.rejects(cmd.actionsGate(io), { code: 'VERSION_MISMATCH' });
    assert.equal(io.calls.outputs.publish, undefined);
  });

  test('unsupported prerelease suffixes are refused instead of landing on latest', () => {
    assert.throws(() => classifyVersion('1.0.0-alpha.1'), /Unsupported prerelease/);
    assert.deepEqual(classifyVersion('1.0.0-rc.2'), { version: '1.0.0-rc.2', distTag: 'next', prerelease: true });
    assert.deepEqual(classifyVersion('0.9.5'), { version: '0.9.5', distTag: 'latest', prerelease: false });
  });

  test('Actions gate passes a matching tag with green CI and outputs publish=true', async () => {
    const io = fakeIo({ env: { GITHUB_REF: 'refs/tags/v0.9.5', GITHUB_SHA: SHA, DRY_RUN: 'false' }, remoteTags: { 'v0.9.5': SHA } });
    await cmd.actionsGate(io);
    assert.deepEqual(io.calls.outputs, { mode: 'release', version: '0.9.5', dist_tag: 'latest', prerelease: 'false', publish: 'true', finalize: 'true' });
  });
});

describe('branch dry run', () => {
  test('a branch dry run plans no publication and no GitHub Release', async () => {
    assert.deepEqual(planRun({ ref: 'refs/heads/feat/x', dryRun: true }), { mode: 'dry-run', publish: false, finalize: false });
    const io = fakeIo({ env: { GITHUB_REF: 'refs/heads/feat/x', GITHUB_SHA: SHA, DRY_RUN: 'true' } });
    await cmd.actionsGate(io);
    assert.equal(io.calls.outputs.publish, 'false');
    assert.equal(io.calls.outputs.finalize, 'false');
    assert.equal(io.calls.registryReads, 0);
    assert.deepEqual(mutations(io), { gh: [], pushes: [], publishes: [] });
  });

  test('a real (non-dry) run on a branch is refused', () => {
    assert.throws(() => planRun({ ref: 'refs/heads/main', dryRun: false }), /requires a v\* tag ref/);
  });

  test('client dispatch refuses a real run at a branch and sends nothing', async () => {
    const io = fakeIo();
    await assert.rejects(cmd.dispatch(io, { ref: 'feat/x', dryRun: false }), /requires a v\* tag ref/);
    assert.equal(io.calls.gh.length, 0);
  });

  test('client dry-run dispatch is correlated by workflow, ref, SHA and dispatch time', async () => {
    const io = fakeIo();
    io.state.releaseRuns.push({ id: 1, path: '.github/workflows/release.yml', head_branch: 'feat/x', head_sha: OTHER, event: 'workflow_dispatch', created_at: '2026-11-11T00:00:00Z' });
    const run = await cmd.dispatch(io, { ref: 'feat/x', dryRun: true });
    assert.equal(run.id, 901);
    assert.ok(io.calls.gh[0].includes('dry_run=true'));
  });
});

describe('missing authentication fails without npm-token fallback', () => {
  test('a real npm credential in the publish environment is refused before publishing', async () => {
    const io = fakeIo({ env: { NODE_AUTH_TOKEN: 'npm_realLookingToken' } });
    await assert.rejects(cmd.publish(io, { version: '0.9.5', distTag: 'latest' }), { code: 'TOKEN_PRESENT' });
    assert.equal(mutations(io).publishes.length, 0);
  });

  test('setup-node placeholder is not a credential', () => {
    assert.doesNotThrow(() => assertNoLongLivedNpmToken({ NODE_AUTH_TOKEN: SETUP_NODE_PLACEHOLDER_TOKEN }));
    assert.throws(() => assertNoLongLivedNpmToken({ NPM_TOKEN: 'x' }), { code: 'TOKEN_PRESENT' });
  });

  test('a failed OIDC exchange fails the job even though pnpm would fall back', async () => {
    const io = fakeIo({
      env: { NODE_AUTH_TOKEN: SETUP_NODE_PLACEHOLDER_TOKEN },
      publishResult: { status: 1, output: '[WARN] Skipped OIDC: ERR_PNPM_AUTH_TOKEN_EXCHANGE (status code 404)\nE401 Unauthorized' },
    });
    await assert.rejects(cmd.publish(io, { version: '0.9.5', distTag: 'latest' }), { code: 'OIDC_FAILED' });
    assert.notEqual(io.calls.outputs.published, 'true');
  });

  test('a successful OIDC publish reports published=true and is verified against this run', async () => {
    const io = fakeIo();
    await cmd.publish(io, { version: '0.9.5', distTag: 'latest' });
    assert.equal(io.calls.outputs.published, 'true');
    const r = await cmd.verifyRegistry(io, { version: '0.9.5', sha: SHA, publishedRunId: '777' });
    assert.equal(r.ok, true);
    assert.equal(r.evidence.trustedPublisher.id, 'github');
  });

  test('a version this run published without a trusted publisher fails verification', async () => {
    const p = publishedDoc('0.9.5', { oidc: false });
    const io = fakeIo({ registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } }, attestations: { [p.attUrl]: p.att } });
    await assert.rejects(cmd.verifyRegistry(io, { version: '0.9.5', sha: SHA, publishedRunId: '777' }), /trusted \(OIDC\) publisher/);
  });
});

describe('existing version / tag / Release and safe resume', () => {
  test('an already-published version is never republished; the gate routes to finalize only', async () => {
    const p = publishedDoc('0.9.5');
    const io = fakeIo({
      env: { GITHUB_REF: 'refs/tags/v0.9.5', GITHUB_SHA: SHA, DRY_RUN: 'false' },
      remoteTags: { 'v0.9.5': SHA },
      registry: { versions: ['0.9.4', '0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } },
    });
    await cmd.actionsGate(io);
    assert.equal(io.calls.outputs.publish, 'false');
    assert.equal(io.calls.outputs.finalize, 'true');
    await cmd.publish(io, { version: '0.9.5', distTag: 'latest' });
    assert.equal(io.calls.outputs.published, 'false');
    assert.equal(mutations(io).publishes.length, 0);
  });

  test('re-tagging the same SHA is a no-op; nothing is pushed', async () => {
    const io = fakeIo({ remoteTags: { 'v0.9.5': SHA } });
    const r = await cmd.createTag(io, { sha: SHA });
    assert.equal(r.created, false);
    assert.equal(mutations(io).pushes.length, 0);
  });

  test('tagging creates the tag at the candidate and reads it back', async () => {
    const io = fakeIo();
    const r = await cmd.createTag(io, { sha: SHA });
    assert.equal(r.created, true);
    assert.equal(io.state.remoteTags['v0.9.5'], SHA);
  });

  test('an existing matching GitHub Release is a successful no-op', async () => {
    const p = publishedDoc('0.9.5');
    const io = fakeIo({
      remoteTags: { 'v0.9.5': SHA },
      registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } },
      releases: [{ tagName: 'v0.9.5', isDraft: false, isPrerelease: false }],
    });
    assert.equal((await cmd.finalize(io, { version: '0.9.5', sha: SHA })).action, 'noop');
    assert.equal(mutations(io).gh.length, 0);
  });

  test('a conflicting (draft or misclassified) Release is not overwritten', async () => {
    for (const rel of [{ isDraft: true, isPrerelease: false }, { isDraft: false, isPrerelease: true }]) {
      const io = fakeIo({
        remoteTags: { 'v0.9.5': SHA },
        registry: { versions: ['0.9.5'], distTags: {}, docs: {} },
        releases: [{ tagName: 'v0.9.5', ...rel }],
      });
      await assert.rejects(cmd.finalize(io, { version: '0.9.5', sha: SHA }), { code: 'RELEASE_CONFLICT' });
      assert.equal(mutations(io).gh.length, 0);
    }
  });

  test('finalization refuses when the version is not on npm or the tag is missing', async () => {
    await assert.rejects(cmd.finalize(fakeIo({ remoteTags: { 'v0.9.5': SHA } }), { version: '0.9.5', sha: SHA }), { code: 'NOT_PUBLISHED' });
    await assert.rejects(cmd.finalize(fakeIo({ registry: { versions: ['0.9.5'], distTags: {}, docs: {} } }), { version: '0.9.5', sha: SHA }), { code: 'TAG_MISSING' });
  });
});

describe('published npm version with failed GitHub Release finalization', () => {
  test('resume decision is finalize-only', () => {
    const r = decideResume({ version: '0.9.5', candidateSha: SHA, tagSha: SHA, published: true, release: null });
    assert.equal(r.state, 'published-unfinalized');
    assert.match(r.next, /Do not bump, republish, or move the tag/);
  });

  test('finalize creates the Release from the tagged changelog page without republishing', async () => {
    const p = publishedDoc('0.9.5');
    const io = fakeIo({
      remoteTags: { 'v0.9.5': SHA },
      registry: { versions: ['0.9.4', '0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } },
      releases: [{ tagName: 'v0.9.4', isDraft: false, isPrerelease: false }],
    });
    const r = await cmd.finalize(io, { version: '0.9.5', sha: SHA });
    assert.equal(r.action, 'create');
    const create = io.calls.gh.find((a) => a[1] === 'create');
    assert.ok(create.includes('--verify-tag'));
    assert.ok(create.includes('--latest=true'));
    assert.ok(!create.includes('--prerelease'));
    const notes = Object.values(io.calls.written)[0];
    assert.doesNotMatch(notes, /^---|Released:|sidebar_position/m);
    assert.match(notes, /fix something \(abc1234\)/);
    assert.equal(mutations(io).publishes.length, 0);
    assert.equal(mutations(io).pushes.length, 0);
  });

  test('finalizing an older version after a newer release does not steal "Latest"', async () => {
    const io = fakeIo({
      remoteTags: { 'v0.9.5': SHA },
      registry: { versions: ['0.9.5', '0.9.6'], distTags: { latest: '0.9.6' }, docs: {} },
      releases: [{ tagName: 'v0.9.6', isDraft: false, isPrerelease: false }],
    });
    await cmd.finalize(io, { version: '0.9.5', sha: SHA });
    assert.ok(io.calls.gh.find((a) => a[1] === 'create').includes('--latest=false'));
  });

  test('a registry that never shows the version is inconclusive, not "not published"', async () => {
    const io = fakeIo();
    const r = await cmd.verifyRegistry(io, { version: '0.9.5', sha: SHA, attempts: 3, intervalMs: 0 });
    assert.equal(r.inconclusive, true);
    assert.equal(io.calls.registryReads, 3);
    assert.match(r.message, /inconclusive/);
  });

  test('transient registry errors are retried, and exhausted retries are inconclusive', async () => {
    const p = publishedDoc('0.9.5');
    const ok = fakeIo({ registryErrors: 2, registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } }, attestations: { [p.attUrl]: p.att } });
    assert.equal((await cmd.verifyRegistry(ok, { version: '0.9.5', sha: SHA, attempts: 3, intervalMs: 0 })).ok, true);
    const bad = fakeIo({ registryErrors: 99 });
    const r = await cmd.verifyRegistry(bad, { version: '0.9.5', sha: SHA, attempts: 3, intervalMs: 0 });
    assert.equal(r.inconclusive, true);
    assert.match(r.message, /HTTP 503/);
  });

  test('a signature-audit install that keeps failing is inconclusive, not a mismatch', async () => {
    const p = publishedDoc('0.9.5');
    const base = { registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } }, attestations: { [p.attUrl]: p.att } };
    const lag = await cmd.verifyRegistry(fakeIo({ ...base, installFails: true }), { version: '0.9.5', sha: SHA, attempts: 2, intervalMs: 0, auditSignatures: true });
    assert.equal(lag.inconclusive, true);
    const good = await cmd.verifyRegistry(fakeIo(base), { version: '0.9.5', sha: SHA, attempts: 2, intervalMs: 0, auditSignatures: true });
    assert.equal(good.ok, true);
  });

  test('unreadable attestations are inconclusive, not a mismatch', async () => {
    const p = publishedDoc('0.9.5');
    const io = fakeIo({ registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } } });
    const r = await cmd.verifyRegistry(io, { version: '0.9.5', sha: SHA, attempts: 2, intervalMs: 0 });
    assert.equal(r.inconclusive, true);
  });

  test('provenance for a different source commit fails verification', async () => {
    const p = publishedDoc('0.9.5', { sha: OTHER });
    const io = fakeIo({ registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' }, docs: { '0.9.5': p.doc } }, attestations: { [p.attUrl]: p.att } });
    await assert.rejects(cmd.verifyRegistry(io, { version: '0.9.5', sha: SHA }), /source commit/);
  });

  test('a failed publish command is not reported as "not published"', async () => {
    const io = fakeIo({ publishResult: { status: 1, output: 'E403 You cannot publish over the previously published versions: 0.9.5.' } });
    await assert.rejects(cmd.publish(io, { version: '0.9.5', distTag: 'latest' }), (e) => e.code === 'PUBLISH_FAILED' && /not proof that nothing was published/.test(e.message));
  });
});

describe('conflicting tags and dist-tag regression', () => {
  test('a remote tag on another commit stops tagging and is never moved', async () => {
    const io = fakeIo({ remoteTags: { 'v0.9.5': OTHER } });
    await assert.rejects(cmd.createTag(io, { sha: SHA }), { code: 'TAG_CONFLICT' });
    assert.equal(io.state.remoteTags['v0.9.5'], OTHER);
    assert.equal(mutations(io).pushes.length, 0);
    assert.throws(() => decideResume({ version: '0.9.5', candidateSha: SHA, tagSha: OTHER, published: true, release: null }), { code: 'TAG_CONFLICT' });
  });

  test('a stale release that would move latest backwards is refused', () => {
    assert.throws(() => decidePublish({ version: '0.9.5', distTag: 'latest', registry: { versions: ['0.9.6'], distTags: { latest: '0.9.6' } } }), { code: 'DIST_TAG_REGRESSION' });
  });

  test('a prerelease not ahead of latest is refused for next', () => {
    assert.throws(() => decidePublish({ version: '0.9.5-next.1', distTag: 'next', registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' } } }), { code: 'DIST_TAG_REGRESSION' });
    assert.equal(decidePublish({ version: '0.10.0-next.1', distTag: 'next', registry: { versions: ['0.9.5'], distTags: { latest: '0.9.5' } } }).action, 'publish');
  });

  test('an already-published older version is not refused (finalization stays possible)', () => {
    assert.equal(decidePublish({ version: '0.9.5', distTag: 'latest', registry: { versions: ['0.9.5', '0.9.6'], distTags: { latest: '0.9.6' } } }).action, 'skip-publish');
  });

  test('the Actions gate refuses a stale tag before any publish', async () => {
    const io = fakeIo({
      env: { GITHUB_REF: 'refs/tags/v0.9.5', GITHUB_SHA: SHA, DRY_RUN: 'false' },
      remoteTags: { 'v0.9.5': SHA },
      registry: { versions: ['0.9.6'], distTags: { latest: '0.9.6' }, docs: {} },
    });
    await assert.rejects(cmd.actionsGate(io), { code: 'DIST_TAG_REGRESSION' });
    assert.equal(io.calls.outputs.publish, undefined);
  });
});

describe('run correlation and release notes', () => {
  test('ambiguous runs after a dispatch time are an error, not "pick the newest"', () => {
    const base = { path: '.github/workflows/release.yml', head_branch: 'v0.9.5', head_sha: SHA, event: 'workflow_dispatch' };
    const runs = [
      { ...base, id: 1, created_at: '2026-11-12T10:00:01Z' },
      { ...base, id: 2, created_at: '2026-11-12T10:00:02Z' },
      { ...base, id: 3, head_sha: OTHER, created_at: '2026-11-12T10:00:03Z' },
    ];
    assert.throws(() => selectWorkflowRun(runs, { ref: 'v0.9.5', sha: SHA, since: '2026-11-12T10:00:00Z' }), { code: 'AMBIGUOUS_RUN' });
    assert.equal(selectWorkflowRun(runs.slice(1), { ref: 'v0.9.5', sha: SHA, since: '2026-11-12T10:00:00Z' }).run.id, 2);
  });

  test('a run created slightly "before" a fast local clock is still correlated (skew tolerance)', async () => {
    const io = fakeIo({ remoteTags: { 'v0.9.5': SHA } });
    io.state.releaseRuns.push({ id: 5, path: '.github/workflows/release.yml', head_branch: 'v0.9.5', head_sha: SHA, event: 'push', created_at: '2026-11-12T09:59:30Z' });
    const run = await cmd.findRun(io, { ref: 'v0.9.5', sha: SHA, since: '2026-11-12T09:59:00.000Z', event: 'push' });
    assert.equal(run.id, 5);
  });

  test('ambiguity and bad input surface as themselves, not as "run not found"', async () => {
    const io = fakeIo({ remoteTags: { 'v0.9.5': SHA } });
    const base = { path: '.github/workflows/release.yml', head_branch: 'v0.9.5', head_sha: SHA, event: 'push' };
    io.state.releaseRuns.push({ ...base, id: 1, created_at: '2026-11-12T10:00:01Z' }, { ...base, id: 2, created_at: '2026-11-12T10:00:02Z' });
    await assert.rejects(cmd.findRun(io, { ref: 'v0.9.5', sha: SHA, since: '2026-11-12T10:00:00Z', waitAttempts: 3, intervalMs: 0 }), { code: 'AMBIGUOUS_RUN' });
    await assert.rejects(cmd.findRun(io, { ref: 'v0.9.5', sha: SHA, since: 'garbage', waitAttempts: 3, intervalMs: 0 }), { code: 'USAGE' });
  });

  test('a branch named like a version still resolves for a dry-run dispatch', async () => {
    const io = fakeIo({ remoteHeads: { 'v2-redesign': OTHER } });
    const run = await cmd.dispatch(io, { ref: 'v2-redesign', dryRun: true });
    assert.equal(run.head_sha, OTHER);
  });

  test('extractReleaseNotes strips frontmatter and the Released marker', () => {
    assert.equal(extractReleaseNotes(MDX), '### Fixed\n\n- fix something (abc1234)\n');
  });
});
