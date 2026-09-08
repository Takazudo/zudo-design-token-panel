import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { normalizeDeclarations } from './normalize-declarations.mjs';

function fixture(t, files) {
  const root = mkdtempSync(path.join(tmpdir(), 'zdtp-declarations-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), content);
  }
  return root;
}

test('rewrites every module syntax against emitted files and preserves unrelated text', (t) => {
  const root = fixture(t, {
    'index.d.ts': `// import('./missing') remains a comment
import './styles/panel.css';
import 'package/styles.css';
import { A } from './a';
export * from './dir';
export { A } from './a.js';
import './a';
import type { Component } from 'preact/compat';
export type Imported = import('./a').A;
export type Nested = Promise<import('./dir').B>;
export type Text = "import('./missing')";
import Common = require('./a');
`,
    'a.d.ts': 'export interface A {}',
    'dir/index.d.ts': "export { A as B } from '../a';",
  });
  assert.equal(normalizeDeclarations(root), 3);
  const output = readFileSync(path.join(root, 'index.d.ts'), 'utf8');
  assert.ok(!output.includes('panel.css'));
  assert.ok(output.includes("import 'package/styles.css'"));
  assert.ok(output.includes('from "./a.js"'));
  assert.ok(output.includes('from "./dir/index.js"'));
  assert.ok(output.includes("from './a.js'"));
  assert.ok(output.includes('import "./a.js";'));
  assert.ok(output.includes('import("./a.js").A'));
  assert.ok(output.includes('import("./dir/index.js").B'));
  assert.ok(output.includes('require("./a.js")'));
  assert.ok(output.includes("from 'preact/compat'"));
  assert.ok(output.includes('// import(\'./missing\') remains a comment'));
  assert.ok(output.includes('"import(\'./missing\')"'));
  assert.ok(readFileSync(path.join(root, 'dir/index.d.ts'), 'utf8').includes('"../a.js"'));
  normalizeDeclarations(root);
  assert.equal(readFileSync(path.join(root, 'index.d.ts'), 'utf8'), output);
});

for (const declaration of ["export * from './missing';", "type A = import('./missing.js').A;", "import './missing';", "import style from './missing.css';"]) {
  test(`CLI rejects unresolved target: ${declaration}`, (t) => {
    const root = fixture(t, { 'index.d.ts': declaration });
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./normalize-declarations.mjs', import.meta.url)), root], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unresolved relative declaration specifier/);
    assert.equal(readFileSync(path.join(root, 'index.d.ts'), 'utf8'), declaration);
  });
}

test('fails before writing any file and rejects references outside output', (t) => {
  const root = fixture(t, { 'a.d.ts': "export * from './b';", 'b.d.ts': "export * from '../outside';" });
  assert.throws(() => normalizeDeclarations(root), /unresolved/);
  assert.equal(readFileSync(path.join(root, 'a.d.ts'), 'utf8'), "export * from './b';");
});
