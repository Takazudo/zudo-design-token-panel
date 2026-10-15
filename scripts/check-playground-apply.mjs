import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const playground = resolve(root, 'playground');
const cssPath = resolve(playground, 'styles/global.css');
const beforeBytes = await readFile(cssPath);
const before = beforeBytes.toString('utf8');
const origin = 'http://localhost:44327';
const children = [];
let output = '';
const tokenPattern = /(--zfb-hsp-md:\s*)([^;]+)(;)/;
const originalToken = before.match(tokenPattern);
assert.ok(originalToken, 'Expected editable playground token');
let applyRequested = false;

function start(command, args) {
  const child = spawn(command, args, { cwd: playground, detached: process.platform !== 'win32' });
  children.push(child);
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-12000); });
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-12000); });
  child.on('error', error => { output += String(error); });
  return child;
}

async function post(body) {
  const response = await fetch(`${origin}/api/dev/apply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

try {
  const sidecar = start(process.execPath, [resolve(root, 'packages/zdtp/dist/bin/server.js'),
    '--write-root', '.', '--routing', 'scaffold.routing.json', '--port', '24685', '--allow-origin', origin]);
  const host = start(resolve(playground, 'node_modules/.bin/zfb'),
    ['dev', '--scratch-dir', '.zfb-build/apply-check', '--port', '44327']);
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    assert.equal(sidecar.exitCode, null, output);
    assert.equal(host.exitCode, null, output);
    try {
      ready = (await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok;
      if (ready) break;
    } catch { /* The dev server is still starting. */ }
    await delay(500);
  }
  assert.ok(ready, `Playground did not start: ${output}`);
  const tokens = { '--zfb-hsp-md': '1.125rem' };
  const preview = await post({ dryRun: true, tokens });
  assert.equal(await readFile(cssPath, 'utf8'), before, 'Preview must not write');
  assert.equal(preview.files.length, 1);
  assert.equal(preview.files[0].file, 'styles/global.css');
  assert.ok(preview.files[0].hunks.some(hunk => hunk.cssVar === '--zfb-hsp-md'));
  applyRequested = true;
  const result = await post({ tokens, expectDigests: { [preview.files[0].file]: preview.files[0].digest } });
  const after = await readFile(cssPath, 'utf8');
  assert.notEqual(after, before);
  assert.match(after, /--zfb-hsp-md:\s*1\.125rem/);
  console.log(`PASS playground Apply: /api/dev/apply → sidecar 24685 → styles/global.css; ${JSON.stringify(result)}`);
} finally {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch { /* Child already exited. */ }
  }
  await Promise.all(children.map(child => child.exitCode === null && child.signalCode === null
    ? new Promise(resolveExit => {
      const timer = setTimeout(() => {
        try {
          if (process.platform === 'win32') child.kill('SIGKILL');
          else process.kill(-child.pid, 'SIGKILL');
        } catch { /* Already exited. */ }
      }, 5000);
      child.once('exit', () => { clearTimeout(timer); resolveExit(); });
    }) : undefined));
  // Stop the writer before restoring; preserve unrelated concurrent source edits.
  if (applyRequested) {
    const current = await readFile(cssPath, 'utf8');
    const currentToken = current.match(tokenPattern);
    if (currentToken?.[2].trim() === '1.125rem') {
      await writeFile(cssPath, current.replace(tokenPattern, (_, prefix, value, suffix) =>
        prefix + originalToken[2] + suffix));
    } else {
      assert.equal(currentToken?.[2], originalToken[2],
        'Token changed concurrently; preserving source for owner inspection');
    }
  }
}

assert.deepEqual(await readFile(cssPath), beforeBytes,
  'Apply verification must restore the stylesheet byte-for-byte');
console.log('PASS playground Apply: stylesheet restored byte-for-byte');
