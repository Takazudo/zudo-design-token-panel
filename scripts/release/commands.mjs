// Release commands. Every function takes an `io` (see io.mjs) so the decision
// flow is testable with mocked git / GitHub / registry state.
import {
  CHANGELOG_EN_DIR,
  CI_WORKFLOW_PATH,
  MAIN_BRANCH,
  PKG,
  PKG_JSON_PATH,
  RELEASE_WORKFLOW_PATH,
  REPO,
  RUN_CORRELATION_SKEW_MS,
  ReleaseError,
  analyzeProvenance,
  analyzePublishOutput,
  analyzePublisher,
  assertNoLongLivedNpmToken,
  checkTagMatchesVersion,
  classifyTag,
  classifyVersion,
  decideGithubRelease,
  decidePublish,
  decideResume,
  extractReleaseNotes,
  planRun,
  retry,
  selectCiRun,
  selectWorkflowRun,
  shouldMarkLatest,
  versionFromTagRef,
} from './lib.mjs';

const SHA_RE = /^[0-9a-f]{40}$/;

function requireSha(sha) {
  if (!SHA_RE.test(String(sha ?? ''))) throw new ReleaseError(`A full 40-character commit SHA is required; got "${sha}".`, { code: 'USAGE' });
}

export function versionAt(io, sha) {
  return JSON.parse(io.git(['show', `${sha}:${PKG_JSON_PATH}`])).version;
}

async function readCiRuns(io, sha) {
  const q = `repos/${REPO}/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&branch=${MAIN_BRANCH}&per_page=50`;
  return (await io.githubGet(q))?.workflow_runs ?? [];
}

/**
 * The candidate gate, shared by the client (before tagging) and by release.yml
 * (before publishing). It establishes one release identity for one SHA:
 * package version == tag, SHA reachable from main, ci.yml green for exactly that
 * SHA, tag absent-or-identical, and no unintended dist-tag regression.
 */
export async function gateCandidate(io, { sha, tagName, requireCi = true, requireTag = false }) {
  requireSha(sha);
  io.gitOk(['fetch', '--quiet', 'origin', `+refs/heads/${MAIN_BRANCH}:refs/remotes/origin/${MAIN_BRANCH}`]);
  io.gitOk(['fetch', '--quiet', 'origin', sha]);
  const version = versionAt(io, sha);
  const cls = classifyVersion(version);
  const tag = tagName ?? `v${version}`;
  checkTagMatchesVersion(tag, version);

  if (!io.gitOk(['merge-base', '--is-ancestor', sha, `origin/${MAIN_BRANCH}`])) {
    throw new ReleaseError(`${sha} is not reachable from origin/${MAIN_BRANCH}; release only integrated commits.`, {
      code: 'NOT_ON_MAIN',
    });
  }

  const tagState = classifyTag(io.remoteTagSha(tag), sha, tag);
  if (requireTag && tagState !== 'same') {
    throw new ReleaseError(`Tag ${tag} is not present on the remote at ${sha}.`, { code: 'TAG_MISSING' });
  }

  const ci = selectCiRun(await readCiRuns(io, sha), sha);
  if (requireCi && ci.state !== 'success') {
    const hint = ci.state === 'cancelled' ? ` It was cancelled (likely superseded by a later push to ${MAIN_BRANCH}); re-run it: gh run rerun ${ci.run.id}` : '';
    throw new ReleaseError(
      `${CI_WORKFLOW_PATH} has no successful push run on ${MAIN_BRANCH} for ${sha} (state: ${ci.state}${ci.run ? `, run ${ci.run.id}` : ''}).${hint}`,
      { code: ci.state === 'pending' ? 'CI_PENDING' : 'CI_NOT_GREEN', details: ci },
    );
  }

  const registry = await io.readRegistry();
  const decision = decidePublish({ version, distTag: cls.distTag, registry });
  return { sha, version, tag, ...cls, tagState, ci, decision };
}

/** release.yml `gate` job. Writes job outputs. */
export async function actionsGate(io) {
  const { GITHUB_REF: ref, GITHUB_SHA: sha } = io.env;
  const dryRun = io.env.DRY_RUN === 'true';
  const plan = planRun({ ref, dryRun });
  if (plan.mode === 'dry-run') {
    const version = versionAt(io, sha);
    io.log(`DRY RUN on ${ref}@${sha}: build only. No npm publication and no GitHub Release.`);
    io.setOutput('mode', 'dry-run');
    io.setOutput('version', version);
    io.setOutput('publish', 'false');
    io.setOutput('finalize', 'false');
    return;
  }
  const g = await gateCandidate(io, { sha, tagName: `v${plan.version}`, requireCi: true, requireTag: true });
  io.log(`Gate passed for v${g.version} at ${sha}: CI run ${g.ci.run.id}, dist-tag ${g.distTag}. ${g.decision.reason}`);
  io.summary(
    `### Release gate\n- version: \`${g.version}\` → dist-tag \`${g.distTag}\`\n- commit: \`${sha}\`\n- ci.yml run: ${g.ci.run.html_url ?? g.ci.run.id}\n- decision: ${g.decision.reason}`,
  );
  io.setOutput('mode', 'release');
  io.setOutput('version', g.version);
  io.setOutput('dist_tag', g.distTag);
  io.setOutput('prerelease', String(g.prerelease));
  io.setOutput('publish', String(g.decision.action === 'publish'));
  io.setOutput('finalize', 'true');
}

/** release.yml `publish` job, real mode. OIDC only; refuses any token fallback. */
export async function publish(io, { version, distTag }) {
  assertNoLongLivedNpmToken(io.env);
  const cls = classifyVersion(version);
  if (cls.distTag !== distTag) throw new ReleaseError(`dist-tag ${distTag} does not match policy ${cls.distTag} for ${version}.`);
  if (versionAt(io, 'HEAD') !== version) throw new ReleaseError(`Checked-out ${PKG_JSON_PATH} is not ${version}.`);

  // Re-read right before mutating: the gate ran in another job.
  const decision = decidePublish({ version, distTag, registry: await io.readRegistry() });
  if (decision.action !== 'publish') {
    io.log(`${decision.reason} Not publishing (this run did not create the registry version).`);
    io.setOutput('published', 'false');
    return;
  }

  const res = await io.run('pnpm', ['--filter', PKG, 'publish', '--tag', distTag, '--no-git-checks', '--access', 'public', '--provenance']);
  const a = analyzePublishOutput(res.output);
  if (a.oidcSkipped) {
    throw new ReleaseError(
      'npm OIDC token exchange failed (pnpm logged "Skipped OIDC"). There is no token fallback by design. ' +
        'Check the npm trusted publisher for release.yml (owner Takazudo, repo zudo-design-token-panel, workflow release.yml, no environment) ' +
        'and this job\'s id-token: write. Read the registry before retrying: the version may or may not exist.',
      { code: 'OIDC_FAILED' },
    );
  }
  if (res.status !== 0) {
    throw new ReleaseError(
      `pnpm publish exited ${res.status}${a.alreadyPublished ? ' (registry reports the version already exists)' : ''}. ` +
        'A failed command is not proof that nothing was published: run `node scripts/release/release.mjs status` before deciding.',
      { code: 'PUBLISH_FAILED' },
    );
  }
  io.setOutput('published', 'true');
}

/**
 * Read back the exact version from the registry. Exit semantics:
 *   ok                 → verified
 *   ReleaseError       → definite mismatch
 *   { inconclusive }   → not visible within the bounded wait; NOT proof of non-publication
 */
export async function verifyRegistry(io, { version, sha, publishedRunId, attempts = 12, intervalMs = 10000, auditSignatures = false }) {
  requireSha(sha);
  const cls = classifyVersion(version);
  const seen = await retry(
    async () => {
      const reg = await io.readRegistry();
      const doc = reg.docs[version];
      return { done: Boolean(doc?.dist?.integrity), value: { reg, doc } };
    },
    { attempts, intervalMs, sleep: io.sleep },
  );
  if (!seen.ok) {
    const why = seen.error ? ` Last error: ${seen.error.message}.` : '';
    return { inconclusive: true, message: `${PKG}@${version} not visible on the registry after ${seen.attempts} reads.${why} This is inconclusive, not proof it was not published.` };
  }
  const { reg, doc } = seen.value;
  const integrity = doc.dist.integrity;

  let attest = null;
  if (doc.dist.attestations?.url) {
    const a = await retry(
      async () => {
        const j = await io.fetchJson(doc.dist.attestations.url);
        return { done: Boolean(j), value: j };
      },
      { attempts: Math.min(attempts, 6), intervalMs, sleep: io.sleep },
    );
    attest = a.ok ? a.value : null;
  }
  const prov = attest
    ? analyzeProvenance(attest, { version, sha, integrity })
    : { ok: false, problems: ['no provenance attestation on the registry'], runId: null, invocationId: null };
  const publisher = analyzePublisher(doc._npmUser);

  const problems = [...prov.problems];
  if (publishedRunId) {
    if (!publisher.oidc) problems.push('this run published, but the registry does not record a trusted (OIDC) publisher');
    if (prov.runId !== String(publishedRunId)) problems.push(`provenance run ${prov.runId} is not this run ${publishedRunId}`);
  }
  const tagNow = reg.distTags[cls.distTag];
  const warnings = [];
  if (tagNow !== version) warnings.push(`dist-tag ${cls.distTag} currently points at ${tagNow} (not ${version}).`);

  if (auditSignatures && !problems.length) {
    const audit = await auditInstalledSignatures(io, version, integrity, { attempts: Math.min(attempts, 6), intervalMs });
    if (audit.inconclusive) return { inconclusive: true, message: audit.message };
    if (!audit.ok) problems.push(audit.message);
  }

  const evidence = {
    version,
    integrity,
    tarball: doc.dist.tarball,
    gitHead: doc.gitHead ?? null,
    npmUser: publisher.user,
    trustedPublisher: publisher.publisher,
    provenanceInvocation: prov.invocationId,
    distTags: reg.distTags,
  };
  if (problems.length) throw new ReleaseError(`Registry verification failed:\n- ${problems.join('\n- ')}`, { code: 'REGISTRY_MISMATCH', details: evidence });
  return { ok: true, evidence, warnings };
}

/**
 * Cryptographic check with existing tooling: install the exact version and run
 * `npm audit signatures`. An install that keeps failing (CDN metadata lag,
 * network) is inconclusive, not a mismatch.
 */
async function auditInstalledSignatures(io, version, integrity, { attempts, intervalMs }) {
  const dir = io.mkTemp('zdtp-audit-');
  const opts = { cwd: dir };
  io.writeFile(io.join(dir, 'package.json'), JSON.stringify({ name: 'zdtp-audit', private: true }));
  const installed = await retry(
    async () => {
      const r = await io.run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-online', '--save-exact', `${PKG}@${version}`], opts);
      return { done: r.status === 0 };
    },
    { attempts, intervalMs, sleep: io.sleep },
  );
  if (!installed.ok) {
    return { ok: false, inconclusive: true, message: `npm install of ${PKG}@${version} kept failing (${installed.attempts} attempts); signature audit is inconclusive, not a mismatch. Re-run later.` };
  }
  const lock = JSON.parse(io.readFile(io.join(dir, 'package-lock.json')));
  const installedIntegrity = lock.packages?.[`node_modules/${PKG}`]?.integrity;
  if (installedIntegrity !== integrity) {
    return { ok: false, message: `installed integrity ${installedIntegrity} differs from registry ${integrity}` };
  }
  const audit = await io.run('npm', ['audit', 'signatures'], opts);
  if (audit.status !== 0) return { ok: false, message: '`npm audit signatures` failed' };
  return { ok: true };
}

async function listReleases(io) {
  const all = (await io.githubGetAll(`repos/${REPO}/releases?per_page=100`)) ?? [];
  return all.map((r) => ({ tagName: r.tag_name, isDraft: r.draft, isPrerelease: r.prerelease, url: r.html_url }));
}

/** Create (or confirm) the GitHub Release for an already-published version. */
export async function finalize(io, { version, sha }) {
  requireSha(sha);
  const cls = classifyVersion(version);
  const tag = `v${version}`;
  const tagState = classifyTag(io.remoteTagSha(tag), sha, tag);
  if (tagState !== 'same') throw new ReleaseError(`${tag} is not on the remote; refusing to create a Release (it would create the tag).`, { code: 'TAG_MISSING' });
  if (versionAt(io, sha) !== version) throw new ReleaseError(`${PKG_JSON_PATH} at ${sha} is not ${version}.`, { code: 'VERSION_MISMATCH' });
  const reg = await io.readRegistry();
  if (!reg.versions.includes(version)) {
    throw new ReleaseError(`${PKG}@${version} is not on the registry; finalization runs only after publication.`, { code: 'NOT_PUBLISHED' });
  }

  const releases = await listReleases(io);
  const existing = releases.find((r) => r.tagName === tag) ?? null;
  const d = decideGithubRelease(existing, cls);
  if (d.action === 'conflict') throw new ReleaseError(d.reason, { code: 'RELEASE_CONFLICT' });
  if (d.action === 'create') {
    const notes = extractReleaseNotes(io.git(['show', `${sha}:${CHANGELOG_EN_DIR}/${version}.mdx`]));
    const notesFile = io.join(io.mkTemp('zdtp-notes-'), 'notes.md');
    io.writeFile(notesFile, notes);
    const latest = shouldMarkLatest(version, releases.map((r) => r.tagName));
    const args = ['release', 'create', tag, '--repo', REPO, '--verify-tag', '--title', tag, '--notes-file', notesFile, `--latest=${latest}`];
    if (cls.prerelease) args.push('--prerelease');
    io.gh(args);
  } else {
    io.log(`GitHub Release ${tag} already exists and matches; leaving it untouched.`);
  }

  const after = (await listReleases(io)).find((r) => r.tagName === tag);
  if (!after || after.isDraft || after.isPrerelease !== cls.prerelease) {
    throw new ReleaseError(`Read-back of GitHub Release ${tag} did not match (${JSON.stringify(after)}).`, { code: 'READBACK_FAILED' });
  }
  io.summary(`### GitHub Release\n- ${after.url} (${d.action === 'create' ? 'created' : 'already present'})`);
  return { action: d.action, url: after.url };
}

/** Client: create the release tag at the gated candidate (never moves an existing tag). */
export async function createTag(io, { sha, via = 'git' }) {
  const g = await gateCandidate(io, { sha, requireCi: true });
  if (g.tagState === 'same') {
    io.log(`${g.tag} already points at ${sha}; nothing to create.`);
    return { tag: g.tag, created: false, since: null };
  }
  if (g.decision.action === 'skip-publish') {
    throw new ReleaseError(`${PKG}@${g.version} is already on npm but ${g.tag} is missing. Investigate before tagging.`, { code: 'ANOMALY' });
  }
  const since = new Date(io.now().getTime() - RUN_CORRELATION_SKEW_MS).toISOString();
  if (via === 'api') {
    io.gh(['api', '-X', 'POST', `repos/${REPO}/git/refs`, '-f', `ref=refs/tags/${g.tag}`, '-f', `sha=${sha}`]);
  } else {
    const local = io.tryExec('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${g.tag}^{commit}`]);
    if (local.ok && local.out !== sha) throw new ReleaseError(`Local tag ${g.tag} points at ${local.out}; delete the local tag, it never reached the remote.`, { code: 'TAG_CONFLICT' });
    if (!local.ok) io.git(['tag', g.tag, sha]);
    io.git(['push', 'origin', `refs/tags/${g.tag}`]);
  }
  const remote = io.remoteTagSha(g.tag);
  if (remote !== sha) throw new ReleaseError(`After pushing, remote ${g.tag} is ${remote}, expected ${sha}.`, { code: 'TAG_CONFLICT' });
  return { tag: g.tag, created: true, since };
}

async function resolveRefSha(io, ref) {
  // A branch may look like a version (e.g. v2-redesign): try both namespaces.
  return versionFromTagRef(ref) ? (io.remoteTagSha(ref) ?? io.remoteHeadSha(ref)) : (io.remoteHeadSha(ref) ?? io.remoteTagSha(ref));
}

/** Correlate a release.yml run by workflow path, ref, SHA and (optionally) start time. */
export async function findRun(io, { ref, sha, since, event, waitAttempts = 1, intervalMs = 10000 }) {
  const targetSha = sha ?? (await resolveRefSha(io, ref));
  if (!targetSha) throw new ReleaseError(`Cannot resolve ${ref} on the remote.`, { code: 'USAGE' });
  const found = await retry(
    async () => {
      const q = `repos/${REPO}/actions/workflows/release.yml/runs?branch=${encodeURIComponent(ref)}&per_page=30${event ? `&event=${event}` : ''}`;
      const runs = (await io.githubGet(q))?.workflow_runs ?? [];
      const r = selectWorkflowRun(runs, { workflowPath: RELEASE_WORKFLOW_PATH, ref, sha: targetSha, event, since });
      return { done: Boolean(r.run), value: r };
    },
    { attempts: waitAttempts, intervalMs, sleep: io.sleep },
  );
  if (!found.ok) throw new ReleaseError(`No release.yml run found for ${ref}@${targetSha}${since ? ` since ${since}` : ''}.`, { code: 'RUN_NOT_FOUND' });
  return found.value.run;
}

/** Dispatch release.yml explicitly (dry run on a branch, or a real run at an existing tag) and correlate it. */
export async function dispatch(io, { ref, dryRun }) {
  if (!dryRun) {
    const version = planRun({ ref: `refs/tags/${ref}`, dryRun: false }).version;
    const sha = io.remoteTagSha(ref);
    if (!sha) throw new ReleaseError(`Tag ${ref} does not exist on the remote; real dispatch only runs at an existing tag.`, { code: 'TAG_MISSING' });
    if (versionAt(io, sha) !== version) throw new ReleaseError(`${ref} does not match the package version at ${sha}.`, { code: 'VERSION_MISMATCH' });
  }
  const sha = await resolveRefSha(io, ref);
  if (!sha) throw new ReleaseError(`Cannot resolve ${ref} on the remote.`, { code: 'USAGE' });
  const since = new Date(io.now().getTime() - RUN_CORRELATION_SKEW_MS).toISOString();
  io.gh(['workflow', 'run', 'release.yml', '--repo', REPO, '--ref', ref, '-f', `dry_run=${dryRun ? 'true' : 'false'}`]);
  return findRun(io, { ref, sha, since, event: 'workflow_dispatch', waitAttempts: 12, intervalMs: 5000 });
}

/** Observed state of one version: tag, registry, GitHub Release, runs → resume decision. */
export async function status(io, { version, sha }) {
  const v = version ?? versionAt(io, 'HEAD');
  classifyVersion(v);
  const tag = `v${v}`;
  const tagSha = io.remoteTagSha(tag);
  const reg = await io.readRegistry();
  const published = reg.versions.includes(v);
  const release = (await listReleases(io)).find((r) => r.tagName === tag) ?? null;
  const runs = (await io.githubGet(`repos/${REPO}/actions/workflows/release.yml/runs?branch=${encodeURIComponent(tag)}&per_page=10`))?.workflow_runs ?? [];
  const doc = reg.docs[v];
  const resume = decideResume({ version: v, candidateSha: sha, tagSha, published, release });
  return {
    version: v,
    tag: { name: tag, sha: tagSha },
    npm: published
      ? { published: true, integrity: doc?.dist?.integrity, npmUser: doc?._npmUser?.name ?? null, trustedPublisher: analyzePublisher(doc?._npmUser).oidc, distTags: reg.distTags }
      : { published: false, distTags: reg.distTags },
    githubRelease: release,
    releaseRuns: runs.map((r) => ({ id: r.id, event: r.event, sha: r.head_sha, attempt: r.run_attempt, status: r.status, conclusion: r.conclusion, url: r.html_url })),
    resume,
  };
}

/** Read-only environment and capability check for the caller (local agent or Codex Cloud). */
export async function preflight(io, { route = 'direct' } = {}) {
  const checks = [];
  const add = (name, level, detail) => checks.push({ name, level, detail });

  const top = io.tryExec('git', ['rev-parse', '--show-toplevel']);
  if (!top.ok) {
    add('git checkout', 'FAIL', 'not inside a git checkout');
    return { checks, ok: false };
  }
  const gitDir = io.tryExec('git', ['rev-parse', '--absolute-git-dir']).out;
  const common = io.tryExec('git', ['rev-parse', '--path-format=absolute', '--git-common-dir']).out;
  const linked = gitDir !== common;
  add('checkout kind', linked && route === 'direct' ? 'FAIL' : 'PASS', linked ? 'linked worktree (pushing is blocked by the repo pre-push hook)' : 'primary checkout');
  const branch = io.tryExec('git', ['branch', '--show-current']).out || '(detached)';
  const dirty = io.tryExec('git', ['status', '--porcelain']).out;
  add('working tree', dirty ? 'WARN' : 'PASS', dirty ? `uncommitted changes on ${branch}; do not switch branches over them — resume or stash deliberately` : `clean on ${branch}`);

  const node = io.tryExec('node', ['--version']).out;
  add('node', /^v24\./.test(node) ? 'PASS' : 'FAIL', `${node || 'missing'} (repo requires >=24 <25)`);
  const pinned = JSON.parse(io.readFile('package.json')).packageManager?.split('@')[1];
  const pnpm = io.tryExec('pnpm', ['--version']).out;
  add('pnpm', pnpm === pinned ? 'PASS' : 'FAIL', `${pnpm || 'missing'} (packageManager pins ${pinned}; use corepack)`);
  add('dependencies', io.exists('node_modules/.modules.yaml') ? 'PASS' : 'FAIL', 'pnpm install --frozen-lockfile');

  const ls = io.tryExec('git', ['ls-remote', '--exit-code', 'origin', `refs/heads/${MAIN_BRANCH}`]);
  add('github.com (git)', ls.ok ? 'PASS' : 'FAIL', ls.ok ? 'origin reachable' : ls.err.split('\n')[0]);
  try {
    const reg = await io.readRegistry();
    add('registry.npmjs.org', 'PASS', `dist-tags ${JSON.stringify(reg.distTags)}`);
  } catch (e) {
    add('registry.npmjs.org', 'FAIL', e.message);
  }

  const gh = io.tryExec('gh', ['auth', 'status']);
  add('gh authenticated', gh.ok ? 'PASS' : 'WARN', gh.ok ? 'yes' : 'no — read-only gates fall back to the public API; tagging, dispatch and PR creation need GitHub write access');
  if (gh.ok) {
    try {
      const repo = await io.githubGet(`repos/${REPO}`);
      const p = repo?.permissions;
      add('repo permission (push)', p?.push ? 'PASS' : 'WARN', p ? JSON.stringify(p) : 'not reported for this credential; write rights are only proven by the first write');
      const wf = await io.githubGet(`repos/${REPO}/actions/workflows/release.yml`);
      add('actions read', wf ? 'PASS' : 'FAIL', wf ? `release.yml state=${wf.state}` : 'cannot read workflows');
    } catch (e) {
      add('github api', 'FAIL', e.message);
    }
  }
  add('capability: tag creation', gh.ok ? 'INFO' : 'WARN', 'needs contents:write (git push of a tag, or `tag --via api`); not provable without writing');
  add('capability: workflow dispatch', gh.ok ? 'INFO' : 'WARN', 'needs actions:write (only for dry runs / resume dispatch); not provable without dispatching');

  const tokenEnv = ['NPM_TOKEN', 'NODE_AUTH_TOKEN'].filter((k) => io.env[k]);
  add('npm credentials on caller', tokenEnv.length ? 'WARN' : 'PASS', tokenEnv.length ? `${tokenEnv.join(', ')} set; not needed — publication happens in Actions via OIDC. Remove it.` : 'none needed, none found in env');

  return { checks, ok: !checks.some((c) => c.level === 'FAIL') };
}
