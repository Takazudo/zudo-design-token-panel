// Release rules for @takazudo/zdtp, shared by the client procedure
// (docs/releasing.md, run by local agents and Codex Cloud) and by
// .github/workflows/release.yml. Pure decisions live here so they are unit-tested;
// all I/O goes through an injected `io` object (see io.mjs) so tests can mock it.

import { comparePrecedence } from '../prune-stale-next-dist-tag.mjs';

export { comparePrecedence };

export const PKG = '@takazudo/zdtp';
export const REPO = 'Takazudo/zudo-design-token-panel';
export const PKG_JSON_PATH = 'packages/zdtp/package.json';
export const CI_WORKFLOW_PATH = '.github/workflows/ci.yml';
export const RELEASE_WORKFLOW_PATH = '.github/workflows/release.yml';
export const COORDINATOR_WORKFLOW_PATH = '.github/workflows/release-coordinator.yml';
export const MAIN_BRANCH = 'main';
export const CHANGELOG_EN_DIR = 'doc/src/content/docs/changelog';
// actions/setup-node writes this literal placeholder into NODE_AUTH_TOKEN when
// `registry-url` is set; it is not a credential.
export const SETUP_NODE_PLACEHOLDER_TOKEN = 'XXXXX-XXXXX-XXXXX-XXXXX';

export class ReleaseError extends Error {
  constructor(message, { code = 'REFUSED', details, inconclusive = false } = {}) {
    super(message);
    this.code = code;
    this.details = details;
    // Not a refusal: the state could not be read yet. The CLI exits 3 ("re-check later").
    this.inconclusive = inconclusive;
  }
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

/**
 * Classify a version under the repository dist-tag policy:
 *   -next.N / -beta.N / -rc.N → `next` (GitHub prerelease)
 *   clean X.Y.Z              → `latest`
 * Any other prerelease suffix is refused rather than silently landing on
 * `latest` (the historical tag regex would have routed e.g. -alpha.1 there).
 */
export function classifyVersion(version) {
  const m = VERSION_RE.exec(String(version));
  if (!m) throw new ReleaseError(`Not a valid release version: "${version}"`);
  const pre = m[4];
  if (!pre) return { version, distTag: 'latest', prerelease: false };
  if (/^(next|beta|rc)\.\d+$/.test(pre)) return { version, distTag: 'next', prerelease: true };
  throw new ReleaseError(
    `Unsupported prerelease suffix "-${pre}" in ${version}: only -next.N, -beta.N and -rc.N are released (to the "next" dist-tag).`,
  );
}

/** `refs/tags/v1.2.3` or `v1.2.3` → `1.2.3`; anything else → null. */
export function versionFromTagRef(ref) {
  const m = /^(?:refs\/tags\/)?v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(String(ref ?? ''));
  return m ? m[1] : null;
}

/**
 * Decide what a Release workflow run must do, from its trigger alone.
 *   - dry_run=true (any ref)      → build-only; never publishes, never finalizes
 *   - real run on a v* tag ref    → gated publish + finalize
 *   - real run on any other ref   → refused (tag-only real publication)
 */
export function planRun({ ref, dryRun }) {
  if (dryRun) return { mode: 'dry-run', publish: false, finalize: false };
  const version = versionFromTagRef(ref);
  if (!version) {
    throw new ReleaseError(
      `Real publication requires a v* tag ref; got "${ref}". Use dry_run=true for a branch smoke test.`,
    );
  }
  return { mode: 'release', version, publish: true, finalize: true };
}

/** Tag name must equal `v` + packages/zdtp/package.json version at the candidate SHA. */
export function checkTagMatchesVersion(tagName, pkgVersion) {
  const tagVersion = versionFromTagRef(tagName);
  if (tagVersion !== pkgVersion) {
    throw new ReleaseError(
      `Tag ${tagName} does not match ${PKG_JSON_PATH} version "${pkgVersion}" at the candidate commit.`,
      { code: 'VERSION_MISMATCH' },
    );
  }
}

/**
 * Compare a remote tag's (peeled) commit with the candidate.
 * Returns 'absent' | 'same'; throws on a tag that points elsewhere — a release
 * tag is immutable and is never force-moved by this tooling.
 */
export function classifyTag(remoteSha, candidateSha, tagName) {
  if (!remoteSha) return 'absent';
  if (remoteSha === candidateSha) return 'same';
  throw new ReleaseError(
    `Tag ${tagName} already exists at ${remoteSha}, not the candidate ${candidateSha}. ` +
      'Release tags are immutable here: investigate which commit was released; never force-update the tag.',
    { code: 'TAG_CONFLICT' },
  );
}

/**
 * Pick the CI evidence for exactly `sha`: runs of ci.yml (by workflow path, not
 * display name), triggered by a push to main, whose head_sha equals the
 * candidate. A deploy workflow or a ci.yml run for another commit never counts.
 * Returns { state: 'success' | 'pending' | 'failed' | 'missing', run }.
 */
export function selectCiRun(runs, sha) {
  const matching = (runs ?? []).filter(
    (r) =>
      r.path === CI_WORKFLOW_PATH &&
      r.head_sha === sha &&
      r.event === 'push' &&
      r.head_branch === MAIN_BRANCH,
  );
  const byNewest = [...matching].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const ok = byNewest.find((r) => r.status === 'completed' && r.conclusion === 'success');
  if (ok) return { state: 'success', run: ok };
  const active = byNewest.find((r) => r.status !== 'completed');
  if (active) return { state: 'pending', run: active };
  // ci.yml cancels in-progress runs per ref, so a quick follow-up merge on main
  // cancels the candidate's run; it must be re-run, not replaced by a new commit.
  if (byNewest.length && byNewest[0].conclusion === 'cancelled') return { state: 'cancelled', run: byNewest[0] };
  if (byNewest.length) return { state: 'failed', run: byNewest[0] };
  return { state: 'missing', run: null };
}

/**
 * Correlate a Release workflow run by workflow path + ref + SHA (+ creation
 * time for a dispatch the caller just made). Never "whatever --limit 1 says".
 * Returns { run, candidates } and throws when the correlation is ambiguous.
 */
export function selectWorkflowRun(runs, { workflowPath = RELEASE_WORKFLOW_PATH, ref, sha, event, since }) {
  const sinceMs = since ? Date.parse(since) : null;
  if (since && Number.isNaN(sinceMs)) throw new ReleaseError(`Invalid --since timestamp: ${since}`, { code: 'USAGE' });
  const candidates = (runs ?? [])
    .filter(
      (r) =>
        r.path === workflowPath &&
        r.head_branch === ref &&
        r.head_sha === sha &&
        (!event || r.event === event) &&
        (sinceMs === null || Date.parse(r.created_at) >= sinceMs),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  if (since && candidates.length > 1) {
    throw new ReleaseError(
      `Ambiguous: ${candidates.length} ${workflowPath} runs for ${ref}@${sha} since ${since}: ${candidates.map((r) => r.id).join(', ')}`,
      { code: 'AMBIGUOUS_RUN' },
    );
  }
  return { run: candidates[0] ?? null, candidates };
}

/**
 * Registry-side decision for a real release of `version`.
 *   - already published            → 'skip-publish' (finalize only; never republish)
 *   - would move a dist-tag back    → refuse (stale release attempt)
 *   - a `next` publish not ahead of `latest` → refuse (would create a stale next)
 *   - otherwise                     → 'publish'
 * An already-published older version is NOT refused just because something newer
 * exists: finalizing its GitHub Release is legitimate.
 */
export function decidePublish({ version, distTag, registry }) {
  const versions = registry?.versions ?? [];
  const tags = registry?.distTags ?? {};
  if (versions.includes(version)) {
    return { action: 'skip-publish', reason: `${PKG}@${version} is already on the registry; publication is skipped.` };
  }
  const current = tags[distTag];
  if (current && comparePrecedence(version, current) < 0) {
    throw new ReleaseError(
      `Refusing to publish ${version} to "${distTag}": it currently points at newer ${current} (dist-tag regression).`,
      { code: 'DIST_TAG_REGRESSION' },
    );
  }
  if (distTag === 'next' && tags.latest && comparePrecedence(version, tags.latest) <= 0) {
    throw new ReleaseError(
      `Refusing to publish prerelease ${version} to "next": it is not ahead of latest ${tags.latest}.`,
      { code: 'DIST_TAG_REGRESSION' },
    );
  }
  return { action: 'publish', reason: `${PKG}@${version} is not on the registry yet; publish to "${distTag}".` };
}

/**
 * The publish step must authenticate through OIDC only. Refuse when a real
 * npm credential is present in the environment (no automatic token fallback).
 * setup-node's literal placeholder is fine.
 */
export function assertNoLongLivedNpmToken(env) {
  const offenders = [];
  for (const name of ['NPM_TOKEN', 'NPM_AUTH_TOKEN', 'npm_config__authToken', 'NPM_CONFIG__AUTHTOKEN']) {
    if (env[name]) offenders.push(name);
  }
  const nat = env.NODE_AUTH_TOKEN;
  if (nat && nat !== SETUP_NODE_PLACEHOLDER_TOKEN) offenders.push('NODE_AUTH_TOKEN');
  for (const key of Object.keys(env)) {
    if (/^npm_config_\/\/.*:_authtoken$/i.test(key) && env[key]) offenders.push(key);
  }
  if (offenders.length) {
    throw new ReleaseError(
      `A long-lived npm credential is present in the publish environment (${offenders.join(', ')}). ` +
        'Publication is OIDC-only; remove the variable instead of relying on it.',
      { code: 'TOKEN_PRESENT' },
    );
  }
}

/**
 * Inspect pnpm publish output. pnpm 11 tries OIDC first and logs
 * "Skipped OIDC" when the exchange fails, then falls back to whatever token
 * the .npmrc names. Treat that warning as a failed authentication, even if a
 * fallback somehow succeeded.
 */
export function analyzePublishOutput(output) {
  const text = String(output ?? '');
  const oidcSkipped = /Skipped OIDC/i.test(text);
  const alreadyPublished = /cannot publish over the previously published version/i.test(text);
  return { oidcSkipped, alreadyPublished };
}

/** `sha512-<base64>` → lowercase hex digest. */
export function integrityToSha512Hex(integrity) {
  const m = /^sha512-(.+)$/.exec(String(integrity ?? ''));
  if (!m) return null;
  return Buffer.from(m[1], 'base64').toString('hex');
}

/**
 * Check the SLSA provenance published for the exact version against the intended
 * repository, workflow, tag ref and source commit, and tie it to the actual
 * published archive (attestation subject digest == registry dist.integrity).
 * This reads the attested claims; cryptographic verification is delegated to
 * `npm audit signatures` (existing tooling).
 */
export function analyzeProvenance(attestationsDoc, { version, sha, integrity }) {
  const problems = [];
  const expectedHex = integrityToSha512Hex(integrity);
  const provenance = (attestationsDoc?.attestations ?? []).find((a) =>
    String(a.predicateType).startsWith('https://slsa.dev/provenance/'),
  );
  if (!provenance) return { ok: false, problems: ['no SLSA provenance attestation found'], invocationId: null, runId: null };

  let statement;
  try {
    statement = JSON.parse(Buffer.from(provenance.bundle.dsseEnvelope.payload, 'base64').toString('utf8'));
  } catch {
    return { ok: false, problems: ['provenance payload is not decodable'], invocationId: null, runId: null };
  }
  const expectedName = `pkg:npm/${PKG.replace('@', '%40')}@${version}`;
  const subject = (statement.subject ?? []).find((s) => s.name === expectedName);
  if (!subject) problems.push(`provenance subject ${expectedName} missing`);
  else if (!expectedHex || subject.digest?.sha512 !== expectedHex) {
    problems.push('provenance subject digest does not match the registry tarball integrity');
  }

  const bd = statement.predicate?.buildDefinition ?? {};
  const wf = bd.externalParameters?.workflow ?? {};
  if (wf.repository !== `https://github.com/${REPO}`) problems.push(`provenance repository is ${wf.repository}`);
  if (wf.path !== RELEASE_WORKFLOW_PATH) problems.push(`provenance workflow is ${wf.path}`);
  if (wf.ref !== `refs/tags/v${version}`) problems.push(`provenance ref is ${wf.ref}`);
  const commit = (bd.resolvedDependencies ?? []).find((d) => d.digest?.gitCommit)?.digest?.gitCommit;
  if (commit !== sha) problems.push(`provenance source commit is ${commit}, expected ${sha}`);

  const invocationId = statement.predicate?.runDetails?.metadata?.invocationId ?? null;
  const runId = /\/actions\/runs\/(\d+)/.exec(invocationId ?? '')?.[1] ?? null;
  return { ok: problems.length === 0, problems, invocationId, runId };
}

/** Registry-side evidence that the version was published through trusted publishing. */
export function analyzePublisher(npmUser) {
  const tp = npmUser && typeof npmUser === 'object' ? npmUser.trustedPublisher : null;
  return { oidc: Boolean(tp && tp.id === 'github'), publisher: tp ?? null, user: npmUser?.name ?? null };
}

/**
 * GitHub Release decision. Never overwrites: an existing non-draft Release whose
 * prerelease flag matches is a successful no-op (manual edits to its notes or
 * title are respected); a draft or a classification mismatch is a conflict for
 * a human to resolve.
 */
export function decideGithubRelease(existing, { prerelease }) {
  if (!existing) return { action: 'create' };
  if (existing.isDraft) {
    return { action: 'conflict', reason: `A draft Release already exists for ${existing.tagName}; publish or delete it manually.` };
  }
  if (Boolean(existing.isPrerelease) !== Boolean(prerelease)) {
    return {
      action: 'conflict',
      reason: `Existing Release ${existing.tagName} has prerelease=${existing.isPrerelease}, expected ${prerelease}; not overwriting.`,
    };
  }
  return { action: 'noop' };
}

/**
 * Should a newly created stable Release be marked "Latest" on GitHub? Only when
 * no newer stable release tag already has a Release.
 */
export function shouldMarkLatest(version, existingReleaseTags) {
  if (classifyVersion(version).prerelease) return false;
  return !(existingReleaseTags ?? [])
    .map(versionFromTagRef)
    .filter((v) => v && !v.includes('-'))
    .some((v) => comparePrecedence(v, version) > 0);
}

/** Release notes = the English changelog page minus frontmatter and the `Released:` marker. */
export function extractReleaseNotes(mdx) {
  const lines = String(mdx).split('\n');
  const out = [];
  let i = 0;
  if (lines[0] === '---') {
    i = 1;
    while (i < lines.length && lines[i] !== '---') i++;
    i++;
  }
  for (; i < lines.length; i++) {
    if (/^Released:/.test(lines[i])) continue;
    out.push(lines[i]);
  }
  const notes = out.join('\n').trim();
  if (!notes) throw new ReleaseError('The changelog page has no release notes body.');
  return `${notes}\n`;
}

/**
 * Resume decision from observed state. Inputs are facts read from the registry,
 * the remote tag and GitHub — never inferred from a workflow's red/green status.
 */
export function decideResume({ version, candidateSha, tagSha, published, release }) {
  const tagName = `v${version}`;
  if (tagSha && candidateSha) classifyTag(tagSha, candidateSha, tagName);
  if (published && !tagSha) {
    return {
      state: 'anomaly',
      next: `${PKG}@${version} is on npm but ${tagName} is missing on the remote. Stop and investigate; do not create a tag on a guessed commit.`,
    };
  }
  if (!tagSha) {
    return { state: 'untagged', next: 'Freeze the candidate SHA, pass the candidate gate, then create the tag.' };
  }
  if (!published) {
    return {
      state: 'tagged-unpublished',
      next: `Inspect the release.yml runs for ${tagName}. If none is active, dispatch release.yml at ${tagName}; never move the tag.`,
    };
  }
  if (!release) {
    return {
      state: 'published-unfinalized',
      next: `npm already has ${version}. Resume GitHub Release finalization only: re-run the failed finalize job, or dispatch release.yml at ${tagName} (its gate skips publication). Do not bump, republish, or move the tag.`,
    };
  }
  return { state: 'complete', next: 'Nothing to do.' };
}

/** Allowed clock skew between the caller and GitHub when correlating a new run. */
export const RUN_CORRELATION_SKEW_MS = 60_000;

/**
 * Bounded retry. Exhaustion — including repeated thrown errors — is reported as
 * inconclusive, never as "not published".
 */
export async function retry(fn, { attempts = 10, intervalMs = 15000, sleep = defaultSleep } = {}) {
  let last;
  let error = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      last = await fn(i);
      error = null;
      if (last?.done) return { ok: true, value: last.value, attempts: i };
    } catch (e) {
      // Definite refusals (ambiguity, mismatch, usage) are never retried away.
      if (e instanceof ReleaseError) throw e;
      // A transient registry/network failure is retried like propagation lag.
      error = e;
    }
    if (i < attempts) await sleep(intervalMs);
  }
  return { ok: false, inconclusive: true, value: last?.value, error, attempts };
}

function defaultSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
