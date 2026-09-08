import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { openSync, closeSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const panel = join(root, 'packages/zdtp');
const scratch = mkdtempSync(join(tmpdir(), 'zdtp-types-'));
function run(command, args, cwd = root, allowFailure = false) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.signal || (!allowFailure && result.status !== 0)) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.error ?? ''}${result.stdout}${result.stderr}`);
  }
  return result;
}
const assets = new Set(['./styles', './styles.css', './astro/DesignTokenPanelHost.astro']);
function unexpectedProblems(report) {
  assert.ok(report.analysis?.types, 'ATTW must analyze a typed package');
  for (const entrypoint of ['.', './astro', './server', './testing']) {
    assert.ok(report.analysis.entrypoints?.[entrypoint], `ATTW must analyze ${entrypoint}`);
  }
  assert.ok(report.problems && typeof report.problems === 'object');
  return Object.values(report.problems).flat().filter((problem) => !(
    (problem.kind === 'NoResolution' && problem.resolutionKind === 'node10') ||
    (problem.kind === 'CJSResolvesToESM' && problem.resolutionKind === 'node16-cjs') ||
    (assets.has(problem.entrypoint) && ['NoResolution', 'UntypedResolution'].includes(problem.kind))
  ));
}
function analyze(tarball) {
  // ATTW calls process.exit for findings; a file descriptor avoids truncated pipe output.
  const output = join(scratch, 'attw.json');
  const fd = openSync(output, 'w');
  let result;
  try {
    result = spawnSync('pnpm', ['exec', 'attw', tarball, '--format', 'json', '--no-definitely-typed'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', fd, 'pipe'],
    });
  } finally {
    closeSync(fd);
  }
  assert.ok(!result.error && !result.signal && (result.status === 0 || result.status === 1),
    `Unexpected ATTW failure: ${result.error ?? result.stderr}`);
  const report = JSON.parse(readFileSync(output, 'utf8'));
  return { report, unexpected: unexpectedProblems(report) };
}
function cssImports(source) {
  // Parse actual import/export syntax, including multiline declarations, not comments.
  const ts = typescript;
  const file = ts.createSourceFile('index.d.ts', source, ts.ScriptTarget.Latest, true);
  return file.statements.filter((node) =>
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier && /\.css(?:[?#]|$)/i.test(node.moduleSpecifier.text));
}
const { default: typescript } = await import(join(panel, 'node_modules/typescript/lib/typescript.js'));
try {
  if (!process.argv.includes('--skip-build')) run('pnpm', ['--filter', '@takazudo/zdtp', 'build']);
  run('pnpm', ['--filter', '@takazudo/zdtp', 'pack', '--pack-destination', scratch]);
  const tarballs = readdirSync(scratch).filter((name) => name.endsWith('.tgz'));
  assert.equal(tarballs.length, 1);
  const tarball = join(scratch, tarballs[0]);
  const { report, unexpected } = analyze(tarball);
  assert.deepEqual(unexpected, [], 'Unexpected ATTW findings');
  // An allowlist permits findings to disappear, including all of them.
  for (const kind of Object.keys(report.problems)) {
    assert.deepEqual(unexpectedProblems({ ...report, problems: { ...report.problems, [kind]: [] } }), []);
  }
  assert.deepEqual(unexpectedProblems({ ...report, problems: {} }), []);
  writeFileSync(join(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  const version = (name) => JSON.parse(readFileSync(join(panel, 'node_modules', name, 'package.json'), 'utf8')).version;
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', tarball,
    `preact@${version('preact')}`], scratch);
  const installed = join(scratch, 'node_modules/@takazudo/zdtp');
  const index = join(installed, 'dist/index.d.ts');
  const original = readFileSync(index, 'utf8');
  assert.equal(cssImports(original).length, 0, 'Packed index.d.ts must not import CSS');
  writeFileSync(join(scratch, 'consumer.ts'), `import * as panel from '@takazudo/zdtp';
import * as astro from '@takazudo/zdtp/astro';
import * as server from '@takazudo/zdtp/server';
import * as testing from '@takazudo/zdtp/testing';
export { panel, astro, server, testing };
`);
  function typecheck(mode, allowFailure = false) {
    writeFileSync(join(scratch, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
      target: 'ES2022', module: mode === 'bundler' ? 'ESNext' : mode,
      moduleResolution: mode, strict: true, skipLibCheck: false, noEmit: true,
      noUncheckedSideEffectImports: true, types: [], lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    }, files: ['consumer.ts'] }));
    return run('node', [join(panel, 'node_modules/typescript/bin/tsc'), '-p', join(scratch, 'tsconfig.json')], scratch, allowFailure);
  }
  for (const mode of ['bundler', 'node16', 'nodenext']) {
    typecheck(mode);
    console.log(`Packed consumer: ${mode}, strict, skipLibCheck=false: PASS`);
  }
  // Mutate only the unpacked tarball copy; repository dist stays untouched.
  for (const [name, mutated, signature] of [
    ['CSS import', `import './panel.css';\n${original}`, /TS2307/],
    ['extensionless import', original.replace(/(from ["']\.\.?\/[^"']+)\.js(["'])/, '$1$2'), /TS2835|TS2834/],
  ]) {
    assert.notEqual(mutated, original, `${name} mutation must change the declaration`);
    writeFileSync(index, mutated);
    try {
      const result = typecheck('node16', true);
      assert.notEqual(result.status, 0, `${name} mutation must fail strict consumer compilation`);
      assert.match(result.stdout + result.stderr, signature);
      if (name === 'CSS import') assert.equal(cssImports(mutated).length, 1);
      // Pack the mutated installed package again to test the same ATTW policy.
      const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], installed).stdout);
      const analysis = analyze(join(scratch, packed[0].filename));
      if (name === 'extensionless import') {
        assert.ok(analysis.unexpected.some((p) => p.kind === 'InternalResolutionError' && p.resolutionOption === 'node16'));
      }
      console.log(`Mutation rejected: ${name}`);
    } finally {
      writeFileSync(index, original);
    }
  }
  typecheck('node16');
  console.log('Packed types: PASS (ATTW allowlist, three consumer modes, both mutations, allowlist improvements)');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
