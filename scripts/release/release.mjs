#!/usr/bin/env node
// Release helper CLI for @takazudo/zdtp. Procedure: docs/releasing.md.
// Dependency-free (Node 24 + git, and `gh` for GitHub writes).
//
// Exit codes: 0 ok · 1 refused/failed · 2 usage · 3 inconclusive or pending (re-check later)
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import * as cmd from './commands.mjs';
import { createIo } from './io.mjs';
import { ReleaseError } from './lib.mjs';

const USAGE = `usage: node scripts/release/release.mjs <command> [options]

  preflight [--route direct|pr]          environment + capability check (read-only)
  status [--version V] [--sha SHA]       tag / npm / GitHub Release / runs → resume decision
  gate --sha SHA                         candidate gate (version, main, ci.yml for SHA, tag, dist-tags)
  tag --sha SHA [--via git|api]          create the v<version> tag at the gated SHA (never moves a tag)
  find-run --ref REF [--sha SHA] [--since ISO] [--event push|workflow_dispatch] [--wait]
  dispatch --ref REF [--dry-run]         dispatch release.yml (dry run on a branch, or real at an existing tag)
  coordinate --version V --sha SHA [--dry-run]
                                         start release-coordinator.yml on main (Actions tags + dispatches release.yml);
                                         for callers that cannot push tags. --dry-run = gate only in Actions

  Actions-only (release.yml):
  actions-gate                           uses GITHUB_REF, GITHUB_SHA, DRY_RUN
  publish --version V --dist-tag T
  verify-registry --version V --sha SHA [--published-run-id ID] [--audit-signatures]
  finalize --version V --sha SHA

  Actions-only (release-coordinator.yml):
  coordinator-gate --version V --sha SHA
  coordinator-tag --version V --sha SHA
  coordinator-dispatch --version V --sha SHA`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    route: { type: 'string' },
    version: { type: 'string' },
    sha: { type: 'string' },
    via: { type: 'string' },
    ref: { type: 'string' },
    since: { type: 'string' },
    event: { type: 'string' },
    wait: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'dist-tag': { type: 'string' },
    'published-run-id': { type: 'string' },
    'audit-signatures': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

const io = createIo();
process.chdir(execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim());
const print = (o) => console.log(JSON.stringify(o, null, 2));

async function main() {
  const [command] = positionals;
  switch (command) {
    case 'preflight': {
      const r = await cmd.preflight(io, { route: values.route });
      for (const c of r.checks) console.log(`${c.level.padEnd(4)}  ${c.name}: ${c.detail}`);
      return r.ok ? 0 : 1;
    }
    case 'status':
      print(await cmd.status(io, { version: values.version, sha: values.sha }));
      return 0;
    case 'gate': {
      try {
        const g = await cmd.gateCandidate(io, { sha: values.sha, requireCi: true });
        print({ ok: true, version: g.version, tag: g.tag, distTag: g.distTag, tagState: g.tagState, ciRun: g.ci.run.html_url ?? g.ci.run.id, decision: g.decision });
        return 0;
      } catch (e) {
        if (e.code === 'CI_PENDING') {
          console.error(`${e.message}\nWatch it: gh run watch ${e.details.run.id} --exit-status`);
          return 3;
        }
        throw e;
      }
    }
    case 'tag':
      print(await cmd.createTag(io, { sha: values.sha, via: values.via ?? 'git' }));
      return 0;
    case 'find-run': {
      const run = await cmd.findRun(io, { ref: values.ref, sha: values.sha, since: values.since, event: values.event, waitAttempts: values.wait ? 18 : 1 });
      print({ id: run.id, event: run.event, sha: run.head_sha, status: run.status, conclusion: run.conclusion, url: run.html_url });
      return 0;
    }
    case 'dispatch': {
      const run = await cmd.dispatch(io, { ref: values.ref, dryRun: Boolean(values['dry-run']) });
      print({ id: run.id, sha: run.head_sha, url: run.html_url, watch: `gh run watch ${run.id} --exit-status` });
      return 0;
    }
    case 'coordinate': {
      const run = await cmd.coordinate(io, { version: values.version, sha: values.sha, dryRun: Boolean(values['dry-run']) });
      print({ id: run.id, url: run.html_url, watch: `gh run watch ${run.id} --exit-status` });
      return 0;
    }
    case 'coordinator-gate':
      await cmd.coordinatorGate(io, { version: values.version, sha: values.sha });
      return 0;
    case 'coordinator-tag':
      print(await cmd.coordinatorTag(io, { version: values.version, sha: values.sha }));
      return 0;
    case 'coordinator-dispatch':
      print(await cmd.coordinatorDispatch(io, { version: values.version, sha: values.sha }));
      return 0;
    case 'actions-gate':
      await cmd.actionsGate(io);
      return 0;
    case 'publish':
      await cmd.publish(io, { version: values.version, distTag: values['dist-tag'] });
      return 0;
    case 'verify-registry': {
      const r = await cmd.verifyRegistry(io, {
        version: values.version,
        sha: values.sha,
        publishedRunId: values['published-run-id'] || undefined,
        auditSignatures: Boolean(values['audit-signatures']),
      });
      if (r.inconclusive) {
        console.error(r.message);
        return 3;
      }
      print(r);
      io.summary(`### Registry read-back\n\`\`\`json\n${JSON.stringify(r.evidence, null, 2)}\n\`\`\``);
      return 0;
    }
    case 'finalize':
      print(await cmd.finalize(io, { version: values.version, sha: values.sha }));
      return 0;
    default:
      console.error(USAGE);
      return values.help ? 0 : 2;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    if (e instanceof ReleaseError) {
      console.error(`::error::[${e.code}] ${e.message}`);
      if (e.details) console.error(JSON.stringify(e.details, null, 2));
      process.exit(e.code === 'USAGE' ? 2 : e.inconclusive ? 3 : 1);
    }
    console.error(e);
    process.exit(1);
  },
);
