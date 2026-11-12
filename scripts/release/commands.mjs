// Release commands. Every function takes an `io` (see io.mjs) so the decision
// flow is testable with mocked git / GitHub / registry state.
import {
  CHANGELOG_EN_DIR,
  CI_WORKFLOW_PATH,
  COORDINATOR_WORKFLOW_PATH,
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
  WORKFLOWS_DIR,
} from './lib.mjs';

const SHA_RE = /^[0-9a-f]{40}$/;

function requireSha(sha) {
  if (!SHA_RE.test(String(sha ?? ''))) throw new ReleaseError(`A full 40-character commit SHA is required; got "${sha}".`, { code: 'USAGE' });
}

export function versionAt(io, sha) {
  let raw;
  try {
    raw = io.git(['show', `${sha}:${PKG_JSON_PATH}`]);
  } catch {
    throw new ReleaseError(`Cannot read ${PKG_JSON_PATH} at ${sha}: the commit is unknown to origin or lacks the package.`, { code: 'UNKNOWN_COMMIT' });
  }
  return JSON.parse(raw).version;
}

/**
 * Registry read for a release decision. A network/HTTP error (including a 404
 * packument for this long-published package) is "unknown", never "not published".
 */
export async function readRegistryKnown(io) {
  try {
    return await io.readRegistry();
  } catch (e) {
    throw new ReleaseError(`npm registry state for ${PKG} is unknown (${e.message}); not treating it as unpublished. Re-run later.`, {
      code: 'REGISTRY_UNKNOWN',
      inconclusive: true,
    });
  }
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
    const hint = ci.state === 'cancelled' ? ` It was cancelled (likely superseded by a later push to ${MAIN_BRANCH}); re-run it once main's current ci.yml run has finished (ci.yml cancels in-progress runs per ref): gh run rerun ${ci.run.id}` : '';
    throw new ReleaseError(
      `${CI_WORKFLOW_PATH} has no successful push run on ${MAIN_BRANCH} for ${sha} (state: ${ci.state}${ci.run ? `, run ${ci.run.id}` : ''}).${hint}`,
      { code: ci.state === 'pending' ? 'CI_PENDING' : 'CI_NOT_GREEN', details: ci },
    );
  }

  const registry = await readRegistryKnown(io);
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
  const decision = decidePublish({ version, distTag, registry: await readRegistryKnown(io) });
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
// ~10 min: a fresh 0.9.5 publish took ~4 min to become publicly readable (#1116).
export async function verifyRegistry(io, { version, sha, publishedRunId, attempts = 40, intervalMs = 15000, auditSignatures = false }) {
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
    if (!a.ok) {
      const why = a.error ? ` Last error: ${a.error.message}.` : '';
      return { inconclusive: true, message: `Provenance attestations for ${PKG}@${version} were not readable after ${a.attempts} tries.${why} Inconclusive; re-run later.` };
    }
    attest = a.value;
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

const toRelease = (r) => ({ tagName: r.tag_name, isDraft: r.draft, isPrerelease: r.prerelease, url: r.html_url });

async function listReleases(io) {
  const all = (await io.githubGetAll(`repos/${REPO}/releases?per_page=100`)) ?? [];
  return all.map(toRelease);
}

/**
 * The Release for a tag, or null. GET releases/tags/{tag} is fresh right after a create but
 * 404s for drafts; the paginated list includes drafts but lags a fresh create. Ask both.
 */
async function findRelease(io, tag) {
  const byTag = await io.githubGet(`repos/${REPO}/releases/tags/${tag}`);
  if (byTag) return toRelease(byTag);
  return (await listReleases(io)).find((r) => r.tagName === tag) ?? null;
}

/** Create (or confirm) the GitHub Release for an already-published version. */
export async function finalize(io, { version, sha, attempts = 12, intervalMs = 5000 }) {
  requireSha(sha);
  const cls = classifyVersion(version);
  const tag = `v${version}`;
  const wait = { attempts, intervalMs, sleep: io.sleep };
  const tagState = classifyTag(io.remoteTagSha(tag), sha, tag);
  if (tagState !== 'same') throw new ReleaseError(`${tag} is not on the remote; refusing to create a Release (it would create the tag).`, { code: 'TAG_MISSING' });
  if (versionAt(io, sha) !== version) throw new ReleaseError(`${PKG_JSON_PATH} at ${sha} is not ${version}.`, { code: 'VERSION_MISMATCH' });
  const onRegistry = await retry(async () => ({ done: (await io.readRegistry()).versions.includes(version) }), wait);
  if (!onRegistry.ok) {
    const why = onRegistry.error ? ` Last error: ${onRegistry.error.message}.` : '';
    throw new ReleaseError(
      `${PKG}@${version} was not visible on the registry after ${onRegistry.attempts} reads.${why} Finalization runs only after publication; if it was just published, re-run later.`,
      { code: 'NOT_PUBLISHED', inconclusive: true },
    );
  }

  const existing = await findRelease(io, tag);
  const d = decideGithubRelease(existing, cls);
  if (d.action === 'conflict') throw new ReleaseError(d.reason, { code: 'RELEASE_CONFLICT' });
  if (d.action === 'create') {
    const notes = extractReleaseNotes(io.git(['show', `${sha}:${CHANGELOG_EN_DIR}/${version}.mdx`]));
    const notesFile = io.join(io.mkTemp('zdtp-notes-'), 'notes.md');
    io.writeFile(notesFile, notes);
    const latest = shouldMarkLatest(version, (await listReleases(io)).map((r) => r.tagName));
    const args = ['release', 'create', tag, '--repo', REPO, '--verify-tag', '--title', tag, '--notes-file', notesFile, `--latest=${latest}`];
    if (cls.prerelease) args.push('--prerelease');
    try {
      io.gh(args);
    } catch (e) {
      // Both reads can lag a Release created moments ago (e.g. by the previous attempt).
      if (!(await findRelease(io, tag))) throw e;
      io.log(`GitHub Release ${tag} appeared while creating it; verifying it instead.`);
    }
  } else {
    io.log(`GitHub Release ${tag} already exists and matches; leaving it untouched.`);
  }

  const readBack = await retry(async () => {
    const after = await findRelease(io, tag);
    if (!after) return { done: false };
    if (after.isDraft || after.isPrerelease !== cls.prerelease) {
      throw new ReleaseError(`Read-back of GitHub Release ${tag} did not match (${JSON.stringify(after)}).`, { code: 'READBACK_FAILED' });
    }
    return { done: true, value: after };
  }, wait);
  if (!readBack.ok && readBack.error) {
    throw new ReleaseError(`Read-back of GitHub Release ${tag} kept failing: ${readBack.error.message}`, { code: 'READBACK_FAILED' });
  }
  if (!readBack.ok) {
    throw new ReleaseError(
      `GitHub Release ${tag} was not readable after ${readBack.attempts} reads. Re-run finalize; an existing matching Release is a no-op.`,
      { code: 'READBACK_PENDING', inconclusive: true },
    );
  }
  const after = readBack.value;
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
    try {
      io.gh(['api', '-X', 'POST', `repos/${REPO}/git/refs`, '-f', `ref=refs/tags/${g.tag}`, '-f', `sha=${sha}`]);
    } catch (e) {
      // A concurrent creator may have won (422 "Reference already exists"): decide from the remote, never retry blindly.
      const now = io.remoteTagSha(g.tag);
      if (!now) throw e;
      classifyTag(now, sha, g.tag);
      io.log(`${g.tag} was created at ${sha} concurrently; continuing with it.`);
      return { tag: g.tag, created: false, since };
    }
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
  const reg = await readRegistryKnown(io);
  const published = reg.versions.includes(v);
  const release = await findRelease(io, tag);
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

// ── Release coordinator (release-coordinator.yml) ─────────────────────────────
// Lets a caller without tag-push rights (e.g. Claude Code Cloud) release by
// dispatching one workflow with an explicit version + SHA. Actions creates the
// tag with its own GITHUB_TOKEN and then dispatches release.yml at that tag
// (a GITHUB_TOKEN tag push does not trigger workflows; workflow_dispatch does).

/**
 * The coordinator must run main's definition of release-coordinator.yml. GITHUB_REF
 * alone would also accept a copy of the file under another name on main.
 * Outside Actions (local `coordinate-gate`) the variables are absent and nothing is checked.
 */
export function assertCoordinatorBinding(env) {
  const ref = env.GITHUB_REF;
  if (ref !== undefined && ref !== `refs/heads/${MAIN_BRANCH}`) {
    throw new ReleaseError(`The release coordinator must be dispatched from ${MAIN_BRANCH}; got ${ref}.`, { code: 'WRONG_REF' });
  }
  const wf = env.GITHUB_WORKFLOW_REF;
  const expected = `${REPO}/${COORDINATOR_WORKFLOW_PATH}@refs/heads/${MAIN_BRANCH}`;
  if (wf !== undefined && wf.toLowerCase() !== expected.toLowerCase()) {
    throw new ReleaseError(`The release coordinator must run ${expected}; got ${wf}.`, { code: 'WRONG_WORKFLOW' });
  }
}

function gitOrNull(io, args) {
  try {
    return io.git(args);
  } catch {
    return null;
  }
}

/**
 * Where the frozen candidate sits relative to main right now (facts only; never
 * used to pick a different SHA). Each field is null when git could not say.
 */
export function candidateContext(io, sha) {
  const mainHead = gitOrNull(io, ['rev-parse', `origin/${MAIN_BRANCH}`]);
  if (!mainHead || mainHead === sha) return { mainHead, behind: mainHead ? 0 : null, workflowDrift: mainHead ? [] : null };
  const behind = Number(gitOrNull(io, ['rev-list', '--count', `${sha}..${mainHead}`]) ?? NaN);
  const diff = gitOrNull(io, ['diff', '--name-only', sha, mainHead, '--', WORKFLOWS_DIR]);
  return { mainHead, behind: Number.isNaN(behind) ? null : behind, workflowDrift: diff === null ? null : diff.split('\n').filter(Boolean) };
}

/** Warnings for a frozen candidate. Diagnostics only: the gate never swaps the SHA. */
export function candidateWarnings({ tagState, sha, candidate }) {
  const w = [];
  if (tagState === 'same') return w; // resume of a started release: the SHA is fixed by the tag
  if (candidate.behind) {
    w.push(`main has ${candidate.behind} commit(s) after the candidate ${sha.slice(0, 12)} (main is ${candidate.mainHead.slice(0, 12)}). The candidate stays as requested; a new release normally freezes main's exact HEAD.`);
  }
  if (candidate.workflowDrift?.length) {
    w.push(
      `The candidate's ${WORKFLOWS_DIR} differs from main (${candidate.workflowDrift.join(', ')}). ` +
        'Observed once (0.9.6, 34f633c): GITHUB_TOKEN tag creation for such a candidate got HTTP 403 while main HEAD succeeded; ' +
        'the cause is a hypothesis, not confirmed by GitHub. Also, release.yml runs as committed at the tag, not as on main.',
    );
  }
  if (candidate.workflowDrift === null) w.push(`Could not compare the candidate's ${WORKFLOWS_DIR} with main.`);
  return w;
}

/**
 * Read-only coordinator gate: everything the client gate checks, plus the
 * requested version must equal packages/zdtp/package.json at the SHA, and the
 * coordinator itself must run from main's workflow definition.
 */
export async function coordinateGate(io, { version, sha, env = io.env }) {
  requireSha(sha);
  classifyVersion(version);
  assertCoordinatorBinding(env);
  io.gitOk(['fetch', '--quiet', 'origin', sha]);
  const pkgVersion = versionAt(io, sha);
  if (pkgVersion !== version) {
    throw new ReleaseError(`Requested version ${version} does not match ${PKG_JSON_PATH} "${pkgVersion}" at ${sha}.`, { code: 'VERSION_MISMATCH' });
  }
  const g = await gateCandidate(io, { sha, tagName: `v${version}`, requireCi: true });
  if (g.tagState === 'absent' && g.decision.action === 'skip-publish') {
    throw new ReleaseError(`${PKG}@${version} is already on npm but ${g.tag} is missing. Investigate before tagging.`, { code: 'ANOMALY' });
  }
  const candidate = candidateContext(io, sha);
  return { ...g, mode: g.tagState === 'same' ? 'resume' : 'new', candidate, warnings: candidateWarnings({ tagState: g.tagState, sha, candidate }) };
}

/**
 * Facts for a refused tag write, kept apart from guesses. Nothing here changes
 * a setting or retries the write with another credential.
 */
export async function diagnoseTagRefusal(io, { tag, sha, stderr, candidate }) {
  const status = /HTTP (\d{3})/.exec(stderr)?.[1] ?? null;
  const confirmed = [
    `GitHub answered ${status ? `HTTP ${status}` : 'an error'} to POST git/refs: ${stderr || '(no stderr)'}`,
    `${tag} was not visible on the remote in one read right after the failure (a re-send re-checks it).`,
    `This job declares contents: write (release-coordinator.yml); the token's effective permissions are listed in the job's "Set up job" log.`,
  ];
  const possible = [];
  const unknown = [];
  if (/workflows?`? permission|create or update workflow/i.test(stderr)) {
    confirmed.push('GitHub named the missing `workflows` permission, which GITHUB_TOKEN cannot hold.');
  } else if (candidate?.workflowDrift?.length) {
    possible.push(
      `The candidate's ${WORKFLOWS_DIR} differs from main (${candidate.workflowDrift.join(', ')}). The same 403 hit 0.9.6 at 34f633c, whose workflows differed from main, while main HEAD ae7be06 succeeded with the same workflow. GitHub did not state this cause.`,
    );
  }
  try {
    const sets = (await io.githubGet(`repos/${REPO}/rulesets?includes_parents=true&targets=tag`)) ?? [];
    const tagSets = (Array.isArray(sets) ? sets : []).filter((r) => r.target === 'tag');
    confirmed.push(`Rulesets readable by this token that target tags: ${tagSets.length ? tagSets.map((r) => `${r.name} (${r.enforcement})`).join(', ') : 'none'}.`);
    unknown.push('Bypass lists and rulesets this token cannot read are not visible here.');
  } catch (e) {
    unknown.push(`Rulesets could not be read (${e.message.split('\n')[0]}).`);
  }
  if (!possible.length && !confirmed.some((c) => c.includes('`workflows`'))) unknown.push('GitHub gave no specific reason; the cause is not established.');
  return { status, confirmed, possible, unknown, candidateSha: sha };
}

/** Coordinator: create the tag at the gated SHA through the GitHub API (idempotent, never moves a tag). */
export async function coordinateTag(io, { version, sha, readbackAttempts = 6, intervalMs = 5000 }) {
  // Re-gate right before the write: state may have changed since the gate job.
  const g = await coordinateGate(io, { version, sha });
  if (g.tagState === 'same') {
    io.log(`${g.tag} already points at ${sha}; resuming without creating it.`);
    return { tag: g.tag, created: false };
  }
  try {
    io.gh(['api', '-X', 'POST', `repos/${REPO}/git/refs`, '-f', `ref=refs/tags/${g.tag}`, '-f', `sha=${sha}`]);
  } catch (e) {
    // A concurrent coordinator or a re-sent request may have won the race: decide from the remote, not the error.
    const now = io.remoteTagSha(g.tag);
    if (now === sha) {
      io.log(`${g.tag} appeared at ${sha} while creating it; treating as already created.`);
      return { tag: g.tag, created: false };
    }
    if (now) classifyTag(now, sha, g.tag);
    // execFileSync hides gh's own message (HTTP status + GitHub's reason) in stderr; surface it.
    const stderr = String(e.stderr ?? '').trim() || e.message.split('\n')[0];
    const d = await diagnoseTagRefusal(io, { tag: g.tag, sha, stderr, candidate: g.candidate });
    const lines = [
      `Creating ${g.tag} at ${sha} failed and the tag is not on the remote.`,
      ...d.confirmed.map((x) => `  confirmed: ${x}`),
      ...d.possible.map((x) => `  possible (unconfirmed): ${x}`),
      ...d.unknown.map((x) => `  unknown: ${x}`),
      'Do not add a PAT or change repository settings to get past this. A person decides between pushing the tag from a user credential (Step 8 Route A) and freezing a new candidate (Step 1/6); the coordinator never switches the SHA.',
    ];
    throw new ReleaseError(lines.join('\n'), { code: 'TAG_CREATE_FAILED', details: d });
  }
  const readBack = await retry(async () => ({ done: Boolean(io.remoteTagSha(g.tag)), value: io.remoteTagSha(g.tag) }), { attempts: readbackAttempts, intervalMs, sleep: io.sleep });
  if (!readBack.ok) throw new ReleaseError(`${g.tag} was created but is not readable yet. Re-run the coordinator; an existing identical tag is a no-op.`, { code: 'READBACK_PENDING', inconclusive: true });
  classifyTag(readBack.value, sha, g.tag);
  return { tag: g.tag, created: true };
}

/** release.yml marks build-only runs in its run-name; they never count as the release. */
export const isDryRunTitle = (title) => /\(dry run\)/i.test(String(title ?? ''));

const runRef = (r) => ({ id: r.id, attempt: r.run_attempt ?? 1, sha: r.head_sha, ref: r.head_branch, event: r.event, status: r.status, conclusion: r.conclusion, url: r.html_url ?? null });

/**
 * Coordinator: start release.yml at the existing tag. Matches runs by workflow
 * path + tag + SHA (dry runs excluded). Distinguishes the registry and the
 * GitHub Release from run colour: "complete" needs both, read back.
 */
export async function coordinateDispatch(io, { version, sha, env = io.env }) {
  requireSha(sha);
  classifyVersion(version);
  assertCoordinatorBinding(env);
  const tag = `v${version}`;
  const tagState = classifyTag(io.remoteTagSha(tag), sha, tag);
  if (tagState !== 'same') throw new ReleaseError(`${tag} is not on the remote at ${sha}; create it first.`, { code: 'TAG_MISSING' });

  const reg = await readRegistryKnown(io);
  const published = reg.versions.includes(version);
  const found = published ? await findRelease(io, tag) : null;
  // A draft is not a finished Release: let release.yml's finalize report it.
  const release = found && !found.isDraft ? found : null;
  const state = decideResume({ version, candidateSha: sha, tagSha: sha, published, release }).state;
  if (state === 'complete') {
    return { dispatched: false, state, run: null, reason: `${PKG}@${version} is on npm and the GitHub Release ${release.url ?? tag} exists; nothing to dispatch.` };
  }

  const runs = (await io.githubGet(`repos/${REPO}/actions/workflows/release.yml/runs?branch=${encodeURIComponent(tag)}&per_page=30`))?.workflow_runs ?? [];
  const latest = runs
    .filter((r) => r.path === RELEASE_WORKFLOW_PATH && r.head_branch === tag && r.head_sha === sha && !isDryRunTitle(r.display_title))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  if (latest && latest.status !== 'completed') {
    return { dispatched: false, state, run: runRef(latest), reason: `release.yml run ${latest.id} (attempt ${latest.run_attempt ?? 1}) for ${tag} is still running.` };
  }
  if (latest?.conclusion === 'success') {
    // A green run with the version still unfinalized means someone changed state afterwards; say so instead of calling it complete.
    return { dispatched: false, state, run: runRef(latest), reason: `release.yml run ${latest.id} for ${tag} already succeeded (registry/Release state now: ${state}).` };
  }
  let run;
  try {
    run = await dispatch(io, { ref: tag, dryRun: false });
  } catch (e) {
    // Definite refusals raised before `gh workflow run` (e.g. VERSION_MISMATCH) keep their own code.
    if (e instanceof ReleaseError && e.code !== 'RUN_NOT_FOUND') throw e;
    const notFound = e instanceof ReleaseError;
    const stderr = String(e.stderr ?? '').trim();
    throw new ReleaseError(
      `${notFound ? 'release.yml was dispatched but its run was not found yet' : `Dispatching release.yml at ${tag} failed (${stderr || e.message.split('\n')[0]})`}. ` +
        `${tag} stays at ${sha}; this job publishes nothing. Re-run the coordinator with the same inputs: it reuses an active run and dispatches only if none exists.`,
      { code: 'DISPATCH_FAILED', inconclusive: notFound },
    );
  }
  return { dispatched: true, state, run: runRef(run), reason: `Dispatched release.yml at ${tag}${state === 'published-unfinalized' ? ' (npm already has it: finalize only)' : ''}.` };
}
