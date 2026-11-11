// Real side-effecting I/O for the release helpers. Tests replace this object.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PKG, REPO } from './lib.mjs';

function exec(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function tryExec(cmd, args, opts) {
  try {
    return { ok: true, out: exec(cmd, args, opts) };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '').trim(), err: String(e.stderr ?? e.message ?? '').trim() };
  }
}

let ghUsable;
function hasGh() {
  if (ghUsable === undefined) ghUsable = tryExec('gh', ['auth', 'status']).ok || Boolean(process.env.GH_TOKEN);
  return ghUsable;
}

export function createIo() {
  return {
    env: process.env,
    now: () => new Date(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    log: (...a) => console.log(...a),
    warn: (...a) => console.error(...a),

    git: (args) => exec('git', args),
    gitOk: (args) => tryExec('git', args).ok,
    tryExec,

    /** Peeled commit SHA of a remote tag, or null. */
    remoteTagSha(tagName) {
      const out = exec('git', ['ls-remote', 'origin', `refs/tags/${tagName}`, `refs/tags/${tagName}^{}`]);
      const rows = out.split('\n').filter(Boolean).map((l) => l.split('\t'));
      const peeled = rows.find(([, ref]) => ref.endsWith('^{}'));
      const plain = rows.find(([, ref]) => ref === `refs/tags/${tagName}`);
      return (peeled ?? plain)?.[0] ?? null;
    },

    remoteHeadSha(branch) {
      const out = exec('git', ['ls-remote', 'origin', `refs/heads/${branch}`]);
      return out.split('\t')[0] || null;
    },

    hasGh,

    /**
     * GitHub REST read. Uses `gh api` when it is authenticated; otherwise falls
     * back to the unauthenticated public API (this repository is public), so a
     * caller without GitHub credentials can still run the read-only gates.
     * Returns parsed JSON, or null on 404.
     */
    async githubGet(path) {
      if (hasGh()) {
        const r = tryExec('gh', ['api', '-H', 'Accept: application/vnd.github+json', path]);
        if (r.ok) return JSON.parse(r.out || 'null');
        if (/HTTP 404/.test(r.err)) return null;
        throw new Error(`gh api ${path} failed: ${r.err.split('\n')[0]}`);
      }
      const res = await fetch(`https://api.github.com/${path}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'zdtp-release-helper' },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GET api.github.com/${path} → HTTP ${res.status}`);
      return res.json();
    },

    gh: (args) => exec('gh', args),

    /** Full packument: versions, dist-tags and per-version _npmUser. Public read, no auth. */
    async readRegistry() {
      const res = await fetch(`https://registry.npmjs.org/${PKG.replace('/', '%2f')}`, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      });
      if (res.status === 404) return { versions: [], distTags: {}, docs: {} };
      if (!res.ok) throw new Error(`registry read failed: HTTP ${res.status}`);
      const doc = await res.json();
      return { versions: Object.keys(doc.versions ?? {}), distTags: doc['dist-tags'] ?? {}, docs: doc.versions ?? {} };
    },

    async fetchJson(url) {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
      return res.json();
    },

    /** Run a command, streaming its output while also capturing it. */
    run(cmd, args, { cwd, env } = {}) {
      const r = spawnSync(cmd, args, { cwd, env: env ?? process.env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
      return { status: r.status ?? 1, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
    },

    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, c) => writeFileSync(p, c),
    exists: (p) => existsSync(p),
    mkTemp: (prefix) => mkdtempSync(join(tmpdir(), prefix)),
    join,

    setOutput(name, value) {
      const file = process.env.GITHUB_OUTPUT;
      if (file) appendFileSync(file, `${name}=${value}\n`);
      console.log(`output ${name}=${value}`);
    },
    summary(markdown) {
      const file = process.env.GITHUB_STEP_SUMMARY;
      if (file) appendFileSync(file, `${markdown}\n`);
    },
    repo: REPO,
  };
}
